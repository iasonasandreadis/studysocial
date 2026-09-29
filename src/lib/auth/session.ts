import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  // Server-confirmed identity; a cookie or getSession alone is not authentication.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  if (!data.user.email_confirmed_at) redirect("/check-email");
  return { supabase, user: data.user };
}
export async function requireOnboarded() {
  const session = await requireUser();
  const { data, error } = await session.supabase
    .from("user_settings")
    .select("onboarding_completed_at")
    .eq("user_id", session.user.id)
    .single();
  if (error)
    throw new Error("We couldn’t load your account. Please try again.");
  if (!data.onboarding_completed_at) redirect("/onboarding");
  return session;
}

export async function redirectSignedInUser() {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email_confirmed_at) redirect("/app");
}
