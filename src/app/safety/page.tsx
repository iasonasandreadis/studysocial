import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { BlockControl } from "@/components/safety/controls";
import { pageNumber } from "@/lib/feed/validation";
export default async function Safety({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { supabase } = await requireOnboarded();
  const page = pageNumber((await searchParams).page);
  const { data, error } = await supabase.rpc("blocked_accounts", {
    page_number: page,
  });
  if (error) throw new Error("Couldn’t load your blocked accounts.");
  const rows = (data ?? []) as { id: string; handle: string | null }[];
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">YOUR SPACE, YOUR CHOICE</p>
        <h1>Privacy and safety.</h1>
        <p className="account-description">
          Blocking removes follows and hides normal profile, post and
          interaction access both ways. Unblocking doesn’t restore those
          connections. Shared community spaces may still exist; content
          visibility remains filtered.
        </p>
        <Link className="text-button" href="/profile/edit">
          Edit profile privacy and sharing
        </Link>
        <h2>Blocked accounts</h2>
        {rows.length ? (
          <ul className="connection-list">
            {rows.slice(0, 20).map((p) => (
              <li key={p.id}>
                <strong>@{p.handle ?? "unavailable"}</strong>
                <BlockControl target={p.id} unblock />
              </li>
            ))}
          </ul>
        ) : (
          <p className="form-notice">
            No accounts blocked. Use an account’s profile to block or report it.
          </p>
        )}
        <nav className="pagination">
          {page > 0 && (
            <Link href={`/safety?page=${page - 1}`}>← Previous</Link>
          )}
          {rows.length > 20 && (
            <Link href={`/safety?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
        <p className="field-hint">
          Post photos and avatars are optional. No location or face photo is
          required. Check images and text for personal details before sharing.
        </p>
      </section>
    </ProfileShell>
  );
}
