-- Phase 01. Apply through the Supabase CLI; never run against an unrelated database.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.academic_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 2 and 80),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  education_system text not null check (length(education_system) between 1 and 100),
  level_code text not null check (length(level_code) between 1 and 80),
  labels jsonb not null check (jsonb_typeof(labels) = 'object'),
  created_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 2 and 80),
  labels jsonb not null check (jsonb_typeof(labels) = 'object'),
  created_at timestamptz not null default now()
);
create table public.program_subjects (
  program_id uuid references public.academic_programs on delete cascade,
  subject_id uuid references public.subjects on delete cascade,
  primary key (program_id, subject_id)
);
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default 'Student' check (length(trim(display_name)) between 1 and 60),
  bio text not null default '' check (length(bio) <= 300),
  is_private boolean not null default true,
  avatar_path text check (avatar_path ~ ('^' || id::text || '/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Sensitive academic context is never part of a publicly readable profile.
create table public.user_settings (
  user_id uuid primary key references public.profiles on delete cascade,
  program_id uuid references public.academic_programs on delete set null,
  school_id uuid references public.schools on delete set null,
  locale text not null default 'en' check (length(locale) between 2 and 35),
  timezone text not null default 'UTC' check (length(timezone) between 1 and 80),
  weekly_goal_minutes integer check (weekly_goal_minutes between 0 and 10080),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_subjects (
  user_id uuid references public.profiles on delete cascade,
  subject_id uuid references public.subjects on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, subject_id)
);
create table public.blocks (
  blocker_id uuid references public.profiles on delete cascade,
  blocked_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id), check (blocker_id <> blocked_id)
);
create table public.follows (
  follower_id uuid references public.profiles on delete cascade,
  following_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id), check (follower_id <> following_id)
);
create table public.follow_requests (
  requester_id uuid references public.profiles on delete cascade,
  target_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key(requester_id, target_id), check (requester_id <> target_id)
);
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (length(trim(name)) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  visibility text not null default 'private' check (visibility in ('public','private')),
  subject_id uuid references public.subjects on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_members (
  community_id uuid references public.communities on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  role text not null default 'member' check (role in ('member','moderator')),
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(), primary key(community_id,user_id)
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  subject_id uuid references public.subjects on delete set null,
  status text not null default 'active' check (status in ('active','paused','completed','discarded')),
  started_at timestamptz not null default now(),
  paused_at timestamptz, ended_at timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id),
  check ((status = 'paused') = (paused_at is not null)),
  check ((status in ('completed','discarded')) = (ended_at is not null)),
  check ((status = 'completed') = (duration_seconds is not null)),
  check (paused_at is null or paused_at >= started_at),
  check (ended_at is null or ended_at >= started_at),
  check (ended_at is null or paused_seconds <= extract(epoch from ended_at - started_at)),
  check (duration_seconds is null or duration_seconds <= extract(epoch from ended_at - started_at) - paused_seconds)
);
create unique index one_open_session_per_user on public.study_sessions(user_id) where status in ('active','paused');
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  caption text not null default '' check (length(caption) <= 2200),
  audience text not null default 'private' check (audience in ('private','followers','public')),
  subject_id uuid references public.subjects on delete set null,
  community_id uuid references public.communities on delete cascade,
  session_id uuid,
  shared_duration_seconds integer check (shared_duration_seconds between 0 and 86400),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (session_id,author_id) references public.study_sessions(id,user_id) on delete no action,
  unique(session_id), unique(id,author_id)
);
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null, owner_id uuid not null,
  object_path text not null unique,
  position integer not null default 0 check (position between 0 and 9),
  alt_text text not null default '' check (length(alt_text) <= 300),
  created_at timestamptz not null default now(),
  foreign key(post_id,owner_id) references public.posts(id,author_id) on delete cascade,
  unique(post_id,position),
  check (object_path ~ ('^' || owner_id::text || '/' || post_id::text || '/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$'))
);
create table public.post_kudos (
  post_id uuid references public.posts on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles on delete cascade,
  actor_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('follow','follow_request','kudos','comment','community')),
  post_id uuid references public.posts on delete cascade,
  community_id uuid references public.communities on delete cascade,
  event_key text not null check (length(event_key) between 1 and 160),
  read_at timestamptz, created_at timestamptz not null default now(),
  unique(recipient_id,event_key), check (recipient_id <> actor_id)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_user_id uuid references public.profiles on delete cascade,
  target_post_id uuid references public.posts on delete cascade,
  target_comment_id uuid references public.comments on delete cascade,
  reason text not null check (reason in ('harassment','privacy','inappropriate','spam','other')),
  details text not null default '' check (length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending','reviewed','resolved')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(target_user_id,target_post_id,target_comment_id) = 1)
);

-- Reverse lookups and feed / ownership paths; PKs cover the forward direction.
create index program_subjects_subject on public.program_subjects(subject_id);
create index settings_program on public.user_settings(program_id);
create index settings_school on public.user_settings(school_id);
create index user_subjects_subject on public.user_subjects(subject_id);
create index blocks_target on public.blocks(blocked_id);
create index follows_target on public.follows(following_id);
create index requests_target on public.follow_requests(target_id);
create index communities_owner on public.communities(owner_id);
create index communities_subject on public.communities(subject_id);
create index memberships_user on public.community_members(user_id);
create index sessions_user_time on public.study_sessions(user_id,started_at desc);
create index sessions_subject on public.study_sessions(subject_id);
create index posts_author_time on public.posts(author_id,created_at desc,id);
create index posts_community_time on public.posts(community_id,created_at desc,id);
create index posts_subject on public.posts(subject_id);
create index media_owner on public.post_media(owner_id);
create index kudos_user on public.post_kudos(user_id);
create index comments_post_time on public.comments(post_id,created_at,id);
create index comments_author on public.comments(author_id);
create index notifications_recipient_time on public.notifications(recipient_id,created_at desc);
create index notifications_actor on public.notifications(actor_id);
create index notifications_post on public.notifications(post_id);
create index notifications_community on public.notifications(community_id);
create index reports_reporter on public.reports(reporter_id);
create index reports_target_user on public.reports(target_user_id);
create index reports_target_post on public.reports(target_post_id);
create index reports_target_comment on public.reports(target_comment_id);

-- All helper functions run with an empty search_path; the private schema is NOT exposed by the API.
create function private.blocked(other_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.blocks where
    (blocker_id = auth.uid() and blocked_id = other_id) or
    (blocked_id = auth.uid() and blocker_id = other_id));
$$;
create function private.follows_user(other_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.follows where follower_id = auth.uid() and following_id = other_id);
$$;
create function private.can_profile(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles p where p.id = target and
    (p.id = auth.uid() or (not private.blocked(p.id) and (not p.is_private or private.follows_user(p.id)))));
$$;
create function private.member_of(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.communities c where c.id=target
    and not private.blocked(c.owner_id) and (c.owner_id=auth.uid() or exists(
      select 1 from public.community_members m where m.community_id=c.id and m.user_id=auth.uid() and m.status='accepted')));
$$;
create function private.owns_community(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.communities where id=target and owner_id=auth.uid());
$$;
create function private.can_community(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.communities c where c.id=target
    and not private.blocked(c.owner_id) and (c.visibility='public' or private.member_of(c.id)));
$$;
create function private.can_post(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.posts p where p.id=target and
    (p.author_id=auth.uid() or (private.can_profile(p.author_id)
      and (p.audience='public' or (p.audience='followers' and private.follows_user(p.author_id)))
      and (p.community_id is null or private.can_community(p.community_id)))));
$$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end; $$;
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  insert into public.profiles(id) values(new.id);
  insert into public.user_settings(user_id) values(new.id);
  return new;
end; $$;
create trigger create_studysocial_profile after insert on auth.users for each row execute function private.create_profile();
-- Preserve existing identities if this is applied to a project that already has users.
insert into public.profiles(id) select id from auth.users on conflict do nothing;
insert into public.user_settings(user_id) select id from public.profiles on conflict do nothing;

create function private.set_post_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare seconds integer;
begin
  if new.session_id is null then new.shared_duration_seconds=null;
  else
    select duration_seconds into seconds from public.study_sessions
    where id=new.session_id and user_id=new.author_id and status='completed';
    if not found then raise exception 'Only your completed session can be shared' using errcode='23514'; end if;
    new.shared_duration_seconds=seconds;
  end if;
  return new;
end; $$;
create trigger snapshot_post before insert or update of session_id on public.posts
for each row execute function private.set_post_snapshot();

-- Serialize social-edge mutations with blocking so unblock never revives old follows.
create function private.lock_pair(a uuid,b uuid) returns void
language sql volatile set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended(least(a,b)::text || greatest(a,b)::text,0));
$$;
create function private.on_block() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  perform private.lock_pair(new.blocker_id,new.blocked_id);
  delete from public.follows where (follower_id=new.blocker_id and following_id=new.blocked_id)
    or (follower_id=new.blocked_id and following_id=new.blocker_id);
  delete from public.follow_requests where (requester_id=new.blocker_id and target_id=new.blocked_id)
    or (requester_id=new.blocked_id and target_id=new.blocker_id);
  -- Remove membership if either party owns the group; an unblock must not restore access.
  delete from public.community_members m using public.communities c where m.community_id=c.id and
    ((c.owner_id=new.blocker_id and m.user_id=new.blocked_id) or (c.owner_id=new.blocked_id and m.user_id=new.blocker_id));
  return new;
end; $$;
create trigger block_cleanup before insert on public.blocks for each row execute function private.on_block();

-- Explicit RPCs keep acceptance and direct follows out of client-writable tables.
create function public.request_follow(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare private_account boolean;
begin
  if auth.uid() is null or auth.uid()=target then raise exception 'Invalid follow' using errcode='42501'; end if;
  perform private.lock_pair(auth.uid(),target);
  select is_private into private_account from public.profiles where id=target for update;
  if not found or private.blocked(target) then raise exception 'Follow unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.follows where follower_id=auth.uid() and following_id=target) then return; end if;
  if private_account then
    insert into public.follow_requests(requester_id,target_id) values(auth.uid(),target) on conflict do nothing;
  else
    insert into public.follows(follower_id,following_id) values(auth.uid(),target) on conflict do nothing;
    delete from public.follow_requests where requester_id=auth.uid() and target_id=target;
  end if;
end; $$;
create function public.accept_follow(requester uuid) returns void
language plpgsql security definer set search_path = '' as $$ begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform private.lock_pair(auth.uid(),requester);
  if private.blocked(requester) then raise exception 'Follow unavailable' using errcode='42501'; end if;
  delete from public.follow_requests where requester_id=requester and target_id=auth.uid();
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
  insert into public.follows(follower_id,following_id) values(requester,auth.uid()) on conflict do nothing;
end; $$;
create function public.request_membership(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare group_owner uuid; group_visibility text;
begin
  select owner_id,visibility into group_owner,group_visibility from public.communities where id=target;
  if auth.uid() is null or group_owner is null then raise exception 'Membership unavailable' using errcode='42501'; end if;
  perform private.lock_pair(auth.uid(),group_owner);
  if private.blocked(group_owner) then raise exception 'Membership unavailable' using errcode='42501'; end if;
  -- Lock visibility against concurrent changes before deciding automatic acceptance.
  select visibility into group_visibility from public.communities where id=target for update;
  insert into public.community_members(community_id,user_id,status)
    values(target,auth.uid(),case when group_visibility='public' then 'accepted' else 'pending' end) on conflict do nothing;
end; $$;
create function public.accept_membership(target uuid,member uuid) returns void
language plpgsql security definer set search_path = '' as $$ begin
  if not private.owns_community(target) then raise exception 'Owner required' using errcode='42501'; end if;
  perform private.lock_pair(auth.uid(),member);
  if private.blocked(member) then raise exception 'Membership unavailable' using errcode='42501'; end if;
  update public.community_members set status='accepted' where community_id=target and user_id=member;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
end; $$;

-- Rights are explicit. UPDATE grants below exclude IDs, ownership and moderation fields.
-- Revoke permissions only for StudySocial tables.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.blocked(uuid),private.follows_user(uuid),private.can_profile(uuid),
  private.member_of(uuid),private.owns_community(uuid),private.can_community(uuid),private.can_post(uuid) to authenticated;
revoke all on function public.request_follow(uuid),public.accept_follow(uuid),public.request_membership(uuid),public.accept_membership(uuid,uuid) from public,anon;
grant execute on function public.request_follow(uuid),public.accept_follow(uuid),public.request_membership(uuid),public.accept_membership(uuid,uuid) to authenticated;

alter table public.academic_programs enable row level security;
revoke all on public.academic_programs from anon,authenticated;
grant select on public.academic_programs to authenticated;
grant all on public.academic_programs to service_role;
alter table public.subjects enable row level security;
revoke all on public.subjects from anon,authenticated;
grant select on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.program_subjects enable row level security;
revoke all on public.program_subjects from anon,authenticated;
grant select on public.program_subjects to authenticated;
grant all on public.program_subjects to service_role;
alter table public.schools enable row level security;
revoke all on public.schools from anon,authenticated;
grant select on public.schools to authenticated;
grant all on public.schools to service_role;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon,authenticated;
grant select on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_subjects enable row level security;
revoke all on public.user_subjects from anon,authenticated;
grant select on public.user_subjects to authenticated;
grant all on public.user_subjects to service_role;
alter table public.blocks enable row level security;
revoke all on public.blocks from anon,authenticated;
grant select on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.follows enable row level security;
revoke all on public.follows from anon,authenticated;
grant select on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follow_requests enable row level security;
revoke all on public.follow_requests from anon,authenticated;
grant select on public.follow_requests to authenticated;
grant all on public.follow_requests to service_role;
alter table public.communities enable row level security;
revoke all on public.communities from anon,authenticated;
grant select on public.communities to authenticated;
grant all on public.communities to service_role;
alter table public.community_members enable row level security;
revoke all on public.community_members from anon,authenticated;
grant select on public.community_members to authenticated;
grant all on public.community_members to service_role;
alter table public.study_sessions enable row level security;
revoke all on public.study_sessions from anon,authenticated;
grant select on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;
alter table public.posts enable row level security;
revoke all on public.posts from anon,authenticated;
grant select on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.post_media enable row level security;
revoke all on public.post_media from anon,authenticated;
grant select on public.post_media to authenticated;
grant all on public.post_media to service_role;
alter table public.post_kudos enable row level security;
revoke all on public.post_kudos from anon,authenticated;
grant select on public.post_kudos to authenticated;
grant all on public.post_kudos to service_role;
alter table public.comments enable row level security;
revoke all on public.comments from anon,authenticated;
grant select on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant select on public.reports to authenticated;
grant all on public.reports to service_role;
create trigger touch_updated_at before update on public.profiles for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.user_settings for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.communities for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.study_sessions for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.posts for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.comments for each row execute function private.touch_updated_at();
create policy academic_programs_select on public.academic_programs for select to authenticated using (true);
create policy subjects_select on public.subjects for select to authenticated using (true);
create policy program_subjects_select on public.program_subjects for select to authenticated using (true);
create policy schools_select on public.schools for select to authenticated using (true);
create policy profiles_select on public.profiles for select to authenticated using (private.can_profile(id));
grant update (handle,display_name,bio,is_private,avatar_path) on public.profiles to authenticated;
create policy profiles_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy user_settings_select on public.user_settings for select to authenticated using (user_id=auth.uid());
grant update (program_id,school_id,locale,timezone,weekly_goal_minutes,onboarding_completed_at) on public.user_settings to authenticated;
create policy user_settings_update on public.user_settings for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy user_subjects_select on public.user_subjects for select to authenticated using (user_id=auth.uid());
grant insert (user_id,subject_id) on public.user_subjects to authenticated;
grant delete on public.user_subjects to authenticated;
create policy user_subjects_insert on public.user_subjects for insert to authenticated with check (user_id=auth.uid());
create policy user_subjects_delete on public.user_subjects for delete to authenticated using (user_id=auth.uid());
create policy blocks_select on public.blocks for select to authenticated using (blocker_id=auth.uid());
grant insert (blocker_id,blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker_id=auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id=auth.uid());
create policy follows_select on public.follows for select to authenticated using ((auth.uid() in (follower_id,following_id)) and not private.blocked(case when follower_id=auth.uid() then following_id else follower_id end));
grant delete on public.follows to authenticated;
create policy follows_delete on public.follows for delete to authenticated using (auth.uid() in (follower_id,following_id));
create policy follow_requests_select on public.follow_requests for select to authenticated using ((auth.uid() in (requester_id,target_id)) and not private.blocked(case when requester_id=auth.uid() then target_id else requester_id end));
grant delete on public.follow_requests to authenticated;
create policy follow_requests_delete on public.follow_requests for delete to authenticated using (auth.uid() in (requester_id,target_id));
create policy communities_select on public.communities for select to authenticated using (private.can_community(id));
grant insert (id,owner_id,slug,name,description,visibility,subject_id) on public.communities to authenticated;
grant update (slug,name,description,visibility,subject_id) on public.communities to authenticated;
grant delete on public.communities to authenticated;
create policy communities_insert on public.communities for insert to authenticated with check (owner_id=auth.uid());
create policy communities_update on public.communities for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy communities_delete on public.communities for delete to authenticated using (owner_id=auth.uid());
create policy community_members_select on public.community_members for select to authenticated using ((user_id=auth.uid() or private.owns_community(community_id) or (status='accepted' and private.member_of(community_id))) and not private.blocked(user_id));
grant delete on public.community_members to authenticated;
create policy community_members_delete on public.community_members for delete to authenticated using (user_id=auth.uid() or private.owns_community(community_id));
grant insert (id,user_id,subject_id,status,started_at,paused_at,ended_at,paused_seconds,duration_seconds,notes) on public.study_sessions to authenticated;
grant update (subject_id,status,started_at,paused_at,ended_at,paused_seconds,duration_seconds,notes) on public.study_sessions to authenticated;
grant delete on public.study_sessions to authenticated;
create policy study_sessions_select on public.study_sessions for select to authenticated using (user_id=auth.uid());
create policy study_sessions_insert on public.study_sessions for insert to authenticated with check (user_id=auth.uid());
create policy study_sessions_update on public.study_sessions for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy study_sessions_delete on public.study_sessions for delete to authenticated using (user_id=auth.uid());
create policy posts_select on public.posts for select to authenticated using (private.can_post(id));
grant insert (id,author_id,caption,audience,subject_id,community_id,session_id) on public.posts to authenticated;
grant update (caption,audience,subject_id,session_id) on public.posts to authenticated;
grant delete on public.posts to authenticated;
create policy posts_insert on public.posts for insert to authenticated with check (author_id=auth.uid() and (community_id is null or private.member_of(community_id)));
create policy posts_update on public.posts for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid() and (community_id is null or private.member_of(community_id)));
create policy posts_delete on public.posts for delete to authenticated using (author_id=auth.uid());
create policy post_media_select on public.post_media for select to authenticated using (private.can_post(post_id));
grant insert (id,post_id,owner_id,object_path,position,alt_text) on public.post_media to authenticated;
grant update (alt_text) on public.post_media to authenticated;
grant delete on public.post_media to authenticated;
create policy post_media_insert on public.post_media for insert to authenticated with check (owner_id=auth.uid());
create policy post_media_update on public.post_media for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy post_media_delete on public.post_media for delete to authenticated using (owner_id=auth.uid());
create policy post_kudos_select on public.post_kudos for select to authenticated using (private.can_post(post_id) and not private.blocked(user_id));
grant insert (post_id,user_id) on public.post_kudos to authenticated;
grant delete on public.post_kudos to authenticated;
create policy post_kudos_insert on public.post_kudos for insert to authenticated with check (user_id=auth.uid() and private.can_post(post_id));
create policy post_kudos_delete on public.post_kudos for delete to authenticated using (user_id=auth.uid());
create policy comments_select on public.comments for select to authenticated using (private.can_post(post_id) and not private.blocked(author_id));
grant insert (id,post_id,author_id,body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;
create policy comments_insert on public.comments for insert to authenticated with check (author_id=auth.uid() and private.can_post(post_id));
create policy comments_update on public.comments for update to authenticated using (author_id=auth.uid() and private.can_post(post_id)) with check (author_id=auth.uid() and private.can_post(post_id));
create policy comments_delete on public.comments for delete to authenticated using (author_id=auth.uid());
create policy notifications_select on public.notifications for select to authenticated using (recipient_id=auth.uid() and not private.blocked(actor_id) and (post_id is null or private.can_post(post_id)) and (community_id is null or private.can_community(community_id)));
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
create policy notifications_update on public.notifications for update to authenticated using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (recipient_id=auth.uid());
grant insert (id,reporter_id,target_user_id,target_post_id,target_comment_id,reason,details) on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id=auth.uid() and ((target_user_id is not null and private.can_profile(target_user_id)) or (target_post_id is not null and private.can_post(target_post_id)) or (target_comment_id is not null and exists(select 1 from public.comments c where c.id=target_comment_id))));
commit;
