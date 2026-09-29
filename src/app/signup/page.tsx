import { redirectSignedInUser } from "@/lib/auth/session";
import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page() {
  await redirectSignedInUser();
  return (
    <AccountShell
      title="Find your study people."
      description="Create your account, then make this space your own."
    >
      <AuthForm mode="signup" available={isSupabaseConfigured()} />
    </AccountShell>
  );
}
