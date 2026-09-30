import { StudyNavigation } from "@/components/timer/study-navigation";
import Link from "next/link";
import { ProfileShell } from "@/components/profile/profile-shell";
import { StudyPreferences } from "@/components/stats/preferences";
import { durationLabel } from "@/lib/posts/types";
import type { StudyStats } from "@/lib/stats/types";
export function ProgressView({ s }: { s: StudyStats }) {
  const goal = s.goal_minutes ? s.goal_minutes * 60 : null,
    largest = Math.max(1, ...s.daily.map((d) => d.seconds));
  return (
    <ProfileShell>
      <StudyNavigation current="progress" />
      <h1 className="screen-title">Your progress</h1>
      <section
        className="progress-summary compact-totals"
        aria-label="Study totals"
      >
        <div>
          <span>Today</span>
          <strong>{durationLabel(s.today_seconds)}</strong>
        </div>
        <div>
          <span>This week</span>
          <strong>{durationLabel(s.week_seconds)}</strong>
        </div>
      </section>
      <section className="weekly-card" aria-labelledby="week-title">
        <h2 id="week-title">Last 7 days</h2>
        <ul className="week-chart">
          {s.daily.map((d) => (
            <li key={d.day}>
              <span className="day-value">
                {d.seconds >= 3600
                  ? `${Math.floor(d.seconds / 3600)}h ${Math.floor((d.seconds % 3600) / 60)}m`
                  : d.seconds >= 60
                    ? `${Math.floor(d.seconds / 60)}m`
                    : d.seconds
                      ? `${d.seconds}s`
                      : "—"}
              </span>
              <div
                className="day-track"
                role="img"
                aria-label={`${d.day}: ${durationLabel(d.seconds)}`}
              >
                <div
                  className="day-fill"
                  style={{
                    height: `${d.seconds ? Math.max(3, (d.seconds / largest) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="day-name">
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(new Date(`${d.day}T12:00:00Z`))}
              </span>
            </li>
          ))}
        </ul>
        {!s.daily.some((d) => d.seconds > 0) && (
          <p className="field-hint">
            Finish your first session to see your week here.
          </p>
        )}
      </section>
      {goal && (
        <section className="weekly-card">
          <h2>Weekly goal</h2>
          <p className="field-hint">
            {durationLabel(s.week_seconds)} / {durationLabel(goal)}
          </p>
          <div
            className="goal-track"
            role="progressbar"
            aria-label="Weekly study goal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(goal, s.week_seconds)}
          >
            <div
              style={{
                width: `${Math.min(100, (s.week_seconds / goal) * 100)}%`,
              }}
            />
          </div>
        </section>
      )}
      <details className="progress-section">
        <summary>Subject breakdown & totals</summary>
        <p className="field-hint">
          {durationLabel(s.total_seconds)} across {s.session_count} completed
          sessions.
        </p>
        <ul className="subject-totals">
          {s.subjects.map((subject) => (
            <li key={subject.subject_id ?? "other"}>
              <span>
                {subject.labels?.en ?? subject.labels?.el ?? "Other study"}
              </span>
              <strong>{durationLabel(subject.seconds)}</strong>
            </li>
          ))}
        </ul>
        <Link className="text-button" href="/sessions">
          View history →
        </Link>
      </details>
      <details className="progress-section">
        <summary>Timezone and weekly goal</summary>
        <p className="field-hint">
          Changing timezone recalculates day and week groupings; session
          timestamps stay the same.
        </p>
        <StudyPreferences timezone={s.timezone} goal={s.goal_minutes} />
      </details>
    </ProfileShell>
  );
}
