"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireUser } from "@/lib/auth/session";
import {
  authModes,
  siteOrigin,
  validateCredentials,
  type ActionState,
  type AuthMode,
} from "@/lib/auth/validation";

export async function authenticate(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const mode = String(form.get("mode")) as AuthMode;
  if (!authModes.includes(mode))
    return { error: "Please use one of the account forms." };
  if (!isSupabaseConfigured())
    return { error: "Accounts aren’t available yet. Please check back soon." };
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const validation = validateCredentials(mode, email, password);
  if (validation) return { error: validation };
  if (mode === "reset") await requireUser();
  let destination = "/app";
  try {
    const supabase = await createClient();
    let error;
    if (mode === "login") {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    } else if (mode === "signup") {
      const origin = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/confirm` },
      });
      error = result.error;
      destination = result.data.session ? "/onboarding" : "/check-email";
    } else if (mode === "reset") {
      ({ error } = await supabase.auth.updateUser({ password }));
    } else {
      const origin = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
      const result =
        mode === "forgot"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${origin}/auth/confirm?flow=recovery`,
            })
          : await supabase.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: `${origin}/auth/confirm` },
            });
      if (result.error?.status === 429)
        return {
          error: "Too many attempts. Please wait a few minutes and try again.",
        };
      // Identical responses prevent email/account enumeration.
      if (result.error && result.error.status && result.error.status >= 500)
        return {
          error: "Email delivery is unavailable. Please try again shortly.",
        };
      return {
        message:
          "If this address is eligible, we’ll send an email with the next steps. Check your inbox and spam folder.",
      };
    }
    if (error) {
      if (error.status === 429)
        return {
          error: "Too many attempts. Please wait a few minutes and try again.",
        };
      return {
        error:
          mode === "login"
            ? "We couldn’t sign you in. Check your email, password, and confirmation email."
            : mode === "reset"
              ? "We couldn’t update your password. Try a different password or request a new recovery link."
              : "We couldn’t create your account. Try again, or sign in if you already have an account.",
      };
    }
  } catch {
    return {
      error: "We couldn’t reach the account service. Please try again shortly.",
    };
  }
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function logout(): Promise<ActionState> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error)
        return { error: "We couldn’t sign you out. Please try again." };
    } catch {
      return { error: "We couldn’t sign you out. Please try again." };
    }
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
