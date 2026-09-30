import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { Membership } from "@/components/discover/forms";
import { PostCard } from "@/components/feed/post-card";
import { uuidPattern } from "@/lib/posts/validation";
import { pageNumber } from "@/lib/feed/validation";
import type { CommunityInfo, Student } from "@/lib/discover/types";
import type { FeedPost } from "@/lib/feed/types";
export default async function Community({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; members?: string; requests?: string }>;
}) {
  const { id } = await params,
    query = await searchParams,
    page = pageNumber(query.page),
    memberPage = pageNumber(query.members),
    requestPage = pageNumber(query.requests);
  const { supabase } = await requireOnboarded();
  if (!uuidPattern.test(id)) notFound();
  const { data, error } = await supabase.rpc("community_info", { target: id });
  if (error) throw new Error("Couldn’t load community.");
  if (!data) notFound();
  const c = data as CommunityInfo;
  const [f, m, r] = await Promise.all([
    c.can_view
      ? supabase.rpc("community_feed", { target: id, page_number: page })
      : Promise.resolve({ data: [], error: null }),
    c.member
      ? supabase.rpc("community_people", {
          target: id,
          page_number: memberPage,
          pending_only: false,
        })
      : Promise.resolve({ data: [], error: null }),
    c.own
      ? supabase.rpc("community_people", {
          target: id,
          page_number: requestPage,
          pending_only: true,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (f.error || m.error || r.error)
    throw new Error("Couldn’t load community activity.");
  const rows = (f.data ?? []) as FeedPost[],
    members = (m.data ?? []) as Student[],
    requests = (r.data ?? []) as Student[];
  const posts = await Promise.all(
    rows.slice(0, 20).map(async (p) => {
      const { data } = p.image_path
        ? await supabase.storage
            .from("post-images")
            .createSignedUrl(p.image_path, 60)
        : { data: null };
      return { ...p, imageUrl: data?.signedUrl ?? null };
    }),
  );
  const link = (key: string, value: number) =>
    `/communities/${id}?${new URLSearchParams({ ...{ page: String(page), members: String(memberPage), requests: String(requestPage) }, [key]: String(value) })}`;
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <Link className="text-button" href="/discover">
          ← Discover
        </Link>
        <p className="eyebrow">{c.visibility} · STUDENT COMMUNITY</p>
        <h1>{c.name}</h1>
        <p className="post-caption">
          {c.description ?? "This club is private. Request to join."}
        </p>
        {c.member ? (
          <>
            <Link className="button" href={`/posts/new?community=${id}`}>
              Share a study moment
            </Link>
            {!c.own && <Membership id={id} action="leave" label="Leave club" />}
          </>
        ) : (
          <Membership
            id={id}
            action={c.pending ? "leave" : "join"}
            label={
              c.pending
                ? "Cancel join request"
                : c.visibility === "private"
                  ? "Request to join"
                  : "Join club"
            }
          />
        )}
        <p className="field-hint">
          Community membership never widens a private account’s post audience.
          Members still need the author’s permission.
        </p>
      </section>
      {c.own && (
        <section className="onboarding-card discover-section">
          <h2>Join requests</h2>
          {requests.length ? (
            <ul className="connection-list">
              {requests.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <Link href={`/u/${s.handle}`}>@{s.handle}</Link>
                  <div className="social-buttons">
                    <Membership
                      id={id}
                      member={s.id}
                      action="accept"
                      label="Approve"
                    />
                    <Membership
                      id={id}
                      member={s.id}
                      action="reject"
                      label="Decline"
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">No pending requests.</p>
          )}
          <nav className="pagination">
            {requestPage > 0 && (
              <Link href={link("requests", requestPage - 1)}>
                Previous requests
              </Link>
            )}
            {requests.length > 20 && (
              <Link href={link("requests", requestPage + 1)}>
                More requests
              </Link>
            )}
          </nav>
        </section>
      )}
      {c.member && (
        <section className="onboarding-card discover-section">
          <h2>Members</h2>
          <ul className="connection-list">
            {members.slice(0, 20).map((s) => (
              <li key={s.id}>
                <Link href={`/u/${s.handle}`}>
                  <strong>{s.display_name ?? `@${s.handle}`}</strong>
                  <span>@{s.handle}</span>
                </Link>
              </li>
            ))}
          </ul>
          <nav className="pagination">
            {memberPage > 0 && (
              <Link href={link("members", memberPage - 1)}>
                Previous members
              </Link>
            )}
            {members.length > 20 && (
              <Link href={link("members", memberPage + 1)}>More members</Link>
            )}
          </nav>
        </section>
      )}
      {c.can_view && (
        <section className="discover-section">
          <h2>Study moments</h2>
          {posts.length ? (
            <div className="feed-list">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <p className="form-notice">
              No posts are available to you here yet.
            </p>
          )}
          <nav className="pagination">
            {page > 0 && (
              <Link href={link("page", page - 1)}>← Previous posts</Link>
            )}
            {rows.length > 20 && (
              <Link href={link("page", page + 1)}>More posts →</Link>
            )}
          </nav>
        </section>
      )}
    </ProfileShell>
  );
}
