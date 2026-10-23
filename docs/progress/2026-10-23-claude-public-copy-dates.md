# Public copy and abstract dates — 23 October 2026

Authority: organizer instructions recorded as ORG-058; implementation ENG-066,
reserved after checking ENG-065 was highest. Requirements: ABS-01, REG-02,
TIM-01/02, SUP-01, LOC-01/03, ACC-01. Existing branch:
`claude/public-copy-dates`. `docs/PROGRESS.md` is unchanged.

## Changes

- Participate alone shows public registration opening/closing dates and free
  attendance. Removed public early-access dates, eligibility and approval wording.
- Removed the homepage summary. Attend again uses the existing closed-journey
  availability design, with free attendance and a reference to Participate dates.
- Submissions has seven approved calendar milestones, EN/AR, in an accessible
  ordered list with date-only `<time datetime>` values. Reuses existing responsive
  journey schedule CSS and the deterministic formatter; no client `Intl`.
  Replaced the stale submission-window announcement and updated the homepage FAQ.
- Removed the Contact form delivery-processing sentence and its obsolete
  `aria-describedby` reference. Approved legal text and email wording are untouched.

Files:

- `src/content/abstract-dates.ts` (new public display data)
- `src/content/registration-opening.ts`
- `src/content/participation-copy.ts`
- `src/content/homepage-narrative.ts`
- `src/components/conference-experiences.tsx`
- `src/components/registration-opening-notice.tsx`
- `src/components/homepage.tsx`
- `src/features/contact/contact-copy.ts`
- `src/features/contact/enabled-contact-form.tsx`
- `tests/e2e/public-copy-dates.spec.ts` (new)
- `tests/e2e/registration-opening.spec.ts`
- `tests/e2e/contact.spec.ts`
- `tests/e2e/contact-delivery.spec.ts`
- `tests/e2e/organizer-public-decisions.spec.ts`
- `docs/DECISIONS.md` and this receipt

## Backend, contracts and preserved wording

Migrations: **none**. RPC signatures: **none**. Backend/API/database contracts:
**unchanged**. The new `abstractDates` constant contains public date-only strings
and bilingual labels. The internal Contact copy type drops the removed field.
No settings seeds, hosted changes, participant opening, feature activation or real
email. Staff/database early access is unchanged.

Exact operational abstract opening/closing instants still require staff entry in
the Science settings tab. The public dates do not supply defaults or enforce access.

Intentionally preserved signed-in wording in
`src/features/registration/my-registration-copy.ts`:

- `Pending approval` / `بانتظار الموافقة`;
- `Your seat is approved` / `تمت الموافقة على مقعدك`;
- `Submitting a request does not confirm admission. Every request needs organizer approval.` /
  `إرسال الطلب لا يؤكد القبول. يحتاج كل طلب إلى موافقة المنظمين.`;
- the pending-request description and all other functional status labels.

The signed-in registration form's request, confirmation and closed-state copy
also remains unchanged. These describe actual requests rather than public invitations.

## Verification

Environment: Node 24.21.0, pnpm 11.19.0, `C:\m\tools\bin` first on PATH.
The checkout initially lacked dependencies. `pnpm install --frozen-lockfile`
passed in 32.7 seconds with no manifest/lockfile changes.

| Check | Observed result |
|---|---|
| `pnpm lint` | PASS, zero warnings |
| `pnpm typecheck` | PASS after correcting an unreachable branch in the updated browser test |
| `pnpm exec vitest run` | PASS, 94 files, 4,111 tests |
| `pnpm build` | PASS, production compilation, types and route generation |
| `git diff --check` | PASS |
| Broad public suites, Chromium/WebKit desktop and phone, HTTPS | FAIL: 178 passed, 18 failed, 24 skipped; diagnostics below |
| Corrected copy/notice/Contact suites, same matrix, serial workers | PASS: 94 passed, 6 intentional skips, zero failures; all 32 new EN/AR page/date/axe cases pass |
| Real visitor discovery, Participate/Contact, EN/AR, four engine/device projects | PASS, 16 tests |
| Real visitor journey extension, Attend/Submissions, same EN/AR matrix | PASS, 16 tests |
| Full synthetic Contact delivery suite | FAIL: 209 passed, 1 failed across five engine/device projects |
| Isolated Safari provider-timeout, EN/AR | PASS, 2 tests with fresh synthetic fixtures and unchanged assertions/timeouts |
| `pnpm exec playwright test -c playwright.staff.config.ts` | BLOCKED before test execution: existing processes occupy the configured ports; see below |
| Database lint, pgTAP, integration/concurrency DB harness | NOT TESTED; no DB changes and local Docker unavailable |

Public command: `pnpm exec playwright test -c .tools-public-https.config.ts contact.spec registration-opening public-copy-dates fluid-journeys conference-experience organizer-public-decisions`.
The temporary config preserves existing assertions/retries/timeouts, uses
Chromium desktop/Pixel 7 and WebKit desktop/iPhone 13, and HTTPS loopback on
3241 backed by an isolated Next process on 3248. Port 3210 is not used.

Visitor commands used temporary copies of `playwright.real-user.config.ts` and
`real-user-discovery.spec.ts`, extending its existing navigation/rotation/text-size/
language-switch/back/reload checks to Attend and Submissions (these two routes
are absent from the existing discovery route list). Temporary files are removed
after execution. Contact command: `pnpm exec playwright test -c playwright.contact.config.ts`.

The first public HTTP run completed with **152 passed, 44 failed, 24 skipped**.
It included stale Attend notice expectations, archive image-load failures and
WebKit protected-page hydration/interaction/axe failures. The stale expectations
were corrected. HTTPS reruns preserve assertions rather than adding retries,
timeouts or changing application safety controls. The initial typecheck/build
also failed on the unreachable test branch before its correction. Logs retain
these failures rather than treating them as successful checks.

The broad HTTPS run completed with **178 passed, 18 failed, 24 skipped**.
Three cross-page sweeps captured WebKit canceled RSC prefetch "access control"
errors. Other failures include a programme day filter, participation/menu
interactions and multi-page test timeouts. Four new registration accessibility
checks captured axe's own injected stylesheet as a CSP violation through the
security fixture. The new layout/copy test now uses the same standard Playwright
fixture as the surrounding public axe tests, retaining the full axe rules.
Application CSP, existing security tests, assertions, retries and timeouts are
unchanged. A focused serial rerun follows that test-fixture correction. Broad
failures in untouched behavior are review findings, not assumed production bugs
or claimed fixed by this task.

Focused command: `pnpm exec playwright test -c .tools-public-https.config.ts public-copy-dates registration-opening contact.spec --workers=1`.
Result: **94 passed, 6 skipped, zero failures**, including every new page/date/axe
case. Skips are the explicit enlarged-text matrix intentionally restricted to the
Chromium desktop project; it runs there for both languages.

The full Contact run's only failure is English desktop WebKit provider-timeout
recovery: the 30-second test deadline expired while Playwright scrolled to the
visible, enabled, stable `Start a new attempt` button at line 467. No copy/status
assertion failed there. An isolated EN/AR rerun uses the unchanged test, fresh local
provider fixtures, zero retries and the same timeouts; both cases pass (17.8s EN,
16.6s AR). Command: `pnpm exec playwright test -c playwright.contact.config.ts --project=contact-safari --grep=provider-timeout`.
The first trace, screenshot
and context are preserved in `.tools/public-copy-dates/contact-first-failure/`.
Do not describe the broad Contact run as green based on any isolated rerun.

The standard staff command found port 3220 already in use (3219 is also occupied).
Temporary alternate-port attempts could not establish a ready staff page: the
test-only server configuration deliberately pins the provider to 3220 and safe
origin to 3219. Those safety checks were not edited. Temporary attempts were
stopped and their own processes/files cleaned up; incumbent processes were not
stopped or reconfigured. No staff cases are represented as passing.

## Visual review and evidence

Reviewed EN/AR Participate, Attend, Submissions and Contact screenshots at desktop
and phone sizes. Date pills, long Arabic milestone labels, two-column desktop /
single-column phone layout, free-attendance copy and restored closed-state section
fit the incumbent design. The new browser checks verify EN/AR direction, all seven
dates/labels, ordered-list semantics, announcement placement, absence of removed
copy, no horizontal overflow, no mutation requests and axe WCAG 2.2 AA checks.
Registration notice tests retain the 320/390/1440px and 200% text matrix.

Local screenshots: `.tools/public-copy-dates/` (full pages and review sheets).
Local command logs: `.tools-copy-*.log`; Playwright failure contexts/traces are
under `test-results/`; broad HTTPS failure details remain in its command log.
`git checkout -- .impeccable/review/` was blocked by the same Git index permission
error described below. All four tracked review images already match HEAD:
`git diff --quiet -- .impeccable/review/` returns zero, so no restoration is needed.
Temporary configs, scripts and test copies are removed (ignored configuration
copies remain with local evidence). Browser engines emulate devices; physical-device
testing is NOT TESTED.

## Owner / Claude review

No new product questions. Staff must enter approved exact abstract instants
separately; this display work does not select times. Review the Arabic wording,
seven calendar milestones, the broader WebKit failures and the pending staff-suite
verification once ports are available. No migration or hosted application step is
needed for this copy task.
The later task-specific instruction to commit on the existing branch takes
precedence over the common no-commit instruction; no push is authorized.

Commit is **BLOCKED by filesystem permissions**. Attempted
`git add -- src/content/abstract-dates.ts`; Git returned:
`fatal: Unable to create 'C:/m/msrc/.git/worktrees/codex-copy/index.lock': Permission denied`.
The linked worktree's Git metadata is outside this session's writable root.
Changes remain uncommitted for Claude; no branch, commit or push was created.
