export const relationshipActions = [
  "follow",
  "unfollow",
  "cancel",
  "accept",
  "reject",
  "remove",
] as const;
export function validTarget(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function profilePage(value: string | undefined) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 0;
}
export function validateProfile(form: FormData): {
  error?: string;
  payload?: Record<string, string | boolean | string[]>;
} {
  const payload: Record<string, string | boolean | string[]> = {};
  const limits: Record<string, number> = {
    display_name: 60,
    handle: 30,
    bio: 300,
    academic_year: 80,
    academic_direction: 100,
    goal_text: 300,
    target_university: 160,
    target_program: 160,
  };
  for (const [field, limit] of Object.entries(limits)) {
    const value = String(form.get(field) ?? "").trim();
    if (value.length > limit)
      return {
        error: `Keep ${field.replaceAll("_", " ")} within ${limit} characters.`,
      };
    payload[field] = field === "handle" ? value.toLowerCase() : value;
  }
  if (!payload.display_name || !payload.academic_year)
    return { error: "Enter your display name and academic year." };
  if (!/^[a-z0-9_]{3,30}$/.test(String(payload.handle)))
    return {
      error: "Use 3–30 letters, numbers, or underscores for your username.",
    };
  const visibility = String(form.get("visibility"));
  if (!["private", "public"].includes(visibility))
    return { error: "Choose your profile visibility." };
  payload.is_private = visibility === "private";
  for (const key of [
    "share_year",
    "share_direction",
    "share_subjects",
    "share_goal",
    "share_target",
  ])
    payload[key] = form.get(key) === "on";
  const subjects = [...new Set(form.getAll("subjects").map(String))];
  if (subjects.length > 30 || subjects.some((s) => !validTarget(s)))
    return { error: "Choose up to 30 subjects from the list." };
  payload.subjects = subjects;
  return { payload };
}
