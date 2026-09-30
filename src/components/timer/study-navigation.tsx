import Link from "next/link";
export function StudyNavigation({
  current,
}: {
  current: "timer" | "progress" | "history";
}) {
  return (
    <nav className="feed-tabs" aria-label="Study tools">
      <Link
        href="/study"
        aria-current={current === "timer" ? "page" : undefined}
      >
        Timer
      </Link>
      <Link
        href="/progress"
        aria-current={current === "progress" ? "page" : undefined}
      >
        Progress
      </Link>
      <Link
        href="/sessions"
        aria-current={current === "history" ? "page" : undefined}
      >
        History
      </Link>
    </nav>
  );
}
