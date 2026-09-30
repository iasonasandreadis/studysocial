import { randomUUID } from "node:crypto";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { CommunityForm } from "@/components/discover/forms";
export default async function NewCommunity() {
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase
    .from("schools")
    .select("id,name")
    .order("name")
    .limit(100);
  if (error) throw new Error("Couldn’t load the school catalog.");
  return (
    <ProfileShell>
      <section className="onboarding-card">
        <p className="eyebrow">STUDY BETTER TOGETHER</p>
        <h1>New club</h1>
        <CommunityForm id={randomUUID()} schools={data ?? []} />
      </section>
    </ProfileShell>
  );
}
