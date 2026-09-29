"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";
import type { AuthMode } from "@/lib/auth/validation";

const labels = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Send recovery email",
  reset: "Save new password",
  resend: "Resend confirmation",
};
export function AuthForm({
  mode,
  available,
}: {
  mode: AuthMode;
  available: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, {});
  const needsPassword = ["login", "signup", "reset"].includes(mode);
  return (
    <form
      action={action}
      className="account-form"
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="mode" value={mode} />
      {!available && (
        <p className="form-notice" role="status">
          Accounts aren’t available yet. You can explore StudySocial while we
          get things ready.
        </p>
      )}
      <fieldset disabled={!available || pending}>
        {mode !== "reset" && (
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
        )}
        {needsPassword && (
          <label>
            {mode === "reset" ? "New password" : "Password"}
            <input
              type="password"
              name="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              aria-describedby={mode !== "login" ? "password-hint" : undefined}
            />
            {mode !== "login" && (
              <span className="field-hint" id="password-hint">
                At least 12 characters. A memorable phrase works well.
              </span>
            )}
          </label>
        )}
        {mode === "signup" && (
          <p className="field-hint">
            Start with a private profile. Choose what you share during setup.
            Your email stays private.
          </p>
        )}
        <button className="button" type="submit">
          {pending ? "One moment…" : labels[mode]}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="form-notice" role="status">
          {state.message}
        </p>
      )}
      {mode === "login" && (
        <div className="form-links">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/check-email">Resend confirmation</Link>
        </div>
      )}
      <p className="form-switch">
        {mode === "signup" ? (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        ) : mode === "login" ? (
          <>
            New here? <Link href="/signup">Create an account</Link>
          </>
        ) : (
          <Link href="/login">Back to sign in</Link>
        )}
      </p>
    </form>
  );
}
