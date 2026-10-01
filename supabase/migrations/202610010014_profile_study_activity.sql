begin;
alter table public.user_settings add column share_study_totals boolean not null default false, add column share_study_live boolean not null default false;
create function public.save_study_visibility(totals boolean,live boolean) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if totals is null or live is null then raise exception 'Choose visibility' using errcode='23514'; end if;
 update public.user_settings set share_study_totals=totals,share_study_live=live where user_id=auth.uid();
end; $$;
create function public.profile_study_activity(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare settings public.user_settings; today date; week_start date; today_seconds bigint; week_seconds bigint; streak integer; studying boolean;
begin
 if auth.uid() is null or not private.can_profile(target) or private.blocked(target) then return null; end if;
 select * into settings from public.user_settings where user_id=target;
 if not found then return null; end if;
 today:=(now() at time zone settings.timezone)::date;
 week_start:=date_trunc('week',now() at time zone settings.timezone)::date;
 if target=auth.uid() or settings.share_study_totals then
  select coalesce(sum(duration_seconds) filter(where (ended_at at time zone settings.timezone)::date=today),0),
    coalesce(sum(duration_seconds) filter(where (ended_at at time zone settings.timezone)::date>=week_start),0)
  into today_seconds,week_seconds from public.study_sessions where user_id=target and status='completed' and ended_at<=now();
  with days as (select distinct (ended_at at time zone settings.timezone)::date as day from public.study_sessions where user_id=target and status='completed' and duration_seconds>0 and ended_at<=now()),
  numbered as (select day,row_number() over(order by day desc)::integer as n,max(day) over() as latest from days)
  select count(*)::integer into streak from numbered where latest>=today-1 and day=latest-(n-1);
 end if;
 if target=auth.uid() or settings.share_study_live then
  select exists(select 1 from public.study_sessions where user_id=target and status='active' and running_since is not null and active_seconds+greatest(0,extract(epoch from (now()-running_since)))<86400) into studying;
 end if;
 return jsonb_build_object('today_seconds',today_seconds,'week_seconds',week_seconds,'streak_days',streak,'is_studying',studying,
  'shared_totals',settings.share_study_totals,'shared_live',settings.share_study_live);
end; $$;
revoke all on function public.save_study_visibility(boolean,boolean),public.profile_study_activity(uuid) from public,anon;
grant execute on function public.save_study_visibility(boolean,boolean),public.profile_study_activity(uuid) to authenticated;
commit;
