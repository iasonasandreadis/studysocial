export type Profile = {
  display_name: string;
  handle: string | null;
  bio: string;
  avatar_path: string | null;
  is_private: boolean;
};
export type Settings = {
  onboarding_step: number;
  onboarding_completed_at: string | null;
  academic_year: string;
  academic_direction: string;
  program_id: string | null;
  target_university: string;
  target_program: string;
  goal_text: string;
  school_id: string | null;
  school_name: string;
};
export type CatalogOption = { id: string; labels: Record<string, string> };
export type SchoolOption = { id: string; name: string; country_code: string };
