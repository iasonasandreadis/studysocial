import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
export default async function Menu() {
  await requireOnboarded();
  return (
    <ProfileShell>
      <h1 className="screen-title">Menu</h1>
      <nav className="settings-list" aria-label="Shortcuts">
        <Link href="/discover?view=clubs">
          Clubs <span>→</span>
        </Link>
        <Link href="/requests">
          Follow requests <span>→</span>
        </Link>
        <Link href="/posts">
          My posts & drafts <span>→</span>
        </Link>
        <Link href="/profile/edit">
          Edit profile <span>→</span>
        </Link>
        <Link href="/settings">
          Settings <span>→</span>
        </Link>
      </nav>
    </ProfileShell>
  );
}
