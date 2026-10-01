# MVP progress and resuming work

User authorized continuing sequentially through Phase 13 on 2026-09-29. This is
still an MVP for a small tester group. Work one phase at a time and pass its checks
before starting the next. This authorization supersedes older per-phase stop text.
No deployment or invitation has happened. The MVP is saved in local Git commit dbcb0aa; remote backup is being completed.

- Phases 00–05: local implementation complete; 56 checks passed at Phase 05.
- Phase 06: local implementation complete; 62 tests, typecheck, lint, build passed.
- Phase 07: optional session sharing complete; full checks plus targeted linking regression passed.
- Phase 08: discovery and communities complete; 68 tests, typecheck, lint, build passed.
- Phase 09: notifications and safety complete; 73 tests, typecheck, lint, build passed.
- Phase 10: private stats and navigation complete; 77 tests, typecheck, lint, build passed.
- Phase 11: local audit complete; 80 tests, typecheck, lint, build passed; npm production audit clean.
- Phase 12: local deployment preparation complete; 81 tests, typecheck, lint, build and 12-route HTTP smoke passed.
- Current status: Supabase connected and schema applied; live app verification and upload hardening remain.
- All supplied phase prompts have been worked through locally; external acceptance and release blockers remain.
- The pack contains thirteen phases numbered 00–12 and labels 12 final. No separate Phase 13 brief exists.

Live Supabase Auth/Storage/browser tests are pending configuration in HUMAN_SETUP.md.
These must be completed before inviting testers. Build fallback is
`npm run build -- --webpack`. Save this journal at phase boundaries so rate-limit
interruptions do not lose progress. No additional recurring automation is configured.

## Next resume
Read docs/DEPLOYMENT.md and docs/AUDIT.md. Check whether .env.local and the dedicated
Supabase project are now configured without printing values. If configured, validate
the target and dry-run/apply migrations, perform live schema/Auth/Storage tests, and
finish trusted upload processing before invitations. Browser localhost access was
previously blocked; do not bypass that restriction. No accounts need to be invented.
Source checkpoint is committed locally (dbcb0aa); verify remote before claiming backup. No active temporary production server;
existing development server may still run on port 3000.

## Live setup checkpoint — 2026-09-29
The existing StudySocial Free organization and `studysocial` project
`onphcogvgisjgmlukqhv` (Stockholm) are verified and linked to this checkout.
All twelve migrations and academic seed applied successfully. Hosted schema lint
passed with no warnings; 19/19 public app tables have RLS, four subjects exist,
and both Storage buckets are private. No auth users exist yet. `.env.local` now
contains the project URL/publishable key and localhost site URL; it is ignored.
Official CLI login succeeded; credentials stay in the CLI credential store.
Local callback/recovery allowlist and minimum password length 12 were applied.
Custom confirmation/recovery templates were rejected by the provider: free-tier
default email service forbids template modification. No upgrade occurred. Defaults
remain; custom SMTP is needed for intended templates/delivery. Do not claim email
flows tested. CLI config push was narrowed to auth fields to preserve other defaults.

Next: finish trusted upload processing, live auth/storage tests, GitHub backup, and
Vercel test deployment. No Vercel deployment yet. Use current CLI commands rather
than asking for passwords. Full local checks last passed 81 tests before this auth
configuration-only change; hosted schema checks now also pass.

## Product refresh and hosting — 2026-09-30
- Replaced obsolete coming-soon landing with prominent signup and student-life copy.
- Purple/lilac theme with peach/blue accents; light/dark support retained. Phone
  landing and signup inspected at 390×844; no fake users, photos or engagement added.
- Composer keeps photo/caption/audience visible; optional study details collapse.
  Onboarding optional academic details collapse without deleting saved values.
- Clubs moved near the top of discovery, empty recommendation sections suppressed;
  header/feed provide club discovery links. Existing communities are the clubs;
  there is no chat or DM feature.
- Apple/Google OAuth server action uses a strict provider allowlist and fixed
  callback. Buttons follow live Supabase provider settings, Apple first. Both
  providers are disabled on the project. Two added provider regression tests pass.
- User's existing failed-email tab reported `otp_expired`. Improved recovery copy
  explains newest-link/same-browser use and password sign-in if already confirmed.
  This is not a claim that email delivery or confirmation is fixed/tested.
- 83 tests, typecheck, lint and Webpack build passed. Vercel Turbopack build also
  passed. Final minor discovery/semantic changes rechecked with typecheck/lint.
- Vercel project created and public app env configured; HTTPS Supabase callbacks
  set. First deployment ready, owner protection enabled; configured redeploy pending.
- Google Cloud terms awaiting user approval; no legal terms accepted. An earlier
  stale UI click was rejected before Cloud Shell could open; shell not activated.
- Next: configure Google after terms approval, Apple after membership confirmation,
  custom email delivery, upload hardening, authenticated live checks. Do not invite
  external testers based on the successful build alone.

### Hosting verification
Configured deployment `dpl_2g5eJ6kuE2SShiToWrtWN3TmqTP2` is READY at
https://studysocial-iota.vercel.app with source commit `339d52d` pushed to GitHub.
Final local Webpack build and hosted Turbopack build pass. Deployment environment
syntax preflight passes with the HTTPS origin. Hosted landing/signup/login return
200; protected feed redirects to login; malformed confirmation redirects to the
fixed local login error page. Frame denial and private no-store auth headers checked.
Hosted mobile landing/signup inspected in Chrome at 390px. No authenticated account
was created or changed, and email/OAuth success is not claimed.

Correction to protection assumptions: Vercel Standard Protection leaves the canonical
production domain public (anonymous request 200), although individual deployment URLs
require Vercel login. Automatic approval review blocked changing this to all URLs
because explicit authorization is needed. User approval is pending; no protection
change or paid upgrade occurred. Do not describe the canonical URL as access-limited.
Google Cloud terms and Apple membership answers are also pending. Browser handoff
keeps the Google terms page open. Latest screenshots are outside the repository in
`/Users/iasonasandreadis/studysocial-review/`.

The initial HTTP smoke expected a redirect status for `/feed` and failed that
assertion. Next streams this route with HTTP 200 plus a login redirect. Follow-up
confirmed the refresh meta and `NEXT_REDIRECT` both target `/login`, and no feed
heading/content is present. This is not an authorization failure or an all-green
claim for the original status-only smoke script.

## Simpler Home Screen app — 2026-09-30
User rejected the website-like interaction and colourful theme. Replaced the visible
shell with neutral light/dark surfaces, a persistent header and four labelled icon
controls (home, search, create, profile). Study tools/settings live on `/account`.
Removed marketing footer and feed ranking exposition. Simplified discovery to People
and Clubs, avoiding seven separate discovery queries and dense empty sections.

Profiles now show actual published photo grids through the session-scoped RLS client;
own private posts remain visible to their author, other viewers keep existing access
rules. No privileged data lookup or migration was performed. Post share uses the native
share sheet or clipboard without changing audience. Composer shows a photo picker,
caption, audience, Next; optional fields live under one disclosure. Large supported
phone images resize to fit the existing server limit, with server validation retained.

Added standalone manifest, 192/512/maskable icons, Apple touch icon and web-app metadata,
viewport safe areas, generic offline screen and connectivity notice. Worker caches
only the generic offline page, never account/post/API/image responses. Home Screen
start URL is `/feed`; signed-in visitors to `/` return to the app. Old shortcuts may
need re-adding in Safari. No claim of actual iPhone installation testing.

Verification: all 89 tests, TypeScript, lint and final local Webpack build passed.
Mobile feed/composer reviewed at 390px and 320px using a clearly labelled temporary
local layout screen; no real/fake accounts were created and the screen was removed
before production build. No horizontal overflow. A browser file-picker test could
not select a local file because the extension disallows file URL access. No permission
was bypassed. Resize validation, bounds, aspect ratio and resource cleanup tested with
browser API mocks; real iPhone photo upload remains to verify.

Pending externally: Google/Apple setup and email delivery/live auth checks from earlier
checkpoints. Trusted upload boundary and operator readiness remain before invitations.
This refresh does not change pending Vercel access-control approval or expose new data.

Deployment complete: source `8dd1e5a` pushed; Vercel deployment
`dpl_GZHUUsuKhcPkRz9Q4b8cyRNxgUtL` READY at https://studysocial-iota.vercel.app.
Hosted build passes. Manifest declares standalone mode and `/feed` start; icon,
Apple touch icon, offline HTML and worker endpoints return 200. Worker no-store
header verified. The first metadata assertion used an outdated apple-prefixed
capable tag; inspected installed Next 16 docs/output and verified the emitted
`mobile-web-app-capable=yes`, Apple title/status bar, viewport-fit and manifest
link instead. Temporary local test URL returns 404. Live welcome reviewed at 390px;
proof saved outside repo as studysocial-review/simple-app-mobile.png. No real iPhone
installation or end-to-end live upload is claimed. Final settings move preserves
the existing school discovery privacy control under Account.

## September 30 — restore Study and reduce interaction delays

Main navigation is Home, Discover, Create, Study and Profile. Study has Timer,
Progress and History tabs. The header menu now contains clubs, follow requests,
posts/drafts and profile editing; account/password, safety, school discovery and
logout are under Settings. Changing email is not implemented by this change.
Finishing a session still opens its saved summary and optional sharing composer.

Performance changes:
- Vercel function region configured as Stockholm (`arn1`), beside Supabase's
  Stockholm database. The prior project default was Washington (`iad1`).
- Feed/profile images use one session-authorized batch signing request instead
  of up to 20/24 requests. Existing Storage RLS and 60-second expiry remain.
- Likes preview immediately with React optimistic state and roll back on failure.
- Follow changes invalidate affected routes instead of the root layout.
- Timer sync skips hidden/offline pages and overlapping background reads; stale
  errors cannot overwrite a newer mutation. Removed the extra refresh after finish.
- Public PWA assets no longer enter the auth-refresh proxy.

Verification: 91 tests pass, including batch signing denied/missing paths, existing
follow authorization and timer lifecycle tests. Typecheck, lint and local Webpack
production build pass. Browser automation could not bind either Chrome or the
existing in-app tab this session; no fresh mobile visual check or real iPhone
interaction benchmark is claimed. No production posts/accounts were changed for
verification. Existing beta release blockers remain; these are UX/performance fixes.

Deployed to https://studysocial-iota.vercel.app as
`dpl_FAxLatF1YDTGL23LxUsLuiSMTTLm`; deployment API confirms READY and `arn1`.
Hosted Turbopack build passes. Anonymous Study/Settings responses contain the
expected streaming login redirect; manifest returns 200. Public login total-time
samples before: 3.272, 0.720, 0.485 seconds; after: 1.233, 0.424, 0.495 seconds.
These three-request samples include cold-start/network variation and do not
establish an authenticated interaction speedup. Code backed up in commit `856cc74`.
No new human setup is needed for this update.

## September 30 — phone progress, avatars and comment replies

Replaced Safari-native meter bars with a compact neutral seven-day chart. The
progress screen now leads with today/this-week totals; optional goal, subject
breakdown and timezone controls are secondary. History stays on its existing tab.
Fixed filled-link text contrast in both themes and dark avatar initials.

Avatar selection now prepares JPEG/PNG/WebP files up to 20 MB in the browser,
resizing to a 768px long edge and <=1 MB before the existing server validation,
512px crop and metadata stripping. Preview, preparation errors and disabled save
state are visible. HEIC is still unsupported. Actual production photo saving was
not exercised on a user's account. Browser fixture proved 4032x3024 becomes 768x576.

Added one-level persisted comment threads via migration 202609300013. Reply links
open the parent and paginated replies; retry IDs, parent/post matching, block rules
and private-profile fields are checked in SQL. Direct parent-column writes stay
ungranted. Existing parent deletion cascades to replies. UI uses likes instead of
kudos; internal schema names are preserved. DMs are not implemented; asked whether
the first version should be mutual followers only or use message requests.

93 tests pass, including reply authorization/duplicate/cascade coverage and avatar
resize bounds. Hosted migration applied and DB lint passes. Local preview checked
at 320px, 390px and 1280px, without horizontal overflow; button contrast checked
in both themes. Preview used clearly labelled example values and was removed
before deployment. Screenshot: ../studysocial-review/progress-refresh.png.

Deployment `dpl_FagyqTpM8GxLRuUrVktpAGjczgUi` is READY at
https://studysocial-iota.vercel.app, source `2a9a0a1` pushed to GitHub.
Final local/hosted builds, lint and typecheck passed. Public home returns 200;
temporary `/ui-review` returns 404. No live personal posts, replies or profile
photos were created during verification. No new human setup is required.

## October 1 — visible study activity and inline replies

Public-account composers now default to the public signed-in audience; private
accounts keep Only me. Existing posts are unchanged. Study durations use a larger
card on feed, post detail and linked-session composition. Session completion and
composer guidance/spacing are shorter.

Replies stay below their root comment with expandable replies, reply counts,
loading/error states and one reusable input. Reply targets focus the input; replies
to replies remain in the root thread with an @handle prefix. Successful submission
clears the input and loads saved replies, without a full-page confirmation card.
Reply pages put the newest first so new replies remain visible in busy threads.
Existing thread links still work. Deletes request confirmation, including cascade
wording for parent deletion. Permission rules stay in the existing tested RPCs.

Profiles show own today/week totals and streaks, with separate opt-in switches for
sharing totals/streaks and running-timer status. Sharing follows profile access
and blocking; no raw session or note records are exposed. Streaks count completed
positive-duration days in the owner's timezone, including a run ending yesterday.
Active/paused/discarded time is excluded from totals. Live status omits paused and
capped timers. Profile activity refreshes every 30 seconds while visible/online.
Existing users are not silently opted in to activity sharing.

94 tests pass, including profile sharing/privacy/blocking, local-date streaks,
missed days, live/paused/capped/resumed timers and reply counts. Phone previews at
320px/390px and desktop at 1280px fit without horizontal overflow. Reply focusing
and public audience default verified in the browser using clearly labelled local
example data; no real posts or accounts mutated. Temporary preview removed.
