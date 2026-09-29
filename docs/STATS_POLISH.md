# Phase 10: private progress and navigation

`/progress` shows today, Monday-to-today, all-time totals, an optional weekly goal,
last seven calendar days, this week's subjects and five recent completed sessions.
Only the current user's completed sessions count. Notes never enter the stats result.
Full active duration belongs to the local completion date; sessions crossing midnight
are not split. Pauses are already excluded by the timer. Changing timezone recomputes
groups without changing timestamps. DST days use calendar dates, not 24-hour windows.
There is no streak, leaderboard, or public time comparison.

Settings validate timezone names and optional goals of 1–10,080 minutes in PostgreSQL.
Navigation now provides Home, Discover, Create, Study and Profile, fixed at the bottom
on small screens. Secondary account tools remain available. Feed skeletons preserve
photo space, motion respects the existing reduced-motion preference, and controls
have visible labels and active-page state.

Validation: 77 tests, TypeScript, ESLint and production Webpack build passed on
2026-09-29. New SQL tests cover ownership, future/noncompleted exclusion, timezone
preferences, midnight/week boundaries and 23/25-hour DST days. Live authenticated
mobile/desktop, screen-reader and Supabase integration checks remain pending setup.
