# Phase 11 audit — 2026-09-29

## Current follow-up — 2026-09-30
Supabase is now linked, all migrations applied, and hosted schema lint passes.
Mobile landing/sign-up visuals were checked in Chrome at 390px. Existing local
connection failures were resolved by starting the development server; browser
access now works. Authenticated two-account and upload acceptance remain pending.
The release blockers below still apply; configuration is no longer the blocker.

## Historical Phase 11 result
Local review and regression checks pass. This is not live integration approval or
permission to invite testers. Supabase Auth/Storage and authenticated browser checks
remain blocked by missing project configuration. No cloud data was changed.

## Confirmed issues fixed
- Private community owners could change visibility and widen other authors' existing
  group posts. A database trigger rejects private-to-public changes when posts exist.
- A direct community DELETE could cascade other authors' posts while leaving Storage
  objects. Client DELETE is revoked until a coordinated cleanup flow exists. Trusted
  account/community removal must remove media through Storage API before DB cleanup.
- Follows, requests, community memberships, group creation and post draft creation had
  no persistent burst limits. Database triggers now cover direct API calls too.
  Per account/minute: follows/requests/memberships 20 each, groups 5, drafts 10;
  existing comments 30, kudos 60 and reports 10 remain. Repeated retries may consume
  budget; wait a minute after reaching it. Limits do not replace platform abuse controls.
- PostgreSQL timezone aliases unsupported by JavaScript could crash recent-session
  rendering. Formatting falls back to explicitly labelled UTC; SQL calendar totals
  continue using the saved timezone.
- A Phase 10 form action return type prevented TypeScript compilation; fixed before
  audit began and verified by the full build.

## Reviewed paths and evidence
| Area | Local evidence | Remaining live verification |
| --- | --- | --- |
| Auth/onboarding | fixed redirect validation, verified server identity, saved-step SQL tests | confirmation/recovery delivery, cookies, refresh/logout |
| Profiles/follows | private projections, explicit sharing flags, approval/revocation/block tests | two-account navigation and signed avatars |
| Posts/photos | decoder/metadata tests, immutable ownership, draft/publish/delete ordering | actual Storage errors, deletion retry and URL expiry |
| Feed/discovery | RLS-filtered ranking/counts/search, private academic matching tests | live pagination and rendered empty/error states |
| Kudos/comments | ownership, duplicate retries, blocked actor and burst tests | UI failures and rapid real requests |
| Timer/sharing | database timestamps, pause/CAS/idempotency/cap tests, private notes excluded | sleeping devices, two tabs and real concurrent API calls |
| Communities | request/accept roles, author privacy and audience-change regressions | real member/owner flows and photo cleanup |
| Notifications/reports | recipient ownership, source visibility, deduplication and confidential reports | review/support operations |
| Stats | own sessions, midnight/week/DST boundaries and timezone fallback | authenticated display against real history |
| Navigation/accessibility | semantic controls, labels, focus, pending/error states, reduced motion, mobile CSS review | keyboard/screen-reader and mobile/desktop visual checks |

## Checks
80 tests pass, applying all twelve migrations from scratch under actual database
roles in isolated PGlite. TypeScript, ESLint and production Webpack build pass.
`git diff --check` passes for tracked changes. `npm audit --omit=dev` reports zero
known production dependency vulnerabilities on this date. The registry check is a
point-in-time advisory result, not a guarantee. Full Supabase schema lint needs the
hosted project or Docker; neither is configured. The PGlite Auth/Storage schemas are
test contracts, not the full Supabase services. Browser access to localhost was
blocked by the browser tool earlier; no authenticated visual result is claimed.

## Release blockers and MVP limits
- Configure dedicated Supabase and verify the live checklist in HUMAN_SETUP.md.
- The app decodes/re-encodes images and strips metadata. A custom direct Storage API
  client can bypass that processing: bucket MIME/size and ownership policies still
  apply, but they cannot inspect image bytes or EXIF. Before external testers, enforce
  trusted upload processing at the backend boundary and test the direct API attack.
  No privileged key is added to the browser to work around this.
- A real operator must review reports and handle urgent support, export/deletion,
  retention and account removal. Reports currently cover users/posts in the UI;
  comments may be reported through their containing post with details. No staff or
  notification delivery is fabricated. Community deletion has no client flow.
- No published-post edit UI, in-app notification preferences, public stats, streaks,
  push notifications, DMs, or moderation dashboard. English UI; catalog labels can
  hold translations. Signed URLs can remain valid for their 60-second lifetime.
- Orphan avatar cleanup after interrupted replacement and abandoned drafts needs an
  operator procedure. Never delete storage.objects rows directly to remove files.
- Local code remains uncommitted/unpushed; no deployment URL exists.
