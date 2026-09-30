# StudySocial — product specification

## Vision and audience
StudySocial is a mobile-first consumer social network built around studying:
**“Strava × studying × modern social media.”** Make study effort visible, give
students a supportive circle, and help them return to their next study session.
The September 30 product direction is a simple, fun, photo-first student social app: study selfies, memes, breaks, friends and clubs. Study tracking is optional. Use purple/lilac, peach and blue rather than the original green theme. Offer Apple then Google sign-in when configured, with email as a fallback.
The core loop is **STUDY → CAPTURE → SHARE → INTERACT → DISCOVER → GET MOTIVATED → STUDY AGAIN**.

The first audience is Greek high-school students preparing for Panhellenic exams.
Many users may be minors. Safety, privacy, accessibility, and a healthy relationship
with studying are product requirements. The product should feel contemporary,
personal, and encouraging; avoid guilt, addictive streak pressure, or public rankings
of hours. It is not an exam platform, grade tracker, or productivity surveillance tool.

## Current delivery boundary: Phase 12 — prepared locally
Deliver documentation, a Next.js/TypeScript/App Router/Tailwind foundation, a polished
responsive signed-out landing page, system light/dark styling, and reusable empty,
loading, and error conventions. The app must install and build without credentials.
Phase 00 established the shell. Phase 01 adds Supabase client utilities, relational
migrations, storage policies and database authorization tests. It does not add live
user accounts, social sample data, a working timer, or simulated core actions. Landing-page descriptions
must clearly identify planned functionality. Phase 02 adds real email/password auth
flows, protected account routes, three saved onboarding steps, and optional avatars.
Phase 03 adds profiles, explicit academic-sharing choices and the follow graph.
Phase 04 adds study photo posts, preview, protected direct viewing and retryable media
deletion. Live auth/storage/social verification requires Supabase configuration.
Phase 05 adds deterministic For You/Community feeds, kudos and flat comments.
Phase 06 adds the persistent private timer and session history.
The user authorized sequential MVP work through Phase 13; complete each supplied
phase and its checks before moving on. The supplied pack ends at 12 (thirteen phases numbered 00–12); a separate Phase 13 has no supplied scope.

## Planned MVP behavior
- **Authentication:** real Supabase sign-up, sign-in, verified email where required,
  sign-out, recovery, and durable sessions. Provide safe errors and redirect handling.
  Choose supported providers during the auth phase; never fake an authenticated user.
- **Onboarding:** explain visibility and safety; collect a display name, unique handle,
  optional avatar/bio, academic context, interests/subjects, and study goals. Collect
  only necessary information. Account visibility defaults to private. Onboarding
  must be resumable and validate inputs on the server.
- **Profiles and follows:** editable own profile, privacy controls, follow/unfollow,
  private-account requests with accept/reject/cancel, and follower removal. Separate
  a minimal discoverable identity from private profile details and activity.
- **Study-photo posts:** upload study-related photos, caption, optional subject and
  linked completed session; preview the actual audience before publishing. Support
  own-post deletion and edits with clear loading/failure handling. Sharing is opt-in.
  Never automatically publish a completed session or expose personal notes.
- **Interactions:** kudos with one per user/post and undo; comments with validated
  length, author ownership, removal and reporting. Counts must reflect real data.
- **Feed and discovery:** paginated authorized activity from followed users and joined
  communities, useful empty states, and discovery by allowed academic interests.
  No visibility bypass through search, counts, recommendations, or direct URLs.
- **Communities:** topic/subject/exam groups, membership, a group feed, clear visibility
  and basic moderation. Private-group content requires membership. Posting a private
  account's content to a broader community must never silently widen its audience;
  require an explicit supported audience decision during that phase.
- **Study timer and sessions:** start, pause, resume, finish/discard; persist state
  across navigation, reload, backgrounding, and reconnects. Use timestamps and
  persisted state rather than interval ticks for elapsed time. Prevent duplicate
  active sessions and duplicate completion; handle multiple tabs, time zones, invalid
  duration and interrupted sessions. The timer is private by default.
- **Study-to-post:** a completed session can prefill an optional sharing composer.
  One session may remain unshared; retrying publication must not duplicate a post.
- **Motivating stats:** own study time, sessions, subjects, and gentle progress over
  time. Define paused time, day boundaries and timezone consistently. Public stats
  require a deliberate visibility choice. No shame-based copy or hours leaderboard.
- **In-app notifications:** real follow/request, kudos, comment and relevant community
  events, read/unread state, pagination and preferences. Deduplicate events, avoid
  self-notifications, and remove inaccessible previews when permissions change.
- **Safety:** block/unblock and report users/posts/comments; reporting reasons,
  private report records, moderation review and an operational response process.
  Blocking must apply in both directions to visibility and interaction paths.
  No direct messaging, precise location, contact importing, or public school schedules
  in the MVP.

## Academic data and internationalization
Model countries, education systems, qualification/exam programs, academic levels,
subjects and optional user goals separately. Use stable IDs/codes and translated
labels, not Greek text or a Greek grade enum as database identity. Greek Panhellenic
programs are initial data, not schema assumptions. Permit unknown/other context,
optional fields, future countries and different subject sets. Store timestamps in
UTC; use the user's locale/timezone for presentation and day/week summaries. Plan
for Greek and English UI, long text and accessible localized dates/numbers.

## Conceptual entities (implemented by Phase 01 migrations)
| Entity | Purpose and key relationships |
| --- | --- |
| Auth user | Supabase-owned identity; app profile references its ID |
| Profile / preferences | Handle, display name, avatar, bio, visibility, locale, timezone; sensitive settings private |
| Academic catalogs | Country → education system → program/level; subjects linked flexibly |
| User academic context / goals | Optional catalog selections, interests and personal goals |
| Follow / follow request | Unique directed relationship, pending/accepted state; no self-follow |
| Post / post media | Author, caption, explicit audience, optional subject/session/community, protected object paths |
| Kudos / comment | Actor, post, timestamps; unique kudos pair and bounded comments |
| Community / membership | Visibility, owner/moderator/member roles, membership state |
| Study session | Owner, subject, timestamps, pause accounting, status and duration |
| Notification | Recipient, actor/event reference, read state; scoped payload |
| Block | Unique blocker/blocked pair; enforced in reads and writes |
| Report / moderation action | Reporter, target, reason, review state; privileged reviewer access |

Define foreign keys, indexes, uniqueness, lifecycle/deletion rules and constraints
in versioned Supabase migrations when these entities are implemented. Aggregate
stats should derive from authoritative sessions; persist summaries only when useful.

## Security and privacy requirements for later phases
1. Deny by default. Enable RLS on exposed application tables and storage objects.
   Test anonymous users, owners, strangers, accepted/pending followers, blocked users,
   members and moderators. Enforce permissions on every read and mutation server-side
   or in Postgres; UI hiding is only presentation. Prevent clients changing ownership,
   role, moderation status, or notification recipients through mass assignment.
2. Use the authenticated session as identity, never a caller-provided user ID. Validate
   types, lengths, file size/type, enums and relationships at the trust boundary.
   Apply constraints and transactional/idempotent operations to races and retries.
   Rate-limit auth-sensitive actions, uploads, follows, comments and reports.
3. Private accounts and sessions are the default. Use minimal identity data for
   discovery; do not expose email, exact age/date of birth, precise school/location,
   private interests or schedule by default. Decide eligibility and any age-related
   process before public launch; do not claim legal compliance from this document.
4. Use private media buckets, authorized short-lived URLs or an equivalent protected
   delivery path. Validate content as well as extensions, bound upload sizes, strip
   EXIF/location metadata, and clean orphaned files. Audience changes/deletion/blocking
   must revoke future access; account for already-issued URL expiry. No public bucket
   shortcut for private posts or avatars requiring protection.
5. Apply one consistent audience model across profiles, posts, comments, media, feed,
   search, stats, communities and notifications. Re-check access when following ends,
   membership changes, a user is blocked, a post is deleted or an account goes private.
   Cache keys/invalidation must not mix users or retain unauthorized private content.
6. Never ship or commit secret/service-role keys. Public Supabase keys are identifiers,
   not authorization. Any privileged client stays server-only and requires explicit
   narrow authorization. Keep local/preview/production credentials separate; redact
   secrets and personal data from logs and user-facing errors.
7. Define data export, deletion and retention behavior, including media, related
   interactions, notifications and reports. Document any restricted moderation
   retention. Provide a real moderation contact/process before inviting minors.
8. Before launch, review actual eligibility, notices, consent needs and applicable
   privacy obligations with a qualified reviewer. Product settings are conservative
   defaults, not a substitute for that review. Avoid third-party tracking by default.

## UI and engineering conventions
Mobile-first at 320px and above; responsive desktop layouts, semantic headings,
keyboard access, visible focus, labelled fields, readable contrast and touch targets.
Respect system theme and reduced motion. Empty states explain the next available
action without inventing activity. Loading preserves context and announces status;
errors use plain language, retry where possible and avoid raw exceptions/secrets.
Use small typed React components and native form controls initially. Add a form
library only when actual form complexity warrants it. Next.js server components
are the default; use client components for interaction. Supabase/Postgres is the
planned backend, with migrations and reproducible seed/reference data, never manual
production-only schema edits. Vercel is the planned deployment target.

## Sequencing and definition of done
Phases through 13 are authorized sequentially; Phases 11–12 have passed local checks; live verification and launch blockers remain. Future numbered task prompts define their exact
scope; the dependency order below is guidance and does not preassign phase numbers:
- Foundation → real auth and data/security baseline → onboarding/profiles/privacy.
- Follows and protected media/posts → interactions/feed/discovery/communities.
- Persistent sessions → optional session sharing and derived stats.
- Notifications and safety completion → end-to-end security, accessibility and launch review.
Build safety enforcement alongside each feature; do not defer basic authorization
until a final hardening phase. Each phase must remain useful, report limitations,
update setup guidance and pass relevant typecheck/lint/build/tests. Later acceptance
must include real persistence, unauthorized-access tests and responsive error/empty
states. No mock data or success toasts may stand in for an unfinished core feature.
