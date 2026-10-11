# Public design engineering refinements

11 October 2026 · Locally implemented and verified; not deployed.

## Scope and current baseline

The requester asked for an Emil Kowalski and Impeccable review, an audit and prioritized
plan before edits, then restrained improvements that preserve MSRC branding. The
[audit](../reviews/design-engineering-audit-2026-10-11.md) preceded implementation.
Its original source references describe an older checkout (`4534452`); the live site
already contained newer venue and policy content. Implementation therefore starts
from current main `340e36df20f601c3fa05c4aa82d8f256df7471bc` in an isolated worktree.
This revision is the implementation baseline, not a new claim about the serving deployment.

Requirements: DSN-01/02, ACC-01, LOC-01/02/03, PRG-01, MED-01/04 and REL-01.
Engineering interpretation is recorded in ENG-020; no new organizer approval is inferred.
Preserve the five-color palette, self-hosted typography, approved MSRC2026 film/crops,
current venue, public Contact/Privacy/Terms copy, plain localized numbering and lack of
a preview banner. Current ORG-012 chapter/title and hero scroll motion remain intact.
The header retains its existing positions, height measurement, landscape tuck and
focus-return behavior. Scientific content stays English/LTR within either interface.

## Changes against the audit

| Finding | Implemented behavior | Main locations |
| --- | --- | --- |
| A01 · Inverse focus | Programme and legacy surfaces provide an ivory focus token, making their gold action outlines distinct from the dark background. | `src/styles/homepage.css` |
| A02 · Hero hit area | Visually empty foreground space passes pointer interaction to the existing background pause control; headings/body remain selectable and action links remain independent. No permanent Pause button is added. | `src/styles/media.css` |
| A03 · Mobile current page | The current link receives a lilac surface and visible underline, in addition to `aria-current`. | `src/styles/public-interface.css` |
| A04 · Compact cards | Participation cards stack at widths up to 600px; mobile descriptions use 1rem text and allow long words to wrap when enlarged. Existing copy, numbering, artwork and closed states are retained. | `src/styles/homepage.css` |
| A05 · Catalogue controls | Mobile search/select text uses 1rem; intrinsic-safe filter columns reflow around readable control widths. Native labels and control heights remain. | `src/styles/conference-experiences.css` |
| A06 · Document reflow | The body no longer forces a 320px minimum width into a narrower client area. No document-wide overflow clipping is added. | `src/app/globals.css` |
| A07 · Programme hierarchy | When there are no approved sessions, the existing bilingual publication announcement appears next to the introduction, with a more compact preamble. Filters, hydration guards, URL state and lower empty/no-result feedback remain intact. | `src/components/conference-experiences.tsx`, `src/styles/conference-experiences.css` |
| A08 · Film recovery centering | Play recovery uses independent CSS `translate` for centering, including RTL, so button feedback transforms cannot replace layout centering. This was a source-only risk in the audit; runtime verification is recorded separately below. | `src/styles/cinematic-film.css` |

## Motion and interaction values

- Mobile menu pointer opening: **180ms**, **4px** rise,
  `cubic-bezier(0.23, 1, 0.32, 1)`. Keyboard/assistive opening and closing are immediate.
  Escape, native disclosure Tab order and focus restoration are preserved.
- Explicit pointer route/anchor arrival: **220ms**, **8px** reading-direction slide,
  using the same easing. Keyboard/assistive destinations receive immediate focus and
  scrolling. Interrupted slides continue from the rendered transform; switching to
  reduced motion cancels the active slide.
- Ordinary below-fold content reveals: **400ms**, **12px** rise, the same easing,
  with **45/90/120ms** child delays. Explicitly navigated content is already settled
  so it does not add a second arrival. Reduced motion exposes waiting content.
- Existing buttons retain **180ms** feedback, **1px** hover lift and **98%** press.
  Decorative fill/arrow/lift/shadow hover effects require a fine pointer with hover;
  press feedback remains separate.

This selectively replaces the older routine menu/arrival/reveal timings. It preserves
ORG-012's authored chapter scenes and hero entrance/scroll behavior, native scrolling,
reduced-motion alternatives, film preferences and manual pause state. No animation
dependency, extra parallax, scroll interception or measured performance claim is added.

## Verification and evidence

| Check | Observed result |
| --- | --- |
| `npx --yes pnpm@11.19.0 check` with portable Node24.21.0 | **PASS**: zero-warning lint, route generation/TypeScript, 2,383 unit tests across 59 files, optimized build generating 79 pages. Counts read from local `design-check.log`. |
| Scoped ESLint for the catalogue component and new readability tests; scoped `git diff --check` | **PASS** before integrated verification. |
| First full public browser pass | **FAIL**: 504 passed, 29 intentional skips, one EN reflow failure at 280px / 200% text. Trace replay identified the Research description's unbroken word extending to 283.75px; `overflow-wrap: anywhere` corrects the source. No retry or tolerance increase. Failed trace/screenshot/context retained in `deliverables/design-engineering-2026-10-11/first-test-results`; HTML receipt in `.tools/design-engineering-2026-10-11/first-playwright-report`; log `design-e2e-first.log`. |
| Impeccable source detector, current tree | **Completed, exit 2**: seven pre-existing `side-tab` warnings. `design-system.css:42`, `feedback.css:4`, `participant-accounts.css:14/24`, `staff-portal.css:21` and `staff-security-preview.css:6/28` are semantic notice/error/success/simulation borders, outside this public refinement. Retained intentionally; no added warning in changed styles. Raw output: `deliverables/design-engineering-2026-10-11/detector.json`. This is not a clean-scan or full accessibility claim. |
| Final lint and build after the wrapping correction | **PASS**: `npx --yes pnpm@11.19.0 lint` and `npx --yes pnpm@11.19.0 build`; exit 0, zero-warning lint and 79 generated pages. Log: `design-final-build.log`. |
| Final full public browser suite | **PASS**: `npx --yes pnpm@11.19.0 test:e2e`; exit 0, **505 passed / 29 intentional skips**, zero failures, retries 0 (4.4 minutes). Chromium desktop/mobile and configured tablet cases. Log: `design-e2e-final.log`; current HTML receipt: `playwright-report/index.html`. |
| New regression coverage | **PASS** within the final suite: inverse focus contrast; 280/390px EN/AR reflow at 100/200% text on home/Programme/Media; programme publication/filter/reset; keyboard and pointer navigation/history; selected mobile disclosure; live reduced-motion changes; central video click/tap, copy selection and foreground navigation; EN/AR film recovery centering through hover/press and both motion preferences. |
| Combined EN/AR desktop/mobile visual inspection | **PASS for inspected views**: in-app Chromium desktop 1440×900, phone 390×844, narrow 320×800 and Arabic programme 768×1024. Checked homepage composition, centre-film pause, foreground programme link, single-column participation cards, menu current state and early publication notice. Classic-scrollbar checks measured 305px client/scroll widths at a 320px viewport in both languages. Final EN/AR programme phone screenshots are retained below. |
| Physical iOS/Android, Safari/Firefox, human screen readers, full accessibility certification, measured performance/load | **NOT TESTED**. Emulated Chromium layout/interaction is not physical-device evidence. |
| Database, hosted migrations/settings and production release | **NOT TESTED / NOT PERFORMED** for this presentation task. No database or infrastructure change is included. |

Evidence housekeeping: an intermediate lint attempt scanned the archived Playwright
report's bundled JavaScript when it was copied beneath `deliverables/`. The generated
report was moved intact to the existing excluded `.tools/` folder; source lint rules
were not relaxed. That failed log is retained as `design-archive-lint-failure.log`.
Expected `NoFallbackError` diagnostics also appeared during existing unknown-policy
version checks; those routes returned their asserted 404s.

Local review screenshots: [English programme](../../deliverables/design-engineering-2026-10-11/programme-en-phone.png)
and [Arabic programme](../../deliverables/design-engineering-2026-10-11/programme-ar-phone.png).
Independent source review found no actionable defects in the final interaction,
RTL, reduced-motion, navigation cleanup or catalogue hydration boundaries. The final
reflow correction preserves the asserted viewport width and readable 1rem type.

No account, registration, payment, submission, review, attendance or certificate gate is
opened. Existing Contact and restricted staff behavior are not changed. No real email,
participant communication, hosted setting, DNS, paid resource, dependency or lockfile
change follows from these refinements. A local synthetic build is not production-ready.

Rollback can revert this presentation/test delta without changing content approvals,
data or service configuration. Changes remain uncommitted on `codex/msrc-design-engineering`
in the attached worktree; no push, PR, merge or deployment was performed. A local preview
is available at `http://127.0.0.1:3211/en/program` while its process remains running.
Next: review this bounded diff and complete physical-device/assistive-technology UAT
before any separately authorized release.
