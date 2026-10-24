# Task n13 — program schedule publishing

24 October 2026. Worktree `C:\m\codex-n13`, branch `claude/program-schedule`.
PRG-01 (specification §10), CMS-01..04, LOC-01/02/03 and ACC-01. Decision ENG-076.

## Inspection and implementation

The worktree was clean initially. Existing public program and session-detail routes
already consumed the published sessions/speakers projection. The sessions collection
already had day/startTime/endTime/roomEn/roomAr/type/speakerIds, immutable publication
snapshots and server/database authorization. Its SQL publication guard rejects end
times at or before start. No migration is needed; reuse
`20261023022851_staff_content_editor.sql` without editing it.

The existing 60-second collection cache, per-collection tags and publish/withdraw
path invalidation remain authoritative. The list route now also declares revalidate
60. No draft or unpublished speaker enters the public catalogue. Existing static
session/speaker fallbacks are empty. Confirmed event dates and venue remain unchanged.

- Group published sessions by day and chronological start/end slots; parallel rooms
  share a slot. Show rooms, translated categories, descriptions and linked published
  speakers; reuse the existing session detail page.
- Native day links and a labeled GET form support day/category/room and existing
  text filtering without JavaScript. Hydrated filters update the URL immediately.
  Clear preserves unrelated query values and returns keyboard focus to search.
  Native anchors use aria-current; existing sizing, RTL and forced-colors styles
  follow the new semantics. Existing navigation tests were updated accordingly.
- Deterministic UTC+3 arithmetic formats Riyadh clocks and Arabic digits without
  Intl. Additional authored date labels reuse the registration formatter. English
  scientific titles stay English/LTR on the Arabic page.
- Empty publication stays “program to be announced,” including stale shared filters;
  a nonempty publication with no filter matches gets the no-results state.
- The bilingual editor previews loaded session drafts including unsaved changes,
  warns about same-room/day overlaps, and explains equal/reversed end times.
  Touching boundaries and different rooms/days do not warn. Overlap warnings are
  advisory against the loaded drafts, not concurrency guarantees or room allocation.
- When the existing account flag is enabled, an authenticated account response
  reveals a My Bookings link to the authenticated dashboard. That section remains
  closed: this checkout has no actual workshop-booking implementation. No saved
  sessions, favourites, personal schedule or registration action is added.
- Documented only: after a committed publish/withdraw transition, future booking/
  assignment integration can compare immutable versions and enqueue idempotent,
  authorized bilingual notifications. No recipient resolution or email executes.
  Conference-wide changes remain with announcements.

## Verification

Synthetic content fixtures add a parallel room; they are a loopback RPC projection,
never a seed.

| Command | Observed result |
| --- | --- |
| `pnpm check` | PASS: lint, route types/TypeScript, 4,668 Vitest cases in 107 files, production build with 114 generated pages. Log `.program-check-final.log`. |
| `pnpm lint && pnpm typecheck` | PASS again after the final test-only readiness corrections. |
| `node scripts/build-content-e2e.ts` | PASS: fresh published/empty/down builds. Log `.program-content-build-final.log`. |
| `pnpm exec playwright test --config .tools/program-navigation-running.config.ts program-card.spec.ts catalogue-hydration.spec.ts conference-experience.spec.ts qa-regressions.spec.ts --grep "programme\|program held\|media held"` | PASS: 30 cases, zero retries, clean exit. Log `.program-navigation-verified.log`. |
| `pnpm exec playwright test --config .tools/program-staff-running.config.ts content-editor.spec.ts` | PASS: 28 cases, zero retries, clean exit. Log `.program-staff-verified.log`. |
| `pnpm exec playwright test --config .tools/program-content-running.config.ts` | PASS: all 60 cases across published/empty/down EN/AR desktop/mobile, including existing content/media regressions and native no-JavaScript filters; zero retries, clean exit. Log `.program-content-verified-final.log`. |
| `git diff --check` | PASS. |

The standard `playwright.content.config.ts`, `playwright.staff.config.ts` and public
config started this task's own servers on their unchanged fixed ports. The first
staff attempt hit occupied port 3220; after several minutes the single permitted
retry started successfully and executed all 28 cases. Windows parent server teardown
then hung after assertions completed. Temporary ignored `.tools/*-running.config.ts`
files spread the originals and change only relative test/output paths, reporter and
omit `webServer`; they test those same task-owned servers and builds, with the same
projects, assertions, timeouts and zero retries, and allow clean runner exits.
No other job's server was reused or terminated. CI remains authoritative.

Preserved diagnostics: the first unit pass exposed the obsolete “all programme
controls disabled” contract; tests now assert native links/forms. A first build
overlapped the content servers and cleared their nested build files; both the regular
and content builds were regenerated before final testing. Parallel fixtures exposed
an ambiguous old time locator; it is now scoped to the named session. A mobile axe
scan caught streamed detail metadata before its title committed; it now waits for
the exact final title, retaining the document-title rule. Hydrated filter tests wait
for the explicit hydration marker, while separate no-JavaScript cases exercise native
links/forms. Failed logs remain in `.program-*.log`; none are represented as passes.

Public screenshot review: English desktop and Arabic desktop/mobile grids inspected;
parallel rooms stack on phones, Arabic mirrors correctly, and authored text remains
readable. Screenshots live under `test-results/program-content-verified/`.
The browser checks retain axe, native navigation, keyboard focus, day-card arrival,
reduced-motion and forced-colors assertions. Browser CI: NOT TESTED (no push).

Database reset, pgTAP, strict database lint and native integration: NOT TESTED locally
(no local Docker; CI is authoritative). No database functions or policies changed.
Hosted migration application, production configuration, real participant messages,
real bookings, physical devices and live publication: NOT TESTED and unperformed.

## Boundaries and next task

All operational flags remain off. No hosted migration/settings seeds, commits,
pushes or branches were made. `docs/PROGRESS.md` was not edited. ENG-076 was appended
to DECISIONS without renumbering existing entries.

Next: Claude reviews/commits the uncommitted change and runs authoritative CI.
Actual workshop bookings and booked/assigned change emails require their separate
implementation and release gates. This task does not open either workflow.
