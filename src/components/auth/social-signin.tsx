"use client";
import { useActionState } from "react";
import { socialSignIn } from "@/app/auth/actions";
import type { SocialProvider } from "@/lib/auth/providers";
export function SocialSignIn({ providers }: { providers: SocialProvider[] }) {
  const [state, action, pending] = useActionState(socialSignIn, {});
  if (!providers.length) return null;
  return (
    <form action={action} className="provider-buttons">
      {providers.map((provider) => (
        <button
          className={provider === "apple" ? "apple-signin" : undefined}
          key={provider}
          name="provider"
          value={provider}
          disabled={pending}
        >
          {pending
            ? "Opening sign-in…"
            : `Continue with ${provider === "apple" ? "Apple" : "Google"}`}
        </button>
      ))}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
