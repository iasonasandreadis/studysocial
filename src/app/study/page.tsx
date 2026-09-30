import { StudyNavigation } from "@/components/timer/study-navigation";
import { randomUUID } from "node:crypto";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { StudyTimer } from "@/components/timer/study-timer";
import type { CatalogOption } from "@/lib/onboarding/types";
import type { TimerSnapshot } from "@/lib/timer/types";
export default async function Study() {
  const { supabase } = await requireOnboarded();
  const [s, c] = await Promise.all([
    supabase.rpc("timer_snapshot"),
    supabase
      .from("subjects")
      .select("id,labels")
      .order("code")
      .limit(100)
      .returns<CatalogOption[]>(),
  ]);
  if (s.error || c.error) throw new Error("We couldn’t load your timer.");
  return (
    <ProfileShell>
      <StudyNavigation current="timer" />
      <StudyTimer
        initial={s.data as TimerSnapshot}
        subjects={c.data ?? []}
        requestId={randomUUID()}
      />
    </ProfileShell>
  );
}
