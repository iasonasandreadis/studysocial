"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/validation";
import { validateOnboarding } from "@/lib/onboarding/validation";
import { MAX_AVATAR_BYTES, prepareAvatar } from "@/lib/onboarding/avatar";

export async function saveOnboarding(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const step = Number(form.get("step"));
  const { payload, error } = validateOnboarding(step, form);
  if (error || !payload) return { error };
  try {
    const { error: saveError } = await supabase.rpc("save_onboarding", {
      step,
      payload,
    });
    if (saveError)
      return {
        error:
          saveError.code === "23505"
            ? "That username is taken. Try another one."
            : "We couldn’t save these details. Check your selections and try again.",
      };
  } catch {
    return {
      error:
        "We couldn’t save your changes. Please check your connection and try again.",
    };
  }
  revalidatePath("/onboarding");
  redirect(step === 3 ? "/app" : `/onboarding?step=${step + 1}`);
}

export async function updateAvatar(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const file = form.get("avatar");
  const removing = form.get("remove") === "true";
  if (
    !removing &&
    (!(file instanceof File) || file.size === 0 || file.size > MAX_AVATAR_BYTES)
  )
    return { error: "Choose a JPEG, PNG, or WebP image smaller than 2 MB." };
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  if (readError)
    return { error: "We couldn’t load your photo. Please try again." };
  let path: string | null = null;
  try {
    if (!removing && file instanceof File) {
      const bytes = await prepareAvatar(
        new Uint8Array(await file.arrayBuffer()),
      );
      path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, bytes, {
          contentType: "image/webp",
          cacheControl: "0",
          upsert: false,
        });
      if (error)
        return { error: "We couldn’t upload that photo. Please try again." };
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id);
    if (error) {
      if (path) await supabase.storage.from("avatars").remove([path]);
      return { error: "We couldn’t save that photo. Please try again." };
    }
    if (profile.avatar_path) {
      const { error: cleanupError } = await supabase.storage
        .from("avatars")
        .remove([profile.avatar_path]);
      if (cleanupError) {
        revalidatePath("/", "layout");
        return {
          message:
            "Your photo was updated. The previous file could not be removed yet; please contact support before deleting your account.",
        };
      }
    }
  } catch {
    return {
      error:
        "We couldn’t process that image. Try a smaller, still JPEG, PNG, or WebP file.",
    };
  }
  revalidatePath("/", "layout");
  return {
    message: removing
      ? "Photo removed."
      : "Photo saved. You can continue below.",
  };
}
