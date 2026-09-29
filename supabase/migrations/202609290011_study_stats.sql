begin;
-- Preferences are validated centrally; duration and session ownership stay immutable.
update public.user_settings set timezone='UTC' where not exists(select 1 from pg_timezone_names z where z.name=timezone);
revoke update(timezone,weekly_goal_minutes) on public.user_settings from authenticated;
create function public.save_study_preferences(zone text,goal integer default null) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if zone is null or not exists(select 1 from pg_timezone_names where name=zone) or (goal is not null and (goal<1 or goal>10080)) then raise exception 'Invalid timezone or goal' using errcode='23514'; end if;
 update public.user_settings set timezone=zone,weekly_goal_minutes=goal where user_id=auth.uid();
end; $$;
create function public.own_study_stats(reference_time timestamptz default now()) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare settings public.user_settings; today date; week_start date; result jsonb;
begin
 if auth.uid() is null or reference_time is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into settings from public.user_settings where user_id=auth.uid();
 if not found then return null; end if;
 today:=(reference_time at time zone settings.timezone)::date;
 week_start:=date_trunc('week',reference_time at time zone settings.timezone)::date;
 with completed as materialized (
 select s.id,s.subject_id,s.duration_seconds,s.ended_at,(s.ended_at at time zone settings.timezone)::date as day
 from public.study_sessions s where s.user_id=auth.uid() and s.status='completed' and s.ended_at<=reference_time
 ), daily as (
 select d::date as day,coalesce(sum(c.duration_seconds),0) as seconds from generate_series(today-6,today,interval '1 day') d
 left join completed c on c.day=d::date group by d
 ), subjects as (
 select c.subject_id,s.labels,coalesce(sum(c.duration_seconds),0) as seconds from completed c left join public.subjects s on s.id=c.subject_id
 where c.day>=week_start and c.day<=today group by c.subject_id,s.labels
 ), recent as (
 select c.id,c.ended_at,c.duration_seconds,s.labels from completed c left join public.subjects s on s.id=c.subject_id order by c.ended_at desc,c.id desc limit 5
 )
 select jsonb_build_object('timezone',settings.timezone,'today',today,'week_start',week_start,'goal_minutes',settings.weekly_goal_minutes,
 'today_seconds',coalesce((select sum(duration_seconds) from completed where day=today),0),
 'week_seconds',coalesce((select sum(duration_seconds) from completed where day>=week_start and day<=today),0),
 'total_seconds',coalesce((select sum(duration_seconds) from completed),0),'session_count',(select count(*) from completed),
 'daily',(select coalesce(jsonb_agg(to_jsonb(daily) order by day),'[]'::jsonb) from daily),
 'subjects',(select coalesce(jsonb_agg(to_jsonb(subjects) order by seconds desc,subject_id),'[]'::jsonb) from subjects),
 'recent',(select coalesce(jsonb_agg(to_jsonb(recent) order by ended_at desc,id desc),'[]'::jsonb) from recent)) into result;
 return result;
end; $$;
revoke all on function public.save_study_preferences(text,integer),public.own_study_stats(timestamptz) from public,anon;
grant execute on function public.save_study_preferences(text,integer),public.own_study_stats(timestamptz) to authenticated;
commit;
