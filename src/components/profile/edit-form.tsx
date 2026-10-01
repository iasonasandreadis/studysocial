"use client";
import { useActionState } from "react";
import { editProfile } from "@/app/profile/actions";
import type { ProfileSettings } from "@/lib/profile/types";
import type { Profile, CatalogOption } from "@/lib/onboarding/types";
export function EditForm({
  profile,
  settings,
  subjects,
  selected,
}: {
  profile: Profile;
  settings: ProfileSettings;
  subjects: CatalogOption[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState(editProfile, {});
  return (
    <form
      action={action}
      className="account-form"
      onReset={(event) => event.preventDefault()}
    >
      <fieldset disabled={pending}>
        <label>
          Display name
          <input
            name="display_name"
            required
            maxLength={60}
            autoComplete="nickname"
            defaultValue={profile.display_name}
          />
        </label>
        <label>
          Username
          <input
            name="handle"
            required
            pattern="[a-zA-Z0-9_]{3,30}"
            maxLength={30}
            autoComplete="username"
            defaultValue={profile.handle ?? ""}
          />
          <span className="field-hint">
            Changing your username changes your profile link.
          </span>
        </label>
        <label>
          Bio
          <textarea
            name="bio"
            rows={3}
            maxLength={300}
            defaultValue={profile.bio}
          />
        </label>
        <label>
          Profile visibility
          <select
            name="visibility"
            defaultValue={profile.is_private ? "private" : "public"}
          >
            <option value="private">Private — approve new followers</option>
            <option value="public">
              Public — visible to signed-in students
            </option>
          </select>
          <span className="field-hint">
            Changing to private keeps existing followers. Remove a follower from
            your followers list to revoke their access.
          </span>
        </label>
        <h2 className="edit-section-title">Your study details</h2>
        <p className="form-notice">
          Details stay private unless you choose to show them below. Your school
          and email are never shared here.
        </p>
        <label>
          Academic year
          <input
            name="academic_year"
            required
            maxLength={80}
            defaultValue={settings.academic_year}
          />
        </label>
        <label>
          Academic direction
          <input
            name="academic_direction"
            maxLength={100}
            defaultValue={settings.academic_direction}
          />
        </label>
        <fieldset className="subject-options">
          <legend>Subjects</legend>
          {subjects.length ? (
            subjects.map((s) => (
              <label className="check-option" key={s.id}>
                <input
                  type="checkbox"
                  name="subjects"
                  value={s.id}
                  defaultChecked={selected.includes(s.id)}
                />
                {s.labels.en ?? Object.values(s.labels)[0]}
              </label>
            ))
          ) : (
            <p className="field-hint">No subjects are listed yet.</p>
          )}
        </fieldset>
        <div className="form-grid">
          <label>
            Target university
            <input
              id="study-goal"
              name="target_university"
              maxLength={160}
              defaultValue={settings.target_university}
            />
          </label>
          <label>
            Target program
            <input
              name="target_program"
              maxLength={160}
              defaultValue={settings.target_program}
            />
          </label>
        </div>
        <label>
          Personal goal
          <textarea
            name="goal_text"
            rows={2}
            maxLength={300}
            defaultValue={settings.goal_text}
          />
        </label>
        <fieldset className="sharing-choices">
          <legend>Show on my profile</legend>
          <p className="field-hint">
            These choices follow your profile’s audience. On a public profile,
            all signed-in students can see the details you select.
          </p>
          {(
            [
              ["share_year", "Academic year"],
              ["share_direction", "Academic direction"],
              ["share_subjects", "Subjects"],
              ["share_goal", "Personal goal"],
              ["share_target", "Target university and program"],
            ] as const
          ).map(([key, label]) => (
            <label className="check-option" key={key}>
              <input
                type="checkbox"
                name={key}
                defaultChecked={settings[key]}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button className="button">
          {pending ? "Saving…" : "Save profile"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
