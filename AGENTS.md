# StudySocial implementation rules

- Read PRODUCT_SPEC.md before work, then inspect the repository and applicable instructions.
- Preserve useful code and working behavior. Prefer small, robust, maintainable changes.
- Each numbered phase implements only its stated scope. Do not start future phases.
  Phase 00 has no auth, schema, posts, timer, or simulated social activity.
- Use strict TypeScript, Next.js App Router, small components and native semantic controls.
  Add dependencies and abstractions only for an actual need.
- Never fake core functionality, users, activity, persistence or successful actions.
- When backend work begins, use Supabase/Postgres and versioned migrations. Design
  constraints, indexes, RLS and storage policies together with each feature.
- Enforce ownership, audiences, blocking and permissions on the server/database.
  UI checks are not authorization. Test allowed and denied access paths.
- Validate untrusted inputs, uploads and relationships at their trust boundary.
- Never commit credentials or personal data. Keep privileged keys server-only.
  Update .env.example and HUMAN_SETUP.md whenever external setup is introduced.
- Keep mobile-first layouts, keyboard access, visible focus, accessible status states,
  system light/dark support and reduced-motion preferences.
- Read installed Next.js documentation for version-sensitive APIs; keep package-lock.json.
- Run relevant checks (npm run typecheck, npm run lint, npm run build, and tests when
  present). Add meaningful behavior/security tests with real features. Fix introduced
  issues; do not claim checks passed if they were not run.
- Finish by reporting changes, verification, human setup, incomplete work and limitations.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
