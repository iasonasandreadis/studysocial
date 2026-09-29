export type CompletedSession = {
  id: string;
  duration_seconds: number;
  subject_id: string | null;
  ended_at: string;
};
export type StudyPost = {
  id: string;
  author_id: string;
  caption: string;
  audience: string;
  subject_id: string | null;
  shared_duration_seconds: number | null;
  created_at: string;
  publication_state: "draft" | "published" | "deleting";
};
export function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} sec` : ""}`;
}
