"use client";
import { useActionState } from "react";
import { changeRelationship } from "@/app/profile/actions";
export function SocialControls({
  target,
  actions,
}: {
  target: string;
  actions: { action: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(changeRelationship, {});
  return (
    <form action={action} className="social-controls">
      <input type="hidden" name="target" value={target} />
      <div className="social-buttons">
        {actions.map((item) => (
          <button
            key={item.action}
            className="button"
            name="action"
            value={item.action}
            disabled={pending}
          >
            {pending ? "Saving…" : item.label}
          </button>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="field-hint">
          {state.message}
        </p>
      )}
    </form>
  );
}
