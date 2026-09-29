import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { profilePage } from "@/lib/profile/validation";
import type { Connection } from "@/lib/profile/types";
import { ProfileShell } from "@/components/profile/profile-shell";
import { SocialControls } from "@/components/profile/social-controls";
export default async function Requests({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { supabase } = await requireOnboarded(),
    page = profilePage((await searchParams).page);
  const { data, error } = await supabase.rpc("incoming_follow_requests", {
    page,
  });
  if (error) throw new Error("We couldn’t load your requests.");
  const rows = (data ?? []) as Connection[];
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">YOUR CIRCLE, YOUR CHOICE</p>
        <h1>Follow requests</h1>
        <p className="account-description">
          Accept people you’re comfortable sharing with. Private requesters are
          identified by username only.
        </p>
        {rows.length ? (
          <ul className="connection-list">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/u/${row.handle}`}>
                  <strong>{row.display_name ?? `@${row.handle}`}</strong>
                  {row.display_name && <span>@{row.handle}</span>}
                </Link>
                <SocialControls
                  target={row.id}
                  actions={[
                    { action: "accept", label: "Accept" },
                    { action: "reject", label: "Decline" },
                  ]}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="profile-empty">
            <h2>You’re all caught up.</h2>
            <p>New follow requests will appear here.</p>
          </div>
        )}
        <nav className="pagination" aria-label="Request pages">
          {page > 0 && <Link href={`?page=${page - 1}`}>← Previous</Link>}
          {rows.length === 20 && <Link href={`?page=${page + 1}`}>Next →</Link>}
        </nav>
      </section>
    </ProfileShell>
  );
}
