# Phase 05 — feed, kudos and flat comments

## Routes and behavior
`/app` opens `/feed`. Home offers For You and Community modes with normal links,
current-mode indicators and 20 posts per page. `/me` opens the viewer's profile.
Cards show the author, private signed photo, caption, explicit subject, optional
shared duration, relative time, a ranking reason, kudos and a comments link.
The direct post page provides flat comments, newest first, and author-only comment
deletion. Existing post management, upload and deletion flows remain available.

Nothing is fabricated for empty feeds. Loading and error states have recovery
controls, and missing photos have a direct-post link for retry. Image URLs expire
in 60 seconds and may need a refresh after a page stays open.

## Deterministic ranking
The `study_feed` SQL function runs with the caller's privileges. RLS filters access
before selecting up to the newest 500 eligible posts from the last 90 days. Every
feed excludes drafts, deleting posts and Only me posts, including the viewer's own.
Private-account posts appear only for approved followers satisfying their audience.

For You scores those candidates as follows:

| Signal | Points |
| --- | ---: |
| Viewer follows author | 40 |
| Explicit post subject is one of the viewer's selected subjects | 20 |
| Viewer is an accepted member of the post's permitted community | 15 |
| Kudos plus flat comments visible to the viewer | 1 each, capped at 10 |
| Recency | max(0, 30 − age in days) |

Community selects own shared posts, followed authors and permitted joined-community
posts. It uses the same score without the subject bonus. It does not imply a new
community management/discovery feature. Existing memberships can supply candidates.
No school, private goal, inferred interest, or other user's unshared academic data
is used. This avoids introducing a school-visibility setting ahead of its scope.

Ties use descending publication time, then descending post UUID. The screen explains
the weights and displays the strongest matching reason. There is no ML or random
boost. Pagination uses bounded offsets into the live ranking; activity, permission
changes or new posts can shift results between pages. It is not a frozen snapshot.
Refresh returns the current first page. Older posts remain accessible by authorized
direct links and in the author's post manager.

## Interactions and privacy
- Kudos is a desired state (give/remove), not a blind toggle. The existing unique
  `(post_id,user_id)` primary key prevents duplicates; repeated requests are safe.
- Server-confirmed state replaces the button/count after each action. There is no
  optimistic count that can remain incorrect after failure. Pending controls prevent
  repeated clicks; retry errors do not expose database internals.
- Counts are exact for interactions visible to the current viewer at query time.
  Blocked actors are excluded from counts, comments and engagement ranking. Two
  viewers can legitimately see different totals; the UI explains this.
- Every action verifies the signed-in, onboarded user. SQL also enforces identity,
  audience and blocking for direct client API calls. Draft/deleting posts cannot
  receive new kudos or comments, even from their author.
- Comments require 1–1,000 trimmed characters. React renders them as text, not HTML.
  A stable request UUID prevents duplicate comments after an interrupted response.
  Retrying an ID with different text or ownership fails. Success offers an explicit
  link to view the latest comments and start another comment.
- Only the comment author can delete it. Deletion remains allowed for one's own
  data even after post access is revoked. UI offers deletion only on visible own
  comments. No post-author moderation control or nested replies were introduced.
- Private commenters reveal only their already-discoverable handle on an accessible
  post. Display names appear only if the viewer can read that profile. No bio,
  avatar, school, goals or other private profile fields are projected.
- A nullable same-post parent foreign key prepares the comments schema for future
  replies; clients have no grant to set it, and this phase reads flat comments only.

Database triggers allow at most 30 successful comment insert attempts and 60 kudos
insert attempts per account per UTC calendar minute. Retry inserts also consume
this budget. The private budget table serializes concurrent increments, and deleting
comments cannot reset it. Old windows are pruned when that account writes again;
account deletion cascades its budgets. These burst caps are basic abuse controls,
not a substitute for broader public-launch rate limiting or moderation.

## Database changes
Migration `202609290006_feed_interactions.sql` adds the feed and activity RPCs,
minimal comment projection, desired-state kudos and idempotent comment creation.
It tightens interaction insertion policies, adds a feed index and the future comment
parent relationship, and stores burst budgets in the unexposed `private` schema.
No new service or environment variable is needed. Do not expose `private` in Supabase.

## Verification
All six migrations are applied in embedded PostgreSQL tests with actual roles,
constraints, RLS and RPCs. Phase 05 tests cover:
- Anonymous and invalid-parameter denial; deterministic ranking and tie ordering.
- Private/draft/deleting/blocked filtering before the candidate limit.
- Follow and community membership restrictions; privacy changes and unfollow.
- Kudos retries/removal, exact filtered counts and unauthorized actor denial.
- Comment text limits, idempotency, author-only deletion, private commenter projection.
- Nonoverlapping pages without concurrent mutations, and persisted burst budgets.

Full hosted Supabase/PostgREST/Storage integration, simultaneous requests across
real connections, and authenticated browser/mobile accessibility checks are pending
configuration. The available browser surface previously rejected localhost access;
no visual pass is claimed. SQL tests do not exercise cookies, signing/CDN expiry or
real browser form submissions. No credentials, sample users, cloud resources, Git
commit, push or deployment were created. Phase 06 has not begun.

### Recorded verification — 2026-09-29
- `npm test`: 56 tests passed across all six migrations and application validation.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run build -- --webpack`: production build passed using the documented fallback.
- Local HTTP checks: both feed modes, `/me` and post detail include a login redirect
  without Supabase configuration. Authenticated interaction/visual tests remain pending.
- `git diff --check`: passed. Changes remain local, uncommitted and unpushed.
