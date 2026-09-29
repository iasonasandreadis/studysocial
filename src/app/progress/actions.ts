"use server";
import { requireOnboarded } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
export async function savePreferences(
  _state: { error?: string; message?: string },
  form: FormData,
): Promise<{ error?: string; message?: string }> {
  const { supabase } = await requireOnboarded();
  const zone = String(form.get("timezone") ?? "").trim(),
    raw = String(form.get("goal") ?? "").trim(),
    goal = raw ? Number(raw) : null;
  if (
    !zone ||
    zone.length > 80 ||
    (goal !== null && (!Number.isInteger(goal) || goal < 1 || goal > 10080))
  )
    return {
      error:
        "Choose a timezone and an optional whole-minute goal from 1 to 10,080.",
    };
  try {
    const { error } = await supabase.rpc("save_study_preferences", {
      zone,
      goal,
    });
    if (error)
      return {
        error:
          "That timezone or goal wasn’t recognized. Check it and try again.",
      };
  } catch {
    return { error: "Couldn’t save your preferences. Please retry." };
  }
  revalidatePath("/progress");
  return { message: "Preferences saved. Your totals now use this timezone." };
}
