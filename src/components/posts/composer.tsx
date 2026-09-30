"use client";
import Link from "next/link";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { publishPost } from "@/app/posts/actions";
import { preparePhoto } from "@/lib/posts/prepare-photo";
import { validatePost } from "@/lib/posts/validation";
import { durationLabel, type CompletedSession } from "@/lib/posts/types";
import type { CatalogOption } from "@/lib/onboarding/types";
export function Composer({
  id,
  isPrivate,
  subjects,
  sessions,
  initialSession,
  communities,
  initialCommunity,
}: {
  id: string;
  isPrivate: boolean;
  subjects: CatalogOption[];
  sessions: CompletedSession[];
  initialSession?: CompletedSession;
  communities: { id: string; name: string }[];
  initialCommunity?: string;
}) {
  const [preparing, setPreparing] = useState(false);
  const [community, setCommunity] = useState(initialCommunity ?? "");
  const [state, action, pending] = useActionState(publishPost, {});
  const [file, setFile] = useState<File | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false);
  const [subject, setSubject] = useState(initialSession?.subject_id ?? ""),
    [minutes, setMinutes] = useState("");
  const [audience, setAudience] = useState("private"),
    [session, setSession] = useState(initialSession?.id ?? ""),
    [show, setShow] = useState(Boolean(initialSession)),
    [caption, setCaption] = useState(""),
    [alt, setAlt] = useState("");
  const form = useRef<HTMLFormElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (preview) heading.current?.focus();
  }, [preview]);
  const audienceText =
    audience === "private"
      ? "Only you"
      : audience === "followers"
        ? "Your approved followers"
        : isPrivate
          ? "Your approved followers (your account is private)"
          : "Signed-in people, except blocked accounts";
  return (
    <form
      ref={form}
      action={action}
      className="account-form post-composer"
      onReset={(e) => e.preventDefault()}
      onInvalidCapture={(e) => {
        const details = (e.target as HTMLElement).closest("details");
        if (details) details.open = true;
      }}
      onSubmit={(e) => {
        if (!preview) e.preventDefault();
      }}
    >
      <input type="hidden" name="post_id" value={id} />
      {session && (
        <input
          type="hidden"
          name="subject_id"
          value={sessions.find((s) => s.id === session)?.subject_id ?? ""}
        />
      )}
      {initialSession && (
        <p className="form-notice">
          Your completed session is selected. Its subject and optional duration
          can be shared; private notes stay private. Nothing is published until
          you preview and confirm.
        </p>
      )}
      <fieldset disabled={pending || preparing}>
        <div hidden={preview}>
          <label className="photo-picker">
            <span className="photo-picker-icon" aria-hidden="true">
              ＋
            </span>
            {file ? "Change photo" : "Choose a photo"}
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={async (e) => {
                const input = e.currentTarget;
                const chosen = input.files?.[0] ?? null;
                setError("");
                setPreview(false);
                setFile(null);
                setUrl("");
                if (!chosen) return;
                setPreparing(true);
                try {
                  const photo = await preparePhoto(chosen);
                  const transfer = new DataTransfer();
                  transfer.items.add(photo);
                  input.files = transfer.files;
                  setFile(photo);
                  setUrl(URL.createObjectURL(photo));
                } catch (error) {
                  input.value = "";
                  setError(
                    error instanceof Error && error.name === "Error"
                      ? error.message
                      : "Couldn’t open this photo. Try a JPEG, PNG or WebP image.",
                  );
                } finally {
                  setPreparing(false);
                }
              }}
            />
            <span className="field-hint">Tap to choose from your photos</span>
          </label>
          {url && (
            <Image
              className="composer-thumbnail"
              src={url}
              alt="Selected photo"
              width={600}
              height={600}
              unoptimized
            />
          )}
          <label>
            Caption <span className="optional">(optional)</span>
            <textarea
              name="caption"
              maxLength={2200}
              rows={2}
              placeholder="A study selfie, a meme, a little win…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <details
            className="optional-details"
            open={initialSession || initialCommunity ? true : undefined}
          >
            <summary>More options</summary>
            <label>
              Image description <span className="optional">(optional)</span>
              <input
                name="alt_text"
                maxLength={300}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the photo for people using screen readers"
              />
            </label>
            <label>
              Subject <span className="optional">(optional)</span>
              <select
                name="subject_id"
                disabled={Boolean(session)}
                value={
                  session
                    ? (sessions.find((s) => s.id === session)?.subject_id ?? "")
                    : subject
                }
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.labels.en ?? s.labels.el ?? "Subject"}
                  </option>
                ))}
              </select>
            </label>
            {sessions.length > 0 ? (
              <label>
                Completed session <span className="optional">(optional)</span>
                <select
                  name="session_id"
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    const linked = sessions.find(
                      (s) => s.id === e.target.value,
                    );
                    if (linked) setSubject(linked.subject_id ?? "");
                  }}
                >
                  <option value="">No linked session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.ended_at).toLocaleDateString("en-GB", {
                        timeZone: "UTC",
                      })}{" "}
                      · {durationLabel(s.duration_seconds)}
                    </option>
                  ))}
                </select>
                <span className="field-hint">
                  Your most recent 100 completed sessions (dates in UTC). A
                  session can be linked to one post. Personal session notes are
                  never shared.
                </span>
              </label>
            ) : (
              <p className="field-hint">
                No completed sessions to link. You can still share a photo and
                optionally enter a duration.
              </p>
            )}
            <label className="check-option">
              <input
                type="checkbox"
                name="show_duration"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
              />{" "}
              Show study duration on this post
            </label>
            {show && !session && (
              <label>
                Duration in whole minutes
                <input
                  name="duration_minutes"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  type="number"
                  min={1}
                  max={1440}
                  required
                />
              </label>
            )}
            {show && session && (
              <p className="field-hint">
                Shared duration:{" "}
                {durationLabel(
                  sessions.find((s) => s.id === session)!.duration_seconds,
                )}
              </p>
            )}

            <label>
              Club <span className="optional">(optional)</span>
              <select
                name="community_id"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
              >
                <option value="">No club</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Only communities you belong to are listed. Posting here does not
                override your account or post privacy.
              </span>
            </label>
          </details>
          <label>
            Who can see this?
            <select
              name="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="private">Only me</option>
              <option value="followers">Approved followers</option>
              <option value="public">Anyone signed in</option>
            </select>
            <span className="field-hint">
              {audience === "private"
                ? "Only you can see this post."
                : isPrivate
                  ? "Your account is private. Only approved followers can see this."
                  : `${audienceText}.`}
              {audience === "public" &&
                isPrivate &&
                " This becomes public if you make your account public."}
            </span>
          </label>
          <button
            className="button"
            type="button"
            onClick={() => {
              if (!form.current?.reportValidity()) return;
              const result = validatePost(new FormData(form.current));
              if (result.error) {
                setError(result.error);
                return;
              }
              if (!file) {
                setError("Choose a photo first.");
                return;
              }
              setError("");
              setPreview(true);
            }}
          >
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
        {preview && (
          <section aria-label="Post preview">
            <h2 ref={heading} tabIndex={-1}>
              Ready to share?
            </h2>
            <p className="post-visibility">
              Visible to: {audienceText}
              {community
                ? `. Also subject to access rules for ${communities.find((c) => c.id === community)?.name ?? "this community"}.`
                : ""}
            </p>
            {url && (
              <Image
                className="post-photo"
                src={url}
                alt={alt || "Your selected study photo"}
                width={1000}
                height={1000}
                unoptimized
              />
            )}
            <p className="post-caption">{caption || "No caption"}</p>
            <div className="post-facts">
              {subject && (
                <span>
                  {subjects.find((s) => s.id === subject)?.labels.en ??
                    subjects.find((s) => s.id === subject)?.labels.el ??
                    "Subject"}
                </span>
              )}
              {show && (
                <span>
                  {durationLabel(
                    session
                      ? sessions.find((s) => s.id === session)!.duration_seconds
                      : Number(minutes) * 60,
                  )}{" "}
                  studied
                </span>
              )}
            </div>
            <p className="field-hint">
              The photo will be resized and its embedded metadata removed before
              upload. Your selected subject and optional duration will appear
              with the post.
            </p>
            <div className="post-buttons">
              <button
                type="button"
                className="text-button"
                onClick={() => setPreview(false)}
              >
                Back to edit
              </button>
              <button type="submit" className="button" disabled={pending}>
                {pending ? "Sharing…" : "Share post"}
              </button>
            </div>
          </section>
        )}
      </fieldset>
      {(error || state.error) && (
        <p role="alert" className="form-error">
          {error || state.error}
        </p>
      )}
      {state.draftId && (
        <Link className="text-button" href={`/posts/${state.draftId}`}>
          Check saved post or discard draft
        </Link>
      )}
      {initialSession && (
        <Link className="text-button" href={`/sessions/${initialSession.id}`}>
          Skip sharing and return to my session
        </Link>
      )}
      <p role="status" className="field-hint">
        {preparing
          ? "Preparing your photo…"
          : pending
            ? "Keep this page open while your photo uploads."
            : ""}
      </p>
    </form>
  );
}
