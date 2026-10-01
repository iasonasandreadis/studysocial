import Link from "next/link";
import type { SocialProfile } from "@/lib/profile/types";

// Accept only the server-authorized social profile projection, never raw settings.
export function StudyGoal({ profile: p }: { profile: SocialProfile }) {
  if (!p.can_view) return null;
  const target = [p.target_program, p.target_university]
    .filter(Boolean)
    .join(" · ");
  if (!target && !p.goal_text && !p.subjects?.length && !p.is_self) return null;
  return (
    <section className="profile-goal" aria-labelledby="study-goal-heading">
      <div className="profile-goal-heading">
        <h2 id="study-goal-heading">Working toward</h2>
        {p.is_self && <Link href="/profile/edit#study-goal">Edit goal</Link>}
      </div>
      {target && <p className="profile-goal-target">{target}</p>}
      {p.goal_text && <p className="profile-goal-text">{p.goal_text}</p>}
      {!target && !p.goal_text && (
        <p className="profile-goal-empty">
          {p.is_self
            ? "Choose a goal to show on your profile."
            : "Making time for these subjects."}
        </p>
      )}
      {!!p.subjects?.length && (
        <section className="profile-subjects" aria-label="Subjects">
          <h3>Subjects</h3>
          <div>
            {p.subjects.map((subject, i) => (
              <span key={i}>{subject.en ?? Object.values(subject)[0]}</span>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
