"use client";
import { useActionState } from "react";
import { logout } from "@/app/auth/actions";
export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, {});
  return (
    <form action={action}>
      <button className="text-button" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
