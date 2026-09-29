export type StudyStats = {
  timezone: string;
  today: string;
  week_start: string;
  goal_minutes: number | null;
  today_seconds: number;
  week_seconds: number;
  total_seconds: number;
  session_count: number;
  daily: { day: string; seconds: number }[];
  subjects: {
    subject_id: string | null;
    labels: Record<string, string> | null;
    seconds: number;
  }[];
  recent: {
    id: string;
    ended_at: string;
    duration_seconds: number;
    labels: Record<string, string> | null;
  }[];
};
