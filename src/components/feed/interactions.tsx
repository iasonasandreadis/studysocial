"use client";
import { Icon } from "@/components/ui/icon";
import { useActionState, useOptimistic } from "react";
import { changeKudos } from "@/app/feed/actions";
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
