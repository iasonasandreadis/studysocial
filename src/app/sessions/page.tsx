import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { pageNumber } from "@/lib/feed/validation";
import { durationLabel } from "@/lib/posts/types";
export default async function Sessions({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const { supabase, user } = await requireOnboarded();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id,ended_at,duration_seconds,subjects(labels)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 20)
    .returns<
      {
        id: string;
        ended_at: string;
        duration_seconds: number;
        subjects: { labels: Record<string, string> } | null;
      }[]
    >();
  if (error) throw new Error("Couldn’t load your sessions.");
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">YOUR PRIVATE STUDY HISTORY</p>
        <h1>One session at a time.</h1>
        <Link href="/study" className="button">
          Open study timer
        </Link>
        {!data?.length ? (
          <div className="profile-empty">
            <h2>{page ? "No more sessions." : "A fresh start."}</h2>
            <p>
              Your completed sessions will appear here. There’s no rush—start
              when you’re ready.
            </p>
          </div>
        ) : (
          <ul className="connection-list">
            {data.slice(0, 20).map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`}>
                  <strong>
                    {s.subjects?.labels.en ?? s.subjects?.labels.el ?? "Study"}{" "}
                    · {durationLabel(s.duration_seconds)}
                  </strong>
                  <span>
                    {new Date(s.ended_at).toLocaleString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <nav className="pagination" aria-label="Session pages">
          {page > 0 && (
            <Link href={`/sessions?page=${page - 1}`}>← Previous</Link>
          )}
          {data && data.length > 20 && (
            <Link href={`/sessions?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
      </section>
    </ProfileShell>
  );
}
