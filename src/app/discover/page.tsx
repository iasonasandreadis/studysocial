import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { SchoolChoice } from "@/components/discover/forms";
import { pageNumber } from "@/lib/feed/validation";
import type { Student } from "@/lib/discover/types";
function Students({ rows }: { rows: Student[] }) {
  return rows.length ? (
    <ul className="connection-list">
      {rows.slice(0, 20).map((s) => (
        <li key={s.id}>
          <Link href={`/u/${s.handle}`}>
            <strong>{s.display_name ?? `@${s.handle}`}</strong>
            <span>
              @{s.handle}
              {s.is_private ? " · Private account" : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="field-hint">
      No permitted matches yet. Matching depends on shared profile details.
    </p>
  );
}
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams,
    q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "",
    page = pageNumber(params.page);
  const { supabase, user } = await requireOnboarded();
  const sections = [
    ["similar", "Students like you"],
    ["subjects", "Studying your subjects"],
    ["goal", "Same university goal"],
    ["school", "From your school"],
  ];
  const [search, matches, communities, subjects, schools, settings, popular] =
    await Promise.all([
      supabase.rpc("discover_students", {
        term: q,
        section: "search",
        page_number: page,
      }),
      Promise.all(
        sections.map(([section]) =>
          supabase.rpc("discover_students", {
            term: "",
            section,
            page_number: 0,
          }),
        ),
      ),
      supabase
        .from("communities")
        .select("id,name,description,kind,visibility")
        .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
        .order("name")
        .limit(20),
      supabase.from("subjects").select("id,labels").order("code").limit(100),
      supabase
        .from("schools")
        .select("id,name")
        .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
        .order("name")
        .limit(20),
      supabase
        .from("user_settings")
        .select("share_school")
        .eq("user_id", user.id)
        .single(),
      supabase.rpc("popular_community_posts"),
    ]);
  if (
    search.error ||
    matches.some((m) => m.error) ||
    communities.error ||
    subjects.error ||
    schools.error ||
    settings.error ||
    popular.error
  )
    throw new Error("Couldn’t load discovery.");
  const students = (search.data ?? []) as Student[],
    catalog = (subjects.data ?? []).filter((s) =>
      JSON.stringify(s.labels).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <ProfileShell>
      <header className="feed-heading">
        <p className="eyebrow">FIND YOUR PEOPLE</p>
        <h1>Find your people.</h1>
        <p>Connect through the interests people choose to share.</p>
      </header>
      <form className="account-form discover-search" action="/discover">
        <label>
          Search people & clubs
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder="A username, club or subject…"
          />
        </label>
        <button className="button">Search</button>
      </form>
      <section className="onboarding-card discover-section">
        <h2>Clubs</h2>
        <Link className="text-button" href="/communities/new">
          Start a club
        </Link>
        {communities.data?.length ? (
          <ul className="connection-list">
            {communities.data.map((c) => (
              <li key={c.id}>
                <Link href={`/communities/${c.id}`}>
                  <strong>{c.name}</strong>
                  <span>
                    {c.kind} · {c.visibility}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">
            No clubs here yet. Start one for your school, a subject, or your
            study friends.
          </p>
        )}
      </section>
      <section className="onboarding-card">
        <h2>{q ? "Student matches" : "Students"}</h2>
        <Students rows={students} />
        <nav className="pagination" aria-label="Student results">
          {page > 0 && (
            <Link
              href={`/discover?q=${encodeURIComponent(q)}&page=${page - 1}`}
            >
              ← Previous
            </Link>
          )}
          {students.length > 20 && (
            <Link
              href={`/discover?q=${encodeURIComponent(q)}&page=${page + 1}`}
            >
              Next →
            </Link>
          )}
        </nav>
      </section>
      {!q && (
        <div className="discover-grid">
          {sections.map(([key, title], i) =>
            matches[i].data?.length ? (
              <section className="onboarding-card" key={key}>
                <h2>{title}</h2>
                <Students
                  rows={((matches[i].data ?? []) as Student[]).slice(0, 6)}
                />
              </section>
            ) : null,
          )}
        </div>
      )}
      <section className="onboarding-card discover-section">
        <h2>From your clubs</h2>
        {popular.data?.length ? (
          <ul className="connection-list">
            {popular.data.map(
              (p: { id: string; caption: string; engagement: number }) => (
                <li key={p.id}>
                  <Link href={`/posts/${p.id}`}>
                    <strong>{p.caption.slice(0, 100) || "Study moment"}</strong>
                    <span>{p.engagement} visible kudos</span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="field-hint">
            Shared posts from communities you join will appear here.
          </p>
        )}
      </section>
      <div className="discover-grid">
        <section className="onboarding-card">
          <h2>Subjects</h2>
          {catalog.length ? (
            <ul>
              {catalog.map((s) => (
                <li key={s.id}>{s.labels.en ?? s.labels.el}</li>
              ))}
            </ul>
          ) : (
            <p>No subjects match.</p>
          )}
          <Link className="text-button" href="/profile/edit">
            Choose your subjects
          </Link>
        </section>
        <section className="onboarding-card">
          <h2>School catalog</h2>
          {schools.data?.length ? (
            <ul>
              {schools.data.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">
              No catalog schools match. No students’ private school details are
              listed here.
            </p>
          )}
        </section>
      </div>
      <details className="onboarding-card discover-section">
        <summary>Your school discovery choice</summary>
        <SchoolChoice shared={settings.data.share_school} />
        <Link className="text-button" href="/profile/edit">
          Edit academic sharing choices
        </Link>
      </details>
    </ProfileShell>
  );
}
