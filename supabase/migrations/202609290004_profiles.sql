begin;
alter table public.user_settings
  add column share_year boolean not null default false,
  add column share_direction boolean not null default false,
  add column share_subjects boolean not null default false,
  add column share_goal boolean not null default false,
  add column share_target boolean not null default false;

-- The same filter powers counts and lists. Owners can identify their own private
-- connections by handle. Other viewers see only connections whose profiles they may read.
create function private.visible_connections(target uuid, direction text)
returns table(id uuid, handle text, display_name text)
language sql stable security definer set search_path='' as $$
  select p.id,p.handle,case when private.can_profile(p.id) then p.display_name else null end
  from public.follows f join public.profiles p on p.id=case when direction='followers' then f.follower_id else f.following_id end
  where auth.uid() is not null and direction in ('followers','following')
    and private.can_profile(target)
    and case when direction='followers' then f.following_id=target else f.follower_id=target end
    and p.handle is not null and not private.blocked(p.id)
    and (target=auth.uid() or private.can_profile(p.id));
$$;
revoke all on function private.visible_connections(uuid,text) from public,anon,authenticated;

create function public.social_profile(username text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; s public.user_settings; result jsonb; can_view boolean;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.profiles where handle=lower(username);
  if not found or private.blocked(p.id) then return null; end if;
  can_view:=private.can_profile(p.id);
  result:=jsonb_build_object('id',p.id,'handle',p.handle,'is_private',p.is_private,'can_view',can_view,'is_self',p.id=auth.uid(),
    'relationship',case when private.follows_user(p.id) then 'following' when exists(select 1 from public.follow_requests where requester_id=auth.uid() and target_id=p.id) then 'requested' else 'none' end);
  -- Only the known handle and relationship state are discoverable for locked profiles.
  if not can_view then return result; end if;
  select * into s from public.user_settings where user_id=p.id;
  result:=result || jsonb_build_object('display_name',p.display_name,'bio',p.bio,'avatar_path',p.avatar_path,
    'followers',(select count(*) from private.visible_connections(p.id,'followers')),
    'following',(select count(*) from private.visible_connections(p.id,'following')),
    'academic_year',case when s.share_year then s.academic_year else null end,
    'academic_direction',case when s.share_direction then s.academic_direction else null end,
    'goal_text',case when s.share_goal then s.goal_text else null end,
    'target_university',case when s.share_target then s.target_university else null end,
    'target_program',case when s.share_target then s.target_program else null end,
    'subjects',case when s.share_subjects then coalesce((select jsonb_agg(subject.labels order by subject.code)
      from public.user_subjects us join public.subjects subject on subject.id=us.subject_id where us.user_id=p.id),'[]'::jsonb) else '[]'::jsonb end);
  if p.id=auth.uid() then
    result:=result || jsonb_build_object('study_seconds',(select coalesce(sum(duration_seconds),0) from public.study_sessions where user_id=p.id and status='completed'),
      'study_sessions',(select count(*) from public.study_sessions where user_id=p.id and status='completed'));
  end if;
  return result;
end; $$;
create function public.social_connections(username text,direction text,page integer default 0)
returns table(id uuid,handle text,display_name text)
language sql stable security definer set search_path='' as $$
  select c.* from public.profiles p cross join lateral private.visible_connections(p.id,direction) c
  where p.handle=lower(username) and page between 0 and 10000
  order by c.handle,c.id limit 20 offset (least(greatest(coalesce(page,0),0),10000)*20);
$$;
create function public.incoming_follow_requests(page integer default 0)
returns table(id uuid,handle text,display_name text)
language sql stable security definer set search_path='' as $$
  select p.id,p.handle,case when private.can_profile(p.id) then p.display_name else null end
  from public.follow_requests r join public.profiles p on p.id=r.requester_id
  where r.target_id=auth.uid() and p.handle is not null and not private.blocked(p.id) and page between 0 and 10000
  order by p.handle,p.id limit 20 offset (least(greatest(coalesce(page,0),0),10000)*20);
$$;
create function public.change_follow(action text,target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null or auth.uid()=target or target is null then raise exception 'Invalid relationship' using errcode='42501'; end if;
  perform private.lock_pair(auth.uid(),target);
  case action
    when 'follow' then perform public.request_follow(target);
    when 'accept' then perform public.accept_follow(target);
    when 'unfollow' then delete from public.follows where follower_id=auth.uid() and following_id=target;
    when 'remove' then delete from public.follows where follower_id=target and following_id=auth.uid();
    when 'cancel' then delete from public.follow_requests where requester_id=auth.uid() and target_id=target;
    when 'reject' then delete from public.follow_requests where requester_id=target and target_id=auth.uid();
    else raise exception 'Invalid relationship action' using errcode='23514';
  end case;
end; $$;
create function public.edit_social_profile(payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); field text; selected_subjects uuid[];
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if payload is null or jsonb_typeof(payload)<>'object' or pg_column_size(payload)>16384 then raise exception 'Invalid profile' using errcode='23514'; end if;
  perform 1 from public.user_settings where user_id=uid and onboarding_completed_at is not null for update;
  if not found then raise exception 'Finish onboarding' using errcode='42501'; end if;
  if nullif(trim(payload->>'display_name'),'') is null or nullif(trim(payload->>'handle'),'') is null or nullif(trim(payload->>'academic_year'),'') is null then raise exception 'Required fields missing' using errcode='23514'; end if;
  foreach field in array array['is_private','share_year','share_direction','share_subjects','share_goal','share_target'] loop
    if jsonb_typeof(payload->field) is distinct from 'boolean' then raise exception 'Invalid visibility choice' using errcode='23514'; end if;
  end loop;
  if jsonb_typeof(payload->'subjects') is distinct from 'array' or jsonb_array_length(payload->'subjects')>30 then raise exception 'Invalid subjects' using errcode='23514'; end if;
  select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) into selected_subjects from jsonb_array_elements_text(payload->'subjects');
  update public.profiles set display_name=trim(payload->>'display_name'),handle=lower(trim(payload->>'handle')),
    bio=coalesce(trim(payload->>'bio'),''),is_private=(payload->>'is_private')::boolean where id=uid;
  update public.user_settings set academic_year=trim(payload->>'academic_year'),academic_direction=coalesce(trim(payload->>'academic_direction'),''),
    goal_text=coalesce(trim(payload->>'goal_text'),''),target_university=coalesce(trim(payload->>'target_university'),''),target_program=coalesce(trim(payload->>'target_program'),''),
    share_year=(payload->>'share_year')::boolean,share_direction=(payload->>'share_direction')::boolean,
    share_subjects=(payload->>'share_subjects')::boolean,share_goal=(payload->>'share_goal')::boolean,share_target=(payload->>'share_target')::boolean where user_id=uid;
  delete from public.user_subjects where user_id=uid;
  insert into public.user_subjects(user_id,subject_id) select uid,unnest(selected_subjects);
end; $$;
revoke all on function public.social_profile(text),public.social_connections(text,text,integer),public.incoming_follow_requests(integer),public.change_follow(text,uuid),public.edit_social_profile(jsonb) from public,anon;
grant execute on function public.social_profile(text),public.social_connections(text,text,integer),public.incoming_follow_requests(integer),public.change_follow(text,uuid),public.edit_social_profile(jsonb) to authenticated;
commit;
