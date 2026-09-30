"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="site-header container">
      <Link
        className="wordmark"
        href={publicPage ? "/" : "/feed"}
        aria-label="StudySocial home"
      >
        <span className="brand-mark" aria-hidden="true">
          s<span>·</span>
        </span>
        studysocial<span className="wordmark-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        {publicPage ? (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/signup" className="nav-pill">
              Sign up
            </Link>
          </>
        ) : (
          <Link className="nav-pill" href="/discover">
            Find clubs ↗
          </Link>
        )}
      </nav>
    </header>
  );
}
