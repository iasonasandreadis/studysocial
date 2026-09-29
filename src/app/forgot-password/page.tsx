import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page() {
  return (
    <AccountShell
      title="A fresh start."
      description="Enter your email to request a password recovery link."
    >
      <AuthForm mode="forgot" available={isSupabaseConfigured()} />
    </AccountShell>
  );
}
