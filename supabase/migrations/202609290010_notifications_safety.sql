begin;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in ('follow','follow_request','follow_accepted','kudos','comment','community'));
alter table public.notifications add column comment_id uuid references public.comments on delete cascade;
alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check check(reason in ('harassment','privacy','inappropriate','spam','impersonation','other'));

create function private.social_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; event text; kind text; post uuid; comment uuid;
begin
 if tg_table_name='follow_requests' then recipient:=new.target_id;actor:=new.requester_id;kind:='follow_request';event:='request:'||actor::text;
 elsif tg_table_name='follows' then
  recipient:=new.following_id;actor:=new.follower_id;kind:='follow';event:='follow:'||actor::text;
  if auth.uid()=new.following_id then
   insert into public.notifications(recipient_id,actor_id,kind,event_key) values(new.follower_id,new.following_id,'follow_accepted','accepted:'||new.following_id::text) on conflict(recipient_id,event_key) do nothing;
  end if;
 elsif tg_table_name='post_kudos' then
  select author_id into recipient from public.posts where id=new.post_id;actor:=new.user_id;post:=new.post_id;kind:='kudos';event:='kudos:'||actor::text||':'||post::text;
 elsif tg_table_name='comments' then
  select author_id into recipient from public.posts where id=new.post_id;actor:=new.author_id;post:=new.post_id;comment:=new.id;kind:='comment';event:='comment:'||comment::text;
 end if;
 if recipient is not null and recipient<>actor and not exists(select 1 from public.blocks where (blocker_id=recipient and blocked_id=actor) or (blocker_id=actor and blocked_id=recipient)) then
 insert into public.notifications(recipient_id,actor_id,kind,post_id,comment_id,event_key) values(recipient,actor,kind,post,comment,event) on conflict(recipient_id,event_key) do nothing;
 end if;return new;
end; $$;
revoke all on function private.social_notification() from public,anon,authenticated;
create trigger notify_follow after insert on public.follows for each row execute function private.social_notification();
create trigger notify_request after insert on public.follow_requests for each row execute function private.social_notification();
create trigger notify_kudos after insert on public.post_kudos for each row execute function private.social_notification();
create trigger notify_comment after insert on public.comments for each row execute function private.social_notification();

create function private.can_notification(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.notifications n where n.id=target and n.recipient_id=auth.uid() and not private.blocked(n.actor_id)
 and (n.post_id is null or (private.can_post(n.post_id) and exists(select 1 from public.posts p where p.id=n.post_id and p.publication_state='published')))
 and (n.community_id is null or private.can_community(n.community_id))
 and (n.kind<>'follow' or exists(select 1 from public.follows f where f.follower_id=n.actor_id and f.following_id=n.recipient_id))
 and (n.kind<>'follow_request' or exists(select 1 from public.follow_requests r where r.requester_id=n.actor_id and r.target_id=n.recipient_id))
 and (n.kind<>'follow_accepted' or exists(select 1 from public.follows f where f.follower_id=n.recipient_id and f.following_id=n.actor_id))
 and (n.kind<>'kudos' or exists(select 1 from public.post_kudos k where k.user_id=n.actor_id and k.post_id=n.post_id)));
$$;
revoke all on function private.can_notification(uuid) from public,anon;
grant execute on function private.can_notification(uuid) to authenticated;
drop policy notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using(private.can_notification(id));
create function public.notification_inbox(page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]'::jsonb) into result from (
 select n.id,n.kind,n.post_id,n.read_at,n.created_at,p.handle,
 case when private.can_profile(p.id) then p.display_name else null end as display_name
 from public.notifications n join public.profiles p on p.id=n.actor_id where private.can_notification(n.id)
 order by n.created_at desc,n.id desc limit 21 offset page_number*20) q;return result;
end; $$;
create function private.clear_block_notifications() returns trigger language plpgsql security definer set search_path='' as $$ begin
 delete from public.notifications where (recipient_id=new.blocker_id and actor_id=new.blocked_id) or (recipient_id=new.blocked_id and actor_id=new.blocker_id);return new;
end; $$;
revoke all on function private.clear_block_notifications() from public,anon,authenticated;
create trigger clear_block_notifications after insert on public.blocks for each row execute function private.clear_block_notifications();
create function public.set_account_block(target uuid,wanted boolean) returns void language plpgsql security invoker set search_path='' as $$ begin
 if auth.uid() is null or target=auth.uid() or target is null or wanted is null then raise exception 'Invalid block' using errcode='23514'; end if;
 if wanted then insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),target) on conflict do nothing;
 else delete from public.blocks where blocker_id=auth.uid() and blocked_id=target;end if;
end; $$;
create function public.blocked_accounts(page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.handle),'[]'::jsonb) into result from (
 select p.id,p.handle from public.blocks b join public.profiles p on p.id=b.blocked_id where b.blocker_id=auth.uid() order by p.handle,p.id limit 21 offset page_number*20) q;return result;
end; $$;
create function private.reportable_user(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not private.blocked(target) and exists(select 1 from public.profiles where id=target and handle is not null);
$$;
revoke all on function private.reportable_user(uuid) from public,anon;
grant execute on function private.reportable_user(uuid) to authenticated;
drop policy reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and ((target_user_id is not null and private.reportable_user(target_user_id)) or (target_post_id is not null and private.can_post(target_post_id)) or (target_comment_id is not null and exists(select 1 from public.comments where id=target_comment_id))));
create function public.submit_safety_report(request_id uuid,user_target uuid,post_target uuid,category text,description text default '') returns void language plpgsql security definer set search_path='' as $$
declare existing public.reports;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if request_id is null or num_nonnulls(user_target,post_target)<>1 or category is null or category not in ('harassment','privacy','inappropriate','spam','impersonation','other') or description is null or length(description)>2000 then raise exception 'Invalid report' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||request_id::text,0));
 select * into existing from public.reports where id=request_id;
 if found then
  if existing.reporter_id=auth.uid() and existing.target_user_id is not distinct from user_target and existing.target_post_id is not distinct from post_target and existing.reason=category and existing.details=description then return;end if;
  raise exception 'Invalid report retry' using errcode='42501';
 end if;
 if (user_target is not null and not private.reportable_user(user_target)) or (post_target is not null and not private.can_post(post_target)) then raise exception 'Target unavailable' using errcode='42501'; end if;
 insert into public.reports(id,reporter_id,target_user_id,target_post_id,reason,details) values(request_id,auth.uid(),user_target,post_target,category,description);
end; $$;
create or replace function private.limit_interaction_burst() returns trigger language plpgsql security definer set search_path='' as $$
declare attempts integer; bucket timestamptz:=date_trunc('minute',now()); cap integer;
begin
 if auth.uid() is null then return new; end if;
 cap:=case when tg_table_name='comments' then 30 when tg_table_name='reports' then 10 else 60 end;
 delete from private.interaction_budgets where user_id=auth.uid() and window_start<bucket-interval '1 minute';
 insert into private.interaction_budgets as b(user_id,kind,window_start,attempts) values(auth.uid(),tg_table_name,bucket,1)
 on conflict(user_id,kind,window_start) do update set attempts=b.attempts+1 returning b.attempts into attempts;
 if attempts>cap then raise exception 'Please wait a minute before trying again' using errcode='P0001'; end if;return new;
end; $$;
create trigger report_burst before insert on public.reports for each row execute function private.limit_interaction_burst();
revoke all on function public.notification_inbox(integer),public.set_account_block(uuid,boolean),public.blocked_accounts(integer),public.submit_safety_report(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.notification_inbox(integer),public.set_account_block(uuid,boolean),public.blocked_accounts(integer),public.submit_safety_report(uuid,uuid,uuid,text,text) to authenticated;
commit;
