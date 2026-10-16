# ORG-053 participation flow implementation — 16 October 2026

Implementer handoff for Claude's visual review, rechecks, commit and PR.
Branch `claude/participation-flow`; no branch, commit, push or PR created.
`docs/PROGRESS.md` is untouched under O9. No workflow, account, backend, environment file,
database, hosted setting or real communication changed. Port 3210/other processes
are not killed. Only the test server started by this task may be stopped.

## Result and audit

ORG-053 / ENG-048 implement the owner's public participation redesign. Main's
DECISIONS and PR #95's decision diff were read through the GitHub connector;
ENG-047 is taken by #95. Header changes are labels/hrefs only; shared conference
CSS, layout and Playwright config stay unchanged. PR #96's motion spec is untouched.

- All four Reserve-your-seat entry points now go to the localized hub.
- Owner-supplied, metadata-stripped photo retained unchanged, registered for the
  decorative header. SHA256 `9dc9514001ee0e8c10f53f4e0558f199975fef3b3279952c88af5853c998c145`;
  295,361 bytes, supplied as 1920×1080 JPEG.
- Five horizontal whole-row links, neutral replaceable icon slots, logical RTL
  positioning, focus/hover/active/reduced-motion styles in a new CSS file.
- Shared benefits/steps/next-move layout; Attend's bottom Sign up for MSRC goes
  to closed sign-up; abstract's action remains at the top; workshops introduce
  learning/certificates/booking above the existing slider and scroll to it.
- Full preceding EN/AR journey text retained verbatim in the non-rendered form
  guidance export; script comparison with HEAD passed for both complete blocks.
  The unit contract still verifies original email-confirmation rules there.
- All bilingual copy, before/after table, decisions, requirement IDs, icon swap
  instructions and review scope: [feature note](../features/participation-flow.md).

## Verification receipts

Tool PATH prepended with `C:\m\tools\bin` (Node 24 / pnpm 11.19.0).

| Check | Observed result |
|---|---|
| `pnpm exec eslint . --max-warnings=0` | PASS, exit 0, no warnings. `.participation-eslint-final.log`. |
| `pnpm typecheck` | PASS, exit 0, route types generated and TypeScript clean. `.participation-typecheck-final.log`. |
| `pnpm test` | PASS, exit 0: 66 files, 2,759 cases, including the final wording/unit archive check. `.participation-unit-final.log`. |
| `pnpm build` | PASS, exit 0; 81 pages generated. `.participation-build-final.log`. |
| Static manifest verification | PASS: all 10 EN/AR hub/submissions/workshops/hackathon/3MT URLs remain SSG. `/en/registration` and `/ar/registration` deliberately remain dynamic (see existing-boundary conflict below). |
| Full public Chromium desktop + mobile | PASS, exit 0: 709 passed / 67 intentional project/matrix skips / zero failures, 776 total, 11.6 minutes, two workers, zero retries. `pnpm exec playwright test --config=playwright.participation-temp.config.ts --project=chromium-desktop --project=chromium-mobile`; port 3292. `.participation-public-e2e-final.log`. |
| Added participation checks | PASS: 12 active new cases, four intentional duplicate-matrix skips; 22 added axe scans with zero violations. All 20 EN/AR card comparisons at 390/1440 are horizontal and RTL mirrored. Explicit 320/390/1440 page matrix, hub 200% text and option 320px/200% text checks pass. |
| `git diff --check` | PASS, exit 0 after final documentation and cleanup. |

Build cleanup: the execution policy rejected recursive `Remove-Item` of `.next`.
A clean build was achieved safely by moving the checked workspace `.next` into
ignored `.tools/participation-flow/prebuild-next`, then archiving the first build
as `first-build` before the corrected clean build. No approval or protected-file
change was needed. These ignored diagnostic/build archives remain for review.

Initial failed receipts are preserved, not called green:

- First unit run: 2,758 pass / one fail because the old Arabic literal did not
  accept «رسالة التأكيد». The assertion now checks confirmation meaning; original
  detailed wording is also verified in the preserved guidance export.
- First lint attempt saw a temporary edit script removed during enumeration;
  later lint passed after scripts were moved under ignored `.tools`.
- An initial string-replacement script expanded template-string replacement
  characters and duplicated four test specs. The implementer restored those
  four specs from the initially clean HEAD and reapplied only the intended href
  assertions. Later lint/typecheck passed; no owner files were replaced.
- First focused browser run: 13 pass / five fail / six intentional matrix skips.
  Four failures reported duplicate 3MT landmark names (hero and benefits); the
  benefits heading is now distinct. One reported English Attend overflow at
  320px/200% text; long content now wraps within its grid. Raw error contexts,
  screenshots and traces are in `.tools/participation-flow/focused-initial-results`.
- The first Playwright-owned server teardown stalled on Windows. The task stopped
  exactly that log-identified server PID 20596, then started its own Next process
  on 3292 and used `reuseExistingServer: true` in the temporary config so the test
  runner does not own teardown. No other server was stopped; no retries/timeouts
  were added to hide a test failure.
- First full public run: 707 passed / two failed / 67 intentional skips (776 total,
  11.7 minutes). Both failures came from the same incumbent no-JS Contact test's
  hard-coded port 3210; the failure graph had been loaded before its correction.
  Its new browser context now receives Playwright's configured baseURL and visits
  the relative localized route. All original no-JS assertions remain. Raw failed
  contexts/screenshots/traces are in `.tools/participation-flow/public-first-failures`;
  the full original log remains `.participation-public-e2e.log`. A fresh full run
  uses `.participation-public-e2e-final.log`, zero retries, the same 776 cases and
  the same two workers. Final fresh run passed all 709 active cases (67 intentional
  skips), with zero failures. Both corrected no-JS Contact cases passed.
- The full suite regenerates four tracked venue tooltip screenshots under
  `.impeccable/review/venue-journey/`. Their generated copies were archived under
  `.tools/participation-flow/generated-venue-screenshots`, then those four files
  were restored byte-for-byte from the initially clean HEAD. No venue screenshot
  diff remains in this participation task.
- The owned Next server's stdout contained `Error: Internal: NoFallbackError`
  entries during the broad suite. All route-status, localized-404 and CSP cases
  passed in the fresh run. This framework fallback diagnostic was not separately
  investigated by the presentation task; it is not a claim of a clean server log.

## Screenshots and review limits

24 full-page screenshots under ignored `.tools/participation-flow/screenshots/`:
`{en|ar}-{participate|registration|submissions|workshops|hackathon|3mt}-{390|1440}.png`.
All 24 final captures are present and indexed at
`.tools/participation-flow/screenshots/INDEX.md`. Final JPEG marker/dimension audit
passed: 1920×1080, 295,361 bytes, no EXIF/XMP/ICC markers. The archived dense evidence
wording is absent from public client chunks.
Representative hub/Attend/abstract/workshop EN/AR desktop/mobile captures were
visually inspected during implementation; Claude's visual approval is still pending.

**BLOCKED acceptance conflict:** ENG-045 deliberately introduced registration's
dynamic nonce layout and its closed request-time form foundation before this task.
The blanket requirement that all five pages be static conflicts with preserving
that security boundary and the prohibition on backend/workflow changes. Both
registration files and the security policy are untouched. This task adds no
dynamic route. A future decision is needed only if the owner wants registration's
existing rendering boundary redesigned; no security relaxation is inferred here.

**NOT TESTED:** hosted CI/deployment/production, native hardware/Safari/Firefox,
human screen-reader or Arabic editorial approval. All operations remain closed;
real registration, email, payments and database activation are outside this task.
3MT eligibility, fees, dates, awards, slide/presentation limits remain unconfirmed
and are not invented. The Team-header-style owner source/licence record is preserved;
this task claims the supplied placement approval, not an independent rights audit.

## Changed-file inventory

- Production presentation: `src/app/globals.css`; components
  `conference-experiences.tsx`, `homepage.tsx`, `mobile-nav.tsx`, `site-header.tsx`;
  content `conference-experiences.ts`, `participation-copy.ts`,
  `participation-form-guidance.ts`, `public-site.ts`;
  `src/styles/participation-flow.css`.
- Supplied asset retained and used: `public/media/participate/participate-header-v1.jpg`.
- Documentation: `docs/DECISIONS.md`, `docs/MEDIA_REGISTER.md`,
  `docs/features/participation-flow.md`, this O9 progress note.
- E2E: `tests/e2e/{axiom-city,axiom-navigation,conference-experience,contact,dates-venue,design-media-interaction,design-system,fluid-journeys,mobile-menu-panel,organizer-public-decisions,participation-flow,premium-interface,private-csp,public-shell}.spec.ts`.
  Most incumbent edits are CTA assertions. Contact's no-JS context now uses the
  configured `baseURL` instead of a hard-coded 3210; this is required to test on
  the requested free port. Product behavior and no-JS assertions are unchanged.
- Unit: `tests/unit/public-participation-copy.test.ts` retains the email-confirmation
  contract in both the short public steps and preserved form guidance.
- Ignored/untracked review assets: screenshot index and 24 PNGs, diagnostics,
  failure traces and prior build archives under `.tools/participation-flow`;
  `.participation-*.log` raw command receipts. The temporary root Playwright config
  is deleted after browser verification. The owned Next server on 3292 (PID 43156,
  confirmed by `netstat` before shutdown) is stopped; no other process is stopped.

Next: Claude reviews the copy/screenshots and diff, reruns required checks, then
commits and opens the PR. No implementation permission gate is pending.
