# Phase 07 — optional session sharing

Completed session results now offer Share your progress. This opens the existing
composer with the owned completed session and its verified subject selected, and
its duration visibly selected for sharing. The user can turn duration off, detach
the session, choose another, skip, add a photo/caption and preview before publishing.
The post still defaults to Only me. No navigation or timer action publishes a post.

The handoff loads only session ID, subject, duration and completion time; it never
loads or sends the note to the composer. An exact selected session is loaded even
if it falls outside the recent 100. Another user's or incomplete session returns
not found. The result's private note remains visible only to its owner on the result
page, separately from the sharing action.

Migration 008 wraps the existing upload lifecycle: linked subjects come from the
owned completed session, even if a client changes the submitted subject. The old
implementation is private and no longer callable by clients. Duration still comes
from the snapshot trigger; direct table writes remain denied. Manual posts keep
manual subject/duration behavior. The unique session/post relationship prevents
another tab or a retry from creating duplicate linked posts.

If a session already has a post, the handoff opens a clear link to that published
post or unfinished draft. After leaving an interrupted composer, discard its draft
before creating another. Removing a linked post preserves the completed session
and allows sharing again. Publishing/deleting invalidates session result pages.

Checks on 2026-09-29: full existing 62-test suite, typecheck, lint and production
build passed; the added targeted post suite also passed its verified subject,
private-note exclusion, internal-RPC denial and manual-post regression case.
Live browser handoff/retry and Supabase upload checks still need the existing setup.
