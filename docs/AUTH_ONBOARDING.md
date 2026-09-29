# Phase 02 — authentication and onboarding

## Implemented
Email/password signup, login, logout, confirmation/resend, password recovery/update,
Supabase SSR cookie refresh, and protected onboarding/welcome routes. Server actions
validate inputs and use cookie-bound clients, never a service-role key. Protected
reads and actions verify the user with getUser, including email confirmation.
Every future protected page/action must use the guards independently; Proxy refresh
alone is not authorization. The welcome page contains no simulated social features.

Confirmation supports PKCE codes and the provided email/recovery token-hash templates.
Callback destinations are fixed internal routes. Email redirects use a configured
trusted site origin rather than submitted input. Recovery responses do not disclose
whether an address exists. Authentication errors do not echo provider details,
passwords or tokens. Supabase Auth handles provider rate limits; configure those
limits and email delivery in the real project before launch.

Onboarding steps:
1. Display name, unique lowercase handle and optional bio/avatar.
2. Academic year, optional education program/direction, subjects, target university,
   target degree, personal goal and school selection or private free-text school name.
3. Explicit private/public choice, defaulting to private.

Completed steps persist in Postgres; unfinished typing is not autosaved. Returning
users resume from their last saved step and can revisit earlier saved steps before
finishing. Validation failures preserve form inputs. No sensitive drafts are stored
in localStorage. Academic details, school and goals stay in owner-only user_settings.
Custom schools do not modify the shared schools catalog.

The third migration adds bounded private academic fields and onboarding progress.
Its save_onboarding RPC derives the owner from auth.uid(), locks the settings row,
validates step order, and updates profile/settings/subject choices atomically. Unique
handle conflicts and invalid subjects roll back the entire step. Direct client
writes to progress/completion fields are forbidden. Completion is idempotent.

Optional avatars: maximum 2 MiB input, JPEG/PNG/WebP bytes checked through Sharp,
16-megapixel decode limit, no animated files, resized to at most 512×512 and re-encoded
to WebP without EXIF/XMP. Uploads use fresh owner-scoped names with no overwrite;
old files are removed after the new reference is saved. Failed cleanup is surfaced
rather than reported as complete. General orphan reconciliation remains a later
storage maintenance concern. Signed avatar previews expire after 60 seconds and
bypass shared image optimization. The Server Action body limit is 3 MiB for multipart
overhead; client validation and the action enforce the smaller file limit.

## Verification
- 25 automated tests passed: SQL migrations/RLS, onboarding transactions and privacy,
  credential validation, fixed redirects, and actual avatar decoding/metadata removal.
- Typecheck and ESLint passed without Supabase credentials. The production build
  passed with `npm run build -- --webpack`. On the resumed 2026-09-29 run, default
  Turbopack compilation hit a local process/port-permission restriction; Webpack
  completed successfully. A prior Turbopack build also passed before that restriction.
- Local HTTP checks confirmed the login page renders and invalid confirmation links
  redirect to a fixed recovery page. Protected routes emit the login redirect rather
  than account data; Next.js may stream this as a redirect in an HTTP 200 response.
- Browser visual verification for this phase was blocked by the browser tool's URL
  security policy. No alternate browser path was used to bypass that restriction.
- Live email delivery, signup/login/logout, session refresh, Storage API uploads and
  authenticated responsive screens remain unverified until Supabase is configured.
  The exact live checklist is in HUMAN_SETUP.md. No real account was created here.

Phase 03 has not started. Local implementation is ready for live integration checks;
this is not a claim that hosted authentication has passed end-to-end testing.
