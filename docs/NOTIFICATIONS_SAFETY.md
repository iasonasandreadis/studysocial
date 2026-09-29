# Phase 09 — in-app notifications, blocking and reports

`/notifications` shows new followers, follow requests, accepted requests, kudos and
comments with unread/read state and mark-one/all controls. Navigation includes a
Notifications entry. There is no push service. SQL triggers create real events in
the same transaction as the underlying change; clients cannot mint notifications.
Self events are skipped. Follow/request/accepted/kudos keys deduplicate a pair or
post relationship across retries, and comment IDs deduplicate comment events.
Re-following/re-requesting can reuse an older event without resetting its read state;
this deliberately avoids repeated notification spam. Notifications are not fabricated
for actions that happened before this migration was applied.

Every read checks the recipient, current blocking, relationship existence and post
or community access. Deleted comment notifications cascade away. Removed kudos and
withdrawn requests stop appearing. Private actor display names are withheld unless
profile access is allowed; the discoverable handle supplies a safe identity. No
comment bodies, photo previews, private notes or academic data enter notifications.
Links lead to authorized direct pages that check access again. Blocking deletes
pair notifications so unblocking cannot resurrect them. Counts are viewer-relative.

Profiles expose block/report controls; other authors' posts have report controls.
`/safety` lists the viewer's blocked handles and supports unblocking. Database rules
already remove follows/requests and group memberships between a member and a
blocked group owner. Normal discovery, profiles, posts, comments and media are
filtered both ways. Unblocking does not recreate connections. Existing signed media
URLs can remain usable for their remaining 60-second lifetime.

Reports support harassment, inappropriate content, spam, impersonation, privacy and
other reasons, plus up to 2,000 characters of optional private detail. Reports use
stable IDs, serialized retries, ownership checks and a 10-per-account/calendar-minute
insert cap. A known private profile handle can be reported without exposing that
profile's protected information. No ordinary user can read reports, including their
own; no moderator dashboard was added. The UI confirms storage only. The project
owner must establish a real report-review process before inviting testers.

Minor-safety review for this phase: avatars/photos remain optional; no face image,
GPS/live location, home address, exact age, facial recognition or detailed routine
is required or inferred. School discovery is off by default and requires profile
access plus consent. Free text/photos can still contain personal details, so the app
asks users to check them before sharing. This is a product review, not a legal or
production-safety certification.

Migration 010 contains the notification triggers, current-access predicate, safety
RPCs and report constraints. Tests cover correct recipients, deduplication, private
actor projections, removal/reading, self-event suppression, blocked interactions,
unblocking without restoring follows, report validation, retries and unreadability.
Live Supabase and authenticated UI/browser behavior remain pending existing setup.
