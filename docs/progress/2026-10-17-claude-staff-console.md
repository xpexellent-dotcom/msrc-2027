# 17 October 2026 — Staff console UI (ORG-055)

- Console shell: sidebar navigation (desktop) / swipeable tab row (phones), dashboard home with role-scoped counts loaded in the background (never blocking sign-in or sign-out), EN/AR with RTL.
- Role tabs: `staffMenu` gives each role its areas and a Super Admin every area; `isOversightOnly` marks Review and Faculty judging read-only for a Super Admin without the scoring role. Landing pages for Finance, Check-in, Review, Science, Judging, Faculty judging, Content and Sponsorship.
- Registration queue screen: status filter, search, select / select-all, bulk and single approve, waitlist, seat bar (capacity, approved, remaining, waiting, waitlisted), "capacity not set" handling, organizing-team tag, masked identity.
- Organizing-team priority screen: participant search, mark/remove with a required reason, current list and removal history.
- Tests: menu/summary unit tests updated to ORG-055; new `tests/staff-e2e/staff-console.spec.ts` (22 cases EN/AR desktop/mobile incl. axe). Staff suite 64 passed / 6 skipped.
