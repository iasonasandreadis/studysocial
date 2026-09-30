import Link from "next/link";
import { redirectSignedInUser } from "@/lib/auth/session";
import { Icon } from "@/components/ui/icon";
export default async function Home() {
  await redirectSignedInUser();
  return (
    <main id="main" className="welcome-screen">
      <div className="welcome-symbol" aria-hidden="true">
        <Icon name="camera" />
      </div>
      <h1>
        Your people.
        <br />
        Your everyday.
      </h1>
      <p>Photos, study breaks, and friends who get it.</p>
      <Link href="/signup" className="button">
        Get started
      </Link>
      <Link href="/login" className="text-button">
        I already have an account
      </Link>
      <details className="install-help">
        <summary>Add to your Home Screen</summary>
        <p>
          On iPhone, open this in Safari. Tap Share, then Add to Home Screen.
          Turn on “Open as Web App” if shown.
        </p>
      </details>
    </main>
  );
}
