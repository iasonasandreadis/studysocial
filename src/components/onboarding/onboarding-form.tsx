"use client";
import { useActionState } from "react";
import { saveOnboarding } from "@/app/onboarding/actions";
import type {
  CatalogOption,
  Profile,
  SchoolOption,
  Settings,
} from "@/lib/onboarding/types";
export function OnboardingForm({
  step,
  profile,
  settings,
  subjects,
  selectedSubjects,
  programs,
  schools,
}: {
  step: number;
  profile: Profile;
  settings: Settings;
  subjects: CatalogOption[];
  selectedSubjects: string[];
  programs: CatalogOption[];
  schools: SchoolOption[];
}) {
  const [state, action, pending] = useActionState(saveOnboarding, {});
  return (
    <form
      action={action}
      className="account-form"
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="step" value={step} />
      <fieldset disabled={pending}>
        {step === 1 && (
          <>
            <label>
              Display name
              <input
                name="display_name"
                required
                maxLength={60}
                autoComplete="nickname"
                defaultValue={
                  profile.display_name === "Student" && !profile.handle
                    ? ""
                    : profile.display_name
                }
                placeholder="What should we call you?"
              />
            </label>
            <label>
              Username
              <input
                name="handle"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]{3,30}"
                autoCapitalize="none"
                autoComplete="username"
                defaultValue={profile.handle ?? ""}
                aria-describedby="handle-hint"
                placeholder="your_study_name"
              />
              <span className="field-hint" id="handle-hint">
                3–30 letters, numbers, or underscores. Usernames are saved in
                lowercase.
              </span>
            </label>
            <label>
              A little about you <span className="optional">(optional)</span>
              <textarea
                name="bio"
                maxLength={300}
                rows={3}
                defaultValue={profile.bio}
                placeholder="What are you working toward?"
              />
              <span className="field-hint">
                Avoid adding your address, daily schedule, or contact details.
              </span>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <p className="form-notice">
              These study details are private. Only you can see them. Everything
              except your academic year is optional.
            </p>
            <label>
              Academic year or level
              <input
                name="academic_year"
                required
                maxLength={80}
                defaultValue={settings.academic_year}
                placeholder="e.g. Final year of high school"
              />
            </label>
            <details className="optional-details">
              <summary>More about your studies (optional)</summary>
              <label>
                Exam or education program
                <select
                  name="program_id"
                  defaultValue={settings.program_id ?? ""}
                >
                  <option value="">Not listed / decide later</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.labels.en ?? Object.values(p.labels)[0]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Academic direction
                <input
                  name="academic_direction"
                  maxLength={100}
                  defaultValue={settings.academic_direction}
                  placeholder="e.g. Humanities, sciences, or your own path"
                />
              </label>
              <fieldset className="subject-options">
                <legend>Subjects you’re studying</legend>
                {subjects.length ? (
                  subjects.map((s) => (
                    <label className="check-option" key={s.id}>
                      <input
                        type="checkbox"
                        name="subjects"
                        value={s.id}
                        defaultChecked={selectedSubjects.includes(s.id)}
                      />
                      {s.labels.en ?? Object.values(s.labels)[0]}
                    </label>
                  ))
                ) : (
                  <p className="field-hint">
                    No subjects are listed yet. You can continue and choose them
                    later.
                  </p>
                )}
              </fieldset>
              <div className="form-grid">
                <label>
                  Target university
                  <input
                    name="target_university"
                    maxLength={160}
                    defaultValue={settings.target_university}
                    placeholder="Still exploring is okay"
                  />
                </label>
                <label>
                  Target degree or program
                  <input
                    name="target_program"
                    maxLength={160}
                    defaultValue={settings.target_program}
                    placeholder="e.g. Engineering"
                  />
                </label>
              </div>
              <label>
                A goal for this chapter
                <textarea
                  name="goal_text"
                  maxLength={300}
                  rows={2}
                  defaultValue={settings.goal_text}
                  placeholder="e.g. Make a little time for maths each day"
                />
              </label>
              <label>
                School
                <select
                  name="school_id"
                  defaultValue={settings.school_id ?? ""}
                >
                  <option value="">Prefer not to say / enter below</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.country_code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                School name, if not listed
                <input
                  name="school_name"
                  maxLength={160}
                  defaultValue={settings.school_name}
                  placeholder="Optional — kept private"
                />
                <span className="field-hint">
                  Choose a school above or enter one here. You can also leave
                  both blank.
                </span>
              </label>
            </details>
          </>
        )}
        {step === 3 && (
          <>
            <fieldset className="privacy-options">
              <legend>Who can see your profile?</legend>
              <label className="privacy-option">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  defaultChecked={profile.is_private}
                />
                <span>
                  <strong>
                    Private <span className="recommended">Recommended</span>
                  </strong>
                  <small>
                    Only people you approve can see your profile and shared
                    study moments.
                  </small>
                </span>
              </label>
              <label className="privacy-option">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  defaultChecked={!profile.is_private}
                />
                <span>
                  <strong>Public</strong>
                  <small>
                    Other signed-in students can see your profile and posts you
                    choose to share publicly.
                  </small>
                </span>
              </label>
            </fieldset>
            <p className="form-notice">
              Your email, academic details, school, goals, and raw study
              sessions stay private with either choice. You decide what to
              share.
            </p>
          </>
        )}
        <button className="button" type="submit">
          {pending
            ? "Saving…"
            : step === 3
              ? "Finish setup"
              : "Save and continue"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <p className="field-hint">
        Each completed step is saved. You can leave and pick up from there
        later.
      </p>
    </form>
  );
}
