import { StudyVisibility } from "@/components/profile/study-visibility";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { EditForm } from "@/components/profile/edit-form";
import { AvatarForm } from "@/components/onboarding/avatar-form";
import type { Profile, CatalogOption } from "@/lib/onboarding/types";
import type { ProfileSettings } from "@/lib/profile/types";
export default async function EditProfile() {
  const { supabase, user } = await requireOnboarded();
  const [p, s, c, selection] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,handle,bio,is_private,avatar_path")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("user_settings")
      .select(
        "academic_year,academic_direction,goal_text,target_university,target_program,share_year,share_direction,share_subjects,share_goal,share_target,share_study_totals,share_study_live",
      )
      .eq("user_id", user.id)
      .single<ProfileSettings>(),
    supabase
      .from("subjects")
      .select("id,labels")
      .order("code")
      .limit(100)
      .returns<CatalogOption[]>(),
    supabase.from("user_subjects").select("subject_id").eq("user_id", user.id),
  ]);
  if (p.error || s.error || c.error || selection.error || !p.data || !s.data)
    throw new Error("We couldn’t load your profile details.");
  let url: string | null = null;
  if (p.data.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(p.data.avatar_path, 60);
    url = data?.signedUrl ?? null;
  }
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <Link href={`/u/${p.data.handle}`} className="text-button">
          ← Back to profile
        </Link>
        <h1>Make it yours.</h1>
        <p className="account-description">
          Choose how you introduce yourself and what you share.
        </p>
        <AvatarForm url={url} hasAvatar={Boolean(p.data.avatar_path)} />
        <StudyVisibility
          totals={s.data.share_study_totals}
          live={s.data.share_study_live}
        />
        <EditForm
          profile={p.data}
          settings={s.data}
          subjects={c.data ?? []}
          selected={(selection.data ?? []).map((s) => s.subject_id)}
        />
      </section>
    </ProfileShell>
  );
}
