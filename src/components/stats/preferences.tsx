"use client";
import { useActionState, useState } from "react";
import { savePreferences } from "@/app/progress/actions";
export function StudyPreferences({
  timezone,
  goal,
}: {
  timezone: string;
  goal: number | null;
}) {
  const [state, action, pending] = useActionState(savePreferences, {}),
    [zone, setZone] = useState(timezone);
  return (
    <form action={action} className="account-form">
      <fieldset disabled={pending}>
        <label>
          Your timezone
          <input
            name="timezone"
            value={zone}
            maxLength={80}
            required
            list="timezones"
            onChange={(e) => setZone(e.target.value)}
          />
          <datalist id="timezones">
            {[
              "Europe/Athens",
              "UTC",
              "Europe/London",
              "Europe/Paris",
              "America/New_York",
              "America/Los_Angeles",
              "Asia/Tokyo",
              "Australia/Sydney",
            ].map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
          }
        >
          Use this device’s timezone
        </button>
        <label>
          Weekly goal in minutes <span className="optional">(optional)</span>
          <input
            type="number"
            name="goal"
            min={1}
            max={10080}
            step={1}
            defaultValue={goal ?? ""}
          />
          <span className="field-hint">
            Choose a pace that works for you, or leave this empty for no goal.
          </span>
        </label>
        <button className="button">
          {pending ? "Saving…" : "Save preferences"}
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
    </form>
  );
}
