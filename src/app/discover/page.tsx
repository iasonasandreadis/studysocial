import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { Icon } from "@/components/ui/icon";
import { pageNumber } from "@/lib/feed/validation";
import type { Student } from "@/lib/discover/types";
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; view?: string }>;
}) {
  const params = await searchParams,
    q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "",
    page = pageNumber(params.page),
    clubs = params.view === "clubs";
  const { supabase } = await requireOnboarded();
  const result = clubs
    ? await supabase
        .from("communities")
        .select("id,name,description,kind,visibility")
        .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
        .order("name")
        .order("id")
        .range(page * 20, page * 20 + 20)
    : await supabase.rpc("discover_students", {
        term: q,
        section: "search",
        page_number: page,
      });
  if (result.error) throw new Error("Couldn’t load search results.");
  const students = clubs ? [] : ((result.data ?? []) as Student[]);
  const groups = clubs
    ? ((result.data ?? []) as {
        id: string;
        name: string;
        kind: string;
        visibility: string;
      }[])
    : [];
  const count = clubs ? groups.length : students.length;
  const query = (p: number) =>
    `/discover?${new URLSearchParams({ view: clubs ? "clubs" : "people", q, page: String(p) })}`;
  return (
    <ProfileShell>
      <h1 className="screen-title">Find your people</h1>
      <nav className="feed-tabs" aria-label="Search type">
        <Link
          href={`/discover?q=${encodeURIComponent(q)}`}
          aria-current={!clubs ? "page" : undefined}
        >
          People
        </Link>
        <Link
          href={`/discover?view=clubs&q=${encodeURIComponent(q)}`}
          aria-current={clubs ? "page" : undefined}
        >
          Clubs
        </Link>
      </nav>
      <form className="account-form compact-search" action="/discover">
        <input type="hidden" name="view" value={clubs ? "clubs" : "people"} />
        <label className="sr-only" htmlFor="search">
          Search {clubs ? "clubs" : "people"}
        </label>
        <input
          id="search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder={clubs ? "Find a club" : "Search a name or username"}
        />
        <button className="icon-button" aria-label="Search">
          <Icon name="search" />
        </button>
      </form>
      {clubs && (
        <Link className="outline-button create-club" href="/communities/new">
          <Icon name="plus" /> Start a club
        </Link>
      )}
      {count ? (
        <ul className="connection-list simple-results">
          {clubs
            ? groups.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <Link href={`/communities/${c.id}`}>
                    <span className="result-avatar">
                      <Icon name="group" />
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.visibility === "private"
                          ? "Private club"
                          : "Public club"}
                      </small>
                    </span>
                  </Link>
                </li>
              ))
            : students.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <Link href={`/u/${s.handle}`}>
                    <span className="result-avatar">
                      <Icon name="user" />
                    </span>
                    <span>
                      <strong>{s.display_name || `@${s.handle}`}</strong>
                      <small>
                        @{s.handle}
                        {s.is_private ? " · Private" : ""}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      ) : (
        <div className="simple-empty">
          <Icon name={clubs ? "group" : "search"} />
          <h2>
            {q
              ? "No matches yet"
              : clubs
                ? "Start your own circle"
                : "Find a friend"}
          </h2>
          <p>
            {clubs
              ? "Make a club for your school or study friends."
              : "Search their name or username to connect."}
          </p>
        </div>
      )}
      <nav className="pagination" aria-label="Search pages">
        {page > 0 && <Link href={query(page - 1)}>Previous</Link>}
        {count > 20 && <Link href={query(page + 1)}>Next</Link>}
      </nav>
    </ProfileShell>
  );
}
