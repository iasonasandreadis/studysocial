"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/feed", label: "Home", icon: "home" },
  { href: "/discover", label: "Friends and clubs", icon: "search" },
  { href: "/posts/new", label: "New post", icon: "plus" },
  { href: "/study", label: "Study timer", icon: "clock" },
  { href: "/me", label: "Profile", icon: "user" },
];
export function AppNavigation() {
  const path = usePathname();
  if (
    [
      "/",
      "/login",
      "/signup",
      "/check-email",
      "/forgot-password",
      "/reset-password",
      "/onboarding",
    ].includes(path) ||
    path.startsWith("/auth/")
  )
    return null;
  return (
    <nav className="app-navigation" aria-label="App navigation">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-label={l.label}
          title={l.label}
          className={l.icon === "plus" ? "create-tab" : undefined}
          aria-current={
            path === l.href ||
            (l.href === "/me" &&
              (path.startsWith("/u/") || path === "/profile/edit")) ||
            (l.href === "/discover" && path.startsWith("/communities")) ||
            (l.href === "/study" &&
              (path === "/progress" || path.startsWith("/sessions")))
              ? "page"
              : undefined
          }
        >
          <Icon name={l.icon} />
          <span className="sr-only">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
