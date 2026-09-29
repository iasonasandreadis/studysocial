begin;
-- Free-text academic fields remain owner-only; custom schools never enter the public catalog.
alter table public.user_settings
  add column academic_year text not null default '' check (length(academic_year) <= 80),
  add column academic_direction text not null default '' check (length(academic_direction) <= 100),
  add column target_university text not null default '' check (length(target_university) <= 160),
  add column target_program text not null default '' check (length(target_program) <= 160),
  add column goal_text text not null default '' check (length(goal_text) <= 300),
  add column school_name text not null default '' check (length(school_name) <= 160),
  add column onboarding_step integer not null default 1 check (onboarding_step between 1 and 3),
  add constraint school_choice_exclusive check (school_id is null or school_name='');
revoke update(onboarding_completed_at) on public.user_settings from authenticated;

-- One transaction per step prevents partial profiles/settings/subject selections.
create function public.save_onboarding(step integer, payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); saved public.user_settings; selected_subjects uuid[];
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if step not between 1 and 3 or step is null or payload is null or jsonb_typeof(payload)<>'object'
    or pg_column_size(payload)>16384 then raise exception 'Invalid onboarding data' using errcode='23514'; end if;
  select * into saved from public.user_settings where user_id=uid for update;
  if not found or step>saved.onboarding_step then raise exception 'Complete the previous step first' using errcode='23514'; end if;
  if step=1 then
    if nullif(trim(payload->>'display_name'),'') is null or nullif(trim(payload->>'handle'),'') is null
      then raise exception 'Name and username required' using errcode='23514'; end if;
    update public.profiles set display_name=trim(payload->>'display_name'),
      handle=lower(trim(payload->>'handle')),bio=coalesce(trim(payload->>'bio'),'') where id=uid;
    update public.user_settings set onboarding_step=greatest(onboarding_step,2) where user_id=uid;
  elsif step=2 then
    if nullif(trim(payload->>'academic_year'),'') is null then raise exception 'Academic year required' using errcode='23514'; end if;
    if jsonb_typeof(payload->'subjects') is distinct from 'array' or jsonb_array_length(payload->'subjects')>30
      then raise exception 'Invalid subjects' using errcode='23514'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) into selected_subjects
      from jsonb_array_elements_text(payload->'subjects');
    update public.user_settings set
      academic_year=trim(payload->>'academic_year'), academic_direction=coalesce(trim(payload->>'academic_direction'),''),
      program_id=nullif(payload->>'program_id','')::uuid,
      target_university=coalesce(trim(payload->>'target_university'),''),target_program=coalesce(trim(payload->>'target_program'),''),
      goal_text=coalesce(trim(payload->>'goal_text'),''),
      school_id=nullif(payload->>'school_id','')::uuid,school_name=coalesce(trim(payload->>'school_name'),''),
      onboarding_step=greatest(onboarding_step,3)
    where user_id=uid;
    delete from public.user_subjects where user_id=uid;
    insert into public.user_subjects(user_id,subject_id) select uid,unnest(selected_subjects);
  else
    if jsonb_typeof(payload->'is_private') is distinct from 'boolean' then raise exception 'Choose visibility' using errcode='23514'; end if;
    if saved.academic_year='' or not exists(select 1 from public.profiles where id=uid and handle is not null)
      then raise exception 'Complete your details first' using errcode='23514'; end if;
    update public.profiles set is_private=(payload->>'is_private')::boolean where id=uid;
    update public.user_settings set onboarding_completed_at=coalesce(onboarding_completed_at,now()) where user_id=uid;
  end if;
end; $$;
revoke all on function public.save_onboarding(integer,jsonb) from public,anon;
grant execute on function public.save_onboarding(integer,jsonb) to authenticated;
commit;
