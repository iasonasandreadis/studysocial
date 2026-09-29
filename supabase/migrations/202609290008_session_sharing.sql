begin;
-- Keep one upload lifecycle implementation; wrap it with verified session metadata.
alter function public.prepare_photo_post(uuid,jsonb,text) set schema private;
revoke all on function private.prepare_photo_post(uuid,jsonb,text) from public,anon,authenticated;
create function public.prepare_photo_post(draft_id uuid,payload jsonb,image_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare linked uuid; verified_subject uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 linked:=nullif(payload->>'session_id','')::uuid;
 if linked is not null then
  select subject_id into verified_subject from public.study_sessions where id=linked and user_id=auth.uid() and status='completed';
  if not found then raise exception 'Completed session unavailable' using errcode='23514'; end if;
  payload:=jsonb_set(payload,'{subject_id}',to_jsonb(coalesce(verified_subject::text,'')));
 end if;
 return private.prepare_photo_post(draft_id,payload,image_hash);
end; $$;
revoke all on function public.prepare_photo_post(uuid,jsonb,text) from public,anon;
grant execute on function public.prepare_photo_post(uuid,jsonb,text) to authenticated;
commit;
