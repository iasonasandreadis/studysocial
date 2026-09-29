export type SocialProfile = {
  id: string;
  handle: string;
  is_private: boolean;
  can_view: boolean;
  is_self: boolean;
  relationship: "none" | "requested" | "following";
  display_name?: string;
  bio?: string;
  avatar_path?: string | null;
  followers?: number;
  following?: number;
  academic_year?: string | null;
  academic_direction?: string | null;
  goal_text?: string | null;
  target_university?: string | null;
  target_program?: string | null;
  subjects?: Record<string, string>[];
  study_seconds?: number;
  study_sessions?: number;
};
export type Connection = {
  id: string;
  handle: string;
  display_name: string | null;
};
export type ProfileSettings = {
  academic_year: string;
  academic_direction: string;
  goal_text: string;
  target_university: string;
  target_program: string;
  share_year: boolean;
  share_direction: boolean;
  share_subjects: boolean;
  share_goal: boolean;
  share_target: boolean;
};
