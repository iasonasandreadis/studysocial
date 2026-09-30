import { SocialSignIn } from "@/components/auth/social-signin";
import { availableProviders } from "@/lib/auth/provider-settings";
import { redirectSignedInUser } from "@/lib/auth/session";
import { AccountShell } from "@/components/auth/account-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Page() {
  await redirectSignedInUser();
  const providers = await availableProviders();
  return (
    <AccountShell
      title="Find your study people."
      description="Create your account, then make this space your own."
    >
      <SocialSignIn providers={providers} />
      {providers.length ? (
        <details className="optional-details">
          <summary>Continue with email</summary>
          <AuthForm mode="signup" available={isSupabaseConfigured()} />
        </details>
      ) : (
        <AuthForm mode="signup" available={isSupabaseConfigured()} />
      )}
    </AccountShell>
  );
}
