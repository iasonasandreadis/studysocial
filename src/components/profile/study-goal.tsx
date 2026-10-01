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
      <div className="goal-art" aria-hidden="true">
        <svg viewBox="0 0 300 110" fill="none">
          <path
            d="M-10 100C40 100 22 20 95 40S170 105 235 35"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <g transform="translate(230 48) rotate(-18)">
            <circle
              r="34"
              fill="currentColor"
              fillOpacity=".08"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle r="22" stroke="currentColor" strokeWidth="1.5" />
            <circle r="9" fill="currentColor" />
            <path
              d="m0 0 39-31m-3-9 3 9 10 1"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="m56 12 2 7 7 2-7 2-2 7-2-7-7-2 7-2Zm100 57 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"
            fill="currentColor"
          />
          <circle cx="134" cy="20" r="3" fill="currentColor" />
        </svg>
        <span>ONE SESSION CLOSER</span>
      </div>
      <div className="profile-goal-heading">
        <h2 id="study-goal-heading">The goal</h2>
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
