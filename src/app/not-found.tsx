import Link from "next/link";
import { StatusPanel } from "@/components/status-panel";
export default function NotFound() {
  return (
    <main id="main" className="container">
      <StatusPanel
        title="A page yet to be written."
        action={
          <Link className="button" href="/">
            Back to StudySocial <span aria-hidden="true">↗</span>
          </Link>
        }
      >
        <p>We can’t find that page. Let’s get you back to the beginning.</p>
      </StatusPanel>
    </main>
  );
}
