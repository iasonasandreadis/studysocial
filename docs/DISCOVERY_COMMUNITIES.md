# Phase 08 — Discover and communities

Discover searches permitted usernames/display names, shared academic goals and
school names; it separately lists catalog subjects/schools and accessible communities.
Private strangers reveal only their discoverable handle. Protected display names,
academic details and matching sections require profile access plus the relevant
sharing flag. Blocks apply before searching or matching, including counts/pages.

Students like you uses shared year (and direction if shared); Studying your subjects
uses explicit subject-sharing consent; Same university goal uses target-sharing
consent; From your school requires the new share_school choice, off by default.
The school choice is editable under Discover and only enables matching/searching
for people who can already view the profile. It does not expose raw settings.
Empty sections contain no example people or fabricated activity. Student search
uses 20-row pages; overview recommendations show at most six of the first page.
Catalog and community search lists are bounded to 20 results (subjects to 100).

Communities are student-created, with school/university/subject/exam/goal/group
kinds, private-by-default visibility, optional catalog school, name and description.
They are not verified official school accounts. Public groups allow direct joins;
private groups require approval. A private link exposes only a generic request stub
to a nonmember, not the name/description or member list. Private groups are omitted
from discovery unless the viewer can access them. Owners approve/decline requests;
members can leave/cancel. Owners retain ownership and cannot leave it behind.

Members see a paginated permitted member list. Private profiles contribute only a
handle unless individually accessible; blocked identities are omitted. Community
feeds reuse real post cards with existing post/privacy/media authorization. The
composer lists up to 100 joined/owned communities. Prepare and publication both
check current membership. Community membership never bypasses private author,
post-audience, blocking or private-community rules. Popular in your communities
uses visible kudos on accessible shared posts in joined/owned communities.

Migration 009 adds types/school consent and scoped query RPCs; no service keys are
used. SQL tests cover withheld search/matching, explicit opt-in, follow revocation,
private request stubs, owner approval, minimal member identities and membership
checks when posting. Live Supabase, mobile/keyboard/visual and concurrent membership
changes during uploads remain pending the existing backend setup.

Recorded checks: 68 tests, typecheck, lint and Webpack production build passed on 2026-09-29.
