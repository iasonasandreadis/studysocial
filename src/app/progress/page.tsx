import Link from "next/link";
import { studyDateLabel } from "@/lib/stats/date";
import { requireOnboarded } from "@/lib/auth/session";
import { ProfileShell } from "@/components/profile/profile-shell";
import { StudyPreferences } from "@/components/stats/preferences";
import { durationLabel } from "@/lib/posts/types";
import type { StudyStats } from "@/lib/stats/types";
export default async function Progress() {
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase.rpc("own_study_stats");
  if (error || !data) throw new Error("Couldn’t load your study progress.");
  const s = data as StudyStats,
    goal = s.goal_minutes ? s.goal_minutes * 60 : null,
    largest = Math.max(1, ...s.daily.map((d) => d.seconds));
  return (
    <ProfileShell>
      <header className="feed-heading">
        <p className="eyebrow">PROGRESS AT YOUR PACE</p>
        <h1>Small steps add up.</h1>
        <p>Your private study record. Every return is a fresh start.</p>
      </header>
      <section className="progress-summary" aria-label="Study totals">
        <div>
          <span>Today</span>
          <strong>{durationLabel(s.today_seconds)}</strong>
        </div>
        <div>
          <span>This week</span>
          <strong>{durationLabel(s.week_seconds)}</strong>
        </div>
        <div>
          <span>All time</span>
          <strong>{durationLabel(s.total_seconds)}</strong>
        </div>
      </section>
      <p className="field-hint">
        {s.session_count} completed sessions. Days use {s.timezone}; weeks start
        Monday. A session’s entire duration counts on the day it finishes.
        Active, paused and discarded sessions don’t count.
      </p>
      <section className="progress-section">
        <h2>Your weekly intention</h2>
        {goal ? (
          <>
            <p>
              {durationLabel(s.week_seconds)} of {durationLabel(goal)}
            </p>
            <progress
              className="study-progress"
              max={goal}
              value={Math.min(goal, s.week_seconds)}
              aria-label="Weekly study goal"
            />
            <p className="field-hint">
              {s.week_seconds >= goal
                ? "You reached your chosen goal. Make room for a break, too."
                : "A little at a time is enough. Your goal is a guide, not a deadline."}
            </p>
          </>
        ) : (
          <p className="account-description">
            No weekly goal set. Study at your own pace, or choose one below.
          </p>
        )}
      </section>
      <section className="progress-section">
        <h2>The last seven days</h2>
        <ul className="daily-activity">
          {s.daily.map((d) => (
            <li key={d.day}>
              <span>{d.day.slice(5)}</span>
              <meter
                min={0}
                max={largest}
                value={d.seconds}
                aria-label={`${d.day}: ${durationLabel(d.seconds)}`}
              />
              <span>{durationLabel(d.seconds)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="progress-section">
        <h2>This week, by subject</h2>
        {s.subjects.length ? (
          <ul className="connection-list">
            {s.subjects.map((subject) => (
              <li key={subject.subject_id ?? "other"}>
                <strong>
                  {subject.labels?.en ?? subject.labels?.el ?? "Other study"}
                </strong>
                <span>{durationLabel(subject.seconds)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="account-description">
            Your subjects will appear here after a completed session this week.
          </p>
        )}
      </section>
      <section className="progress-section">
        <h2>Recent study moments</h2>
        {s.recent.length ? (
          <ul className="connection-list">
            {s.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/sessions/${r.id}`}>
                  <strong>
                    {r.labels?.en ?? r.labels?.el ?? "Study"} ·{" "}
                    {durationLabel(r.duration_seconds)}
                  </strong>
                  <span>{studyDateLabel(r.ended_at, s.timezone)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="account-description">
            Nothing to catch up on. Begin when you’re ready.
          </p>
        )}
        <div className="form-links">
          <Link href="/study" className="button">
            Open study timer
          </Link>
          <Link href="/sessions" className="text-button">
            All sessions
          </Link>
        </div>
      </section>
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
