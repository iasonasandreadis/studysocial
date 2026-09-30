import { ShareButton } from "@/components/posts/share-button";
import Link from "next/link";
import { ReportControl } from "@/components/safety/controls";
import { randomUUID } from "node:crypto";
import {
  Kudos,
  CommentForm,
  DeleteComment,
} from "@/components/feed/interactions";
import {
  relativeTime,
  type Activity,
  type PostComment,
} from "@/lib/feed/types";
import { pageNumber } from "@/lib/feed/validation";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProfileShell } from "@/components/profile/profile-shell";
import { DeletePostForm } from "@/components/posts/delete-form";
import { requireOnboarded } from "@/lib/auth/session";
import { uuidPattern } from "@/lib/posts/validation";
import { durationLabel, type StudyPost } from "@/lib/posts/types";
export default async function PostDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commentsPage?: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireOnboarded();
  if (!uuidPattern.test(id)) notFound();
  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "id,author_id,caption,audience,subject_id,shared_duration_seconds,created_at,publication_state",
    )
    .eq("id", id)
    .maybeSingle<StudyPost>();
  if (error) throw new Error("We couldn’t load this post.");
  if (!post) notFound();
  const [author, media] = await Promise.all([
    supabase
      .from("profiles")
      .select("handle,display_name,is_private")
      .eq("id", post.author_id)
      .maybeSingle(),
    supabase
      .from("post_media")
      .select("object_path,alt_text")
      .eq("post_id", id)
      .maybeSingle(),
  ]);
  if (author.error || media.error)
    throw new Error("We couldn’t load the post details.");
  if (!author.data) notFound();
  let subject: string | null = null;
  if (post.subject_id) {
    const { data, error } = await supabase
      .from("subjects")
      .select("labels")
      .eq("id", post.subject_id)
      .maybeSingle();
    if (error) throw new Error("We couldn’t load the subject.");
    subject = data?.labels.en ?? data?.labels.el ?? null;
  }
  let url: string | null = null;
  if (media.data && post.publication_state !== "deleting") {
    const { data } = await supabase.storage
      .from("post-images")
      .createSignedUrl(media.data.object_path, 60);
    url = data?.signedUrl ?? null;
  }
  const own = post.author_id === user.id;
  const commentsPage = pageNumber((await searchParams).commentsPage);
  let activity: Activity | null = null,
    comments: PostComment[] = [];
  if (post.publication_state === "published") {
    const [a, c] = await Promise.all([
      supabase.rpc("post_activity", { target: id }),
      supabase.rpc("post_comments", { target: id, page_number: commentsPage }),
    ]);
    if (a.error || c.error) throw new Error("We couldn’t load the comments.");
    if (!a.data || c.data === null) notFound();
    activity = a.data as Activity;
    comments = c.data as PostComment[];
  }
  return (
    <ProfileShell>
      <article className="onboarding-card post-detail">
        <Link
          href={own ? "/posts" : `/u/${author.data.handle}`}
          className="text-button"
        >
          ← {own ? "My posts" : "Author profile"}
        </Link>

        <div className="post-title-row">
          <h1>{author.data.display_name}</h1>
          <ShareButton path={`/posts/${id}`} />
        </div>
        <Link className="text-button" href={`/u/${author.data.handle}`}>
          @{author.data.handle}
        </Link>
        <p className="field-hint">
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleString("en-GB", {
              timeZone: "UTC",
            })}{" "}
            UTC
          </time>
        </p>
        {post.publication_state !== "published" && (
          <p role="status" className="form-notice">
            {post.publication_state === "draft"
              ? "Draft — only you can see this. Return to your open composer to retry with the same photo, or discard this draft and start again."
              : "Deletion is unfinished. This post is hidden from others. Retry below to finish removing the photo."}
          </p>
        )}
        {url ? (
          <Image
            className="post-photo"
            src={url}
            alt={media.data?.alt_text || "Study photo"}
            width={1000}
            height={1000}
            unoptimized
          />
        ) : (
          <p className="form-notice">
            {post.publication_state === "deleting"
              ? "Photo pending removal or already removed."
              : "Photo unavailable. Refresh to retry loading it."}
          </p>
        )}
        {post.caption && <p className="post-caption">{post.caption}</p>}
        <div className="post-facts">
          {subject && <span>{subject}</span>}
          {post.shared_duration_seconds !== null && (
            <span>{durationLabel(post.shared_duration_seconds)} studied</span>
          )}
        </div>
        {activity && (
          <section
            id="comments"
            className="post-comments"
            aria-labelledby="comments-title"
          >
            <Kudos id={id} activity={activity} />
            <h2 id="comments-title">Comments · {activity.comment_count}</h2>

            <CommentForm postId={id} id={randomUUID()} />
            {comments.length ? (
              <ul className="comment-list">
                {comments.slice(0, 20).map((c) => (
                  <li key={c.id}>
                    <header>
                      {c.handle ? (
                        <Link href={`/u/${c.handle}`}>
                          <strong>{c.display_name || `@${c.handle}`}</strong>
                        </Link>
                      ) : (
                        <strong>Student</strong>
                      )}
                      <time
                        dateTime={c.created_at}
                        title={new Date(c.created_at).toISOString()}
                      >
                        {relativeTime(c.created_at)}
                      </time>
                    </header>
                    <p>{c.body}</p>
                    {c.own && <DeleteComment postId={id} id={c.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="form-notice">
                {commentsPage
                  ? "No more comments on this page."
                  : "No comments yet. A kind word can make someone’s day."}
              </p>
            )}
            <nav className="pagination" aria-label="Comment pages">
              {commentsPage > 0 && (
                <Link
                  href={`/posts/${id}?commentsPage=${commentsPage - 1}#comments`}
                >
                  ← Newer
                </Link>
              )}
              {comments.length > 20 && (
                <Link
                  href={`/posts/${id}?commentsPage=${commentsPage + 1}#comments`}
                >
                  Older →
                </Link>
              )}
            </nav>
          </section>
        )}
        {!own && <ReportControl id={randomUUID()} target={id} type="post" />}
        {own && (
          <>
            <p className="field-hint">
              Audience:{" "}
              {post.audience === "private"
                ? "Only you"
                : post.audience === "followers"
                  ? "Approved followers"
                  : author.data.is_private
                    ? "Approved followers while your account is private; anyone signed in if you make it public"
                    : "Anyone signed in, except blocked accounts"}
              .
            </p>
            <details className="optional-details">
              <summary>Manage post</summary>
              <DeletePostForm id={id} state={post.publication_state} />
            </details>
          </>
        )}
      </article>
    </ProfileShell>
  );
}
