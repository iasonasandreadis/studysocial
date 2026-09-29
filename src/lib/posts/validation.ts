export const MAX_POST_IMAGE_BYTES = 3 * 1024 * 1024;
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type PostPayload = {
  caption: string;
  alt_text: string;
  subject_id: string;
  session_id: string;
  community_id: string;
  audience: string;
  show_duration: boolean;
  manual_duration_seconds: number | null;
};
export function validatePost(form: FormData): {
  payload?: PostPayload;
  error?: string;
} {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  if (!uuidPattern.test(text("post_id")))
    return { error: "Please reopen the composer and try again." };
  if (text("caption").length > 2200 || text("alt_text").length > 300)
    return {
      error:
        "Keep your caption within 2,200 characters and image description within 300.",
    };
  if (!["private", "followers", "public"].includes(text("audience")))
    return { error: "Choose who can see your post." };
  for (const key of ["subject_id", "session_id", "community_id"])
    if (text(key) && !uuidPattern.test(text(key)))
      return { error: "Choose a valid subject or completed session." };
  const show = form.get("show_duration") === "on";
  let duration: number | null = null;
  if (show && !text("session_id")) {
    const minutes = Number(text("duration_minutes"));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)
      return { error: "Enter a duration between 1 and 1,440 whole minutes." };
    duration = minutes * 60;
  }
  return {
    payload: {
      caption: text("caption"),
      alt_text: text("alt_text"),
      subject_id: text("subject_id"),
      session_id: text("session_id"),
      community_id: text("community_id"),
      audience: text("audience"),
      show_duration: show,
      manual_duration_seconds: duration,
    },
  };
}
