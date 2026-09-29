# Phase 03 — profiles and social graph

## Implemented routes
- `/app` resolves the authenticated user's current handle and redirects to their profile.
- `/u/[handle]` renders an authorized profile or a minimal private-profile request state.
- `/profile/edit` edits the current user's profile, study details and sharing choices.
- `/u/[handle]/connections` lists authorized followers/following, 20 per page.
- `/requests` lets the recipient accept or decline incoming requests, 20 per page.

All routes and server actions require verified authentication and completed onboarding.
There is no discovery/search page or invented social content. A user can visit another
profile through its known URL or an authorized connection/request list. Supabase
configuration is still required to use these routes; signed-out users go to login.

## Database privacy boundary
The fourth migration adds five owner-private sharing flags to user_settings; all
are false by default. The profile editor explicitly opts in to sharing year,
direction, subjects, a goal, or university/program targets. School and email are
never in the social projection. Owner-only settings/subjects RLS remains unchanged.

`social_profile(username)` returns details only when private.can_profile authorizes
the caller. Otherwise it returns just the known handle, opaque identity ID, private
status and caller relationship state. Display name, avatar, biography, academic
choices and counts are omitted for unauthorized private viewers. Blocked and absent
profiles both return null. This is a narrow projection, not public SELECT access to
private profiles. Pending request lists likewise reveal only a private requester's
handle, not their biography/avatar/display name.

`social_connections` and profile counts share private.visible_connections. Owners
can see handles for their own private connections. Other viewers see only connections
whose profiles they may read. Counts are therefore viewer-relative; the UI explains
this. Both paths exclude blocked users. Lists use stable handle/UUID ordering and
bounded pagination. A username change or concurrent relationship change may move
items between pages; list results are not a transactionally frozen snapshot.

`change_follow` derives the actor from auth.uid() and exposes follow, unfollow,
request cancellation, recipient acceptance/rejection, and follower removal. Existing
request/accept RPCs enforce private-account consent and block checks. Each relationship
mutation takes the same pair lock as block creation. Unique constraints prevent
duplicate edges/requests. Removing a follower revokes private access immediately.
Changing a public profile to private preserves already accepted followers; pending
requests still require acceptance. The editor makes this behavior explicit.

`edit_social_profile` validates bounded fields, sharing booleans and selected subjects,
locks the owner's settings and saves all changes in one transaction. It never accepts
an owner ID. Username conflicts or invalid subject references roll back the edit.
Avatar editing reuses the Phase 02 processing pipeline and refreshes affected routes.

Raw study sessions remain owner-only. Only the owner sees a computed sum/count of
real completed sessions; no public study-time statistic is exposed. With no sessions,
the page displays a truthful empty state. Posts, timer, discovery, communities and
notifications are not implemented in this phase. Block enforcement is tested with
database fixtures; user-facing block/report management remains a later safety phase.

## Verification and limits
- 36 automated tests pass, including new profile projection, academic opt-in,
  private requester, viewer-relative count/list, owner edit, duplicate request,
  acceptance/rejection/removal, privacy transition, blocking and pagination tests.
- Typecheck and lint pass. The production build is verified with Next.js Webpack
  because this machine restricts Turbopack's compiler process.
- No real credentials, profiles or relationships were created. Tests use disposable
  embedded PostgreSQL identities; they do not simulate accounts in the app.
- Hosted Supabase RPC/Storage/session checks and authenticated visual/mobile testing
  remain pending. Browser automation previously rejected local page access under its
  URL security policy, so it was not retried through another surface.
- Apply all four migrations before live testing. No new credential type or external
  service is required beyond the existing Supabase setup.

## Human action / next phase
Nothing is required from the owner to continue local implementation work. Live
verification needs the Supabase project, local URL/publishable-key configuration and
migrations described in HUMAN_SETUP.md. Phase 04 has not started.
