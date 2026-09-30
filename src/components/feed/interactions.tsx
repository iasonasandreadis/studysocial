"use client";
import { Icon } from "@/components/ui/icon";
import { useActionState } from "react";
import { changeKudos, addComment, removeComment } from "@/app/feed/actions";
import type { Activity } from "@/lib/feed/types";
export function Kudos({ id, activity }: { id: string; activity: Activity }) {
  const [state, action, pending] = useActionState(changeKudos, {});
  return (
    <form action={action}>
      <input type="hidden" name="post_id" value={id} />
      <input
        type="hidden"
        name="wanted"
        value={activity.has_kudos ? "no" : "yes"}
      />
      <button
        className="kudos-button"
        type="submit"
        aria-pressed={activity.has_kudos}
        aria-label={activity.has_kudos ? "Unlike post" : "Like post"}
        disabled={pending}
      >
        <Icon name="heart" filled={activity.has_kudos} />
        <span>{activity.kudos_count}</span>
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <span className="sr-only" role="status">
        {state.message}
      </span>
    </form>
  );
}
export function CommentForm({ postId, id }: { postId: string; id: string }) {
  const [state, action, pending] = useActionState(addComment, {});
  if (state.completedId)
    return (
      <p role="status" className="form-notice">
        Comment added.{" "}
        <a className="text-button" href={`/posts/${postId}#comments`}>
          View latest comments or write another
        </a>
      </p>
    );
  return (
    <form
      action={action}
      className="account-form"
      onReset={(e) => e.preventDefault()}
    >
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="comment_id" value={id} />
      <fieldset disabled={pending}>
        <label>
          Add a comment
          <textarea
            name="body"
            required
            minLength={1}
            maxLength={1000}
            rows={3}
            placeholder="A little encouragement goes a long way."
          />
        </label>
        <button type="submit" className="button">
          {pending ? "Posting…" : "Post comment"}
        </button>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function DeleteComment({ postId, id }: { postId: string; id: string }) {
  const [state, action, pending] = useActionState(removeComment, {});
  return (
    <form action={action}>
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="comment_id" value={id} />
      <button type="submit" className="text-button" disabled={pending}>
        {pending ? "Deleting…" : "Delete my comment"}
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
