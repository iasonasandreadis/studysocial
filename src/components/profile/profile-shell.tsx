import type { ReactNode } from "react";
export function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="container profile-shell">
      {children}
    </main>
  );
}
