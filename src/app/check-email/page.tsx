import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page() {
  return (
    <AccountShell
      title="Check your inbox."
      description="If your address is eligible, a confirmation email is on its way. Open the link to continue. You can request another below."
    >
      <AuthForm mode="resend" available={isSupabaseConfigured()} />
    </AccountShell>
  );
}
