"use client";
import { useActionState } from "react";
import { deletePost } from "@/app/posts/actions";
export function DeletePostForm({
  id,
  state: status,
}: {
  id: string;
  state: string;
}) {
  const [state, action, pending] = useActionState(deletePost, {});
  return (
    <details className="post-delete" open={status === "deleting"}>
      <summary>
        {status === "draft"
          ? "Discard this draft"
          : status === "deleting"
            ? "Finish deleting"
            : "Delete this post"}
      </summary>
      <form action={action} className="account-form">
        <input type="hidden" name="post_id" value={id} />
        <fieldset disabled={pending}>
          <p className="field-hint">
            This permanently removes your post and its photo. It cannot be
            undone.
          </p>
          <label className="check-option">
            <input type="checkbox" name="confirm" required /> I want to delete
            this post and photo
          </label>
          <button className="button" type="submit">
            {pending ? "Removing post and photo…" : "Delete permanently"}
          </button>
        </fieldset>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </details>
  );
}
