begin;
-- Community owners cannot delete other authors' posts and orphan their Storage
-- objects through a raw table DELETE. Deletion needs a coordinated cleanup flow.
revoke delete on public.communities from authenticated;
create function private.guard_community_visibility() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if old.visibility='private' and new.visibility='public' and exists(select 1 from public.posts where community_id=old.id) then
  raise exception 'A community with private-group posts cannot become public' using errcode='23514';
 end if;
 return new;
end; $$;
revoke all on function private.guard_community_visibility() from public,anon,authenticated;
create trigger protect_community_audience before update of visibility on public.communities for each row execute function private.guard_community_visibility();
-- Apply budgets to the actual database write path, including direct API callers.
create or replace function private.limit_interaction_burst() returns trigger language plpgsql security definer set search_path='' as $$
declare attempts integer; bucket timestamptz:=date_trunc('minute',now()); cap integer;
begin
 if auth.uid() is null then return new; end if;
 cap:=case when tg_table_name='comments' then 30 when tg_table_name in ('reports','posts') then 10 when tg_table_name='communities' then 5 when tg_table_name in ('follows','follow_requests','community_members') then 20 else 60 end;
 delete from private.interaction_budgets where user_id=auth.uid() and window_start<bucket-interval '1 minute';
 insert into private.interaction_budgets as b(user_id,kind,window_start,attempts) values(auth.uid(),tg_table_name,bucket,1)
 on conflict(user_id,kind,window_start) do update set attempts=b.attempts+1 returning b.attempts into attempts;
 if attempts>cap then raise exception 'Please wait a minute before trying again' using errcode='P0001'; end if;return new;
end; $$;
create trigger follow_burst before insert on public.follows for each row execute function private.limit_interaction_burst();
create trigger request_burst before insert on public.follow_requests for each row execute function private.limit_interaction_burst();
create trigger membership_burst before insert on public.community_members for each row execute function private.limit_interaction_burst();
create trigger community_burst before insert on public.communities for each row execute function private.limit_interaction_burst();
create trigger draft_burst before insert on public.posts for each row execute function private.limit_interaction_burst();
commit;
