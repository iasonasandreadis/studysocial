import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page() {
  return (
    <AccountShell
      title="Check your inbox."
      description="If your address is eligible, a confirmation email is on its way. Open the newest link in the same browser where you signed up. If the link says it was already used, try signing in with your password. You can request another below."
    >
      <AuthForm mode="resend" available={isSupabaseConfigured()} />
    </AccountShell>
  );
}
