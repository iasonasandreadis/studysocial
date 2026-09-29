begin;
-- Bucket limits are defense in depth; the later upload pipeline must decode/re-encode
-- photos to verify content and strip EXIF. SVG/HTML/GIF are deliberately excluded.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp']),
       ('post-images','post-images',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function private.can_read_asset(bucket text,path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
   (bucket='avatars' and exists(select 1 from public.profiles p where p.avatar_path=path and private.can_profile(p.id))) or
   (bucket='post-images' and exists(select 1 from public.post_media m where m.object_path=path and private.can_post(m.post_id)))
 );
$$;
revoke all on function private.can_read_asset(text,text) from public,anon;
grant execute on function private.can_read_asset(text,text) to authenticated;

-- Supabase enables RLS on storage.objects. These policies do not permit UPDATE/upsert.
-- Ownership is bound both to Auth's owner_id and to a canonical user-ID path.
create policy studysocial_asset_read on storage.objects for select to authenticated using (
  (bucket_id in ('avatars','post-images') and owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text)
  or private.can_read_asset(bucket_id,name)
);
create policy studysocial_asset_insert on storage.objects for insert to authenticated with check (
  owner_id=auth.uid()::text and (
    (bucket_id='avatars' and name ~ ('^' || auth.uid()::text || '/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$')) or
    (bucket_id='post-images' and exists(select 1 from public.post_media m
      where m.object_path=name and m.owner_id=auth.uid()))
  )
);
create policy studysocial_asset_delete on storage.objects for delete to authenticated using (
  bucket_id in ('avatars','post-images') and owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text
);
commit;
