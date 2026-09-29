# Phase 04 — study photos and posts

## What works in the implementation
- `/posts/new`: one still photo, caption, image description, subject, optional completed
  session, opt-in study duration, explicit audience, preview and publish.
- `/posts/[id]`: authorized direct view with author, timestamp, selected subject and
  duration. Unavailable and unauthorized posts use the same not-found response.
- `/posts`: your posts and saved drafts, 20 per page. This is an owner management list.
- Own-post deletion removes the image through Storage before deleting its database
  references. A confirmation checkbox protects against accidental deletion.

There is no feed, timer, kudos/comment UI, discovery or notification feature in this
phase. Completed sessions can be linked if they already exist; no sessions are
fabricated to populate the selector. No Phase 05 work has started.

## Upload and retry behavior
The application accepts one JPEG, PNG or WebP up to **3 MiB**, with at most 40 million
pixels. Sharp checks decoded content, rejects unsupported/animated formats, applies
orientation, resizes within 2000 × 2000, removes embedded metadata and writes WebP.
The server action allows 4 MiB for the request, including multipart overhead.
The existing private bucket retains its 10 MiB defense-in-depth limit and allowed
MIME types. App uploads use the stricter 3 MiB limit for both input and output.

Migration `202609290005_posts.sql` introduces `draft`, `published` and `deleting`:
1. `prepare_photo_post` creates or updates an owned draft and its single media row
   together. The path is `<owner>/<post>/<sanitized-content-SHA256>.webp`.
2. The server uploads to that private path without overwrite. A retry uses the same
   composer ID and hash. If the upload reports failure, the action downloads the
   existing object and compares its bytes' hash before reusing it.
3. `publish_photo_post` checks that an owned Storage object exists before publishing.
   Repeating publication returns success without duplicating the post.
4. Failed uploads remain private drafts in My posts. Retry in the same open composer
   with the same photo. After leaving the composer, discard the draft and create a
   fresh post. Changing a prepared draft's photo is rejected rather than orphaning
   the original object. Unfinished drafts have explicit deletion; no automatic
   expiry job is installed.

Direct authenticated post/media INSERT, UPDATE and DELETE grants are revoked;
validated lifecycle RPCs now own those mutations. Upload policy checks the exact
registered path and locks its draft post row against publication/deletion. Published
or deleting posts cannot receive a replacement upload. One image per post is also
an SQL unique constraint enforced by an index.

The decoder protects **the application's upload route**. A user with their own
valid token can call the exposed RPC and Storage APIs directly for their own draft;
bucket MIME/size rules alone do not prove decoding or metadata removal. A future
server-only upload gateway or quarantine workflow is needed before claiming every
possible direct-client upload is sanitized. No privileged key is used here.

## Visibility and session privacy
- New app posts default to Only me. Public means signed-in users.
- Other viewers must satisfy account privacy, post audience and blocking rules.
  Existing community-linked data also retains its community access requirement.
- Private-account posts remain limited to approved followers even if their audience
  is public. The preview explains that making the account public later widens those
  public-audience posts.
- Draft/deleting posts and their media are owner-only. RLS applies to direct queries,
  not just the rendered page. Signed photo URLs last 60 seconds; already-issued URLs
  can remain usable until expiry after a block or privacy change.
- The composer queries only your completed sessions' ID, end time and duration.
  It never queries notes. The direct post page never fetches raw sessions.
- Linked sessions must belong to the author and be completed. One session can be
  linked to one post. The post exposes the duration snapshot only when requested.
  Without a linked session, an optional self-reported duration is 1–1,440 minutes.
  Readers cannot access raw sessions through the opaque session reference.

## Deletion and cleanup
`begin_post_deletion` verifies ownership, locks the post and hides it from others.
The server removes its photo through the Storage API. `finish_post_deletion` refuses
to delete references while the object is still registered in Storage. If either
service is interrupted, the row/path remains available for a retry from My posts.
An empty draft can be removed too. Session data is preserved; its post link is freed.
Do not remove Storage metadata with SQL in production: it does not remove bytes.
Account-wide removal and scheduled abandoned-draft retention are still future work.

## Verification and limits
The local suite applies all five migrations in embedded PostgreSQL with real roles,
RLS, constraints and RPCs. It covers anonymous/foreign mutation denial, one-image
constraints, draft visibility, publication preconditions, idempotent retries,
completed-session ownership, duration opt-in, audiences, blocking, and interrupted
cleanup. Decoder tests use actual image bytes, metadata, resizing and pixel limits.

The older authorization suite now creates its historical published-post fixtures
as an administrator because clients no longer have the old mutation grants. Its
read/interaction assertions still run against all current migrations. The new post
suite exercises actual authenticated lifecycle RPCs and denies the former writes.

Full Supabase Auth/Storage HTTP integration, signed-URL expiry, concurrent upload
and deletion across services, and authenticated browser/mobile checks still require
a configured Supabase project. Browser automation was also unable to open localhost
under this session's browser access policy; no Phase 04 visual pass is claimed.
Rate limiting and comprehensive public-launch review remain outstanding. Local
checks are evidence for the code and SQL, not a claim of a production-ready service.

### Recorded verification — 2026-09-29
- `npm test`: all 45 tests passed, including actual animated WebP rejection.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build -- --webpack`: production build passed. The documented Webpack
  fallback avoids this environment's Turbopack process/port restriction.
- HTTP smoke checks: landing page returned 200; all three post routes included
  Next.js's streamed login redirect when no Supabase configuration was available.
- No live Supabase operations, deployment, Git commit or push were performed.
