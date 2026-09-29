"use server";
import { requireOnboarded } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uuidPattern } from "@/lib/posts/validation";
export type SafetyState = { error?: string; message?: string };
export async function blockAccount(
  _state: SafetyState,
  form: FormData,
): Promise<SafetyState> {
  const { supabase } = await requireOnboarded();
  const id = String(form.get("target")),
    wanted = form.get("wanted") === "yes";
  if (!uuidPattern.test(id)) return { error: "Account unavailable." };
  try {
    const { error } = await supabase.rpc("set_account_block", {
      target: id,
      wanted,
    });
    if (error)
      return { error: "Couldn’t save this block choice. Please retry." };
  } catch {
    return { error: "Connection interrupted. Please retry." };
  }
  revalidatePath("/", "layout");
  if (wanted) redirect("/safety");
  return { message: "Account unblocked. Previous follows are not restored." };
}
export async function reportContent(
  _state: SafetyState,
  form: FormData,
): Promise<SafetyState> {
  const { supabase } = await requireOnboarded();
  const id = String(form.get("id")),
    target = String(form.get("target")),
    type = String(form.get("type")),
    category = String(form.get("category")),
    description = String(form.get("description") ?? "").trim();
  if (
    !uuidPattern.test(id) ||
    !uuidPattern.test(target) ||
    !["user", "post"].includes(type) ||
    ![
      "harassment",
      "inappropriate",
      "spam",
      "impersonation",
      "privacy",
      "other",
    ].includes(category) ||
    description.length > 2000
  )
    return {
      error: "Choose a reason and keep details within 2,000 characters.",
    };
  try {
    const { error } = await supabase.rpc("submit_safety_report", {
      request_id: id,
      user_target: type === "user" ? target : null,
      post_target: type === "post" ? target : null,
      category,
      description,
    });
    if (error)
      return {
        error:
          error.code === "P0001"
            ? "Please wait a minute before submitting another report."
            : "Couldn’t save this report. The content may no longer be available.",
      };
  } catch {
    return { error: "Connection interrupted. Retry with the same details." };
  }
  return { message: "Report saved privately." };
}
export async function markNotification(
  _state: SafetyState,
  form: FormData,
): Promise<SafetyState> {
  const { supabase, user } = await requireOnboarded();
  const id = String(form.get("id"));
  if (id !== "all" && !uuidPattern.test(id))
    return { error: "Notification unavailable." };
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id);
  query = id === "all" ? query.is("read_at", null) : query.eq("id", id);
  const { error } = await query;
  if (error) return { error: "Couldn’t mark notifications read." };
  revalidatePath("/notifications");
  return { message: "Marked as read." };
}
