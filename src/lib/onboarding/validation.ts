export type OnboardingPayload = Record<string, string | boolean | string[]>;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateOnboarding(
  step: number,
  form: FormData,
): { payload?: OnboardingPayload; error?: string } {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  if (step === 1) {
    const display_name = text("display_name"),
      handle = text("handle").toLowerCase(),
      bio = text("bio");
    if (!display_name || display_name.length > 60)
      return { error: "Use a display name between 1 and 60 characters." };
    if (!/^[a-z0-9_]{3,30}$/.test(handle))
      return {
        error: "Your username needs 3–30 letters, numbers, or underscores.",
      };
    if (bio.length > 300)
      return { error: "Keep your bio within 300 characters." };
    return { payload: { display_name, handle, bio } };
  }
  if (step === 2) {
    const limits: Record<string, number> = {
      academic_year: 80,
      academic_direction: 100,
      target_university: 160,
      target_program: 160,
      goal_text: 300,
      school_name: 160,
    };
    const payload: OnboardingPayload = {};
    for (const [key, max] of Object.entries(limits)) {
      if (text(key).length > max)
        return {
          error: `Keep ${key.replaceAll("_", " ")} within ${max} characters.`,
        };
      payload[key] = text(key);
    }
    if (!payload.academic_year)
      return {
        error:
          "Tell us your academic year or level (for example, final year of high school).",
      };
    for (const key of ["school_id", "program_id"]) {
      if (text(key) && !uuid.test(text(key)))
        return { error: "Choose a valid school or exam program." };
      payload[key] = text(key);
    }
    if (payload.school_id && payload.school_name)
      return {
        error: "Choose a school from the list or enter its name, not both.",
      };
    const subjects = [...new Set(form.getAll("subjects").map(String))];
    if (subjects.length > 30 || subjects.some((value) => !uuid.test(value)))
      return { error: "Choose up to 30 subjects from the list." };
    payload.subjects = subjects;
    return { payload };
  }
  if (step === 3) {
    if (!["private", "public"].includes(text("visibility")))
      return { error: "Choose who can see your profile." };
    return { payload: { is_private: text("visibility") === "private" } };
  }
  return { error: "Please complete the onboarding steps in order." };
}
