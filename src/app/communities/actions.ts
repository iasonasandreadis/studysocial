"use server";
import { requireOnboarded } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uuidPattern } from "@/lib/posts/validation";
export type CommunityActionState = { error?: string; message?: string };
export async function createCommunity(
  _state: CommunityActionState,
  form: FormData,
): Promise<CommunityActionState> {
  const { supabase, user } = await requireOnboarded();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const id = get("id"),
    name = get("name"),
    description = get("description"),
    kind = get("kind"),
    visibility = get("visibility"),
    school = get("school_id");
  if (
    !uuidPattern.test(id) ||
    !name ||
    name.length > 100 ||
    description.length > 1000 ||
    !["school", "university", "subject", "exam", "goal", "group"].includes(
      kind,
    ) ||
    !["private", "public"].includes(visibility) ||
    (school && !uuidPattern.test(school))
  )
    return { error: "Check the name, description, type and visibility." };
  const { error } = await supabase
    .from("communities")
    .insert({
      id,
      owner_id: user.id,
      slug: `community-${id}`,
      name,
      description,
      kind,
      visibility,
      school_id: school || null,
    });
  if (error) {
    const { data } = await supabase
      .from("communities")
      .select("id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!data)
      return {
        error:
          "Couldn’t create this community. Check your connection and retry.",
      };
  }
  revalidatePath("/discover");
  redirect(`/communities/${id}`);
}
export async function communityAction(
  _state: CommunityActionState,
  form: FormData,
): Promise<CommunityActionState> {
  const { supabase, user } = await requireOnboarded();
  const id = String(form.get("id")),
    action = String(form.get("action")),
    member = String(form.get("member") ?? "");
  if (
    !uuidPattern.test(id) ||
    !["join", "leave", "accept", "reject"].includes(action) ||
    (["accept", "reject"].includes(action) && !uuidPattern.test(member))
  )
    return { error: "Invalid community action." };
  try {
    const result =
      action === "join"
        ? await supabase.rpc("request_membership", { target: id })
        : action === "accept"
          ? await supabase.rpc("accept_membership", { target: id, member })
          : await supabase
              .from("community_members")
              .delete()
              .eq("community_id", id)
              .eq("user_id", action === "leave" ? user.id : member);
    if (result.error)
      return {
        error: "This action is unavailable. Check your membership and retry.",
      };
  } catch {
    return { error: "Connection interrupted. Refresh and retry." };
  }
  revalidatePath("/", "layout");
  return { message: "Membership updated." };
}
export async function schoolDiscovery(
  _state: CommunityActionState,
  form: FormData,
): Promise<CommunityActionState> {
  const { supabase, user } = await requireOnboarded();
  const { error } = await supabase
    .from("user_settings")
    .update({ share_school: form.get("share_school") === "on" })
    .eq("user_id", user.id);
  if (error) return { error: "Couldn’t save your choice." };
  revalidatePath("/discover");
  return { message: "School discovery preference saved." };
}
