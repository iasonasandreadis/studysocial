import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppNavigation } from "./app-navigation";
export function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="container profile-shell">
      <AppNavigation />
      <nav className="account-navigation" aria-label="Account tools">
        <Link href="/notifications">Notifications</Link>
        <Link href="/progress">My progress</Link>
        <details>
          <summary>Account</summary>
          <div>
            <Link href="/posts">My posts</Link>
            <Link href="/sessions">Sessions</Link>
            <Link href="/requests">Follow requests</Link>
            <Link href="/profile/edit">Edit profile</Link>
            <Link href="/safety">Safety</Link>
            <LogoutButton />
          </div>
        </details>
      </nav>
      {children}
    </main>
  );
}
