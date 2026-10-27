# Header account action — 27 October 2026

Branch `claude/header-account-action`. Decision ENG-085.

- The header and mobile-menu "Reserve your seat" button opens Sign in. Signed in, it becomes "My profile" and opens My MSRC.
- The Sign in page has a "New to MSRC?" callout with a Sign up button.
- Updated the public e2e tests that pinned the header action to /participate. Added a participant e2e test covering signed-out, sign-in and signed-in states.

Checks: tsc and lint clean; vitest 5259 passed; build OK; public Playwright 886 passed (1 Venue timing test flaky, passed on rerun); participant config 204 passed.
