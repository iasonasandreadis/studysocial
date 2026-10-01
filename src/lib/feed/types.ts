export type Activity = {
  kudos_count: number;
  comment_count: number;
  has_kudos: boolean;
};
export type FeedPost = {
  id: string;
  author_id: string;
  handle: string;
  display_name: string;
  caption: string;
  created_at: string;
  subject: Record<string, string> | null;
  shared_duration_seconds: number | null;
  image_path: string | null;
  alt_text: string | null;
  activity: Activity;
  reason: string;
  imageUrl?: string | null;
};
export type PostComment = {
  reply_count?: number;
  id: string;
  body: string;
  created_at: string;
  own: boolean;
  handle: string | null;
  display_name: string | null;
};
export function relativeTime(value: string, now = Date.now()) {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
