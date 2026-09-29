begin;
-- Reserve a same-post parent relationship for a later replies phase. No client
-- grant allows setting it; this phase creates and reads only flat comments.
alter table public.comments add constraint comments_id_post_unique unique(id,post_id);
alter table public.comments add column parent_comment_id uuid;
alter table public.comments add constraint comment_parent_same_post foreign key(parent_comment_id,post_id) references public.comments(id,post_id) on delete cascade;
alter table public.comments add constraint comment_nonblank check(length(btrim(body,E' \n\r\t')) between 1 and 1000);

-- An author's own unpublished post is readable for cleanup, but not interactive.
drop policy post_kudos_insert on public.post_kudos;
create policy post_kudos_insert on public.post_kudos for insert to authenticated with check (
 user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and p.publication_state='published')
);
drop policy comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (
 author_id=auth.uid() and parent_comment_id is null and exists(select 1 from public.posts p where p.id=post_id and p.publication_state='published')
);

create function public.post_activity(target uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'kudos_count',(select count(*) from public.post_kudos k where k.post_id=p.id),
 'comment_count',(select count(*) from public.comments c where c.post_id=p.id and c.parent_comment_id is null),
 'has_kudos',exists(select 1 from public.post_kudos k where k.post_id=p.id and k.user_id=auth.uid()))
 from public.posts p where p.id=target and p.publication_state='published';
$$;
create function public.set_post_kudos(target uuid,wanted boolean) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if auth.uid() is null or wanted is null or not exists(select 1 from public.posts where id=target and publication_state='published') then
 raise exception 'Post unavailable' using errcode='42501'; end if;
 if wanted then insert into public.post_kudos(post_id,user_id) values(target,auth.uid()) on conflict do nothing;
 else delete from public.post_kudos where post_id=target and user_id=auth.uid(); end if;
end; $$;
create function public.add_post_comment(target uuid,comment_id uuid,content text) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if auth.uid() is null or not exists(select 1 from public.posts where id=target and publication_state='published') then raise exception 'Post unavailable' using errcode='42501'; end if;
 if comment_id is null or content is null or length(btrim(content,E' \n\r\t')) not between 1 and 1000 then raise exception 'Write 1 to 1000 characters' using errcode='23514'; end if;
 insert into public.comments(id,post_id,author_id,body) values(comment_id,target,auth.uid(),btrim(content,E' \n\r\t')) on conflict(id) do nothing;
 if not exists(select 1 from public.comments where id=comment_id and post_id=target and author_id=auth.uid() and body=btrim(content,E' \n\r\t')) then raise exception 'Comment retry does not match' using errcode='23514'; end if;
end; $$;

-- A private commenter may participate on a shared post. Only the discoverable
-- handle is projected unless the viewer also has access to their full profile.
create function public.post_comments(target uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.can_post(target) or not exists(select 1 from public.posts where id=target and publication_state='published') then return null; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]'::jsonb) into result from (
 select c.id,c.body,c.created_at,c.author_id=auth.uid() as own,p.handle,
 case when private.can_profile(c.author_id) then p.display_name else null end as display_name
 from public.comments c join public.profiles p on p.id=c.author_id
 where c.post_id=target and c.parent_comment_id is null and not private.blocked(c.author_id)
 order by c.created_at desc,c.id desc limit 21 offset page_number*20
 ) q;
 return result;
end; $$;

create index posts_feed_time on public.posts(created_at desc,id desc) where publication_state='published' and audience<>'private';
create function public.study_feed(feed_mode text default 'for-you',page_number integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if feed_mode is null or feed_mode not in ('for-you','community') or page_number is null or page_number<0 or page_number>24 then raise exception 'Invalid feed page' using errcode='23514'; end if;
 -- RLS removes inaccessible rows before the candidate bound and ranking.
 with candidates as materialized (
 select p.*,exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id) as followed,
 exists(select 1 from public.user_subjects s where s.user_id=auth.uid() and s.subject_id=p.subject_id) as shared_subject,
 exists(select 1 from public.community_members m where m.community_id=p.community_id and m.user_id=auth.uid() and m.status='accepted') as joined
 from public.posts p where p.publication_state='published' and p.audience<>'private' and p.created_at>=now()-interval '90 days'
 and (feed_mode='for-you' or p.author_id=auth.uid()
 or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id)
 or exists(select 1 from public.community_members m where m.community_id=p.community_id and m.user_id=auth.uid() and m.status='accepted'))
 order by p.created_at desc,p.id desc limit 500
 ), ranked as (
 select c.*,public.post_activity(c.id) as activity,
 (case when followed then 40 else 0 end + case when shared_subject and feed_mode='for-you' then 20 else 0 end + case when joined then 15 else 0 end
 + least(10,(select count(*) from public.post_kudos k where k.post_id=c.id)+(select count(*) from public.comments x where x.post_id=c.id and x.parent_comment_id is null))
 + greatest(0,30-extract(epoch from (now()-c.created_at))/86400)) as score
 from candidates c
 ), page as (
 select * from ranked order by score desc,created_at desc,id desc limit 21 offset page_number*20
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'author_id',p.author_id,'handle',a.handle,'display_name',a.display_name,
 'caption',p.caption,'created_at',p.created_at,'subject',s.labels,'shared_duration_seconds',p.shared_duration_seconds,
 'image_path',m.object_path,'alt_text',m.alt_text,'activity',p.activity,
 'reason',case when p.followed then 'Someone you follow' when p.joined then 'From your community' when p.shared_subject and feed_mode='for-you' then 'A subject you study' when p.author_id=auth.uid() then 'Your study moment' else 'Recent study moment' end)
 order by p.score desc,p.created_at desc,p.id desc),'[]'::jsonb) into result
 from page p join public.profiles a on a.id=p.author_id left join public.subjects s on s.id=p.subject_id left join public.post_media m on m.post_id=p.id;
 return result;
end; $$;
revoke all on function public.study_feed(text,integer),public.post_activity(uuid),public.set_post_kudos(uuid,boolean),public.add_post_comment(uuid,uuid,text),public.post_comments(uuid,integer) from public,anon;
grant execute on function public.study_feed(text,integer),public.post_activity(uuid),public.set_post_kudos(uuid,boolean),public.add_post_comment(uuid,uuid,text),public.post_comments(uuid,integer) to authenticated;
-- Small persistent per-account burst budgets. Kept outside the exposed schema;
-- deleting comments cannot reset the budget, and one row serializes concurrent writes.
create table private.interaction_budgets (
 user_id uuid references public.profiles on delete cascade,
 kind text not null, window_start timestamptz not null, attempts integer not null,
 primary key(user_id,kind,window_start)
);
revoke all on private.interaction_budgets from public,anon,authenticated;
create function private.limit_interaction_burst() returns trigger
language plpgsql security definer set search_path='' as $$
declare attempts integer; bucket timestamptz:=date_trunc('minute',now()); cap integer;
begin
 if auth.uid() is null then return new; end if;
 cap:=case when tg_table_name='comments' then 30 else 60 end;
 delete from private.interaction_budgets where user_id=auth.uid() and window_start<bucket-interval '1 minute';
 insert into private.interaction_budgets as b(user_id,kind,window_start,attempts)
 values(auth.uid(),tg_table_name,bucket,1)
 on conflict(user_id,kind,window_start) do update set attempts=b.attempts+1 returning b.attempts into attempts;
 if attempts>cap then raise exception 'Please wait a minute before trying again' using errcode='P0001'; end if;
 return new;
end; $$;
revoke all on function private.limit_interaction_burst() from public,anon,authenticated;
create trigger comment_burst before insert on public.comments for each row execute function private.limit_interaction_burst();
create trigger kudos_burst before insert on public.post_kudos for each row execute function private.limit_interaction_burst();
commit;
