"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
export function SiteHeader() {
  const path = usePathname();
  const publicPage = [
    "/",
    "/login",
    "/signup",
    "/check-email",
    "/forgot-password",
    "/reset-password",
  ].includes(path);
  return (
    <header
      className={`site-header container ${publicPage ? "public-header" : "app-header"}`}
    >
      <Link
        className="wordmark"
        href={publicPage ? "/" : "/feed"}
        aria-label="StudySocial home"
      >
        studysocial<span className="wordmark-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        {publicPage ? (
          <Link
            href={path === "/login" ? "/signup" : "/login"}
            className="text-button"
          >
            {path === "/login" ? "Sign up" : "Log in"}
          </Link>
        ) : (
          <>
            <Link
              className="icon-button"
              href="/notifications"
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" />
            </Link>
            <Link
              className="icon-button"
              href="/account"
              aria-label="Settings and study tools"
              title="Settings"
            >
              <Icon name="menu" />
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
