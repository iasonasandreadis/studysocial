import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySocial — Find your study people",
  description:
    "A little focus. A little encouragement. A place to grow together. StudySocial is building a social home for your study journey.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Link className="skip-link" href="#main">
          Skip to content
        </Link>
        <header className="site-header container">
          <Link className="wordmark" href="/" aria-label="StudySocial home">
            <span className="brand-mark" aria-hidden="true">
              s<span>·</span>
            </span>
            studysocial<span className="wordmark-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#idea">
              The idea <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/app" className="nav-pill">
              My space
            </Link>
          </nav>
        </header>
        {children}
        <footer className="container site-footer">
          <Link href="/" className="footer-brand">
            studysocial.
          </Link>
          <p>Small steps. Shared energy.</p>
          <span>Made for the journey.</span>
        </footer>
      </body>
    </html>
  );
}
