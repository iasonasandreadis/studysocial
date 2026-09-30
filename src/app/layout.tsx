import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "StudySocial — Find your study people",
  description:
    "Photos, friends and clubs. A social home for your student life.",
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
        <SiteHeader />
        {children}
        <footer className="container site-footer">
          <Link href="/" className="footer-brand">
            studysocial.
          </Link>
          <p>Study days. Good company.</p>
          <span>Be yourself.</span>
        </footer>
      </body>
    </html>
  );
}
