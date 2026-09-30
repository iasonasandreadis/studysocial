"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
export function ShareButton({ path }: { path: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    const url = new URL(path, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: "StudySocial", url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied. Your privacy settings still apply.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage("Couldn’t share the link. Please try again.");
    }
  }
  return (
    <span className="share-control">
      <button
        type="button"
        className="icon-button"
        onClick={share}
        aria-label="Share post link"
        title="Share post"
      >
        <Icon name="share" />
      </button>
      {message && (
        <span className="share-message" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
