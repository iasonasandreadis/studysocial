import { redirectSignedInUser } from "@/lib/auth/session";
import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await redirectSignedInUser();
  const params = await searchParams;
  return (
    <AccountShell
      title="Welcome back."
      description="Your next chapter starts with showing up."
    >
      {params.message === "link-expired" && (
        <p className="form-error" role="alert">
          That link is invalid or has expired. Request a new confirmation or
          recovery email below.
        </p>
      )}
      <AuthForm mode="login" available={isSupabaseConfigured()} />
    </AccountShell>
  );
}
