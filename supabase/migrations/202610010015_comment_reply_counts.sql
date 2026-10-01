begin;
create or replace function public.post_comments(target uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.can_post(target) or not exists(select 1 from public.posts where id=target and publication_state='published') then return null; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]'::jsonb) into result from (
 select c.id,c.body,c.created_at,c.author_id=auth.uid() as own,p.handle,
 (select count(*) from public.comments r where r.parent_comment_id=c.id and not private.blocked(r.author_id)) as reply_count,
 case when private.can_profile(c.author_id) then p.display_name else null end as display_name
 from public.comments c join public.profiles p on p.id=c.author_id
 where c.post_id=target and c.parent_comment_id is null and not private.blocked(c.author_id)
 order by c.created_at desc,c.id desc limit 21 offset page_number*20
 ) q;
 return result;
end; $$;


commit;
