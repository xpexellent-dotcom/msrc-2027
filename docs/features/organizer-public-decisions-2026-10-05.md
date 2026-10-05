# Public copy, venue and numbering — 5 October 2026

Organizer decisions ORG-030/031/032 supersede the earlier public back-office copy,
venue TBD and zero-padded index presentation. Requirement IDs: SCP-01/02,
REG-01/02/03/05, PAY-03, WKS-02, TIM-01, CFG-01, DSN-02, ACC-01,
LOC-01/03, CMS-04 and REL-01. The v0.5 source snapshot stays unchanged.

## Result

- Registration steps: create an account, verify email, register/pay, then receive
  the confirmation email and ticket. The visitor is told their place is confirmed
  when that email arrives. Workshop steps: choose, book with confirmed conference
  registration, then receive the confirmation email. EN/AR copy omits approval and
  discounts; organizers contact eligible KAU students directly about discounts.
- The bilingual typed venue is King Faisal Conference Center /
  مركز الملك فيصل للمؤتمرات, King Abdulaziz University, Jeddah. Address:
  Abdullah Sulayman St, King Abdulaziz University, Jeddah 22254. Homepage key facts,
  FAQs, pathway/registration location text and search/link descriptions publish it.
  Dates & venue adds the address and an accessible Google Maps directions link
  opening in a new tab. The address is the organizer-supplied fact; the Maps URL
  uses the name/address without inferred coordinates or a Place ID.
  Its `api=1` and `destination` parameters follow the
  [official Google Maps URL guide](https://developers.google.com/maps/documentation/urls/get-started).
- schema.org Event location is a Place with localized name and PostalAddress
  (streetAddress, Jeddah, 22254, SA). The calendar remains one all-day event over
  27–28 January 2027 and gains the full localized LOCATION; its fixed revision
  stamp is 5 October 2026. Session times, doors and rooms remain unannounced.
- Shared `formatIndex` and source eyebrows/examples display 1, 2, 3 / ١، ٢، ٣.
  Homepage edition art displays 5 / ٥. Countdown/date/time padding is unchanged.
  Existing circle/flex/grid alignment does not require two-digit labels.

## Boundaries and files

There are no changes to backend state transitions, approval enforcement, discount
models, scarce-seat allocation, payments, migrations, permissions, workflow flags,
package versions or the lockfile. Participant account changes are copy-only.
Registration/booking stay closed. No merge, hosted settings, DNS/paid resources,
live email or participant communications are part of this task.

Changed areas: shared conference config/i18n, public content, homepage/design examples,
Dates & venue and metadata routes, calendar/schema helpers, participant copy,
venue/link CSS, copy/config/calendar/schema unit assertions and public browser checks.
DECISIONS, REQUIREMENTS and PROJECT_BRIEF reconcile the new authority; PROGRESS
records observed evidence. Historical feature receipts remain historical.

## Verification

Executed locally with Node 24.21.0 / pnpm 11.19.0, using the production build:

| Command/check | Result | Observed evidence |
| --- | --- | --- |
| Open PR list; fresh main/worktree | PASS | No open PRs. Branch `codex/organizer-copy-venue-numbering` starts at `origin/main` `d1c643b`. Original checkout's modified logs and untracked work are preserved. |
| `pnpm install --frozen-lockfile` | PASS | Dependencies installed without package/lock changes. The earlier offline attempt lacked a cached SDK tarball; network installation resolved it. |
| `pnpm check` | PASS | Zero-warning lint, route types/TypeScript, 2,031 unit tests in 45 files, 65-page production build; exit 0. |
| `pnpm test:e2e --reporter=list,html,json` | PASS | Full configured public suite: 413 passed, 23 explicitly skipped, zero failures/flaky results; exit 0. Existing device-only/matrix skips remain; the new width matrix runs once per locale rather than twice. |
| `pnpm exec playwright test --config playwright.auth.config.ts` | PASS | All 81 auth tests passed; local fixtures, no live accounts. |
| `pnpm exec playwright test --config playwright.contact.config.ts` | PASS | All 44 delivery tests passed with local mock providers; no real messages. |
| Public registration/workshop regression | PASS | All 15 public routes per locale inspected; registration/workshop main content and metadata, related pathway cards and collapsed FAQ answers reject `approval`, `approve`, `discount`, `موافقة` and `خصم`. Four registration steps and three workshop steps retain email confirmation and confirmed conference registration requirements. |
| Axe on affected pages | PASS for automated violations | 16 scans: homepage, Dates & venue, Registration and Workshops × EN/AR × phone/desktop; zero violations. Incomplete `color-contrast` and `aria-prohibited-attr` items remain recorded for manual assessment; this is not a complete accessibility certification. |
| Layout, keyboard, motion and screenshots | PASS in Chromium emulation | Width matrix at 320, 390, 791 and 1440px in EN/AR; no horizontal overflow or clipped numbers. Full suite covers enlarged text, keyboard, RTL, reduced motion and scrolling down/up. All 16 requested full-page screenshots were captured; eight phone and eight desktop views were visually reviewed on this application build. |
| `agent-browser` page verification | PASS | Homepage and Dates & venue loaded with the expected venue, accessible link and pending schedule copy; Dates & venue had no browser console errors or framework error overlay. |
| Independent scope/assertion review; `git diff --check` | PASS | No backend approval/state/model, migration, permission, package or lockfile changes. Existing time/price/capacity, privacy, closure and navigation checks retained. |
| Physical devices, screen reader, external Maps journey and native database fixture suites | NOT TESTED | Browser viewport emulation is the layout evidence. No database change; native database fixture tests require their separate isolated environment. |
| Hosted PR CI and publication | NOT TESTED at local closeout | Draft-PR checks run after push. No merge or production publication is claimed. |

The first browser run exposed an incorrect new test assumption that the unpublished
programme had numbered session rows. The matrix now asserts the catalogue remains
empty and continues checking overflow; homepage programme overview numbering is
covered. A second run exposed an existing Contact keyboard test acting before the
language link hydrated its fragment. Trace evidence showed the server-only href
lacked the hash; the test now waits for the exact hydrated href before pressing Enter,
retaining all URL, focus, RTL and viewport assertions. No retries/timeouts were relaxed.
The final full run passed. Negative tests for unrecorded policy versions/locales still
assert 404; the server emits `NoFallbackError` messages during those requests, retained
in the log. Separate scientific ethics and policy-publication wording stays accurate.

Local ignored evidence is in `deliverables/organizer-public-2026-10-05/`: `check.log`,
`e2e-final.log`, the public JSON/HTML reports, auth/contact logs, `browser-evidence.json`,
16 screenshots and 16 axe JSON files. The screenshot index and review ZIP are provided
with the task handoff. Earlier failed-run logs/traces are retained separately.

## Rollback and next task

Revert this branch's application/content/test commit to restore the previous public
presentation, metadata and calendar venue. No database or hosted-resource rollback
is needed. Keep the organizer decision record and restore their intended presentation
in a follow-up if rollback is necessary.

Next: organizer review of the draft PR and bilingual screenshots. Times, rooms,
registration/payment readiness and workflow openings need their separate approved
inputs and release evidence.
