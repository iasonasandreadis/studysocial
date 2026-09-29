begin;
alter table public.study_sessions add column active_seconds numeric not null default 0 check(active_seconds>=0), add column running_since timestamptz, add column version integer not null default 0;
update public.study_sessions set active_seconds=case when status='completed' then duration_seconds when status='paused' then greatest(0,extract(epoch from paused_at-started_at)-paused_seconds) else 0 end,
 running_since=case when status='active' then started_at+paused_seconds*interval '1 second' else null end;
alter table public.study_sessions add constraint running_session_state check((status='active')=(running_since is not null));
revoke insert(id,user_id,subject_id,status,started_at,paused_at,ended_at,paused_seconds,duration_seconds,notes),update(subject_id,status,started_at,paused_at,ended_at,paused_seconds,duration_seconds,notes),delete on public.study_sessions from authenticated;

create function public.timer_snapshot() returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('server_now',clock_timestamp(),'session',(select to_jsonb(s) from public.study_sessions s where user_id=auth.uid() and status in ('active','paused') limit 1));
$$;
create function public.start_study_session(request_id uuid,subject uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.study_sessions; stamp timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if request_id is null or subject is null then raise exception 'Choose a subject' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended('timer:'||auth.uid()::text,0));
 select * into s from public.study_sessions where id=request_id;
 if found then
  if s.user_id<>auth.uid() then raise exception 'Session unavailable' using errcode='42501'; end if;
 else
  select * into s from public.study_sessions where user_id=auth.uid() and status in ('active','paused');
  if not found then
   stamp:=clock_timestamp();
   insert into public.study_sessions(id,user_id,subject_id,started_at,running_since) values(request_id,auth.uid(),subject,stamp,stamp) returning * into s;
  end if;
 end if;
 return jsonb_build_object('session',to_jsonb(s),'server_now',clock_timestamp());
end; $$;
create function public.change_study_session(target uuid,operation text,expected_version integer,note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.study_sessions; stamp timestamptz; active numeric; seconds integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into s from public.study_sessions where id=target and user_id=auth.uid() for update;
 if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
 if operation is null or operation not in ('pause','resume','finish','discard','note') or length(note)>2000 then raise exception 'Invalid session change' using errcode='23514'; end if;
 if (s.status='completed' and operation='finish') or (s.status='discarded' and operation='discard') then
 return jsonb_build_object('session',to_jsonb(s),'server_now',clock_timestamp()); end if;
 if s.status not in ('active','paused') then raise exception 'Session already ended' using errcode='23514'; end if;
 if expected_version is distinct from s.version then raise exception 'Session changed in another tab. Refresh and retry.' using errcode='40001'; end if;
 stamp:=greatest(clock_timestamp(),s.started_at,coalesce(s.running_since,s.started_at),coalesce(s.paused_at,s.started_at));
 active:=s.active_seconds+case when s.status='active' then greatest(0,extract(epoch from stamp-s.running_since)) else 0 end;
 seconds:=least(86400,floor(active))::integer;
 if operation='pause' and s.status='active' then
  update public.study_sessions set status='paused',paused_at=stamp,running_since=null,active_seconds=active,version=version+1 where id=target returning * into s;
 elsif operation='resume' and s.status='paused' then
  update public.study_sessions set status='active',paused_at=null,running_since=stamp,version=version+1 where id=target returning * into s;
 elsif operation in ('finish','discard') then
  update public.study_sessions set status=case when operation='finish' then 'completed' else 'discarded' end,
   ended_at=stamp,paused_at=null,running_since=null,active_seconds=active,
   paused_seconds=greatest(0,floor(extract(epoch from stamp-started_at)-active)::integer),
   duration_seconds=case when operation='finish' then seconds else null end,
   notes=coalesce(note,notes),version=version+1 where id=target returning * into s;
 elsif operation='note' then
  update public.study_sessions set notes=coalesce(note,notes),version=version+1 where id=target returning * into s;
 else raise exception 'Timer state changed. Refresh and retry.' using errcode='40001';
 end if;
 return jsonb_build_object('session',to_jsonb(s),'server_now',clock_timestamp());
end; $$;
revoke all on function public.timer_snapshot(),public.start_study_session(uuid,uuid),public.change_study_session(uuid,text,integer,text) from public,anon;
grant execute on function public.timer_snapshot(),public.start_study_session(uuid,uuid),public.change_study_session(uuid,text,integer,text) to authenticated;
commit;
