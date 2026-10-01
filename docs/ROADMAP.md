# StudySocial roadmap, in plain language

The supplied prompt pack contains 13 phases numbered **00–12**. It does not define phases 13–40 or beyond. Database migration numbers are separate from product phases.

| Phase | What it builds |
| --- | --- |
| 00 | App foundation, page layout, development setup. |
| 01 | Database, photo storage and rules controlling who can see or change data. |
| 02 | Sign-up, sign-in and first-time profile setup. |
| 03 | Profiles, follows and private-account follow requests. |
| 04 | Photo posts, captions, audiences and post management. |
| 05 | Feeds, likes (originally called kudos) and comments. |
| 06 | Study timer, saved sessions and session history. |
| 07 | Sharing a finished study session as a post. |
| 08 | Finding students and joining communities/clubs. |
| 09 | Notifications, blocking, reporting and safety tools. |
| 10 | Personal study statistics and interface polish. |
| 11 | Reviewing the whole app for bugs, privacy and accessibility. |
| 12 | Hosting, configuration and a release checklist. |

## Where we are

The implementation has reached the end of the supplied pack and is deployed. We are now refining the MVP based on phone testing: simpler navigation, clearer study posts, inline replies, study activity sharing and a goal-first profile. This does not mean every release check is complete.

## Recommended next work (not original numbered phases)

1. Close the remaining beta release checks: upload security and end-to-end testing with two accounts, including privacy and deletion.
2. Run a small invited beta, fix reported problems and measure slow interactions.
3. Finish Apple/Google sign-in once the required provider accounts and agreements are configured.
4. Define private messaging before building it; direct messages are not implemented yet.
5. Use beta feedback to decide whether a native iPhone/Android app is needed. The current product is an installable web app.

Goals, subjects, study totals and live status continue to respect each student's sharing choices. Study hours show effort; they do not calculate how close someone is to passing an exam or entering a university.
