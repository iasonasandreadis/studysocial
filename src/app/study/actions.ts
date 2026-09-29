"use server";
import { requireOnboarded } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { uuidPattern } from "@/lib/posts/validation";
import type { TimerSnapshot } from "@/lib/timer/types";
export async function readTimer(): Promise<TimerSnapshot> {
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase.rpc("timer_snapshot");
  if (error) throw new Error("Could not sync timer");
  return data as TimerSnapshot;
}
export async function updateTimer(input: {
  id: string;
  operation: string;
  subject?: string;
  version?: number;
  note?: string;
}): Promise<{ snapshot?: TimerSnapshot; error?: string }> {
  const { supabase } = await requireOnboarded();
  if (
    !uuidPattern.test(input.id) ||
    !["start", "pause", "resume", "finish", "discard", "note"].includes(
      input.operation,
    ) ||
    (input.note !== undefined &&
      (typeof input.note !== "string" || input.note.length > 2000))
  )
    return { error: "Check your timer details and try again." };
  if (
    input.operation === "start" &&
    (!input.subject || !uuidPattern.test(input.subject))
  )
    return { error: "Choose a subject first." };
  if (
    input.operation !== "start" &&
    (!Number.isInteger(input.version) || input.version! < 0)
  )
    return { error: "Refresh the timer and try again." };
  try {
    const { data, error } =
      input.operation === "start"
        ? await supabase.rpc("start_study_session", {
            request_id: input.id,
            subject: input.subject,
          })
        : await supabase.rpc("change_study_session", {
            target: input.id,
            operation: input.operation,
            expected_version: input.version,
            note: input.note ?? null,
          });
    if (error)
      return {
        error:
          error.code === "40001"
            ? "This session changed in another tab. Sync the timer, then retry."
            : "Couldn’t save this change. Sync to check its status before retrying.",
      };
    revalidatePath("/sessions");
    revalidatePath("/progress");
    revalidatePath("/u", "layout");
    revalidatePath("/study");
    return { snapshot: data as TimerSnapshot };
  } catch {
    return {
      error:
        "Connection interrupted. Sync before retrying; your saved timer continues on the server.",
    };
  }
}
