import { SchoolChoice } from "@/components/discover/forms";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { LogoutButton } from "@/components/auth/logout-button";
export default async function Account() {
  const { supabase, user } = await requireOnboarded();
  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("share_school")
    .eq("user_id", user.id)
    .single();
  if (error) throw new Error("Couldn’t load your settings.");
  return (
    <ProfileShell>
      <h1 className="screen-title">Settings</h1>
      <nav className="settings-list" aria-label="Your account">
        <Link href="/profile/edit">
          Edit profile <span>→</span>
        </Link>
        <Link href="/requests">
          Follow requests <span>→</span>
        </Link>
        <Link href="/posts">
          My posts & drafts <span>→</span>
        </Link>
        <Link href="/safety">
          Privacy & safety <span>→</span>
        </Link>
      </nav>
      <details className="optional-details">
        <summary>School discovery</summary>
        <SchoolChoice shared={settings.share_school} />
      </details>
      <h2 className="section-title">Study tools</h2>
      <nav className="settings-list" aria-label="Study tools">
        <Link href="/study">
          Study timer <span>→</span>
        </Link>
        <Link href="/progress">
          My progress <span>→</span>
        </Link>
        <Link href="/sessions">
          Past sessions <span>→</span>
        </Link>
      </nav>
      <div className="settings-logout">
        <LogoutButton />
      </div>
    </ProfileShell>
  );
}
