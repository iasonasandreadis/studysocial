"use client";
import { useActionState } from "react";
import { saveStudyVisibility } from "@/app/profile/study-actions";
export function StudyVisibility({
  totals,
  live,
}: {
  totals: boolean;
  live: boolean;
}) {
  const [state, action, pending] = useActionState(saveStudyVisibility, {});
  return (
    <details id="study-sharing" className="optional-details">
      <summary>Study activity sharing</summary>
      <form action={action} className="account-form">
        <p className="field-hint">
          Shared with your profile’s audience. Private accounts require follow
          approval.
        </p>
        <label className="check-option">
          <input
            type="checkbox"
            name="totals"
            defaultChecked={totals}
            disabled={pending}
          />
          Show today, this week and my streak
        </label>
        <label className="check-option">
          <input
            type="checkbox"
            name="live"
            defaultChecked={live}
            disabled={pending}
          />
          Show when I’m studying
        </label>
        <p className="field-hint">
          A streak counts consecutive days with completed study time, using your
          study timezone. Notes stay private.
        </p>
        <button className="outline-button" disabled={pending}>
          {pending ? "Saving…" : "Save study visibility"}
        </button>
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
    </details>
  );
}
