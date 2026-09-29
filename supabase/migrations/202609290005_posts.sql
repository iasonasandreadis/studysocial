begin;
alter table public.posts
  add column publication_state text not null default 'published' check (publication_state in ('draft','published','deleting')),
  add column show_duration boolean not null default true,
  add column manual_duration_seconds integer check (manual_duration_seconds between 60 and 86400);
alter table public.posts alter column publication_state set default 'draft';
create unique index one_image_per_post on public.post_media(post_id);

-- Only the owner may see unpublished/deleting rows, including through media policies.
create or replace function private.can_post(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.posts p where p.id=target and
 (p.author_id=auth.uid() or (p.publication_state='published' and private.can_profile(p.author_id)
 and (p.audience='public' or (p.audience='followers' and private.follows_user(p.author_id)))
 and (p.community_id is null or private.can_community(p.community_id)))));
$$;
create or replace function private.set_post_snapshot() returns trigger
language plpgsql security definer set search_path='' as $$
declare seconds integer;
begin
 if new.session_id is not null then
  select duration_seconds into seconds from public.study_sessions where id=new.session_id and user_id=new.author_id and status='completed';
  if not found then raise exception 'Only your completed session can be shared' using errcode='23514'; end if;
 else seconds:=new.manual_duration_seconds;
 end if;
 new.shared_duration_seconds:=case when new.show_duration then seconds else null end;
 return new;
end; $$;
drop trigger snapshot_post on public.posts;
create trigger snapshot_post before insert or update of session_id,show_duration,manual_duration_seconds on public.posts for each row execute function private.set_post_snapshot();

-- Close direct data mutation paths: lifecycle RPCs preserve upload/deletion ordering.
revoke insert(id,author_id,caption,audience,subject_id,community_id,session_id),update(caption,audience,subject_id,session_id),delete on public.posts from authenticated;
revoke insert(id,post_id,owner_id,object_path,position,alt_text),update(alt_text),delete on public.post_media from authenticated;

create function public.prepare_photo_post(draft_id uuid,payload jsonb,image_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p public.posts; path text; existing_path text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if draft_id is null or image_hash is null or image_hash !~ '^[0-9a-f]{64}$' or payload is null or jsonb_typeof(payload)<>'object' or pg_column_size(payload)>10000
  or jsonb_typeof(payload->'show_duration') is distinct from 'boolean'
  or coalesce(payload->>'audience','') not in ('private','followers','public') then raise exception 'Invalid post' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(draft_id::text,0));
 select * into p from public.posts where id=draft_id for update;
 if found then
  if p.author_id<>uid then raise exception 'Post unavailable' using errcode='42501'; end if;
  if p.publication_state='deleting' then raise exception 'Finish deleting this post first' using errcode='23514'; end if;
  if p.publication_state='published' then return jsonb_build_object('state','published'); end if;
 end if;
 path:=uid::text || '/' || draft_id::text || '/' || image_hash || '.webp';
 select m.object_path into existing_path from public.post_media m where m.post_id=draft_id;
 if existing_path is not null and existing_path<>path then raise exception 'Retry with the original image or discard this draft' using errcode='23514'; end if;
 insert into public.posts(id,author_id,caption,subject_id,session_id,audience,publication_state,show_duration,manual_duration_seconds)
 values(draft_id,uid,coalesce(payload->>'caption',''),nullif(payload->>'subject_id','')::uuid,nullif(payload->>'session_id','')::uuid,payload->>'audience','draft',(payload->>'show_duration')::boolean,nullif(payload->>'manual_duration_seconds','')::integer)
 on conflict(id) do update set caption=excluded.caption,subject_id=excluded.subject_id,session_id=excluded.session_id,audience=excluded.audience,show_duration=excluded.show_duration,manual_duration_seconds=excluded.manual_duration_seconds;
 insert into public.post_media(post_id,owner_id,object_path,alt_text) values(draft_id,uid,path,coalesce(payload->>'alt_text',''))
 on conflict(post_id) do update set alt_text=excluded.alt_text;
 return jsonb_build_object('state','draft','path',path);
end; $$;
create function public.publish_photo_post(target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p public.posts;
begin
 select * into p from public.posts where id=target and author_id=auth.uid() for update;
 if not found or p.publication_state='deleting' then raise exception 'Post unavailable' using errcode='42501'; end if;
 if p.publication_state='published' then return; end if;
 if not exists(select 1 from public.post_media m join storage.objects o on o.bucket_id='post-images' and o.name=m.object_path
   where m.post_id=target and m.owner_id=auth.uid() and o.owner_id=auth.uid()::text)
 then raise exception 'Upload the image before publishing' using errcode='23514'; end if;
 update public.posts set publication_state='published',created_at=now() where id=target;
end; $$;
create function public.begin_post_deletion(target uuid) returns text
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 perform 1 from public.posts where id=target and author_id=auth.uid() for update;
 if not found then raise exception 'Post unavailable' using errcode='42501'; end if;
 update public.posts set publication_state='deleting' where id=target;
 select object_path into path from public.post_media where post_id=target;
 return path;
end; $$;
create function public.finish_post_deletion(target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.posts where id=target and author_id=auth.uid() and publication_state='deleting' for update;
 if not found then raise exception 'Post unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.post_media m join storage.objects o on o.bucket_id='post-images' and o.name=m.object_path where m.post_id=target)
 then raise exception 'Remove the stored image first' using errcode='23514'; end if;
 delete from public.posts where id=target;
end; $$;
revoke all on function public.prepare_photo_post(uuid,jsonb,text),public.publish_photo_post(uuid),public.begin_post_deletion(uuid),public.finish_post_deletion(uuid) from public,anon;
grant execute on function public.prepare_photo_post(uuid,jsonb,text),public.publish_photo_post(uuid),public.begin_post_deletion(uuid),public.finish_post_deletion(uuid) to authenticated;

-- Serialize metadata insertion with the post lifecycle row lock. An upload that
-- reaches the database after deletion begins cannot recreate an abandoned object.
create function private.can_upload_post_asset(path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare state text;
begin
 select p.publication_state into state from public.posts p join public.post_media m on m.post_id=p.id
 where m.object_path=path and p.author_id=auth.uid() and m.owner_id=auth.uid() for update of p;
 return coalesce(state='draft',false);
end; $$;
revoke all on function private.can_upload_post_asset(text) from public,anon;
grant execute on function private.can_upload_post_asset(text) to authenticated;

drop policy studysocial_asset_insert on storage.objects;
create policy studysocial_asset_insert on storage.objects for insert to authenticated with check (
 owner_id=auth.uid()::text and (
  (bucket_id='avatars' and name ~ ('^' || auth.uid()::text || '/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$')) or
  (bucket_id='post-images' and private.can_upload_post_asset(name))
 ));
commit;
