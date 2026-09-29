export type StudySession = {
  id: string;
  subject_id: string | null;
  status: "active" | "paused" | "completed" | "discarded";
  started_at: string;
  ended_at: string | null;
  running_since: string | null;
  active_seconds: number;
  duration_seconds: number | null;
  notes: string;
  version: number;
};
export type TimerSnapshot = {
  session: StudySession | null;
  server_now: string;
};
export function elapsedSeconds(session: StudySession, serverNow: number) {
  return Math.min(
    86400,
    Math.max(
      0,
      Math.floor(
        Number(session.active_seconds) +
          (session.status === "active" && session.running_since
            ? Math.max(
                0,
                (serverNow - Date.parse(session.running_since)) / 1000,
              )
            : 0),
      ),
    ),
  );
}
export function clockLabel(seconds: number) {
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
