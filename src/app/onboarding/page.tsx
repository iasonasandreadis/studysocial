import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { AvatarForm } from "@/components/onboarding/avatar-form";
import { LogoutButton } from "@/components/auth/logout-button";
import type {
  CatalogOption,
  Profile,
  SchoolOption,
  Settings,
} from "@/lib/onboarding/types";

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const results = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,handle,bio,avatar_path,is_private")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("user_settings")
      .select(
        "onboarding_step,onboarding_completed_at,academic_year,academic_direction,program_id,target_university,target_program,goal_text,school_id,school_name",
      )
      .eq("user_id", user.id)
      .single<Settings>(),
    supabase
      .from("subjects")
      .select("id,labels")
      .order("code")
      .limit(100)
      .returns<CatalogOption[]>(),
    supabase
      .from("academic_programs")
      .select("id,labels")
      .order("code")
      .limit(100)
      .returns<CatalogOption[]>(),
    supabase
      .from("schools")
      .select("id,name,country_code")
      .order("name")
      .limit(100)
      .returns<SchoolOption[]>(),
    supabase.from("user_subjects").select("subject_id").eq("user_id", user.id),
  ]);
  if (results.some((r) => r.error) || !results[0].data || !results[1].data)
    throw new Error("We couldn’t load your saved details. Please try again.");
  const profile = results[0].data,
    settings = results[1].data;
  if (settings.onboarding_completed_at) redirect("/app");
  const requested = Number((await searchParams).step);
  const step = [1, 2, 3].includes(requested)
    ? Math.min(requested, settings.onboarding_step)
    : settings.onboarding_step;
  let avatarUrl: string | null = null;
  if (step === 1 && profile.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 60);
    avatarUrl = data?.signedUrl ?? null;
  }
  const titles = [
    "Make yourself at home.",
    "What’s your next chapter?",
    "Your space. Your choice.",
  ];
  const descriptions = [
    "Start with the name you want your study people to know.",
    "A little context to help make this space yours.",
    "Choose a comfortable starting point for sharing.",
  ];
  return (
    <main id="main" className="container onboarding-shell">
      <div className="onboarding-top">
        <Link href="/">← Home</Link>
        <LogoutButton />
      </div>
      <nav className="step-nav" aria-label="Setup progress">
        {["About you", "Your studies", "Your privacy"].map((label, index) =>
          index + 1 <= settings.onboarding_step ? (
            <Link
              key={label}
              href={`/onboarding?step=${index + 1}`}
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </Link>
          ) : (
            <span key={label} className="future-step">
              <span>{index + 1}</span>
              {label}
            </span>
          ),
        )}
      </nav>
      <section className="onboarding-card">
        <p className="eyebrow">STEP {step} OF 3</p>
        <h1>{titles[step - 1]}</h1>
        <p className="account-description">{descriptions[step - 1]}</p>
        {step === 1 && (
          <AvatarForm
            url={avatarUrl}
            hasAvatar={Boolean(profile.avatar_path)}
          />
        )}
        <OnboardingForm
          key={step}
          step={step}
          profile={profile}
          settings={settings}
          subjects={results[2].data ?? []}
          programs={results[3].data ?? []}
          schools={results[4].data ?? []}
          selectedSubjects={(results[5].data ?? []).map((s) => s.subject_id)}
        />
        {step > 1 && (
          <Link className="text-button" href={`/onboarding?step=${step - 1}`}>
            ← Back to previous step
          </Link>
        )}
      </section>
    </main>
  );
}
