import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
export default async function AppHome() {
  const { supabase, user } = await requireOnboarded();
  const { data, error } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .single();
  if (error || !data.handle)
    throw new Error("We couldn’t load your profile. Please try again.");
  redirect(`/u/${data.handle}`);
}
