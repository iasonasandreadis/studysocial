import { ProgressView } from "@/components/stats/progress-view";
import { requireOnboarded } from "@/lib/auth/session";
import type { StudyStats } from "@/lib/stats/types";
export default async function Progress() {
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase.rpc("own_study_stats");
  if (error || !data) throw new Error("Couldn’t load your study progress.");
  return <ProgressView s={data as StudyStats} />;
}
