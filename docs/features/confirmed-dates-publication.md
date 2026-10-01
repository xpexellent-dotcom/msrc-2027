# Confirmed dates, homepage countdown and approved film

Date: 1 October 2026. Milestone: M3 public information. Authority: current user
confirmation of Day1 27January / Day2 28January for the MSRC2027 edition and
explicit authorization to push/publish all updates; subsequent approval of the
reviewed18.7-second MSRC2026 montage, including people and posters shown.
Source IDs: SCP-01/02, CFG-01/12, TIM-01, CMS-01/04, LOC-01/03, DSN-01/02,
ACC-01, MED-01/02/03/04, INF-04, REL-01. See ORG-001/002 in DECISIONS.

## Slice and boundaries

Visitors can see Day1 **27 January 2027** and Day2 **28 January 2027** in both
languages, read the standalone Dates & Venue page and see calendar days until
Day1 on the homepage. Home/About metadata and the link-preview image use the
same typed configuration. English is LTR; Arabic uses RTL, Gregorian dates and
Arabic-Indic digits. Existing visual/motion polish, audit and backlog updates
are included under the user's instruction to push/publish all updates.

There is no approved opening/session time. The countdown compares Gregorian
calendar dates in Asia/Riyadh; the midnight refresh is a display convention,
not an event start instant. Cached HTML contains the confirmed range, never a
build-time live number. Hydration enhances it; midnight/focus/visibility refresh
handles long-lived/background tabs. Day1, Day2 and post-event states avoid
negative values. No seconds animation or repeated live announcements.

Venue, rooms, program times, deadlines, prices and capacities remain unset.
All15 operational server flags stay false; there is no registration, payment,
submission, booking, review, scanning, attendance, certificate, AI or CMS write.
No schema, migration, grant/RLS, hosted environment, integration, DNS or email
change is needed. No participant data is touched. Audit evidence is Git and
the versioned organizer decisions; no operational audit/email event occurs.

## Approved media and privacy boundary

Public Home uses four optimized copies of the approved review cut under
`public/media/msrc2026/`: desktop/mobile MP4 and desktop/mobile JPEG posters.
Both loops are18.7s, muted with no audio stream, inline, local/CDN served, and
explicitly captioned as previous-edition2026 footage. Mobile selects its own
720×1280 crop; desktop1280×720. Pause preserves the frame; keyboard controls
have visible focus and44px targets. Reduced motion, saveData, slow2g/2g/3g and
failed playback use a still; limited-bandwidth modes do not fetch video.

The184MB source stays ignored, private and unchanged. Public copies must match
the four approved derivative hashes. The development-only review page/API
still returns404 in production builds, even if its flag is set. Approval is
for this specific cut/placement; future archive assets, final institutional
brand/copy approval and the complete consent/removal policy remain separate.
Public static assets are copyable. Removal/replacement requires unpublishing
the controlled derivatives and verifying delivery caches; no promise applies
to independent third-party copies.

## Acceptance and evidence

- Local and hosted Home/About/Dates routes show both confirmed days accurately.
- Before-event/midnight/Day1/Day2/after, background-tab and no-JS states work.
- Native scrolling, keyboard focus, RTL and enlarged text remain usable.
- The actual approved film loads the correct responsive source, pauses/resumes,
  falls back under motion/network preferences and exposes no original.
- All operational routes remain denied; production review/showcase gates hold.
- Relevant application and isolated synthetic DB CI run on the committed revision.

The first browser pass reproduced two product defects: English ICU range spacing
differed between Node and Chromium, causing hydration mismatch; the shared public
loading boundary left streamed content hidden without JavaScript. The countdown
now receives server-formatted text, with a mocked ICU regression test. The loading
convention is scoped to the interactive design-system route; static public Home,
About and Dates render directly. This follows the documented [Next.js streaming
boundary behavior](https://nextjs.org/docs/app/guides/streaming). Two test-only
failures were corrected: normalized anchor href matching and polling the existing
400ms media opacity transition before asserting it is fully visible. The initial
suite was stopped after74 tests; it is not a passing full run.

| Command / executed check | Observed result |
|---|---|
| `. ./scripts/use-local-node.ps1; pnpm check` | PASS: pinned Node24.21.0/pnpm11.19.0, ESLint, route types/TypeScript,232 unit tests in10 files, optimized production build including both Dates routes |
| `PLAYWRIGHT_BROWSERS_PATH=.tools/playwright; pnpm test:e2e` | PASS:157/157 Chromium desktop/tablet/mobile tests,1.7minutes after the skip-link repair; date boundaries, no-JS Home/About/Dates, actual approved media, enlarged text/RTL/keyboard/axe and closed-operation regressions |
| Original SHA256 and four source/public hash comparisons | PASS: unchanged original; all four copied public files exactly match approved review derivatives |
| FFmpeg full decode of both public MP4 files | PASS: exit0 for desktop and mobile |
| Production-like `pnpm start --port3300`, VERCEL_ENV=production with both preview flags=true | PASS: Home opens; seven showcase/review/original paths return real404; current public derivatives remain independently available |
| Initial153-case browser attempt | FAILED and stopped after74 tests; defects and test repairs described above, then rebuilt and reran the complete suite |

Independent visual QA PASS:36 Home/About/Dates views across EN/AR,1440/390/320px and
normal/200% text, plus six actual-film keyboard pause/focus checks. No console/page errors,
horizontal overflow, clipped text or caption/control overlap. Screenshot review included
English desktop hero, Arabic mobile hero and Arabic desktop Dates; evidence is ignored
`deliverables/m3-confirmed-dates`. Manual review then found the unfocused Arabic skip link
overlapping the banner at320px/200% text: its fixed hiding offset was shorter than its
wrapped height. A size-relative transform fixes this, with a keyboard regression test.
Final full157-case browser retest PASS, including the new enlarged-text skip-link regression.
All six320px/200% EN/AR Home/About/Dates skip-link visual retests passed: hidden before
focus, complete3px ring on firstTab and Enter reaches main. A further minor enlarged-text
still-status border fragmentation was corrected with an inline-block box; both EN/AR
320px/200% reduced-motion retests PASS with one fully contained box and no video/errors.
The two screenshots were inspected; lint and production build passed after this style fix.
Hosted CI/deployment evidence is recorded below.
The first GitHub run on `3bd8659` passed lint, type-check,232 units and build,
and its isolated database job passed20 pgTAP permission tests and10 client
integration tests. The application job failed9/157 browser cases in the
streamed design-system demonstrations (148 passed). Tests were focusing or
selecting files in hidden streamed nodes, or counting controls before the
loading boundary was replaced. The demonstrations now wait for their real
heading to be visible before raw focus/file/count operations. Original
assertions remain intact, with no sleeps, retries or relaxed expectations.
This follows [Playwright's actionability distinction](https://playwright.dev/docs/actionability).
The corrected revision's local and hosted rerun evidence is recorded below.
Local correction verification PASS: `pnpm lint`, `pnpm typecheck` and
`CI=true pnpm exec playwright test tests/e2e/m2-components.spec.ts tests/e2e/design-system.spec.ts`
(44/44, one worker,1.1minutes). No application code or dependency changed in this repair.

### Observed hosted release — 1 October 2026

[PR5](https://github.com/xpexellent-dotcom/msrc-2027/pull/5) was merged after
[CI36793419169](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793419169)
completed successfully on `5a27e9cb766379099832b1093fbc283f5894360b`.
The production merge revision is `d6e4be7deb98fd5b85d5cf2ff5cca5ead89f8180`.
The merged main revision also passed
[CI36793777799](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793777799).
GitHub's Vercel integration reported Production deployment6772802242 successful;
actual [English](https://www.msrc2027.com/en) and [Arabic](https://www.msrc2027.com/ar)
browser checks confirmed the approved release on the public domain.

| Executed command/check | Observed result |
|---|---|
| GitHub application job: frozen install, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, Chromium installation, `pnpm test:e2e` | PASS:232 unit tests/10 files;157 browser tests/one worker/2.7minutes; every application step successful |
| Isolated GitHub Docker job: `db:start`, `db:reset`, `db:lint`, `db:test`, security advisors, `db:types` plus strict TypeScript, `db:env`, `db:integration`, `db:stop` | PASS: schema lint,20 pgTAP permission tests,10 client Data API tests, advisors/types and teardown; no hosted project used |
| Safe Git/GCM push and expected-SHA PR merge | PASS: release pushed; PR5 merged only after both CI jobs and Vercel Preview build succeeded |
| Vercel Preview builds | PASS on release source; headless browser inspection of the earlier3bd8659 Preview was BLOCKED by Vercel login redirect. Protection was not disabled; no authenticated Preview UAT is claimed |
| `node .tools/media/verify-hosted-release.mjs https://www.msrc2027.com production` | PASS: six Home/About/Dates routes200, English LTR/Arabic RTL, confirmed dates/metadata, current Riyadh count118/١١٨, responsive actual film +keyboard pause; two reduced-motion stills with0 video requests; two MP4 range206 and two JPEG200; ten private/showcase/original404; health200/no-store,15 direct workflow503/no-store, unknown404;0 console/page errors |
| `node .tools/media/verify-production-independent.mjs` | PASS:12 complementary EN390/AR1440/ENAR320200% Home/About/Dates views, four film keyboard pauses/44px targets/3px focus, plus two320px/200% reduced-motion fallbacks;0 overflow/main-text clipping/errors. Seven screenshots visually inspected |

Production screenshots and JSON are ignored under `deliverables/m3-confirmed-dates/production`
and `production-independent`. English320px/200% headings wrap within words and make the
hero tall; all text/actions remain available, with no clipping. This is a future typography
refinement, not an operational gate or a claimed WCAG certification.
Full Vercel project/runtime/drains settings remain NOT VERIFIED: the connected tool's
argument contract rejected project lookup. GitHub deployment evidence and public browser
checks are separately verified. No connector scope repair or service change was made.

Documentation follow-through: current progress, media/design evidence and BL-PUB-01/02
statuses/index reconcile the release. PowerShell parsing verified24 epic files,
152 issues,19 nonempty metadata fields per issue and165 unique index rows;
every indexed title/file/status/dependency/release/owner/TBD field matches its issue.
The initial parser attempt failed on a PowerShell automatic-variable collision;
task-specific variable names fixed it and the complete check passed. Source snapshots
and source coverage are unchanged. `git diff --check` passed.

Firefox/WebKit, real phones and a complete screen-reader/WCAG audit are not
covered by Chromium automation. No hosted Supabase database is reset or tested.

## Configuration, release and rollback

No new dependency or migration; public playback/countdown need no environment change.
The earlier local-review addition documents optional `LOCAL_MEDIA_PREVIEW_ENABLED`
in `.env.example`; it does not control approved public media or operational gates.
The existing GitHub/Vercel integration published the authorized branch through PR5
to main; production deployment and public-browser evidence are verified above.
No manual environment, database or DNS setup is required for this slice.

Rollback the release commit through a reviewed revert or the existing Vercel
rollback path; verify both languages, static fallback and closed gates. Restore
synthetic hero artwork if the approved media is withdrawn, remove controlled
derivatives and verify caching. Keep the confirmed organizer date decision;
no database rollback or data deletion is involved.

Next bounded task: apply forthcoming official brand inputs, then approved
contact/privacy/terms and remaining public informational routes. The permission
contract can proceed independently; staff grants/MFA precede CMS editing.

## Complete release file list

Complete scoped release and documentation follow-through: 70 files relative to pre-release main9e018ae.
The loading convention moved from src/app/[locale]/(preview)/loading.tsx to
src/app/[locale]/design-system/loading.tsx.

- .env.example
- README.md
- docs/DECISIONS.md
- docs/DESIGN_GUIDE.md
- docs/MEDIA_REGISTER.md
- docs/PROGRESS.md
- docs/PROJECT_BRIEF.md
- docs/REQUIREMENTS.md
- docs/backlog/01-governance.md
- docs/backlog/02-foundation.md
- docs/backlog/03-design-system.md
- docs/backlog/04-public-site.md
- docs/backlog/22-testing.md
- docs/backlog/23-deployment.md
- docs/backlog/DECISION_REQUIRED.md
- docs/backlog/ISSUE_INDEX.csv
- docs/backlog/README.md
- docs/backlog/VALIDATION.md
- docs/features/brand-motion-media-preview.md
- docs/features/confirmed-dates-publication.md
- docs/features/design-system.md
- docs/reviews/checklist-audit-2026-10-01.md
- playwright.config.ts
- public/media/msrc2026/hero-desktop-v1.mp4
- public/media/msrc2026/hero-mobile-v1.mp4
- public/media/msrc2026/poster-desktop-v1.jpg
- public/media/msrc2026/poster-mobile-v1.jpg
- src/app/[locale]/(preview)/about/page.tsx
- src/app/[locale]/(preview)/dates-venue/page.tsx
- src/app/[locale]/(preview)/page.tsx
- src/app/[locale]/design-system/layout.tsx
- src/app/[locale]/design-system/loading.tsx
- src/app/[locale]/hero-preview/page.tsx
- src/app/[locale]/opengraph-image.tsx
- src/app/api/preview-media/[asset]/route.ts
- src/app/globals.css
- src/components/conference-countdown.tsx
- src/components/design-system-demo.tsx
- src/components/hero-media.tsx
- src/components/homepage.tsx
- src/components/section-journey.tsx
- src/config/conference.ts
- src/content/about.ts
- src/content/dates-venue.ts
- src/content/public-site.ts
- src/lib/conference-dates.ts
- src/lib/media-policy.ts
- src/lib/preview-media.server.ts
- src/lib/preview.server.ts
- src/styles/about.css
- src/styles/components.css
- src/styles/countdown.css
- src/styles/dates.css
- src/styles/homepage.css
- src/styles/journey.css
- src/styles/media.css
- src/styles/tokens.css
- tests/e2e/about.spec.ts
- tests/e2e/brand-motion.spec.ts
- tests/e2e/countdown.spec.ts
- tests/e2e/dates-venue.spec.ts
- tests/e2e/design-system.spec.ts
- tests/e2e/m2-components.spec.ts
- tests/e2e/public-media.spec.ts
- tests/e2e/public-shell.spec.ts
- tests/unit/conference-dates.test.ts
- tests/unit/design-contracts.test.ts
- tests/unit/foundation.test.ts
- tests/unit/media-policy.test.ts
- tests/unit/media-preview.test.ts
