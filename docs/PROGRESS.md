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
