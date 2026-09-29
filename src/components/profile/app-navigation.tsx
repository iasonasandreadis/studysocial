"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  { href: "/feed", label: "Home", icon: "M3 10 12 3l9 7v11h-6v-7H9v7H3z" },
  {
    href: "/discover",
    label: "Discover",
    icon: "m16 8-3 5-5 3 3-5z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  },
  { href: "/posts/new", label: "Create", icon: "M12 4v16M4 12h16" },
  {
    href: "/study",
    label: "Study",
    icon: "M9 2h6M12 7v6l3 2M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16",
  },
  {
    href: "/me",
    label: "Profile",
    icon: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 8 0 0 1 16 0v2",
  },
];
export function AppNavigation() {
  const path = usePathname();
  const active = (href: string) =>
    path === href ||
    (href === "/study" &&
      (path.startsWith("/sessions") || path === "/progress")) ||
    (href === "/me" && (path.startsWith("/u/") || path === "/profile/edit"));
  return (
    <nav className="app-navigation" aria-label="App navigation">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={l.icon} />
          </svg>
          <span>{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
