# ORG-004 — Premium public interface refinement

Scoped requester decision, 1 October 2026. IDs: DSN-01/02, ACC-01, LOC-01/03,
MED-01/04, TIM-01, CFG-01/12, SCP-02, REL-01. Owner types: frontend engineer and
English/Arabic content editor. Actor: anonymous public visitor; no sign-in required.

## Scope and behavior

Restore “Where curiosity becomes discovery.” with “Medical students. Shared ideas.
New discoveries.” and equivalent Arabic copy. Self-host Manrope5.3.0 Latin for English
display titles; retain the working purple/gold/ivory/lilac/ink palette and other fonts.
Simplify Home/About/Dates prose, remove repeated public draft/disclaimer paragraphs,
retain the top Development preview banner, and add original decorative research line
art. Preserve the full15-entry typed sitemap and the accurate closed/unknown states.

The countdown is an ivory panel with a gold edge, prominent days and separated H/M/S,
confirmed27–28January2027 and Arabic-Indic digits. It still counts to the date boundary
at00:00 in Riyadh, with an exact accessible target; actual opening time remains null.
It refreshes after hidden tabs and never performs an operational transition.

Remove the separate visible Pause/Play hero UI. An invisible native button covering
exposed background provides semantic EN/AR pause/resume, Space/Enter activation and
visible keyboard focus. Content links/buttons and selectable text retain pointer
interaction. Explicit pause persists until resumed. Only actual browser autoplay
denial exposes temporary Play recovery, which returns focus to the background after
success. Actual media failure retains a poster and nonvisual translated status.

Shared header, mobile menu, footer and action controls use refined geometry/spacing.
One shared observer runs one-time400 ms /12 px reveals, with45/90/120 ms child stagger;
content is visible before JavaScript or observer failure. UI reduced-motion removes
nonessential travel. Explicit navigation retains mirrored400 ms slides, route/query/hash,
history and focus. Ordinary wheel/touch/keyboard scrolling remains browser-owned.

## Exclusions and dependencies

No new public destination, session/roster/sponsor, price/capacity/venue/opening time,
final logo, gallery or new footage. The four ORG-002 derivatives and original remain
unchanged. No authentication, CMS, registration, submissions, review, payments,
workshops, hackathon,3MT operations, check-in, survey, certificate or AI implementation.
No migrations, database/storage/grant/RLS, secrets/environment, DNS, email or service
provisioning changes. All15 server gates remain closed; existing denial tests still apply.

Dependencies: Manrope5.3.0 pinned with lockfile; exact version/CLI verified before use.
Final official branding, institutional/content/Arabic sign-off, venue/start times and
broader REL-01 evidence remain later release dependencies. They do not block this
authorized presentation slice. No audit/email job or personal data is created; this
versioned organizer decision is the approval record.

## Acceptance and verification

- Exact restored English heading, concise bilingual lead, one top preview notice,
  no separate visible Pause control or duplicate draft/disclaimer paragraphs.
- EN/AR responsive header/body/footer, original decorative SVGs excluded from the
  accessibility tree, no invented event data, routes/closed actions unchanged.
- Native background keyboard/tap pause, frozen frame, durable pause across visibility,
  autoplay-denial recovery, real media-error poster; no third-party media embed.
- D/H/M/S/date readable at desktop/mobile/320 px and200% text, no horizontal overflow.
- Reveal sequence finishes at its starting geometry, plays once, stays visible without
  JS/observer, and is disabled under reduced motion. Navigation focus/history preserved.

Executed evidence and final release results are maintained below. Automated axe checks
do not establish complete accessibility conformance, particularly video-control visual
discoverability and screen-reader behavior. Real Safari/Firefox/device/screen-reader
UAT and human Arabic/editorial/brand review remain NOT TESTED.

## Changed files (complete slice list)

```text
docs/DECISIONS.md
docs/DESIGN_GUIDE.md
docs/MEDIA_REGISTER.md
docs/PROGRESS.md
docs/features/premium-public-interface.md
package.json
pnpm-lock.yaml
src/app/[locale]/(preview)/about/page.tsx
src/app/[locale]/(preview)/dates-venue/page.tsx
src/app/[locale]/layout.tsx
src/components/conference-countdown.tsx
src/components/footer.tsx
src/components/hero-media.tsx
src/components/homepage.tsx
src/components/research-visual.tsx
src/components/site-header.tsx
src/components/ui/reveal.tsx
src/content/about.ts
src/content/dates-venue.ts
src/content/public-site.ts
src/lib/fonts.ts
src/styles/about.css
src/styles/components.css
src/styles/countdown.css
src/styles/dates.css
src/styles/homepage.css
src/styles/media.css
src/styles/tokens.css
tests/e2e/about.spec.ts
tests/e2e/countdown.spec.ts
tests/e2e/dates-venue.spec.ts
tests/e2e/premium-interface.spec.ts
tests/e2e/public-media.spec.ts
```

## Executed checks and results

- `pnpm help add` / `pnpm view @fontsource-variable/manrope version`: current CLI/version
  inspected; `pnpm add --save-exact @fontsource-variable/manrope@5.3.0` PASS.
- `pnpm check`: final lint, typecheck,252 units and optimized production build PASS.
  An initial Arabic-Indic contract failed on a Latin MSRC2026 label; translated label
  corrected and the complete check rerun passed. No framework/toolchain upgrade.
- `pnpm test:e2e`: first201-test run197 PASS /4 FAIL. New reveal assertions required the
  string `none` after fill-mode animations; fresh inspection found finished animations
  serialize as identity matrices, with no repeated movement on re-entry. Assertions now
  require identity geometry plus finished animations and unchanged start counts; the
  corrected focused premium suite16/16 PASS. Final full201/201 rerun PASS (2.3 min).
  `pnpm typecheck` and `pnpm lint` after the assertion edit both PASS.
  `pnpm install --frozen-lockfile` PASS; lockfile unchanged by that verification.
- Production-mode local six-view inspection: EN/AR1440px,390px and320px+200% PASS actual
  autoplay/background keyboard pause, frozen state, countdown/reflow and no browser errors.
  Six public routes200, ten private/showcase paths404 and all15 workflows503/no-store.
  Actual400 ms navigation slides/focus PASS in both languages. Screenshots/receipts:
  ignored `deliverables/m3-premium-refinement/local/`; hero/full-page/mobile/clock inspected.
- Local server agent-browser open/snapshot/errors PASS; no blank page or error overlay.
- Database tests on this Windows host NOT RUN in this slice. Isolated Linux GitHub
  [CI36847305482](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36847305482)
  on exact head9d9026a74d2ba2df560d49cf2a66dbd76fbfb406 PASS both jobs: frozen install,
  lint/types/252 units/build/201 browsers; local stack start/reset/lint/20 pgTAP/security
  advisors/generated types+strict typecheck/local public client environment/10 client
  integration tests/stop. No hosted Supabase mutation or production connection.
- [PR9](https://github.com/xpexellent-dotcom/msrc-2027/pull/9) merged at
  cbfe62adc1b04e829479b6bbf0ad9d41d5a14bc2 after exact-head CI and Vercel Preview success.
  `git diff --exit-code 9d9026a HEAD` PASS: merged tree matches verified PR head.
  Preview6781648361 succeeded; actual unauthenticated browser UAT redirected to Vercel
  Login and was BLOCKED. Preview protection was preserved.
- Production6781771386 succeeded for cbfe62a. Fresh live inspection at
  `https://www.msrc2027.com` PASS all six EN/AR desktop/mobile/320px+200% views:
  exact restored heading, one notice, no visible hero control, real autoplay/keyboard
  pause/frozen state, complete countdown/reflow, actual mirrored400 ms navigation
  slides/focus and no browser errors. Six public routes200, ten private/showcase404,
  all15 workflows503/no-store. Screenshots/receipts in ignored
  `deliverables/m3-premium-refinement/live/`; desktop/mobile views inspected.
- Changed-file and whitespace review PASS. All33 changed paths belong to this slice;
  no `.env`, migration, Supabase or public media file was staged. The existing final
  official branding/human editorial/Arabic/device/screen-reader/Firefox/Safari checks
  remain open. This release does not open broader REL-01 or operational gates.

## Opening, manual setup and rollback

Use the existing README/portable Node setup and `pnpm install --frozen-lockfile`.
`pnpm start --port 3300` opens the built preview. No hosted environment setting needs
to change, and no production connection or secret is needed for these public changes.
Screenshots are local evidence and are not new deployed assets.
The scoped app is published at [English](https://www.msrc2027.com/en) and
[Arabic](https://www.msrc2027.com/ar). Local built preview remains at
`http://127.0.0.1:3300/en` / `/ar` while this task's process remains running.

Rollback through a reviewed revert of the scoped app PR or restore the prior successful
Vercel app deployment6773736526 / main9de4c1c. No schema rollback is required. Preserve
ORG-004/history even if UI is reverted. All workflow flags stay closed.

Next smallest task: apply the supplied official brand files and approved bilingual copy;
then approved Contact/Privacy/Terms within M3. BL-SEC-01 may proceed independently.
