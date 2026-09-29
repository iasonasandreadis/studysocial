# Phase 01: database and security foundation

## Implemented scope
Two transactional SQL migrations create 19 application tables, RLS policies,
private storage buckets and constrained social relationship RPCs. No auth screens,
real users, UI data fetching or later social features are implemented. The app
still runs without configuration. The SQL has been executed in embedded PostgreSQL;
a hosted migration and full Supabase API integration run remain to be verified.

## Tables and audience rules
| Tables | Reads | Writes |
| --- | --- | --- |
| academic_programs, subjects, program_subjects, schools | Signed-in users | Trusted administration only |
| profiles | Owner; unblocked signed-in viewers if public; accepted followers if private | Owner may edit presentation and privacy fields |
| user_settings, user_subjects | Owner only | Owner, with bounded editable columns |
| study_sessions | Owner only | Owner; one active/paused session per user |
| posts | Owner, or profile access AND post audience AND community access | Author; community membership required for posting |
| post_media | Same access as post | Post author; immutable ownership/path |
| comments, post_kudos | Post access and no block with actor | Own contributions to an accessible post; own deletion |
| follows, follow_requests | Parties only, without blocking | RPC creation/acceptance; either party may remove/cancel |
| communities | Owner, accepted members, or unblocked signed-in public-group viewers | Owner; ownership cannot be transferred by direct update |
| community_members | Own request, group owner, or accepted members seeing accepted peers, excluding blocks | RPC request/accept; own leave or owner removal |
| notifications | Recipient only, with current actor/post/community visibility | Trusted backend creates; recipient can mark read or delete |
| blocks | Blocker only | Blocker adds/removes own block |
| reports | No client reads, including reporter | Reporter inserts visible target; trusted moderation only thereafter |

Anonymous clients cannot read any application table. Public means discoverable to
signed-in users, not publicly indexed. A post in a community does not override a
private author's follower requirement. Owners can always read their own posts.
For follow-request UI, private requesters' full profiles remain hidden: a later
phase may add a narrowly scoped minimal-identity RPC, never relax full profile RLS.
Private community discovery/invitations are likewise future work; request_membership
requires a known community UUID, and requests do not grant access.

Settings keep school/program, goals, locale and timezone away from profile readers.
Academic catalogs use country codes, system/level codes, translated JSON labels and
a many-to-many subject mapping; they are not fixed to Greece. The optional seed is
a small starter catalog, not a complete authoritative exam syllabus. No schools or
student data are seeded.

## Mutation and security design
- UUID keys, foreign keys, bounded text/numeric values, unique relationship pairs,
  reverse lookup indexes and timestamps support later features. IDs/ownership,
  role/status and server-computed snapshots are excluded from client UPDATE grants.
- An auth.users insert trigger creates a private profile and settings using only
  the Auth user ID. User metadata never grants roles or sets trusted identity fields.
  Existing Auth identities receive a private profile when the migration is applied.
- `request_follow(target)` directly follows public accounts; private accounts receive
  one pending request. `accept_follow(requester)` checks the current target. Direct
  table INSERT is denied. DELETE cancels/unfollows/removes followers.
- `request_membership(target)` joins public groups or requests private membership.
  `accept_membership(target, member)` is owner-only. Moderator promotion is reserved
  for a later authorized server workflow; clients cannot set role/status.
- Blocking applies both directions in database reads/writes and deletes follow edges,
  pending requests and membership in groups owned by the other party. Unblocking
  does not restore those relationships. Pair advisory locks serialize those RPCs
  with block creation. Multi-connection race tests remain part of live integration.
- Security-definer authorization helpers live in unexposed `private`, use a fixed
  empty search_path and derive the viewer from auth.uid(). They avoid recursive RLS.
  Only predicate helpers receive authenticated EXECUTE; trigger helpers do not.
  Public RPCs revoke default PUBLIC/anon execute access. Service-role clients bypass
  RLS by design: no service-role client/key is included in this app.
- Notifications contain bounded event references, not arbitrary private text payloads.
  Clients cannot forge notifications. Future event handlers must use verified events,
  honor preferences and choose unique event keys; they are not implemented here.
- Reports are insert-only to ordinary clients. No moderation UI, reviewer role or
  moderation endpoint is added in this phase.

## Session snapshots and deletion
Raw sessions (including timestamps, pause state and notes) never become readable
through a share. A post may reference the author's completed session. A trigger
copies only duration seconds; subject/caption are explicit share fields. The opaque
session UUID identifies the relationship but does not grant access to that session.
The session-post link is unique; arbitrary duration snapshots cannot be submitted.
Snapshots do not change when a session is edited. Unlink/delete its post before
removing a linked session; the FK deliberately restricts direct session deletion.
Duration values are self-reported study activity, not proof of achievement.

Most content cascades on account/content deletion. Reports currently cascade with
their target/reporter; no invisible long-term retention is implemented. Auth account
deletion and storage cleanup need a server workflow later: remove owned Storage
objects through the Storage API before deleting the Auth user. Database cascades
remove media references, not object bytes. Do not delete storage metadata with SQL.

## Storage workflow
Both buckets are private. Authenticated upload paths:
- avatars: `<user UUID>/<unique filename>.webp` (also jpg/jpeg/png), max 2 MiB.
- post-images: `<user UUID>/<post UUID>/<unique filename>.webp`, max 10 MiB.

Create a post and its post_media record before uploading a post image. The composite
foreign key ties metadata to that post's actual author. Set the profile's avatar_path
to publish an avatar. Owners can read their own unlinked assets; others can read only
assets referenced by a currently accessible profile/post. There is no UPDATE policy:
use fresh filenames and `upsert: false`, never overwrite an existing object. Owners
can delete their own objects. The later uploader must decode/re-encode images, strip
EXIF, bound dimensions, and clean abandoned uploads. Bucket MIME limits alone cannot
validate actual image contents.

Use authenticated download or short-lived signed URLs (recommended maximum 60 seconds)
only after authorization; never public URLs. Existing signed URLs remain usable until
expiry even after a block/privacy change. Avoid shared/CDN caching of private media;
re-check permissions when issuing each URL. Policies apply to object listing too.

## Client and environment setup
`src/lib/supabase/client.ts` is the browser client; `server.ts` is server-only and
creates a cookie-bound client per call. `src/proxy.ts` refreshes and verifies sessions
with getClaims and forwards updated cookies to both request and response. Responses
that refresh cookies are marked private/no-store. Future authenticated pages and
handlers must independently verify identity, honor RLS and avoid shared data caching.
Proxy alone is not authorization. No login routing/redirects are added yet.

Only project URL and a modern `sb_publishable_` key are accepted. The landing page
and build work without either. A partially configured environment fails when a
Supabase client is requested; finish both values before using account features.
Do not call getSession alone to authorize a server action. Generate database types
against the configured project when adding typed queries:
```sh
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```
Then supply Database to createBrowserClient/createServerClient. Client utilities in
this phase have no queries; generated cloud types are not fabricated here.

## Validation and remaining verification
`npm test` runs both SQL migrations against PGlite (embedded PostgreSQL), with
minimal test-only auth.users, auth.uid(), storage.buckets and storage.objects
contracts. It switches actual database roles/JWT subjects to exercise RLS, grants,
constraints, triggers and RPCs. Test identities exist only inside an ephemeral engine.
Seeds are tested for repeatability and contain only reference catalogs.

This tests SQL semantics, not GoTrue, PostgREST, Storage HTTP behavior, object decoding,
JWT verification, multi-connection races, or signing/CDN expiry. `npm run db:lint`
requires a local Supabase stack (`npm run db:start`) and Docker. Docker is unavailable
on this machine and no hosted project is configured, so full Supabase validation
must run before claiming live account/media functionality works. Rate limiting,
image processing, event creation and end-to-end auth tests belong to later feature phases.

References: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[Storage schema](https://supabase.com/docs/guides/storage/schema/design).

### Recorded verification — 2026-09-28
- Dependency installation/audit: passed, zero reported vulnerabilities.
- `npm test`: 17 tests passed (one migration suite with 16 authorization cases).
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `git diff --check`: passed. Existing landing page HTTP smoke check: passed.
- `npm run db:lint`: unable to connect to local Supabase at port 54322; full
  Docker-backed/hosted verification remains pending. No hosted resources were changed.

## Phase 02 extension
Migration `202609280003_onboarding.sql` adds private academic year/direction,
university/program targets, goal, custom school name and saved onboarding progress.
`save_onboarding(step, payload)` derives ownership from Auth, validates step order
and atomically saves each step. Direct completion/progress changes are denied.
The avatar processing and auth event flows described as future work above now exist
for onboarding; see AUTH_ONBOARDING.md. Post-photo processing remains a later phase.
All three migrations are included in the current SQL tests.

## Phase 03 extension
Migration `202609290004_profiles.sql` adds opt-in academic sharing flags and narrow
profile/relationship RPCs without widening raw profile/settings RLS. Counts and lists
share an authorization filter. Profile edits are atomic; relationship mutation RPCs
derive the actor from auth.uid(). See PROFILES.md for the exact private-profile,
requester, blocking and count behavior. All four migrations run in the test suite.

## Phase 04 extension
Migration `202609290005_posts.sql` adds the photo post lifecycle and optional
explicit duration sharing. It replaces direct post/media mutation grants with
owner-checked prepare/publish/delete RPCs and limits each post to one image.
Draft/deleting records are owner-only. Upload policy locks and checks the owned
registered draft; finish-deletion preserves metadata until Storage removal succeeds.
All five migrations run in current tests. See POSTS.md for the current upload,
manual/session duration, cleanup, direct-client limitations and live checks; those
rules supersede the original post mutation/upload workflow above.

## Phase 05 extension
Migration `202609290006_feed_interactions.sql` adds invoker-secured feed/activity
RPCs, a minimal comment projection, desired-state kudos and idempotent comments.
Draft/deleting posts reject new interactions. Viewer-filtered engagement powers
counts and ranking. A private per-account budget table and insert triggers enforce
burst limits. A same-post nullable parent reference prepares for future replies
without exposing nested comments. All six migrations are tested. See
FEED_INTERACTIONS.md for ranking weights, privacy and verification limits.
