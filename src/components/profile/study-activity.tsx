"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readProfileActivity } from "@/app/profile/study-actions";
import { durationLabel } from "@/lib/posts/types";
import type { ProfileActivity } from "@/lib/stats/profile-activity";
export function StudyActivity({
  target,
  initial,
  own,
}: {
  target: string;
  initial: ProfileActivity | null;
  own: boolean;
}) {
  const [activity, setActivity] = useState(initial);
  useEffect(() => {
    let active = true,
      loading = false;
    const refresh = async () => {
      if (
        loading ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      loading = true;
      try {
        const next = await readProfileActivity(target);
        if (active) setActivity(next);
      } catch {
        if (active) setActivity(null);
      } finally {
        // Never leave a stale live badge or private totals on screen after an error.
        loading = false;
      }
    };
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [target]);
  return <StudyActivityView activity={activity} own={own} />;
}
export function StudyActivityView({
  activity,
  own,
}: {
  activity: ProfileActivity | null;
  own: boolean;
}) {
  if (
    !activity ||
    (!own && activity.today_seconds === null && !activity.is_studying)
  )
    return null;
  return (
    <section className="profile-study" aria-label="Study activity">
      {activity.is_studying && (
        <p className="studying-now">
          <span aria-hidden="true" />
          Studying now
        </p>
      )}
      {activity.today_seconds !== null && (
        <div className="study-metrics">
          <div>
            <strong>{durationLabel(activity.today_seconds)}</strong>
            <span>Today</span>
          </div>
          <div>
            <strong>{durationLabel(activity.week_seconds ?? 0)}</strong>
            <span>This week</span>
          </div>
          <div>
            <strong>
              {activity.streak_days ?? 0}{" "}
              {(activity.streak_days ?? 0) === 1 ? "day" : "days"}
            </strong>
            <span>Study streak</span>
          </div>
        </div>
      )}
      {own && (
        <Link className="study-sharing-link" href="/profile/edit#study-sharing">
          {activity.shared_totals || activity.shared_live
            ? "Study sharing settings"
            : "Only you · Share study activity"}
        </Link>
      )}
    </section>
  );
}
