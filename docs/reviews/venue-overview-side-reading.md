# Venue overview hold and side reading — ENG-035

The organizer clarifies the held frame in the annotated overview screenshot and
requests publication. Emil design engineering and Impeccable retain the existing
MSRC identity and Experience surface. No new media, dependency, provider or facts.

| Before | After | Why |
| --- | --- | --- |
| Entrance tied only to section bottom | Complete desktop overview below shared header | Preserve the intended held frame |
| Large centered reading column | Smaller leading-side column, vertically centered | Expose the map |
| Text exchange at viewport edges | Earlier soft entry/exit bands | Keep successive chapters coherent |

The desktop overview uses a content-safe viewport frame, with its centered Begin
action visible. If content grows beyond the frame, natural reading reaches its
end before charge: no clipping, document lock or hidden controls. Continued down
input accumulates the existing bounded bottom glow/blur; a540ms strong ease-out
release lands at Airport. The bridging veil has a static8px backdrop blur and
maximum30% opacity; stage copy blur remains bounded at6px. Reverse, pauses,
focus/keyboard, preference changes, resize and unmount clear effects. Native,
reduced-motion, enlarged text and no-JS alternatives remain.

## Verification

- Bounded entrance source review: no material interruption/frame/fallback defect.
  Journey side geometry uses an independent chapter-index reserve and mirrored
  leading column; its dark scrim follows the actual reading edge. Camera/popup
  reserves use the selected point when one is open, including cross-chapter pins.
- Phone native anchors sit40px below the pinned map; cap their exit band at32px
  after the8px inset so arriving copy stays fully readable. Desktop exit starts
  sooner near the header and incoming copy reveals before reaching reading center.
- An interim complete check passed2,401 units/build before the final phone fade
  arithmetic correction. Its receipt is preserved as
  `.tools/venue-side-check-pre-phone-fade.log`, not final-source proof.
- Next frozen-check attempt stopped at new test-fixture nullability. Explicit
  structural guards retain the geometry assertions; failed receipt is preserved.
  Current-source complete checks and browser evidence are pending.
- Physical devices and screen readers: NOT TESTED. Hosted settings, workflows,
  migrations, accounts and real communications are outside this UI release.

## Frozen local verification

- PASS exact-pinned pnpm11.19.0 check: lint/types,2,401 units in61 files and
  81-page build. `.tools/venue-side-check-final.log`. Failed test-nullability
  attempt remains in `.tools/venue-side-check-test-nullability.log`.
- PASS Chromium63/65 cases, two intentional desktop-only geometry skips on
  mobile; zero retries. `.tools/venue-side-browser-final.log`. New assertions
  independently prove the complete desktop overview is visible before light,
  stationary charge, native Airport landing within1px, smaller mirrored side
  text, vertical centering and earlier incoming/outgoing fades with reversal.
  Existing touch approach/escape, query/focus, no-JS, short/enlarged/reduced,
  fixed44px controls, hover corridors, map/transport/locale/privacy/axe remain.
- PASS WebKit phone10/10, zero retries. `.tools/venue-side-webkit-final.log`.
  These cover Begin, layout/accessibility, map points, chapter anchors and travel
  guidance. Touch charge is Chromium-tested; physical Safari remains NOT TESTED.
- One batched desktop/EN-AR phone visual review: the held complete overview,
  blur/glow release, settled side Airport copy and compact phone map are clean.
  Saved screenshots: `.impeccable/review/venue-overview-side-reading/`.
  Temporary viewport override reset. No further visual edits were needed.
- React review applied: native anchors/disclosures, ref-held animation state,
  coalesced camera updates, measured geometry, complete cleanup, no per-frame
  React updates or new dependencies. `git diff --check` PASS.

Current-source publication awaits exact-head CI, owned Preview and guarded merge,
then owned Production source/alias proof and actual public-site verification.

## Initial hosted check and bounded setup correction — ENG-036

- PR63 initial reviewed head: dd432fc061307b596cd0fc79feb08977333c6698,
  base/main81efe6c76c45e61c581444f3dab83a81caf77a09. Owned READY Preview
  dpl_29LpSuLyFzZaD5dJjePchBzw4yrz matches the expected project/team/head.
- Initial exact-head CI is INCOMPLETE: nine jobs pass; public shard2 is cancelled
  after20minutes at browser installation. Its test and evidence-upload steps are
  skipped. Public shards1+3:432 passes/32 intentional skips/zero assertions failed.
  This is neither a complete public-suite pass nor a design/test assertion failure.
- Root cause: APT's mirror+file:/etc/apt/apt-mirrors.txt configuration repeatedly
  uses the failing HTTP Azure archive despite successful canonical HTTPS metadata.
  Sanitized proof: `.tools/venue-side-install-cancelled-dd432fc.json`;
  incomplete totals: `.tools/venue-side-ci-totals-dd432fc-initial.json`.
- [GitHub's current runner-image configuration](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/scripts/build/configure-apt-sources.sh)
  confirms the mirror-list URI and priorities. The runner-only helper changes that
  exact URI/direct Azure URI in known Ubuntu source files to canonical HTTPS.
  [Ubuntu's archive verification](https://documentation.ubuntu.com/security/software-integrity/archive-verification/)
  remains intact; [Playwright's dependency installation](https://playwright.dev/docs/ci),
  test commands, assertions, retries, time limits and workflow permissions remain.
- PASS Git Bash syntax check and git diff --check. Independent final helper/source
  review finds no material defect. Genuine Ubuntu execution awaits new-head CI.
  No automatic rerun, retry, merge or hosted configuration change was performed.

## Published release receipts

- Corrected reviewed head80b5c2ce4449a5ddfa9bcf8472fe0341f4ea8637: all three
  exact-head PR workflows, ten jobs and ten actual Actions checks PASS, attempt1.
  Public653 pass/43 intentional skips/zero failures/696 cases; core2,401 units/
  61 files,81-page build and81 smoke; Contact44; participant88+4 skips;
  staff102+8 skips; each disposable SQL run1,023 assertions/13 files, clean
  schema/advisors. All seven browser jobs prove canonical HTTPS retrieval,
  zero HTTP Azure requests, successful installation and executed tests. No retries.
- Owned READY Preview dpl_CWi1zGG7CrJ8TPHcAhdrSCQp7F5z matches the expected
  project/team/branch/repository and exact80b5 metadata/GitSource. Protected EN/AR
  page GETs are200 with Venue markers. Connector access returned403; the first
  CLI fallback was not confirmed due Windows batch query splitting. It was not
  retried blindly; subsequent known-deployment inspection established source proof.
  Preview is Git-sourced; its precise creation trigger is not established.
- Vercel's GitHub comment/commit signals were absent, so eleven green checks are
  NOT claimed. A separate guarded helper freshly inspects the owned READY Preview
  twice and retains all workflow/job/actual-check guards and rejection of reported
  bad statuses. Preview inspection precedes the final fresh PR/main pair. No status
  is forged and no server protection/settings are changed.
- Single ordinary head-guarded PR63 squash merge is79d0679d2eb59c0583658d4a5fda827fb781448a.
  Fresh main matches; reviewed and merged trees equal ddc6f6d336ccee61e81694353384b7910f6dd2d5.
- Expected-source automatic Production was absent in bounded lookups. A single
  source-pinned existing-project Production API request uses main+79d and existing
  settings. Direct Node CLI invocation preserves query arguments; no dirty local
  files are uploaded. Deployment dpl_EScbq98CCVAB7zTpaF8kXxSo6ZnD is READY,
  matches expected owner/project/repo/main and79d metadata/GitSource, and both
  msrc2027.com / www.msrc2027.com appear in target and deployment alias lists.
- Independent push/main CI at79d also PASS: all three workflows, ten jobs and
  ten actual Actions checks, with the same complete numeric suite totals.
- Actual public runtime:97 GET/HEAD checks PASS; scoped Chromium63 PASS, two
  intentional desktop-only phone skips, zero retries. This covers the published
  hold/charge/exact landing, side/vertical text and early fades, native phone
  gestures/anchors, no-JS, focus/keyboard/reduced/enlarged/RTL, fixed controls,
  map/disclosure/privacy/axe, public media and unchanged closed boundaries.
- Final public visual confirmation reproduces the stationary overview at96px
  below the header, charging then one release to Airport with full side opacity.
  Screenshots live-desktop-airport.png and live-phone-airport.png are in the task
  review directory. Public tab retained, temporary viewport reset and reloaded at
  the native anchor. Physical devices/screen readers remain NOT TESTED.

Detailed receipts: `.tools/venue-side-80b5-evidence-complete.json`,
`.tools/venue-side-direct-preview-status.json`, `.tools/venue-side-merge-receipt.json`,
`.tools/venue-side-production-final.json`, `.tools/venue-side-live-receipt.json`,
`.tools/venue-side-live-browser.log`, `.tools/venue-side-main-79d-*`.
Post-release receipt updates are local, leaving the deployed source frozen.
