import "server-only";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import type { SocialProfile } from "./types";
export async function loadProfile(handle: string) {
  const session = await requireOnboarded();
  if (!/^[a-z0-9_]{3,30}$/i.test(handle)) notFound();
  const { data, error } = await session.supabase.rpc("social_profile", {
    username: handle.toLowerCase(),
  });
  if (error)
    throw new Error("We couldn’t load this profile. Please try again.");
  if (!data) notFound();
  return { ...session, profile: data as SocialProfile };
}
