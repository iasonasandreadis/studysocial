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
      <h1 className="sr-only">Home feed</h1>
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
          Following
        </Link>
      </nav>
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
                ? "Find your people."
                : "No posts yet."}
          </h2>
          <p>
            {page
              ? "Return to the first page for the latest study moments."
              : mode === "community"
                ? "Follow someone from their profile to see their shared study moments here."
                : "Add friends or share your first photo."}
          </p>
          <Link
            className="button"
            href={page ? `/feed?mode=${mode}` : "/posts/new"}
          >
            {page ? "Back to latest" : "Share a photo"}
          </Link>
          {!page && (
            <Link className="text-button" href="/discover">
              Find friends & clubs →
            </Link>
          )}
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
