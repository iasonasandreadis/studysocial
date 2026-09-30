# Phase 12 deployment preparation — 2026-09-29

## Current status — 2026-09-30
Supabase is linked and initialized. Source is backed up on GitHub. Vercel project
`jasontest1/studysocial` was created using the existing CLI login; no paid services.
Canonical origin: `https://studysocial-iota.vercel.app`. Vercel assigned the first
build to its production target. Standard Protection authenticates individual
deployment URLs but leaves the canonical production domain PUBLIC. This was
verified with an anonymous HTTP request (200). Setting protection to all deployments
was rejected by auto-review pending explicit user authorization.
This is an owner preview, not a public tester release. The first build intentionally
had no app credentials; subsequent configured builds are recorded in PROGRESS.md.

Three public app environment values are configured in Vercel production/preview.
Supabase Site URL is the HTTPS origin and exact confirmation/recovery callbacks
are allowed, preserving localhost callbacks. Local `.env.local` stays ignored.
Google/Apple providers remain disabled pending external setup. Custom SMTP is pending.
GitHub automatic deployment linking failed because Vercel needs a GitHub login
connection. CLI deployments work independently; keep committing/pushing source.

The checks below describe the historical Phase 12 checkpoint. Current release
blockers in AUDIT.md still apply, especially trusted upload processing and live flows.

## Changes
- Node engine narrowed to 24.x in package and lockfile, matching .nvmrc.
- `npm run deploy:check` loads Next environment files and requires HTTPS project/site
  origins, a publishable key and Node 24. It never logs configuration values. It is
  a syntax preflight, not a backend test. Use it before the Vercel build.
- Supabase URLs reject embedded credentials, paths, queries and fragments. Invalid
  configuration disables account forms without breaking the public landing page.
- HTTPS site configuration uses Secure, SameSite=Lax auth cookies. The browser SSR
  client retains access to session cookies as required by the installed SDK. Proxy
  applies SDK cache headers and private/no-store on refresh. Clients remain request
  scoped; no user session is held in module-global server state.
- Global nosniff, frame denial, no-referrer, permissions restrictions and a limited
  CSP protect basic response boundaries. CSP restricts frames/objects/base URLs;
  it is not a strict script nonce policy. X-Powered-By is disabled. Hosting supplies
  HTTPS; verify deployed behavior before inviting users.
- Runtime remains Next's default Node.js for Sharp. No static export or Edge runtime
  is introduced. Server Actions retain their 4 MB bound; photos are limited to 3 MB.
- HUMAN_SETUP.md covers separate preview/production environments, twelve migrations,
  private buckets, SMTP/templates/redirects, live smoke tests, diagnostics and rollback.

## Final checks
- 81 automated tests pass, including twelve migrations applied from scratch, role
  permissions, image processing, timer and privacy boundaries, DST and environment tests.
- TypeScript and ESLint pass; `npm run build -- --webpack` passes. Default Turbopack
  is subject to the previously recorded local compiler sandbox restriction.
- Production HTTP smoke: twelve public/protected routes return expected pages or
  signed-out redirects with security headers and no X-Powered-By. Temporary server
  on port 3031 was stopped afterwards. This was not authenticated browser testing.
- `npm ci --ignore-scripts --offline --dry-run` confirms package/lock consistency;
  it is not a second clean installation.
- `npm audit --omit=dev` reported zero known production vulnerabilities during Phase 11.
- `npm run deploy:check` correctly fails in this unconfigured checkout without
  printing values. Live migrations/schema lint/Auth/Storage/deployment were not run.

## What is still required
Follow HUMAN_SETUP.md, beginning with the dedicated Supabase account. The agent can
run migrations and live tests once configured. Resolve the trusted-upload processing
boundary, operator support/report review, and all live checks in docs/AUDIT.md before
external testers. Configuration alone does not complete those remaining engineering
and acceptance checks. No paid service or public site was created.

The supplied pack contains 00–12 (thirteen phases), with deployment explicitly the
final supplied phase. A separate Phase 13 brief has not been provided.

References checked: [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[Vercel environment variables](https://vercel.com/docs/environment-variables),
[Supabase SSR cookie/cache guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
Installed Next.js headers/runtime documentation was used for framework configuration.
