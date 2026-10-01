"use server";
import { requireOnboarded } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { uuidPattern } from "@/lib/posts/validation";
import type { ProfileActivity } from "@/lib/stats/profile-activity";
export async function readProfileActivity(
  target: string,
): Promise<ProfileActivity | null> {
  const { supabase } = await requireOnboarded();
  if (!uuidPattern.test(target)) return null;
  const { data, error } = await supabase.rpc("profile_study_activity", {
    target,
  });
  if (error) throw new Error("Couldn’t refresh study activity.");
  return data as ProfileActivity | null;
}
export async function saveStudyVisibility(
  _previous: { error?: string; message?: string },
  form: FormData,
): Promise<{ error?: string; message?: string }> {
  const { supabase } = await requireOnboarded();
  const { error } = await supabase.rpc("save_study_visibility", {
    totals: form.get("totals") === "on",
    live: form.get("live") === "on",
  });
  if (error) return { error: "Couldn’t save. Please try again." };
  revalidatePath("/u", "layout");
  revalidatePath("/profile/edit");
  return { message: "Study visibility saved." };
}
