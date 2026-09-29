"use client";
import { useActionState } from "react";
import { updateAvatar } from "@/app/onboarding/actions";
export function AvatarForm({
  url,
  hasAvatar,
}: {
  url: string | null;
  hasAvatar: boolean;
}) {
  const [state, action, pending] = useActionState(updateAvatar, {});
  return (
    <form action={action} className="avatar-form">
      <div className="avatar-preview">
        {url ? (
          // Signed, short-lived owner-authorized URL; avoid a shared image-optimization cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your chosen avatar" width={64} height={64} />
        ) : (
          <span aria-hidden="true">✳</span>
        )}
      </div>
      <div>
        <label htmlFor="avatar">
          Add a photo <span className="optional">(optional)</span>
        </label>
        <p className="field-hint">
          A face photo is never required. JPEG, PNG, or WebP, up to 2 MB.
        </p>
        <input
          id="avatar"
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
        <div className="form-links">
          <button className="text-button" disabled={pending}>
            {pending ? "Saving…" : "Save photo"}
          </button>
          {hasAvatar && (
            <button
              className="text-button"
              name="remove"
              value="true"
              disabled={pending}
            >
              Remove photo
            </button>
          )}
        </div>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="field-hint" role="status">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
