# Homepage playback, navigation and countdown refinement

Date: 1 October 2026. Milestone: M2/M3. Requirements: DSN-01/02, ACC-01,
LOC-01/03, MED-01/04, TIM-01, CFG-01/12, SCP-01/02, REL-01.

## Purpose and scope

ORG-003 records the requester's explicit homepage corrections. Visitors can see the
approved muted film without an automatic still-image preference gate, pause and resume
it, move between content through clear navigation, read the larger countdown and receive
welcoming English/Arabic copy. This is a scoped public presentation update.

- Public Home attempts muted inline autoplay, including when reduced motion, data saving
  or a slow connection is reported. Remove the public automatic `Still image mode` UI.
  Pause freezes the frame; hidden tabs stop playback. A browser autoplay denial keeps an
  accessible Play action; an unavailable media file retains the approved error poster.
- Use consistent decorative icons and remove unnecessary mobile arrow glyphs. Explicit
  anchor navigation scrolls smoothly; section/page reading content receives a restrained
  400 ms directional slide when UI motion is allowed. Wheel, touch and keyboard scrolling
  remain native. Reduced-motion UI removes these nonessential slides.
- Show large days, hours, minutes and seconds in a dedicated desktop hero column. The
  countdown targets the start of the confirmed Day 1 calendar date: 27 January 2027,
  00:00 Asia/Riyadh. Label that boundary and keep the actual conference opening time unset.
  Arabic uses RTL and Arabic-Indic digits. The timer does not announce every second.
- Use the requested welcoming hero copy in English and Arabic. This is provisional
  editorial content; final institutional brand/translation approval remains separate.

## Exclusions and boundaries

No schema, migration, RLS/grant, authentication, environment, DNS, payment, email or
operational workflow change. All 15 operational flags and CMS editing remain closed.
The original montage and four approved derivative files remain unchanged. ORG-001 dates
and ORG-002 media approval remain valid. No conference opening time, venue, capacity,
price, roster or additional publication permission is inferred.

No participant data, durable jobs, database audit record or email is required for these
read-only public interactions. Versioned decisions and the Git review record provide the
change history. Browser autoplay remains subject to browser restrictions; manual Play is
the recovery path.

## Acceptance and verification

Verify actual autoplay under normal/reduced-motion and data-saving/slow-network profiles;
manual keyboard pause/resume; blocked autoplay recovery; responsive source selection;
native history and cross-page/hash navigation; visible focus; mirrored Arabic slides;
large-clock reflow at mobile widths and 200%; hidden-tab refresh; date/day/after-event
states; stable SSR/hydration; and no per-second screen-reader announcements.

| Command/check | Observed result |
|---|---|
| Initial `pnpm check` | Lint passed; type-check found TS2352 in a new test-only visibility-hook cast. Fixed the cast; no application failure was hidden. |
| Final `pnpm check` | PASS: lint, Next route types/TypeScript, 252 unit tests across 10 files, production build. |
| `pnpm test:e2e` | PASS: all 185 Chromium desktop/tablet/mobile tests. Actual muted decoding, pause/resume, preference cases, autoplay denial/recovery, UI slides, history and language focus are covered. |
| Local visual/playback review | PASS: six EN/AR desktop/mobile/320 px + 200% views; actual autoplay, keyboard pause, no still-mode UI, desktop clock columns, no horizontal overflow, six public routes 200 and ten private routes 404. Screenshots inspected. |
| Reflow refinement | Visual review found split English time labels and uneven figures at 320 px/200%. Time units now align at the top and wrap into complete rows when needed; `pnpm build` and 51 focused countdown/public-shell browser regressions PASS. Six-view verification rerun PASS, including 15 closed/no-store workflow endpoints; enlarged clock screenshots inspected. |
| GitHub workflow, Preview, production and live checks | Pending. |
| Database migrations | None. Isolated database regression checks remain in committed CI; no live database mutation is required. |

## Complete changed file list

Documentation: `README.md`, `docs/DECISIONS.md`, `docs/DESIGN_GUIDE.md`,
`docs/MEDIA_REGISTER.md`, `docs/PROGRESS.md`, this feature note. The earlier uncommitted
read-only still-image diagnosis in PROGRESS is preserved as dated evidence and superseded
by ORG-003 for the current implementation.

Components: `src/components/conference-countdown.tsx`, `hero-media.tsx`, `homepage.tsx`,
`language-switch.tsx`, `mobile-nav.tsx`, `section-journey.tsx`, `site-header.tsx`,
`src/components/ui/link.tsx`.

Content/helpers: `src/content/public-site.ts`, `src/lib/anchor-navigation.ts`,
`src/lib/conference-dates.ts`, `src/lib/media-policy.ts`.

Styles: `src/styles/components.css`, `countdown.css`, `homepage.css`, `journey.css`,
`media.css`.

Tests: `tests/e2e/brand-motion.spec.ts`, `countdown.spec.ts`, `design-system.spec.ts`,
`public-media.spec.ts`, `tests/unit/conference-dates.test.ts`, `media-policy.test.ts`.

Total: 29 source-controlled paths. Local screenshots/receipts remain under ignored
`deliverables/m3-homepage-fixes/`; the temporary verification helper is ignored under
`.tools/media/`. No dependency/lockfile, migration or environment changes.

Browser limits: Chromium desktop/tablet/mobile emulation was executed. Safari, Firefox,
real mobile hardware and human screen-reader/editorial/Arabic sign-off were NOT TESTED
in this task. No claim of complete REL-01 or final brand approval follows.

## Setup, rollback and next task

No manual configuration or new environment variables are required. Roll back the scoped
PR or restore the preceding Vercel deployment; do not revoke the confirmed dates or
approved media rights as a side effect. Next: apply the official brand files when supplied
and continue the smallest remaining public-content slice with approved source content.
