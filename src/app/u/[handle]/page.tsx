import { StudyGoal } from "@/components/profile/study-goal";
import { StudyActivity } from "@/components/profile/study-activity";
import type { ProfileActivity } from "@/lib/stats/profile-activity";
import { PhotoGrid } from "@/components/profile/photo-grid";
import { pageNumber } from "@/lib/feed/validation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BlockControl, ReportControl } from "@/components/safety/controls";
import { loadProfile } from "@/lib/profile/data";
import { ProfileShell } from "@/components/profile/profile-shell";
import { SocialControls } from "@/components/profile/social-controls";
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { handle } = await params;
  const page = pageNumber((await searchParams).page);
  const { supabase, profile: p } = await loadProfile(handle);
  const { data: study, error: studyError } = await supabase.rpc(
    "profile_study_activity",
    { target: p.id },
  );
  if (studyError) throw new Error("Couldn’t load study activity.");
  let avatar: string | null = null;
  if (p.can_view && p.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(p.avatar_path, 60);
    avatar = data?.signedUrl ?? null;
  }
  const actions =
    p.relationship === "following"
      ? [{ action: "unfollow", label: "Unfollow" }]
      : p.relationship === "requested"
        ? [{ action: "cancel", label: "Cancel request" }]
        : [
            {
              action: "follow",
              label: p.is_private ? "Request to follow" : "Follow",
            },
          ];
  return (
    <ProfileShell>
      <section className="profile-card">
        <div className="profile-content">
          <div className="profile-heading">
            <div className="profile-avatar">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={`${p.display_name}'s avatar`}
                  width={96}
                  height={96}
                />
              ) : (
                <span aria-hidden="true">
                  {p.can_view ? p.display_name?.slice(0, 1).toUpperCase() : "✳"}
                </span>
              )}
            </div>
            {p.is_self ? (
              <Link className="outline-button" href="/profile/edit">
                Edit profile
              </Link>
            ) : (
              <SocialControls target={p.id} actions={actions} />
            )}
          </div>
          {!p.is_self && (
            <details className="profile-safety">
              <summary>Account safety options</summary>
              <p className="field-hint">
                Blocking removes your connections and hides this account’s
                content. You can unblock in Safety.
              </p>
              <BlockControl target={p.id} />
              <ReportControl id={randomUUID()} target={p.id} type="user" />
            </details>
          )}
          <p className="eyebrow">
            {p.is_private ? "PRIVATE PROFILE" : "PUBLIC PROFILE"}
          </p>
          <h1>{p.can_view ? p.display_name : `@${p.handle}`}</h1>
          {p.can_view && <p className="profile-handle">@{p.handle}</p>}
          {!p.can_view ? (
            <div className="profile-empty">
              <h2>A little privacy goes a long way.</h2>
              <p>
                Request to follow to see this person’s profile. Their details
                stay private until they approve you.
              </p>
              {p.relationship === "requested" && (
                <p>Your request is waiting for approval.</p>
              )}
            </div>
          ) : (
            <>
              <StudyGoal profile={p} />
              <StudyActivity
                key={p.id}
                target={p.id}
                initial={study as ProfileActivity | null}
                own={p.is_self}
              />
              {p.bio && <p className="profile-bio">{p.bio}</p>}
              <div className="profile-counts">
                <Link href={`/u/${p.handle}/connections?direction=followers`}>
                  <strong>{p.followers}</strong> Followers
                </Link>
                <Link href={`/u/${p.handle}/connections?direction=following`}>
                  <strong>{p.following}</strong> Following
                </Link>
              </div>
              {(p.academic_year || p.academic_direction) && (
                <details className="profile-about">
                  <summary>Academic details</summary>
                  <div className="profile-details">
                    {p.academic_year && (
                      <div>
                        <span>Academic year</span>
                        <p>{p.academic_year}</p>
                      </div>
                    )}
                    {p.academic_direction && (
                      <div>
                        <span>Study direction</span>
                        <p>{p.academic_direction}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
              <PhotoGrid
                authorId={p.id}
                own={p.is_self}
                page={page}
                handle={p.handle}
              />
            </>
          )}
        </div>
      </section>
    </ProfileShell>
  );
}
