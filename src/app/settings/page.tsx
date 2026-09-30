import { SchoolChoice } from "@/components/discover/forms";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { LogoutButton } from "@/components/auth/logout-button";
export default async function Settings() {
  const { supabase, user } = await requireOnboarded();
  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("share_school")
    .eq("user_id", user.id)
    .single();
  if (error) throw new Error("Couldn’t load your settings.");
  return (
    <ProfileShell>
      <Link className="text-button" href="/account">
        ← Menu
      </Link>
      <h1 className="screen-title">Settings</h1>
      <p className="field-hint">Signed in as {user.email}</p>
      <nav className="settings-list" aria-label="Your account">
        <Link href="/profile/edit">
          Edit profile <span>→</span>
        </Link>
        <Link href="/reset-password">
          Change password <span>→</span>
        </Link>
        <Link href="/safety">
          Privacy & safety <span>→</span>
        </Link>
      </nav>
      <details className="optional-details">
        <summary>School discovery</summary>
        <SchoolChoice shared={settings.share_school} />
      </details>
      <div className="settings-logout">
        <LogoutButton />
      </div>
    </ProfileShell>
  );
}
