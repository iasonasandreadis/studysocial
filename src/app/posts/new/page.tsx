import Link from "next/link";
import { notFound } from "next/navigation";
import { uuidPattern } from "@/lib/posts/validation";
import { randomUUID } from "node:crypto";
import { ProfileShell } from "@/components/profile/profile-shell";
import { Composer } from "@/components/posts/composer";
import { requireOnboarded } from "@/lib/auth/session";
import type { CatalogOption } from "@/lib/onboarding/types";
import type { CompletedSession } from "@/lib/posts/types";
export default async function NewPost({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; community?: string }>;
}) {
  const params = await searchParams;
  const selected = params.session;
  const { supabase, user } = await requireOnboarded();
  const [profile, subjects, sessions, groups] = await Promise.all([
    supabase.from("profiles").select("is_private").eq("id", user.id).single(),
    supabase
      .from("subjects")
      .select("id,labels")
      .order("code")
      .limit(100)
      .returns<CatalogOption[]>(),
    supabase
      .from("study_sessions")
      .select("id,subject_id,duration_seconds,ended_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(100)
      .returns<CompletedSession[]>(),
    supabase.rpc("posting_communities"),
  ]);
  if (profile.error || subjects.error || sessions.error || groups.error)
    throw new Error("We couldn’t load the post composer.");
  const communities = (groups.data ?? []) as { id: string; name: string }[];
  if (params.community && !communities.some((c) => c.id === params.community))
    notFound();
  let initialSession: CompletedSession | undefined;
  const options = sessions.data ?? [];
  if (selected) {
    if (!uuidPattern.test(selected)) notFound();
    const [s, existing] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("id,subject_id,duration_seconds,ended_at")
        .eq("id", selected)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .maybeSingle<CompletedSession>(),
      supabase
        .from("posts")
        .select("id,publication_state")
        .eq("session_id", selected)
        .eq("author_id", user.id)
        .maybeSingle(),
    ]);
    if (s.error || existing.error)
      throw new Error("Couldn’t load your completed session.");
    if (!s.data) notFound();
    if (existing.data)
      return (
        <ProfileShell>
          <section className="onboarding-card">
            <h1>This session already has a post.</h1>
            <p className="account-description">
              Open the existing post to view it, or discard its unfinished draft
              before trying again.
            </p>
            <Link className="button" href={`/posts/${existing.data.id}`}>
              Open{" "}
              {existing.data.publication_state === "published"
                ? "post"
                : "saved draft"}
            </Link>
            <Link className="text-button" href={`/sessions/${selected}`}>
              Back to my session
            </Link>
          </section>
        </ProfileShell>
      );
    initialSession = s.data;
    if (!options.some((s) => s.id === selected)) options.unshift(s.data);
  }
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">CAPTURE YOUR PROGRESS</p>
        <h1>Small steps. Worth sharing.</h1>
        <p className="account-description">
          A page of notes, a finished chapter, a quiet study corner. Share a
          moment on your terms.
        </p>
        <Composer
          id={randomUUID()}
          isPrivate={profile.data.is_private}
          subjects={subjects.data ?? []}
          sessions={options}
          initialSession={initialSession}
          communities={communities}
          initialCommunity={params.community}
        />
      </section>
    </ProfileShell>
  );
}
