import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProfile } from "@/lib/profile/data";
import { profilePage } from "@/lib/profile/validation";
import type { Connection } from "@/lib/profile/types";
import { ProfileShell } from "@/components/profile/profile-shell";
import { SocialControls } from "@/components/profile/social-controls";
export default async function Connections({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ direction?: string; page?: string }>;
}) {
  const { profile, supabase } = await loadProfile((await params).handle);
  if (!profile.can_view) notFound();
  const query = await searchParams,
    direction = query.direction === "following" ? "following" : "followers",
    page = profilePage(query.page);
  const { data, error } = await supabase.rpc("social_connections", {
    username: profile.handle,
    direction,
    page,
  });
  if (error) throw new Error("We couldn’t load these connections.");
  const rows = (data ?? []) as Connection[];
  const total =
    (direction === "followers" ? profile.followers : profile.following) ?? 0;
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <Link href={`/u/${profile.handle}`} className="text-button">
          ← Back to @{profile.handle}
        </Link>
        <h1 className="connections-title">
          {direction === "followers" ? "Followers" : "Following"}
        </h1>
        <p className="account-description">
          Only connections you’re allowed to see appear here.
        </p>
        {rows.length ? (
          <ul className="connection-list">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/u/${row.handle}`}>
                  <strong>{row.display_name ?? `@${row.handle}`}</strong>
                  {row.display_name && <span>@{row.handle}</span>}
                </Link>
                {profile.is_self && (
                  <SocialControls
                    target={row.id}
                    actions={[
                      {
                        action:
                          direction === "followers" ? "remove" : "unfollow",
                        label:
                          direction === "followers"
                            ? "Remove follower"
                            : "Unfollow",
                      },
                    ]}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="form-notice">No connections to show on this page.</p>
        )}
        <nav className="pagination" aria-label="Connections pages">
          {page > 0 && (
            <Link href={`?direction=${direction}&page=${page - 1}`}>
              ← Previous
            </Link>
          )}
          {(page + 1) * 20 < total && (
            <Link href={`?direction=${direction}&page=${page + 1}`}>
              Next →
            </Link>
          )}
        </nav>
      </section>
    </ProfileShell>
  );
}
