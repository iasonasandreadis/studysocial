import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { MarkRead } from "@/components/safety/controls";
import { pageNumber } from "@/lib/feed/validation";
import { relativeTime } from "@/lib/feed/types";
type Notice = {
  id: string;
  kind: string;
  post_id: string | null;
  handle: string | null;
  display_name: string | null;
  read_at: string | null;
  created_at: string;
};
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const { supabase } = await requireOnboarded();
  const [list, count] = await Promise.all([
    supabase.rpc("notification_inbox", { page_number: page }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  if (list.error || count.error)
    throw new Error("Couldn’t load notifications.");
  const rows = (list.data ?? []) as Notice[];
  const labels: Record<string, string> = {
    follow: "followed you",
    follow_request: "requested to follow you",
    follow_accepted: "accepted your follow request",
    kudos: "liked your post",
    comment: "commented on your post",
  };
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">FROM YOUR STUDY CIRCLE</p>
        <h1>Notifications.</h1>
        <p className="account-description">
          {count.count ?? 0} unread. Only events you can still access appear
          here.
        </p>
        <MarkRead />
        {rows.length ? (
          <ul className="connection-list notification-list">
            {rows.slice(0, 20).map((n) => (
              <li key={n.id} className={n.read_at ? "" : "notification-unread"}>
                <Link
                  href={
                    n.post_id
                      ? `/posts/${n.post_id}`
                      : n.kind === "follow_request"
                        ? "/requests"
                        : n.handle
                          ? `/u/${n.handle}`
                          : "/feed"
                  }
                >
                  <strong>
                    {!n.read_at && (
                      <span className="unread-dot" aria-label="Unread">
                        ●{" "}
                      </span>
                    )}
                    {n.display_name ?? `@${n.handle ?? "student"}`}{" "}
                    {labels[n.kind] ?? "updated your community"}
                  </strong>
                  <span>{relativeTime(n.created_at)}</span>
                </Link>
                {!n.read_at && <MarkRead id={n.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="profile-empty">
            <h2>You’re all caught up.</h2>
            <p>
              Follows, requests, likes and comments will appear here when they
              happen.
            </p>
          </div>
        )}
        <nav className="pagination">
          {page > 0 && (
            <Link href={`/notifications?page=${page - 1}`}>← Previous</Link>
          )}
          {rows.length > 20 && (
            <Link href={`/notifications?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
      </section>
    </ProfileShell>
  );
}
