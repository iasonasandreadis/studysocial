import Link from "next/link";
import { ProfileShell } from "@/components/profile/profile-shell";
import { requireOnboarded } from "@/lib/auth/session";
export default async function MyPosts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: raw } = await searchParams;
  const page = Math.min(
    10000,
    Math.max(0, Number.parseInt(raw ?? "0", 10) || 0),
  );
  const { supabase, user } = await requireOnboarded();
  const { data, error } = await supabase
    .from("posts")
    .select("id,caption,publication_state,created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 20);
  if (error) throw new Error("We couldn’t load your posts.");
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">YOUR STUDY MOMENTS</p>
        <h1>Progress, in pictures.</h1>
        <p className="account-description">
          Your published posts and unfinished drafts. Open a post to view it or
          remove it.
        </p>
        <Link href="/posts/new" className="button">
          Create a post <span aria-hidden="true">+</span>
        </Link>
        {!data?.length ? (
          <div className="profile-empty">
            <h2>
              {page ? "No more posts." : "Your first moment starts here."}
            </h2>
            <p>
              {page
                ? "Go back to see your earlier posts."
                : "Share a study photo when you feel ready. You choose who can see it."}
            </p>
          </div>
        ) : (
          <ul className="connection-list">
            {data.slice(0, 20).map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`}>
                  <strong>{p.caption?.slice(0, 100) || "Study photo"}</strong>
                  <span>
                    {p.publication_state === "draft"
                      ? "Private draft"
                      : p.publication_state === "deleting"
                        ? "Deletion needs retry"
                        : "Published"}{" "}
                    ·{" "}
                    {new Date(p.created_at).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <nav className="pagination" aria-label="Post pages">
          {page > 0 && <Link href={`/posts?page=${page - 1}`}>← Previous</Link>}
          {data && data.length > 20 && (
            <Link href={`/posts?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
      </section>
    </ProfileShell>
  );
}
