"use client";
import { Icon } from "@/components/ui/icon";
import { useActionState, useOptimistic } from "react";
import { changeKudos, addComment, removeComment } from "@/app/feed/actions";
import type { Activity } from "@/lib/feed/types";
export function Kudos({ id, activity }: { id: string; activity: Activity }) {
  const [state, action, pending] = useActionState(changeKudos, {});
  const [display, setLiked] = useOptimistic(
    activity,
    (current, liked: boolean) => ({
      ...current,
      has_kudos: liked,
      kudos_count: Math.max(
        0,
        current.kudos_count + Number(liked) - Number(current.has_kudos),
      ),
    }),
  );
  return (
    <form
      action={async (form) => {
        setLiked(form.get("wanted") === "yes");
        await action(form);
      }}
    >
      <input type="hidden" name="post_id" value={id} />
      <input
        type="hidden"
        name="wanted"
        value={activity.has_kudos ? "no" : "yes"}
      />
      <button
        className="kudos-button"
        type="submit"
        aria-pressed={display.has_kudos}
        aria-label={display.has_kudos ? "Unlike post" : "Like post"}
        disabled={pending}
      >
        <Icon name="heart" filled={display.has_kudos} />
        <span>{display.kudos_count}</span>
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <span className="sr-only" role="status">
        {pending ? "Saving like…" : state.message}
      </span>
    </form>
  );
}
export function CommentForm({
  postId,
  id,
  parentId,
}: {
  postId: string;
  id: string;
  parentId?: string;
}) {
  const [state, action, pending] = useActionState(addComment, {});
  if (state.completedId)
    return (
      <p role="status" className="form-notice">
        Comment added.{" "}
        <a
          className="text-button"
          href={`/posts/${postId}${parentId ? `?thread=${parentId}` : ""}#comments`}
        >
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
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <fieldset disabled={pending}>
        <label>
          {parentId ? "Your reply" : "Add a comment"}
          <textarea
            name="body"
            required
            minLength={1}
            maxLength={1000}
            rows={3}
            placeholder={parentId ? "Write a reply…" : "Write a comment…"}
          />
        </label>
        <button type="submit" className="button">
          {pending ? "Posting…" : parentId ? "Reply" : "Post"}
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
