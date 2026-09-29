"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/validation";
import {
  relationshipActions,
  validTarget,
  validateProfile,
} from "@/lib/profile/validation";
export async function changeRelationship(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboarded();
  const action = String(form.get("action")),
    target = String(form.get("target"));
  if (!relationshipActions.some((a) => a === action) || !validTarget(target))
    return { error: "That action isn’t available." };
  try {
    const { error } = await supabase.rpc("change_follow", { action, target });
    if (error)
      return {
        error:
          "We couldn’t update this connection. It may no longer be available. Please refresh and try again.",
      };
  } catch {
    return { error: "We couldn’t save this change. Please try again." };
  }
  revalidatePath("/", "layout");
  const messages: Record<string, string> = {
    follow: "Your follow has been saved. Private profiles require approval.",
    unfollow: "Unfollowed.",
    cancel: "Request cancelled.",
    accept: "Request accepted.",
    reject: "Request declined.",
    remove: "Follower removed.",
  };
  return { message: messages[action] };
}
export async function editProfile(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboarded();
  const { payload, error } = validateProfile(form);
  if (error || !payload) return { error };
  try {
    const { error: saveError } = await supabase.rpc("edit_social_profile", {
      payload,
    });
    if (saveError)
      return {
        error:
          saveError.code === "23505"
            ? "That username is taken. Try another."
            : "We couldn’t save your profile. Check the fields and try again.",
      };
  } catch {
    return { error: "We couldn’t save your profile. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/u/${payload.handle}`);
}
