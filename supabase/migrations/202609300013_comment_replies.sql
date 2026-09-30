begin;
-- Direct writes to parent_comment_id remain ungranted. This narrow RPC checks
-- both post visibility and the parent before writing a one-level reply.
create function public.reply_to_comment(target uuid,parent_id uuid,comment_id uuid,content text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_post(target) or not exists(select 1 from public.posts where id=target and publication_state='published') then raise exception 'Post unavailable' using errcode='42501'; end if;
 if not exists(select 1 from public.comments c where c.id=parent_id and c.post_id=target and c.parent_comment_id is null and not private.blocked(c.author_id)) then raise exception 'Comment unavailable' using errcode='42501'; end if;
 if comment_id is null or content is null or length(btrim(content,E' \n\r\t')) not between 1 and 1000 then raise exception 'Write 1 to 1000 characters' using errcode='23514'; end if;
 insert into public.comments(id,post_id,author_id,body,parent_comment_id) values(comment_id,target,auth.uid(),btrim(content,E' \n\r\t'),parent_id) on conflict(id) do nothing;
 if not exists(select 1 from public.comments where id=comment_id and post_id=target and author_id=auth.uid() and parent_comment_id=parent_id and body=btrim(content,E' \n\r\t')) then raise exception 'Reply retry does not match' using errcode='23514'; end if;
end; $$;

create function public.comment_thread(target uuid,parent_id uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare parent jsonb; replies jsonb;
begin
 if auth.uid() is null or not private.can_post(target) or not exists(select 1 from public.posts where id=target and publication_state='published') then return null; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page' using errcode='23514'; end if;
 select jsonb_build_object('id',c.id,'body',c.body,'created_at',c.created_at,'own',c.author_id=auth.uid(),'handle',p.handle,'display_name',case when private.can_profile(c.author_id) then p.display_name else null end) into parent
 from public.comments c join public.profiles p on p.id=c.author_id where c.id=parent_id and c.post_id=target and c.parent_comment_id is null and not private.blocked(c.author_id);
 if parent is null then return null; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb) into replies from (
 select c.id,c.body,c.created_at,c.author_id=auth.uid() as own,p.handle,case when private.can_profile(c.author_id) then p.display_name else null end as display_name
 from public.comments c join public.profiles p on p.id=c.author_id where c.post_id=target and c.parent_comment_id=parent_id and not private.blocked(c.author_id)
 order by c.created_at,c.id limit 21 offset page_number*20) q;
 return jsonb_build_object('parent',parent,'replies',replies);
end; $$;
create index comments_thread_time on public.comments(parent_comment_id,created_at,id) where parent_comment_id is not null;
revoke all on function public.reply_to_comment(uuid,uuid,uuid,text),public.comment_thread(uuid,uuid,integer) from public,anon;
grant execute on function public.reply_to_comment(uuid,uuid,uuid,text),public.comment_thread(uuid,uuid,integer) to authenticated;
commit;
