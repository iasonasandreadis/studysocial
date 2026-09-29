import Link from "next/link";
import { ProfileShell } from "@/components/profile/profile-shell";
import { PostCard } from "@/components/feed/post-card";
import { requireOnboarded } from "@/lib/auth/session";
import { pageNumber } from "@/lib/feed/validation";
import type { FeedPost } from "@/lib/feed/types";
export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; page?: string }>;
}) {
  const params = await searchParams,
    mode = params.mode === "community" ? "community" : "for-you",
    page = pageNumber(params.page, 24);
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase.rpc("study_feed", {
    feed_mode: mode,
    page_number: page,
  });
  if (error) throw new Error("We couldn’t load your feed.");
  const rows = (data ?? []) as FeedPost[];
  const posts = await Promise.all(
    rows.slice(0, 20).map(async (post) => {
      let imageUrl: string | null = null;
      if (post.image_path) {
        const { data } = await supabase.storage
          .from("post-images")
          .createSignedUrl(post.image_path, 60);
        imageUrl = data?.signedUrl ?? null;
      }
      return { ...post, imageUrl };
    }),
  );
  return (
    <ProfileShell>
      <header className="feed-heading">
        <p className="eyebrow">A LITTLE PROGRESS, TOGETHER</p>
        <h1>Your study circle.</h1>
        <p>Real moments from people putting in the work.</p>
      </header>
      <nav className="feed-tabs" aria-label="Feed mode">
        <Link
          href="/feed?mode=for-you"
          aria-current={mode === "for-you" ? "page" : undefined}
        >
          For You
        </Link>
        <Link
          href="/feed?mode=community"
          aria-current={mode === "community" ? "page" : undefined}
        >
          Community
        </Link>
      </nav>
      <details className="feed-explanation">
        <summary>How this feed is ordered</summary>
        <p>
          Among up to 500 accessible posts from the last 90 days: follows add 40
          points, your subjects add 20 in For You, and joined communities add
          15. Visible kudos and comments add up to 10. Recency adds up to 30,
          falling by one point per day. Ties use time and post ID.
        </p>
        <p>
          Community includes followed people, your shared posts and permitted
          posts in communities you belong to. Private school details and goals
          aren’t used. Counts exclude interactions from accounts you have
          blocked or that blocked you. Refresh for the latest order; pages can
          shift as activity changes.
        </p>
      </details>
      {posts.length ? (
        <div className="feed-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <section className="onboarding-card feed-empty">
          <span aria-hidden="true">✳</span>
          <h2>
            {page
              ? "You’ve reached the end."
              : mode === "community"
                ? "Your circle starts with a connection."
                : "A fresh page for your study story."}
          </h2>
          <p>
            {page
              ? "Return to the first page for the latest study moments."
              : mode === "community"
                ? "Follow someone from their profile to see their shared study moments here."
                : "There are no accessible study moments here yet. Share a photo when you’re ready."}
          </p>
          <Link
            className="button"
            href={page ? `/feed?mode=${mode}` : "/posts/new"}
          >
            {page ? "Back to latest" : "Create a post"}
          </Link>
        </section>
      )}
      <nav className="pagination" aria-label="Feed pages">
        {page > 0 && (
          <Link href={`/feed?mode=${mode}&page=${page - 1}`}>← Previous</Link>
        )}
        {rows.length > 20 && page < 24 && (
          <Link href={`/feed?mode=${mode}&page=${page + 1}`}>Next →</Link>
        )}
      </nav>
    </ProfileShell>
  );
}
