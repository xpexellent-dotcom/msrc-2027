# Night-3 Task 1 — public registration opening times

Local, uncommitted implementation from `d7ef947` in `C:\m\codex-night3`; ENG-061.
The starting worktree was clean. Read AGENTS.md, PROJECT_BRIEF, DECISIONS including
ORG-055/056/057, PROGRESS, DESIGN_GUIDE and the relevant REG/LOC/TIM requirements.
`docs/PROGRESS.md` remains unchanged under O9. No branch, commit or push.

## Audit and result

Attend (`/registration`) previously said registration dates would be announced;
Participate had no opening notice. Replace Attend's old availability banner with
the shared notice and add it immediately below Participate's photographic header.
Retain the purple/ivory/gold design: a quiet gold rule, two desktop date columns,
stacked phone dates and a short conditions/deadline footer. A small homepage line
below the main actions gives the general opening time and free-attendance fact.

- Early access: Sunday 15 November 2026, 8 pm Riyadh time, for people on the
  organizers' early-access list.
- General registration: Wednesday 18 November 2026, 8 pm Riyadh time.
- Registration closes: Tuesday 26 January 2027, 11:59 pm Riyadh time.
- Attendance is free; seats require organizer approval. Existing conference dates
  remain 27–28 January 2027.

`src/content/registration-opening.ts` owns the three instants and all notice copy.
Its ORG-056/057 comment explicitly defers actual access to database settings;
these values are display announcements, never registration defaults or seeds.
Both languages use semantic `time` elements. Formatting forces `Asia/Riyadh`,
the Gregorian calendar, and Arabic-Indic digits for Arabic regardless of visitor
timezone. No timer, countdown, live status or registration gating was added.

The explicit current task's seat-approval wording narrowly supersedes the older
ORG-030/ENG-059 public-copy exclusion. ENG-061 records the conflict and resolution.
The older copy guard still checks all other public registration/workshop text,
metadata and discount exclusions.

## Files and boundaries

- New `src/content/registration-opening.ts` and
  `src/components/registration-opening-notice.tsx`.
- `src/components/conference-experiences.tsx`, `src/components/homepage.tsx`,
  `src/styles/participation-flow.css`, `src/styles/homepage.css` integrate/style
  the notice and compact summary.
- New `tests/e2e/registration-opening.spec.ts` and updated
  `tests/e2e/organizer-public-decisions.spec.ts` cover content, accessibility and
  the narrowly authorized public-copy exception. Participate joins visual captures.
  `tests/e2e/contact.spec.ts` expects the newly published notice while retaining
  every existing closed-form, disabled-action, noindex and no-write assertion.
- `docs/DECISIONS.md`, `docs/features/participation-flow.md` and this O9 receipt.

**Migrations: none. RPC signatures: none. API/database contract additions: none.**
No registration handlers, permissions, database configuration, feature flags,
approved legal text or ORG-057 email wording changed. No hosted queries/writes,
settings seeds, real email, participant activation or paid-resource changes.

## Verification

Node 24.21.0 / pnpm 11.19.0 with `C:\m\tools\bin` first on PATH.
Raw logs and screenshots: ignored `.tools/registration-opening/`.

| Check | Result |
| --- | --- |
| `pnpm lint` | PASS; final exit 0 after the test correction, `lint-final.log` |
| `pnpm typecheck` | PASS; final exit 0 after the test correction, `typecheck-final.log` |
| `pnpm exec vitest run` | PASS; 3,701 tests / 83 files, exit 0, `unit.log` |
| `pnpm build` | PASS; 110 static pages, exit 0, before browser suites, `build.log` |
| Focused new public Playwright spec | PASS; 14 passed / 2 duplicate-project skips / 0 failed, exit 0; `focused-browser.log` |
| New axe coverage | PASS; 12 full-page EN/AR desktop/mobile scans, zero violations |
| `pnpm exec playwright test -c playwright.staff.config.ts --output=test-results-night3-staff` | PASS; 194 passed / 12 intentional skips / 0 failed, exit 0; `staff.log` |
| Full public Playwright suite | Initial FAIL: 855 passed / 161 intentional skips / 6 failed, exit 1; all six were the obsolete EN/AR closed-heading assertion across desktop/tablet/mobile, `public-browser.log` |
| Corrected full `contact.spec.ts` rerun | PASS; 27 passed / 0 skipped / 0 failed, exit 0; all six corrected cases included, `contact-final.log` |
| `git diff --check` | PASS after final documentation/cleanup |
| Supabase lint, pgTAP, DB integration/concurrency | BLOCKED locally; no Docker. No DB or permission behavior changed in this display-only slice |
| Hosted state, real email/Auth, physical devices and assistive technology | NOT TESTED; outside this local publication task |

The public suite uses a temporary copy of `playwright.config.ts` with only port
3210 replaced by 3235, preserving the owner's app port. No retries or timeouts
were raised. Exact focused command:
`pnpm exec playwright test -c playwright.night3-temp.config.ts registration-opening.spec.ts`.
The full command omits the spec filter; the final correction run replaces the
filter with `contact.spec.ts`. Staff uses its original config plus an isolated
test-output path to avoid the public suite's cleanup. The temporary public
configuration was deleted after verification.

Windows runners left their own servers alive after the final scheduled cases
finished. Stopping only each run's identified server PIDs allowed normal report
generation and the recorded exit status; no owner server was stopped.
Staff's isolated results were preserved
under `.tools/registration-opening/staff-results/`, then its temporary output
directory was removed. This teardown issue is separate from the passing
assertions, not hidden by retrying tests. The public run's six failure contexts,
screenshots and traces remain in `public-initial-failures/`; the original log is
retained. Only obsolete test wording changed after the full run, followed by the
entire affected test file, lint and typecheck. No full-suite green rerun is claimed.

## Visual review and regression scope

All 12 new EN/AR home/Participate/Attend desktop/mobile viewport screenshots were
visually reviewed across the implementer and independent reviewer. Dates,
eligibility, free/approval wording and closing time are readable; no overlap or
clipping was found, and the Arabic layout mirrors correctly. Screenshots are
`.tools/registration-opening/screenshots/{en|ar}-{home|participate|registration}-{chromium-desktop|chromium-mobile}.png`.

The new matrix checks 320/390/1440px at 100% and 200% root text size in both
languages, with America/Los_Angeles as visitor timezone. It checks exact machine
instants, Gregorian Arabic dates/digits, text geometry/overflow, no page-driven
writes, no registration form, and the preserved closed-registration marker.
Existing affected visual suites regenerated review artifacts; there are no stored
pixel-snapshot assertions to update. `git checkout -- .impeccable/review/` was
attempted but could not create the index lock outside this worktree's writable
root. Restored the four generated JPGs byte-for-byte with read-only `git show
HEAD:<path>` into their workspace paths instead; the final diff contains no
`.impeccable/review/` changes. No Git metadata was written.

## Owner / Claude handoff

No open product questions. Claude should review the bilingual presentation and
ENG-061's narrow approval-copy exception, then commit the uncommitted changes.
If approved registration dates change later, update the shared display module
alongside the independently authorized database settings. Publishing this notice
does not activate registration or authorize any hosted change.
