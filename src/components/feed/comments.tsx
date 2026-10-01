"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  addComment,
  readCommentThread,
  removeComment,
} from "@/app/feed/actions";
import { relativeTime, type PostComment } from "@/lib/feed/types";
type Thread = { replies: PostComment[]; page: number; more: boolean };
export function Comments({
  postId,
  comments,
  initialThread,
}: {
  postId: string;
  comments: PostComment[];
  initialThread?: { parent: PostComment; replies: PostComment[] };
}) {
  const [threads, setThreads] = useState<Record<string, Thread>>(
    initialThread
      ? {
          [initialThread.parent.id]: {
            replies: initialThread.replies.slice(0, 20),
            page: 0,
            more: initialThread.replies.length > 20,
          },
        }
      : {},
  );
  const [open, setOpen] = useState<Record<string, boolean>>(
    initialThread ? { [initialThread.parent.id]: true } : {},
  );
  const [reply, setReply] = useState<{ id: string; handle: string } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const load = async (parentId: string, page = 0) => {
    setLoading(parentId);
    setError("");
    try {
      const result = await readCommentThread(postId, parentId, page);
      if (result.error || !result.thread) {
        setError(result.error ?? "Couldn’t load replies.");
        setThreads((old) => {
          const next = { ...old };
          delete next[parentId];
          return next;
        });
        return;
      }
      const rows = result.thread.replies;
      setThreads((old) => ({
        ...old,
        [parentId]: {
          replies: page
            ? [...(old[parentId]?.replies ?? []), ...rows.slice(0, 20)]
            : rows.slice(0, 20),
          page,
          more: rows.length > 20,
        },
      }));
      setOpen((old) => ({ ...old, [parentId]: true }));
    } catch {
      setError("Couldn’t load replies. Please retry.");
    } finally {
      setLoading(null);
    }
  };
  const selectReply = (parent: PostComment, person = parent) => {
    setReply({
      id: parent.id,
      handle: person.handle ?? person.display_name ?? "Student",
    });
    if (person.id !== parent.id && person.handle && !draft)
      setDraft(`@${person.handle} `);
    requestId.current = null;
    input.current?.focus();
  };
  const remove = (comment: PostComment, parentId?: string) =>
    startTransition(async () => {
      setError("");
      const form = new FormData();
      form.set("post_id", postId);
      form.set("comment_id", comment.id);
      try {
        const result = await removeComment({}, form);
        if (result.error) setError(result.error);
        else if (parentId) await load(parentId);
      } catch {
        setError("Couldn’t delete. Please retry.");
      }
    });
  const row = (comment: PostComment, parent: PostComment, isReply = false) => (
    <div
      className={`comment-row ${isReply ? "comment-reply" : ""}`}
      key={comment.id}
    >
      <span className="comment-avatar" aria-hidden="true">
        {(comment.display_name ?? comment.handle ?? "S")
          .slice(0, 1)
          .toUpperCase()}
      </span>
      <div className="comment-content">
        <p>
          {comment.handle ? (
            <Link href={`/u/${comment.handle}`}>
              <strong>{comment.handle}</strong>
            </Link>
          ) : (
            <strong>Student</strong>
          )}{" "}
          <span>{comment.body}</span>
        </p>
        <div className="comment-tools">
          <time dateTime={comment.created_at}>
            {relativeTime(comment.created_at)}
          </time>
          <button
            type="button"
            onClick={() => selectReply(parent, comment)}
            disabled={pending}
          >
            Reply
          </button>
          {comment.own && (
            <details>
              <summary aria-label="Comment options">···</summary>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      isReply
                        ? "Delete this reply?"
                        : "Delete this comment and its replies?",
                    )
                  )
                    remove(comment, isReply ? parent.id : undefined);
                }}
              >
                Delete
              </button>
            </details>
          )}
        </div>
      </div>
    </div>
  );
  const roots =
    initialThread && !comments.some((c) => c.id === initialThread.parent.id)
      ? [initialThread.parent, ...comments]
      : comments;
  return (
    <div className="inline-comments">
      {roots.length ? (
        roots.slice(0, 21).map((parent) => (
          <div className="comment-thread" key={parent.id}>
            {row(parent, parent)}
            {parent.reply_count ||
            threads[parent.id]?.replies.length ||
            loading === parent.id ? (
              <button
                className="view-replies"
                type="button"
                disabled={loading !== null || pending}
                onClick={() =>
                  open[parent.id]
                    ? setOpen((old) => ({ ...old, [parent.id]: false }))
                    : void load(parent.id)
                }
              >
                {loading === parent.id
                  ? "Loading…"
                  : open[parent.id]
                    ? "Hide replies"
                    : `View replies${parent.reply_count ? ` (${parent.reply_count})` : ""}`}
              </button>
            ) : null}
            {open[parent.id] &&
              threads[parent.id]?.replies.map((c) => row(c, parent, true))}
            {open[parent.id] && threads[parent.id]?.more && (
              <button
                className="view-replies"
                type="button"
                disabled={loading !== null || pending}
                onClick={() =>
                  void load(parent.id, threads[parent.id].page + 1)
                }
              >
                More replies
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="field-hint">Be the first to comment.</p>
      )}
      <form
        className="comment-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || !draft.trim()) return;
          requestId.current ??= crypto.randomUUID();
          const id = requestId.current;
          const parentId = reply?.id;
          const form = new FormData();
          form.set("post_id", postId);
          form.set("comment_id", id);
          form.set("body", draft);
          if (parentId) form.set("parent_id", parentId);
          startTransition(async () => {
            setError("");
            try {
              const result = await addComment({}, form);
              if (result.error) {
                setError(result.error);
                return;
              }
              requestId.current = null;
              setDraft("");
              setReply(null);
              if (parentId) await load(parentId);
            } catch {
              setError("Couldn’t send. Retry to check whether it saved.");
            }
          });
        }}
      >
        {reply && (
          <div className="replying-to">
            <span>Replying to @{reply.handle}</span>
            <button
              type="button"
              aria-label="Cancel reply"
              disabled={pending}
              onClick={() => {
                setReply(null);
                requestId.current = null;
              }}
            >
              ×
            </button>
          </div>
        )}
        <div className="comment-input-row">
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              requestId.current = null;
            }}
            aria-label={reply ? `Reply to ${reply.handle}` : "Add a comment"}
            placeholder={reply ? "Write a reply…" : "Add a comment…"}
            maxLength={1000}
            rows={1}
            required
            disabled={pending}
          />
          <button type="submit" disabled={pending || !draft.trim()}>
            {pending ? "Sending…" : "Post"}
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
