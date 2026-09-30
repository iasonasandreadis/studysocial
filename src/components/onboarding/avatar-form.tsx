"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { preparePhoto } from "@/lib/posts/prepare-photo";
import { updateAvatar } from "@/app/onboarding/actions";
export function AvatarForm({
  url,
  hasAvatar,
}: {
  url: string | null;
  hasAvatar: boolean;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const selection = useRef(0);
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; message?: string }, form: FormData) => {
      if (form.get("remove") !== "true") {
        if (!photo) return { error: "Choose a photo first." };
        form.set("avatar", photo);
      }
      const result = await updateAvatar(previous, form);
      if (!result.error) {
        setPhoto(null);
        setPreview(null);
      }
      return result;
    },
    {},
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <form action={action} className="avatar-form">
      <div className="avatar-preview">
        {preview || url ? (
          // Signed, short-lived owner-authorized URL; avoid a shared image-optimization cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview || url || ""}
            alt="Your chosen avatar"
            width={64}
            height={64}
          />
        ) : (
          <span aria-hidden="true">✳</span>
        )}
      </div>
      <div>
        <label htmlFor="avatar">
          Add a photo <span className="optional">(optional)</span>
        </label>
        <p className="field-hint">
          JPEG, PNG or WebP, up to 20 MB. We resize it for you.
        </p>
        <input
          id="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            const current = ++selection.current;
            setPhoto(null);
            setPreview(null);
            setPhotoError("");
            if (!file) {
              setPreparing(false);
              return;
            }
            setPreparing(true);
            try {
              const prepared = await preparePhoto(file, {
                maxBytes: 1024 * 1024,
                longEdge: 768,
                alwaysResize: true,
              });
              if (current === selection.current) {
                setPhoto(prepared);
                setPreview(URL.createObjectURL(prepared));
              }
            } catch (error) {
              if (current === selection.current)
                setPhotoError(
                  error instanceof Error
                    ? error.message
                    : "Couldn’t prepare that photo. Try another.",
                );
            } finally {
              if (current === selection.current) setPreparing(false);
            }
          }}
        />
        <div className="form-links">
          <button
            className="text-button"
            disabled={pending || preparing || !photo}
          >
            {preparing ? "Preparing…" : pending ? "Saving…" : "Save photo"}
          </button>
          {hasAvatar && (
            <button
              className="text-button"
              name="remove"
              value="true"
              disabled={pending || preparing}
            >
              Remove photo
            </button>
          )}
        </div>
        {photoError && (
          <p className="form-error" role="alert">
            {photoError}
          </p>
        )}
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
