import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import "./mobile.css";
import { Connectivity } from "@/components/app/connectivity";
import { AppNavigation } from "@/components/profile/app-navigation";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "StudySocial",
  applicationName: "StudySocial",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudySocial",
  },
  formatDetection: { telephone: false },
  description:
    "Photos, friends and clubs. A social home for your student life.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101010" },
  ],
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
        <Connectivity />
        <SiteHeader />
        {children}
        <AppNavigation />
      </body>
    </html>
  );
}
