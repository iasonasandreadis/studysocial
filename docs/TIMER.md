# Phase 06 — private study timer

`/study` starts, pauses, resumes, saves a private note, finishes or discards a session.
`/sessions` lists completed sessions in pages of 20. `/sessions/[id]` shows the
owner's completed result and private note. No session publishes automatically.

Migration 007 revokes direct session writes. Start is serialized per user; retries
reuse the request UUID and another tab gets the existing open timer. Changes lock
the session and require its version. Stale tab actions fail with a sync instruction.
Terminal finish/discard retries return the saved result without overwriting it.

The database accumulates fractional active seconds from its own timestamps; pauses
are excluded and completion rounds down once. Display is interpolated from the last
server timestamp with a monotonic browser clock, not an interval counter or submitted
duration. Focus, reconnect and a 15-second poll resynchronize. In-flight reads cannot
overwrite newer action results. A suspended/offline browser does not pause the saved
timer. The next successful sync is authoritative; offline pause is not queued.
Completed duration is capped at 24 hours, explained in the UI. Timestamps use UTC.
Notes must be explicitly saved before navigation; finishing also saves them.

All sessions remain owner-only through RLS. No direct client write can forge a
start time, duration, owner or version. Old authorization tests now create historical
completed-session fixtures as administrator; new tests exercise the actual timer RPCs.

Verification: 62 tests, typecheck, lint and Webpack production build passed on
2026-09-29. Tests cover interval-independent display, fractional time, pause/resume,
stale versions, ownership, raw mutation denial, private notes, duplicate finish,
discard and the cap. Real browser suspension, multi-connection races and live
Supabase integration remain pending backend setup. No new credentials are needed.
