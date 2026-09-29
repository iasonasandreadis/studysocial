# Human setup checklist

## Latest status
Supabase is now connected and all twelve migrations are applied. You do not need
to create another project. Hosted schema checks pass. Auth redirects and 12-character
password minimum are saved. Custom email templates require a custom SMTP provider;
no paid upgrade was made. Live sign-up/upload testing and deployment remain.
The older setup checklist below is retained as a reference.

## Start here
Local implementation and deployment preparation have reached the final supplied
phase (12). The pack contains thirteen phases numbered 00–12; there is no separate
Phase 13 prompt. **Your next required action is the dedicated Supabase account
setup below.** The agent can continue migration and live testing once configured.
No new coding tools need installing. Do not invite testers yet; see the audit.

## Completed locally
- [x] Node.js 24 is installed (verified v24.16.0).
- [x] Dependencies installed, development server started, and landing page verified.
- [x] Supabase CLI is installed as a project dependency; no global install needed.
- [x] Phase 01 migrations, policies and database regression tests are written.
- [x] Phase 02 authentication, resumable onboarding and optional avatar processing are implemented locally.
- [x] Phase 03 profile pages, editing, follow requests and social graph are implemented locally.
- [x] Phase 04 photo posts, preview, direct viewing and retryable deletion are implemented locally.
- [x] Phase 05 feeds, kudos and flat comments are implemented locally.
- [x] Phases 06–10 timer, sharing, communities, safety, stats and navigation implemented.
- [x] Phases 11–12 local audit and deployment preparation completed; 81 tests pass.
- [ ] Live Supabase verification, trusted upload hardening and tester readiness remain.

To restart the app: open Terminal in this repository, run `npm run dev`, and visit
http://localhost:3000. No credentials are required for the landing page or `npm test`.

## Needed before live authentication: create a dedicated Supabase project
These steps need your account access. No hosted project has been created or changed.
Do not paste any credentials into chat or Git. The agent can continue once your
project is configured locally; it does not need you to send keys in a message.

1. Sign in at https://supabase.com/dashboard and create a **new dedicated StudySocial
   project**. Choose a suitable region. Save its database password in a password manager.
2. In the project's Connect dialog, find its **Project URL** and **publishable key**
   (starts with `sb_publishable_`). Do not use a secret or service-role key.
3. In this repository, run `cp .env.example .env.local`. Edit `.env.local` on your
   computer and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
   This file is ignored by Git. Restart `npm run dev` after changing it.
4. Authenticate the CLI, then link your project (the project reference is the identifier
   in the dashboard URL, not an API key):
   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REFERENCE
   npx supabase db push --dry-run
   npx supabase db push
   ```
   Enter the database password only in the CLI's password prompt if asked. Inspect the
   dry run first; it should list the twelve StudySocial migrations. Use the new project,
   not a database belonging to another app. Do not run `db reset --linked`.
5. The second migration **creates the avatars and post-images buckets automatically**.
   In Storage, confirm both are private; avatars allow 2 MiB and post images 10 MiB,
   with JPEG/PNG/WebP only. Do not make buckets public or add permissive policies.
6. In the SQL editor, verify every StudySocial table has RLS enabled:
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public';
   ```
   Every StudySocial table should show `true`. Do not expose the `private` schema
   through Data API settings. Keep anonymous sign-ins disabled.
7. Run `npx supabase db lint --linked --level warning --fail-on warning`. Later auth/photo
   phases must also test sign-in, session refresh, upload MIME/size limits, signed
   URLs and access revocation against this actual project with separate test accounts.
8. Optional: populate the small academic reference catalog by running **only**
   `supabase/seed.sql` in the SQL editor. It is idempotent and creates no users/posts.
   Never run `supabase/tests/bootstrap.sql` in a real project; that file is test-only.

## Alternative: full local Supabase stack (optional)
The SQL regression tests already work without Docker. To additionally run the
full Supabase stack locally, install and open Docker Desktop, then:
```sh
npm run db:start
npm run db:reset
npm run db:lint
```
`db:reset` erases and rebuilds the **local** database, then applies seed.sql. Use it
only for disposable local data. Docker is not installed/configured here, so this
full-stack validation has not yet run. `npm test` has validated all twelve migrations
and their RLS logic in embedded PostgreSQL, using small test Auth/Storage schemas.

## Needed for Phase 02 live verification: authentication settings
These require your Supabase account. The agent can handle migrations and tests once
the project and local configuration are available. Until then, account forms show
an unavailable message and do not simulate sign-in.

1. In Supabase Authentication → URL Configuration, set **Site URL** to
   `http://localhost:3000` for development. Add these exact redirect URLs:
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/auth/confirm?flow=recovery`
2. In Authentication → Email, keep email/password sign-in and **Confirm email**
   enabled. Keep anonymous sign-in disabled. Set minimum password length to 12.
3. In Authentication → Email Templates, copy the HTML from:
   - `supabase/templates/confirmation.html` into **Confirm signup**.
   - `supabase/templates/recovery.html` into **Reset password**.
   These templates point to the app's confirmation endpoint and support opening
   confirmation links on another device. Local Supabase uses these files automatically.
4. Set up SMTP for sending to real users. Until SMTP is configured, use the recipient
   addresses allowed by your Supabase project's current email settings. Review Auth
   rate limits before inviting users; the app displays a retry message when limited.
5. Apply the migrations from the previous section. Run `supabase/seed.sql` once if
   you want the initial exam program and subjects to appear in onboarding.
6. Restart `npm run dev` after editing `.env.local`. Visit `/signup`, register with
   an email you control, and confirm the email. Do not send your password to the agent.

### Live acceptance checks still pending
- [ ] Sign up, confirm email, and reach onboarding. Invalid/expired links offer recovery.
- [ ] Save step 1, sign out, sign back in, and resume at step 2.
- [ ] Try a duplicate username; verify the original details are preserved.
- [ ] Save academic details, choose privacy, and reach `/app`.
- [ ] Refresh/reopen the browser and verify the session persists. Sign out and verify
  `/app`, `/onboarding`, and `/reset-password` no longer show account data.
- [ ] Request password recovery, follow the email, set a new password, and sign in.
- [ ] Upload/replace/remove an optional avatar. Verify another unauthorized account
  cannot download it. Check the private bucket's actual upload limits.
- [ ] Check the authenticated onboarding screens at mobile and desktop sizes.

No hosted auth emails, account creation, session refresh or Storage API operations
have been tested yet. These checks require the configured project; local SQL and
image-processing tests do not substitute for them.

## Phase 12 — deployment preparation

**Nothing has been deployed. Start with the dedicated Supabase project above.**
The agent can run commands after account configuration. Never send passwords or keys
in chat. Current local checks pass, but the live checklist and upload hardening in
`docs/AUDIT.md` must be completed before inviting testers.

### 1. Prepare Supabase
- Complete the project, local environment, migration, private-bucket and email steps
  above. There are now **twelve migrations**, applied in filename order.
- Run `supabase/seed.sql`: the timer requires subjects. The seed contains academic
  reference data only. Never run the test bootstrap in your real project.
- For previews use a separate test Supabase project and email accounts you control.
  Keep real users and their data out of development/preview environments.
- Choose a stable HTTPS preview hostname. In the preview Supabase project set that
  as Auth Site URL and allow exactly `/auth/confirm` and
  `/auth/confirm?flow=recovery` on that hostname. Our email templates use Site URL,
  so changing only the allowlist will not change where their links go.
- Repeat with your final production hostname in the production project. Keep HTTPS,
  confirmation enabled and anonymous sign-ins disabled. Configure SMTP for testers.

### 2. Connect Vercel
1. Sign into [Vercel](https://vercel.com) using your account. Choose Add New → Project
   and import `iasonasandreadis/studysocial` from GitHub. Allow access only as needed.
2. The current implementation is local and has not been pushed. Let the agent save
   and push the reviewed code before importing/deploying; importing the current
   remote initial commit will not include the app. No manual source editing is needed.
3. Select Next.js, repository root, **Node.js 24.x**, install command `npm ci`, and
   build command `npm run deploy:check && npm run build`. Leave the output directory
   at the Next.js default. The app uses Node.js (including Sharp), not static export.
4. In Project Settings → Environment Variables, set only:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Dedicated project's HTTPS Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That project's `sb_publishable_…` key |
   | `NEXT_PUBLIC_SITE_URL` | Exact HTTPS app origin, with no path/query |
   Choose Preview or Production deliberately for each value. Do not add a secret or
   service-role key to any `NEXT_PUBLIC_` variable. No such key is used by this app.
5. Make the first verification deployment protected where your Vercel account permits
   it. Use a preview branch/environment and its test backend. Environment changes
   require a new deployment because public values are built into browser code.
6. Run the live smoke checks below. Only promote a reviewed deployment after the
   outstanding release blockers are resolved; a green build is not launch approval.

### 3. Post-deployment checks (agent can help once connected)
- [ ] HTTPS loads the app; login is enabled; refresh and protected routes work.
- [ ] Sign up/confirm/onboard, sign out/in, request recovery and change password.
      Email links stay on the intended preview/production hostname.
- [ ] Use owner, stranger and approved-follower accounts: private profiles, posts,
      photos, sessions, counts, discovery and notifications stay private.
- [ ] Publish/delete a photo, interrupt/retry, and verify actual Storage cleanup.
      Test direct API upload bypass and finish trusted processing before testers.
- [ ] Start/pause/resume/finish in two tabs, background/sleep, reconnect, share once;
      private notes never reach posts. Compare timezone totals in `/progress`.
- [ ] Join/request/approve/leave groups; block/unblock; report and verify admin review.
- [ ] Check 320px/mobile and desktop, keyboard focus, screen reader, light/dark,
      slow/offline errors and empty states. Check signed URL expiry after 60 seconds.
- [ ] Inspect network responses: no shared caching for authenticated data or refreshed
      cookies; HTTPS cookies are Secure/SameSite=Lax. Security headers are present.
- [ ] Verify logs contain no passwords, tokens, photo bytes or private session notes.

### Diagnostics and rollback
- Disabled account forms: check all three variables and redeploy; use `npm run
  deploy:check` with the deployed environment loaded locally. The check never prints
  values and validates syntax only; it does not authenticate or deploy.
- Auth link failure: verify Site URL, exact redirect allowlist, templates and SMTP.
- Database errors: compare `npx supabase migration list` with the twelve local files;
  use dry-run before `db push`, then linked schema lint. Never reset a live database.
- Photo failure: verify both private buckets, migrations, current membership and
  3 MB upload limit. Do not fix access errors by making a bucket public.
- Build: Node 24 + `npm ci`; the verified restricted-local fallback is
  `npm run build -- --webpack`. Keep normal Next build for Vercel unless its build
  logs show a concrete reason to use the fallback.
- Bad app deployment: restore the previously verified Vercel deployment. Database
  migrations do not roll back with the app; keep compatible schema, fix forward,
  and use an independently verified backup for data recovery. Do not drop tables.
- Review costs/quotas and backups in your accounts before inviting testers. No paid
  upgrade, billing change, domain purchase or public deployment was performed.

Official references: [Vercel environments](https://vercel.com/docs/environment-variables),
[Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments),
[Supabase SSR cookies and caching](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

## Before real users — release requirements
- [ ] Decide supported ages/regions and obtain an appropriate privacy/eligibility review.
- [ ] Prepare accurate privacy/terms notices, support contact, data deletion/export process,
  moderation ownership and incident handling.
- [ ] Test all access roles against live Supabase, configure rate limits and verify the
  upload paths. Phase 02 avatars and Phase 04 post photos are decoded and stripped
  of metadata through the app; direct API uploads need additional launch hardening.
- [ ] Confirm backups/recovery and a policy for moderation retention and deletion.

## Phase 03: what is needed from you?
**Nothing new is needed to continue local development.** Live verification still
requires the same Supabase project and `.env.local` configuration above. No new
service, account or type of key is required.

After applying all twelve migrations, use two or more test accounts you control:
- [ ] Visit `/app` and edit your profile. Confirm unchecked academic details are hidden.
- [ ] Open `/u/YOUR_USERNAME` from the other account. A private profile must expose
  only its username and request control until approval.
- [ ] Request, cancel, request again, accept/decline in `/requests`, and verify counts.
- [ ] Unfollow/remove a follower; private access must disappear immediately.
- [ ] Change privacy and sharing choices. Check followers/following lists for both accounts.
- [ ] Verify avatars and profile layouts on mobile and desktop. Signed media access,
  session behavior and browser rendering remain pending live checks.

## Phase 04: what is needed from you?
**Nothing new is needed to continue local implementation.** The same Supabase
project configuration is needed before live accounts and photo uploads can be
verified. No additional service, paid plan, Storage bucket or secret type is needed.

When the project is ready, apply all twelve migrations, restart the app and use
separate test accounts you control:
- [ ] Open Create post, choose a JPEG/PNG/WebP under 3 MB, select an optional subject,
  add a caption, and preview. Confirm audience and optional duration before publishing.
- [ ] Open the direct post link from owner, stranger and approved-follower accounts.
  Only the intended accounts should see it. Test private/public account changes.
- [ ] Interrupt an upload and retry with the same photo. Confirm one post appears;
  My posts should list any unfinished private draft for cleanup.
- [ ] Delete a published post and a failed draft. Verify both the post row and its
  actual Storage object disappear. Retry an interrupted deletion from My posts.
- [ ] Test invalid files, oversized photos, unauthorized object paths and blocked users.
  Check access after an issued signed URL's 60-second expiry.
- [ ] Check the composer/preview/post/deletion screens at mobile and desktop widths,
  with keyboard navigation and light/dark themes.

See `docs/POSTS.md` for precise cleanup behavior and remaining integration limits.
These checks require the live backend; local passing tests do not replace them.

## Phase 05: what is needed from you?
**Nothing new is needed to continue local development.** The same Supabase project
and local environment configuration remain necessary for live verification. There
are no new keys, accounts or services to configure.

After applying all twelve migrations, use separate accounts you control:
- [ ] Open `/feed` and switch between For You and Community. With no shared posts,
  confirm the real empty state appears. `/app` now opens this feed; My profile uses `/me`.
- [ ] Create shared posts, follow another account and choose a subject. Check the
  ranking explanation and confirm Only me posts/drafts never appear in either feed.
- [ ] Give/remove kudos and refresh. Repeat a request; the count must not duplicate.
- [ ] Open a post, add a comment, retry after an interrupted response, and delete
  your comment. Another account must not be able to delete it.
- [ ] Switch an author to private, remove a follow or create a block through an
  authorized test fixture. Verify feeds, counts, comments and media respect access.
- [ ] Check long captions/comments, keyboard navigation, mobile widths, both themes,
  loading/failure states and navigation between comment/feed pages.

The community interface and timer are now implemented. Test community
ranking with your own test accounts; do not fabricate activity in the app. Detailed rules and remaining verification are in `docs/FEED_INTERACTIONS.md`.

## Phase 06 — timer verification
No new account, key or service is needed for local development. After applying all
twelve migrations and seeding subjects, test `/study` with your configured account:
start, refresh, navigate away/back, pause/resume, save a note and finish. Open a
second tab; an old action should ask you to sync. Test disconnect/reconnect and
finish retries. Check `/sessions` and another account's inability to access it.
Browser timing, sleeping devices and live API concurrency still need these tests.

## Phase 07 — sharing a completed session
Nothing new is needed from you for local development. Live test after the existing
Supabase setup: finish a session with a private note, choose Share your progress,
verify subject/duration, skip once, return, add a photo, preview and publish. The
note must never appear in the composer or post. Reopen the result: it should link
to the existing post. Retry an interrupted upload and test another account's
session URL. Apply all twelve migrations before testing this flow.

## Phase 08 — Discover and communities
No new external setup is required to continue locally. Apply all twelve migrations
before live testing. Check discovery as a stranger, approved follower and blocked
account. Academic/school matching must appear only after the appropriate opt-in.
Create a private student community, send its URL manually to another test account,
request/approve membership, publish a permitted post, leave and confirm access is
revoked. Private authors still require their own follow approval. Catalog schools
are not fabricated; populate genuine reference records separately if desired.

## Phase 09 — notifications and safety
No new external account or key is needed. After applying all twelve migrations, use
two test accounts for follow/request/accept, kudos and comments. Check unread/read
state, repeat actions, delete comments, remove kudos, and verify stale events vanish.
Block from a profile, verify both-direction visibility and interactions, then unblock
from Safety and confirm follows do not return. Submit a user and post report; only
a trusted administrator should be able to read the reports table.

**Before inviting MVP testers:** designate the person who reviews `public.reports`,
how often they check it, and how urgent concerns reach them. The application stores
reports but does not provide staff, email delivery or a moderator dashboard. Keep
admin credentials private and define tester support/deletion procedures.

## Phase 10 — private progress
No new service or key is required. Apply all twelve migrations. Complete sessions,
open `/progress`, change timezone/goal and compare with your session history. Check
that another account cannot read your totals. Test bottom navigation at 320px and
desktop, both themes, keyboard and screen-reader navigation.
