"use client";
import { StatusPanel } from "@/components/status-panel";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="container">
      <StatusPanel
        title="Let’s try that again."
        action={
          <button className="button" onClick={reset}>
            Try again <span aria-hidden="true">↗</span>
          </button>
        }
      >
        <p>We couldn’t load this page. Please try again in a moment.</p>
      </StatusPanel>
    </main>
  );
}
