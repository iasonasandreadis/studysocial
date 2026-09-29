"use client";
import { useActionState } from "react";
import {
  blockAccount,
  reportContent,
  markNotification,
} from "@/app/safety/actions";
export function BlockControl({
  target,
  unblock = false,
}: {
  target: string;
  unblock?: boolean;
}) {
  const [state, action, pending] = useActionState(blockAccount, {});
  return (
    <form action={action}>
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="wanted" value={unblock ? "no" : "yes"} />
      <button className="text-button" disabled={pending}>
        {pending
          ? "Saving…"
          : unblock
            ? "Unblock account"
            : "Block this account"}
      </button>
      {state.error && (
        <p className="form-error" role="alert">
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
export function ReportControl({
  id,
  target,
  type,
}: {
  id: string;
  target: string;
  type: "user" | "post";
}) {
  const [state, action, pending] = useActionState(reportContent, {});
  return (
    <details className="post-delete">
      <summary>Report this {type === "user" ? "account" : "post"}</summary>
      {state.message ? (
        <p className="form-notice" role="status">
          {state.message}
        </p>
      ) : (
        <form
          action={action}
          className="account-form"
          onReset={(e) => e.preventDefault()}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="type" value={type} />
          <fieldset disabled={pending}>
            <label>
              Reason
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Choose a reason
                </option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="spam">Spam</option>
                <option value="impersonation">Impersonation</option>
                <option value="privacy">Privacy concern</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Details <span className="optional">(optional)</span>
              <textarea name="description" maxLength={2000} rows={3} />
            </label>
            <p className="field-hint">
              Reports are private. Include only details needed to explain your
              concern.
            </p>
            <button className="button">
              {pending ? "Saving report…" : "Submit report"}
            </button>
          </fieldset>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
        </form>
      )}
    </details>
  );
}
export function MarkRead({ id = "all" }: { id?: string }) {
  const [state, action, pending] = useActionState(markNotification, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="text-button" disabled={pending}>
        {pending ? "Saving…" : id === "all" ? "Mark all as read" : "Mark read"}
      </button>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
