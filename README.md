# StudySocial

A mobile-first social network built around studying. **Study → capture → share →
interact → discover → get motivated → study again.**

## Status: Phase 12 — deployment preparation complete locally
The foundation includes a responsive landing page, system light/dark theme,
accessible status conventions, and durable product/implementation/setup guides.
Phase 01 adds Supabase client/server utilities, reproducible database migrations,
private storage policies, and authorization tests. Phase 02 adds real Supabase
email/password flows, protected account routes, three saved onboarding steps and
optional avatar processing. Phase 03 adds profile viewing/editing, academic sharing
choices, real follows, private requests, and authorized connection lists.
Phase 04 adds private photo uploads, post preview/publishing, direct post views,
an owner post list, and deletion with retryable cleanup. Phase 05 adds For You/Community feeds, deterministic ranking,
kudos and flat comments. Phase 06 adds the persistent private study timer and session history.
Phases 07–10 add optional session sharing, discovery/communities, notifications,
blocking/reporting, private stats and mobile navigation. Phases 11–12 add audit
fixes and deployment preparation. **No deployment or live Supabase verification has
happened.** Before testers, finish the release blockers in docs/AUDIT.md.

The prompt pack contains thirteen phases numbered 00–12. No separate Phase 13 brief
is included. Start with the dedicated Supabase setup in HUMAN_SETUP.md; the agent
can run the remaining migration/testing work once your account is configured.

## Run locally
Use Node.js 24 LTS (`nvm use` if available), then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The landing page and local tests need no credentials.
Visit `/login` or `/signup` to inspect the account forms. They remain disabled until
Supabase is configured in `.env.local`.
See [HUMAN_SETUP.md](HUMAN_SETUP.md) for future Supabase and Vercel steps.

## Validate and run production
```sh
npm run typecheck
npm run lint
npm run build
npm start
```

`npm run check` runs PostgreSQL authorization tests, typecheck, lint and build.
If this environment blocks Turbopack’s compiler process from opening a local port,
use `npm run build -- --webpack`; that production build has also been verified.
`npm test` applies all twelve migrations in isolated embedded PostgreSQL and checks real
SQL policies using test-only identities. It needs no credentials or Docker.
This does not replace full Supabase Auth/Storage API integration tests.
The tests also cover input validation, redirect destinations, and avatar/post image metadata
removal. Dependencies are pinned and a lockfile is included for reproducible installs.

## Structure
- `src/app/`: App Router layout, landing page, global styles and route status boundaries.
- `src/components/`: small reusable presentation components, including StatusPanel.
- `PRODUCT_SPEC.md`: planned MVP, conceptual data, privacy/security and phase boundaries.
- `AGENTS.md`: durable instructions for future implementation tasks.
- `HUMAN_SETUP.md`: beginner checklist for external setup.
- `.env.example`: documented configuration placeholders; no credentials.
- `src/lib/supabase/` and `src/proxy.ts`: browser/server clients and session refresh.
- `supabase/`: CLI config, migrations, reference seed and test-only schema contracts.
- `scripts/test-database.mjs`: migration and permission regression tests.
- `docs/DATABASE.md`: schema, access rules, storage workflow and verification limits.

Use server components by default, native form controls, and client
components only where browser interaction is needed. Styling uses Tailwind CSS and
shared CSS theme tokens. Theme follows the operating system. Fonts use a local system
stack so builds do not require remote font downloads. Loading/error/empty states
share StatusPanel; errors expose recovery controls without exception details.

## Stack and deployment
Next.js App Router, React, strict TypeScript, Tailwind CSS and ESLint. The project
uses the standard [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
and is compatible with Vercel's Next.js preset. No deployment has been created.
Supabase Postgres/RLS/storage definitions are included. Applying them to a hosted
project requires the setup in HUMAN_SETUP.md. No cloud database was changed.
Read PRODUCT_SPEC.md before changing scope.

## Account routes
- `/signup`, `/login`: email/password forms; successful existing sessions go to `/app`.
- `/check-email`, `/forgot-password`, `/reset-password`: confirmation and recovery.
- `/auth/confirm`: verifies email tokens or exchanges a PKCE code; destinations are fixed.
- `/onboarding`: authenticated, resumable identity, studies and privacy setup.
- `/app`: opens the home feed; incomplete accounts return to onboarding.
- `/feed`: For You and Community feed modes. `/me`: opens your profile.
- `/u/[handle]`, `/profile/edit`: profile viewing and safe own-profile editing.
- `/u/[handle]/connections`, `/requests`: social graph and follow approvals.

See [docs/AUTH_ONBOARDING.md](docs/AUTH_ONBOARDING.md) for implementation decisions,
verification results and the checks still requiring a live Supabase project.

See [docs/PROFILES.md](docs/PROFILES.md) for Phase 03 access rules and verification.

## Study post routes
- `/posts/new`: choose a photo, preview its audience and publish.
- `/posts/[id]`: direct authorized post view and author-only deletion.
- `/posts`: your published posts, private drafts and unfinished deletions.

See [docs/POSTS.md](docs/POSTS.md) for Phase 04 lifecycle, privacy and verification limits.

See [docs/FEED_INTERACTIONS.md](docs/FEED_INTERACTIONS.md) for ranking, interaction
privacy, rate limits and Phase 05 verification.

Timer: `/study`. Private history and results: `/sessions` and `/sessions/[id]`.
See [docs/TIMER.md](docs/TIMER.md) and [docs/PROGRESS.md](docs/PROGRESS.md).

Completed sessions can optionally open the photo composer with verified subject
and duration. See [docs/SESSION_SHARING.md](docs/SESSION_SHARING.md).

`/discover` finds permitted people and communities; `/communities/new` creates a
student community. See [docs/DISCOVERY_COMMUNITIES.md](docs/DISCOVERY_COMMUNITIES.md).

In-app events: `/notifications`. Block management: `/safety`. Profiles and posts
include reporting controls. See [docs/NOTIFICATIONS_SAFETY.md](docs/NOTIFICATIONS_SAFETY.md).

Private totals and weekly goals: `/progress`. See [docs/STATS_POLISH.md](docs/STATS_POLISH.md).

Audit results and release blockers: [docs/AUDIT.md](docs/AUDIT.md).

Deployment guide and verified checks: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
Final local result: **81 tests**, typecheck, lint, production Webpack build and twelve
production HTTP route checks pass. Deployment preflight deliberately fails until
real HTTPS environment settings exist. Source checkpoint is committed locally; see docs/PROGRESS.md for current hosted setup status.
