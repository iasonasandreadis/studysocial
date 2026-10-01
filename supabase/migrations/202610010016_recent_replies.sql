begin;
-- Keep a just-saved reply on the first page of a busy thread.
create or replace function public.comment_thread(target uuid,parent_id uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare parent jsonb; replies jsonb;
begin
 if auth.uid() is null or not private.can_post(target) or not exists(select 1 from public.posts where id=target and publication_state='published') then return null; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select jsonb_build_object('id',c.id,'body',c.body,'created_at',c.created_at,'own',c.author_id=auth.uid(),'handle',p.handle,'display_name',case when private.can_profile(c.author_id) then p.display_name else null end) into parent
 from public.comments c join public.profiles p on p.id=c.author_id where c.id=parent_id and c.post_id=target and c.parent_comment_id is null and not private.blocked(c.author_id);
 if parent is null then return null; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]'::jsonb) into replies from (
 select c.id,c.body,c.created_at,c.author_id=auth.uid() as own,p.handle,case when private.can_profile(c.author_id) then p.display_name else null end as display_name
 from public.comments c join public.profiles p on p.id=c.author_id where c.post_id=target and c.parent_comment_id=parent_id and not private.blocked(c.author_id)
 order by c.created_at desc,c.id desc limit 21 offset page_number*20) q;
 return jsonb_build_object('parent',parent,'replies',replies);
end; $$;
commit;
