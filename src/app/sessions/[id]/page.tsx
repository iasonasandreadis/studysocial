import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { uuidPattern } from "@/lib/posts/validation";
import { durationLabel } from "@/lib/posts/types";
export default async function SessionResult({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireOnboarded();
  if (!uuidPattern.test(id)) notFound();
  const { data: s, error } = await supabase
    .from("study_sessions")
    .select("id,subject_id,started_at,ended_at,duration_seconds,notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();
  if (error) throw new Error("Couldn’t load this session.");
  if (!s) notFound();
  let subject = "Study";
  if (s.subject_id) {
    const { data, error } = await supabase
      .from("subjects")
      .select("labels")
      .eq("id", s.subject_id)
      .maybeSingle();
    if (error) throw new Error("Couldn’t load the subject.");
    subject = data?.labels.en ?? data?.labels.el ?? subject;
  }
  const { data: linked, error: linkError } = await supabase
    .from("posts")
    .select("id,publication_state")
    .eq("session_id", id)
    .eq("author_id", user.id)
    .maybeSingle();
  if (linkError) throw new Error("Couldn’t load the sharing status.");
  return (
    <ProfileShell>
      <section className="onboarding-card session-result">
        <h1>Session complete.</h1>
        <p className="timer-result">{durationLabel(s.duration_seconds)}</p>
        <h2>{subject}</h2>
        <p className="field-hint">Saved to your history · Only you</p>
        {s.notes && (
          <section>
            <h3>Your private note</h3>
            <p className="post-caption">{s.notes}</p>
          </section>
        )}
        <Link
          className="button"
          href={linked ? `/posts/${linked.id}` : `/posts/new?session=${id}`}
        >
          {linked
            ? linked.publication_state === "published"
              ? "View your post"
              : "Review saved draft"
            : "Share your progress"}
        </Link>
        <div className="form-links">
          <Link href="/study" className="text-button">
            Back to studying
          </Link>
          <Link href="/sessions" className="text-button">
            Recent sessions
          </Link>
        </div>
      </section>
    </ProfileShell>
  );
}
