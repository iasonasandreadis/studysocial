import Link from "next/link";
import Image from "next/image";
import { Kudos } from "./interactions";
import { relativeTime, type FeedPost } from "@/lib/feed/types";
import { durationLabel } from "@/lib/posts/types";
export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="feed-card">
      <header>
        <div className="feed-avatar" aria-hidden="true">
          {post.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <Link href={`/u/${post.handle}`}>
            <strong>{post.display_name}</strong>
            <span>@{post.handle}</span>
          </Link>
          <p>
            <time
              dateTime={post.created_at}
              title={new Date(post.created_at).toISOString()}
            >
              {relativeTime(post.created_at)}
            </time>{" "}
            · {post.reason}
          </p>
        </div>
      </header>
      <Link
        href={`/posts/${post.id}`}
        aria-label={`Open ${post.display_name}’s study post`}
      >
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            className="post-photo"
            alt={post.alt_text || "Study photo"}
            width={1000}
            height={1000}
            unoptimized
          />
        ) : (
          <div className="feed-photo-missing">
            Photo unavailable. Open the post to retry.
          </div>
        )}
      </Link>
      <div className="feed-card-body">
        {post.caption && <p className="post-caption">{post.caption}</p>}
        <div className="post-facts">
          {post.subject && (
            <span>{post.subject.en ?? post.subject.el ?? "Study"}</span>
          )}
          {post.shared_duration_seconds !== null && (
            <span>{durationLabel(post.shared_duration_seconds)} studied</span>
          )}
        </div>
        <div className="feed-actions">
          <Kudos id={post.id} activity={post.activity} />
          <Link className="text-button" href={`/posts/${post.id}#comments`}>
            {post.activity.comment_count} comments
          </Link>
        </div>
      </div>
    </article>
  );
}
