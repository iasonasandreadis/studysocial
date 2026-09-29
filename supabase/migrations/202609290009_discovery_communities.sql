begin;
alter table public.user_settings add column share_school boolean not null default false;
grant update(share_school) on public.user_settings to authenticated;
alter table public.communities add column kind text not null default 'school' check(kind in ('school','university','subject','exam','goal','group')), add column school_id uuid references public.schools on delete set null;
grant insert(kind,school_id),update(kind,school_id) on public.communities to authenticated;

create function public.discover_students(term text default '',section text default 'search',page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; own public.user_settings;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if term is null or length(term)>80 or section is null or section not in ('search','similar','subjects','goal','school') or page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid discovery request' using errcode='23514'; end if;
 select * into own from public.user_settings where user_id=auth.uid();
 select coalesce(jsonb_agg(to_jsonb(q) order by q.handle),'[]'::jsonb) into result from (
 select p.id,p.handle,p.is_private,case when private.can_profile(p.id) then p.display_name else null end as display_name
 from public.profiles p join public.user_settings s on s.user_id=p.id
 where p.id<>auth.uid() and p.handle is not null and not private.blocked(p.id)
 and (section='search' or (private.can_profile(p.id) and (
  (section='similar' and s.share_year and own.academic_year<>'' and s.academic_year=own.academic_year and (not s.share_direction or s.academic_direction=own.academic_direction)) or
  (section='subjects' and s.share_subjects and exists(select 1 from public.user_subjects a join public.user_subjects b on b.subject_id=a.subject_id where a.user_id=auth.uid() and b.user_id=p.id)) or
  (section='goal' and s.share_target and own.target_university<>'' and lower(s.target_university)=lower(own.target_university)) or
  (section='school' and s.share_school and ((own.school_id is not null and s.school_id=own.school_id) or (own.school_id is null and own.school_name<>'' and lower(s.school_name)=lower(own.school_name))))
 )))
 and (term='' or strpos(lower(p.handle),lower(term))>0 or (private.can_profile(p.id) and (
 strpos(lower(p.display_name),lower(term))>0 or (s.share_target and strpos(lower(s.target_university||' '||s.target_program),lower(term))>0) or (s.share_goal and strpos(lower(s.goal_text),lower(term))>0) or (s.share_school and (strpos(lower(s.school_name),lower(term))>0 or exists(select 1 from public.schools sc where sc.id=s.school_id and strpos(lower(sc.name),lower(term))>0))) or (s.share_subjects and exists(select 1 from public.user_subjects us join public.subjects sub on sub.id=us.subject_id where us.user_id=p.id and strpos(lower(sub.labels::text),lower(term))>0)))))
 order by p.handle limit 21 offset page_number*20
 ) q;return result;
end; $$;
create function public.community_info(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.communities; allowed boolean; pending boolean;
begin
 if auth.uid() is null then return null; end if;
 select * into c from public.communities where id=target and not private.blocked(owner_id);
 if not found then return null; end if;
 allowed:=private.can_community(target);
 pending:=exists(select 1 from public.community_members where community_id=target and user_id=auth.uid() and status='pending');
 return jsonb_build_object('id',c.id,'can_view',allowed,'own',c.owner_id=auth.uid(),'member',private.member_of(target),'pending',pending,'visibility',c.visibility,
 'name',case when allowed then c.name else 'Private community' end,'description',case when allowed then c.description else null end,'kind',case when allowed then c.kind else null end);
end; $$;
create function public.community_people(target uuid,page_number integer default 0,pending_only boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.member_of(target) or (pending_only and not private.owns_community(target)) then return null; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.handle),'[]'::jsonb) into result from (
 select p.id,p.handle,case when private.can_profile(p.id) then p.display_name else null end as display_name
 from public.profiles p where not private.blocked(p.id) and (
 exists(select 1 from public.community_members m where m.community_id=target and m.user_id=p.id and m.status=case when pending_only then 'pending' else 'accepted' end)
 or (not pending_only and exists(select 1 from public.communities c where c.id=target and c.owner_id=p.id)))
 order by p.handle limit 21 offset page_number*20
 ) q;return result;
end; $$;
create function public.posting_communities() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by q.name),'[]'::jsonb) from (select id,name from public.communities where private.member_of(id) order by name,id limit 100) q;
$$;
create function public.community_feed(target uuid,page_number integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 if not private.can_community(target) then return null; end if;
 with page as (select * from public.posts where community_id=target and publication_state='published' and audience<>'private' order by created_at desc,id desc limit 21 offset page_number*20)
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'author_id',p.author_id,'handle',a.handle,'display_name',a.display_name,'caption',p.caption,'created_at',p.created_at,'subject',s.labels,'shared_duration_seconds',p.shared_duration_seconds,'image_path',m.object_path,'alt_text',m.alt_text,'activity',public.post_activity(p.id),'reason','Community study moment') order by p.created_at desc,p.id desc),'[]'::jsonb) into result
 from page p join public.profiles a on a.id=p.author_id left join public.subjects s on s.id=p.subject_id left join public.post_media m on m.post_id=p.id;return result;
end; $$;
create function public.popular_community_posts() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by q.engagement desc,q.created_at desc,q.id),'[]'::jsonb) from (
 select p.id,p.caption,p.created_at,(select count(*) from public.post_kudos k where k.post_id=p.id) as engagement
 from public.posts p where p.community_id is not null and private.member_of(p.community_id) and p.publication_state='published' and p.audience<>'private'
 order by engagement desc,p.created_at desc,p.id limit 6) q;
$$;
create or replace function public.prepare_photo_post(draft_id uuid,payload jsonb,image_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare linked uuid; verified_subject uuid; group_id uuid; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 linked:=nullif(payload->>'session_id','')::uuid;group_id:=nullif(payload->>'community_id','')::uuid;
 if group_id is not null and not private.member_of(group_id) then raise exception 'Join this community before posting' using errcode='42501'; end if;
 if linked is not null then
  select subject_id into verified_subject from public.study_sessions where id=linked and user_id=auth.uid() and status='completed';
  if not found then raise exception 'Completed session unavailable' using errcode='23514'; end if;
  payload:=jsonb_set(payload,'{subject_id}',to_jsonb(coalesce(verified_subject::text,'')));
 end if;
 result:=private.prepare_photo_post(draft_id,payload,image_hash);
 if result->>'state'='draft' then update public.posts set community_id=group_id where id=draft_id and author_id=auth.uid(); end if;
 return result;
end; $$;
alter function public.publish_photo_post(uuid) set schema private;
revoke all on function private.publish_photo_post(uuid) from public,anon,authenticated;
create function public.publish_photo_post(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.posts;
begin
 select * into p from public.posts where id=target and author_id=auth.uid() for update;
 if not found or (p.community_id is not null and not private.member_of(p.community_id)) then raise exception 'Post unavailable or membership changed' using errcode='42501'; end if;
 perform private.publish_photo_post(target);
end; $$;
revoke all on function public.discover_students(text,text,integer),public.community_info(uuid),public.community_people(uuid,integer,boolean),public.posting_communities(),public.community_feed(uuid,integer),public.popular_community_posts(),public.publish_photo_post(uuid) from public,anon;
grant execute on function public.discover_students(text,text,integer),public.community_info(uuid),public.community_people(uuid,integer,boolean),public.posting_communities(),public.community_feed(uuid,integer),public.popular_community_posts(),public.publish_photo_post(uuid) to authenticated;
commit;
