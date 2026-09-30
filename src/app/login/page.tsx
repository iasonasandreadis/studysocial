import { SocialSignIn } from "@/components/auth/social-signin";
import { availableProviders } from "@/lib/auth/provider-settings";
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
  const providers = await availableProviders();
  const params = await searchParams;
  return (
    <AccountShell
      title="Welcome back."
      description="Your people are right here."
    >
      {params.message === "link-expired" && (
        <p className="form-error" role="alert">
          We couldn’t finish signing you in with that link. If you already
          confirmed your email, try signing in below. Otherwise request a fresh
          link and open it in the same browser where you started.
        </p>
      )}
      <SocialSignIn providers={providers} />
      {providers.length ? (
        <details className="optional-details">
          <summary>Continue with email</summary>
          <AuthForm mode="login" available={isSupabaseConfigured()} />
        </details>
      ) : (
        <AuthForm mode="login" available={isSupabaseConfigured()} />
      )}
    </AccountShell>
  );
}
