# Axiom-inspired MSRC 2027 approval demo

11 October 2026. ENG-022. Status: local review build; user visual approval pending.

## Brief and scope

The [audit and prioritized plan](../reviews/axiom-inspired-demo-brief.md) preceded
this revision. It combines the earlier design engineering work with the user's
explicit Axiom reference and section-by-section direction. The preceding
[poster demo](public-visual-demo.md) remains historical evidence, not the current
visual specification.

- Full-viewport approved conference film, large title at the reading margin and
  lower-corner live countdown. Arabic mirrors the reading direction.
- One glass navigation system that separates into logo/action islands while
  reading, expands on pointer approach or focus, and retains a compact phone menu.
  Programme offers both days; Participate offers all five routes. Logo reloads
  home. Our Team replaces the header Media link.
- Pausable left-to-right Brand strip; sticky introduction beside five large
  photographic participation cards; image-led programme and direct day links.
- Native horizontal speaker and MSRC 2026 photo rails, arrow controls, interactive
  photo treatment, explicit demo speaker labels and links to the main pages.
- New bilingual Team and Sponsors pages, illustrative Platinum/Gold/Silver
  layouts, stronger FAQ disclosure controls, and a muted Jeddah Corniche closing.
- Shared public typography, buttons, photography and spacing across the existing
  information, programme, speakers, participation, media and legal pages.

Speaker/team names and appointments are unconfirmed. Sponsor brands and tiers are
illustrative. Programme sessions, prices, capacities, prizes and workflow windows
are not invented. The current source does not deploy itself or open registration.
Privacy and Terms wording remains unchanged.

## Motion and interaction

Native document scrolling is retained. The header uses short custom ease-out
transitions, while the constant-speed sponsor strip uses linear movement.
Keyboard-triggered navigation and rail actions settle immediately. Hover
transforms apply only to fine pointers. Reduced motion removes travel and leaves
the hero/city posters; data-saving/slow connections avoid the Jeddah video.
The closing video loads only near its section, has an explicit pause control,
pauses in a hidden document and falls back to its poster on playback failure.
Without IntersectionObserver the closing remains a still image.

## Assets

[Media provenance and transformations](../media/axiom-demo-assets.md) records the
13 authentic MSRC 2026 photographs and licensed Jeddah Corniche source. Archive
photos illustrating pathways are not claimed as photographs of those exact
activities. Portraits do not identify confirmed 2027 speakers.

All 16 referenced JPEGs across the demo and existing hero asset directories carry
embedded provenance. JPEG content checks confirm metadata embedding preserved
the two existing hero posters and 13 selected archive image streams. The FFmpeg
Jeddah still retains its separately recorded final file hash; its pre-embedding
hash included encoder comments and is not used as a stripped-content comparison.

## Verification evidence

- PASS: Node 24.21.0 / pnpm 11.19.0 combined lint, TypeScript, 2,383 unit tests and
  Next production build (83 static pages). Receipt: .tools/axiom-final-source-check.log.
- PASS: initial and confirming visual captures at 1440x960, 1265x712 and 390x844,
  including EN/AR homepage, programme, Team, Sponsors and Speakers. No page-width
  overflow or page errors in .impeccable/review/axiom/captures.json.
- PASS: raster provenance scan: 16 rasters, zero missing. Final file hashes are in
  .impeccable/review/axiom/media-integrity.json; JPEG verification receipt beside it.
- Impeccable detector: ran once per changed target group. Root/nav results contain
  76 advisory differences from the previous DESIGN.md (font scale, palette
  literals and radii). These are requested visual-system changes, not a claim of
  a clean detector. The final system documentation must reflect them.
- PASS: 14 focused regressions, including actual EN/AR Jeddah playback, poster
  fallback, 280px/200% reflow, Arabic tracking, clock readability and forced-colour
  keyboard focus. Receipt: .tools/axiom-regression-confirm.log.
- Full browser regression run: **560 passed / 7 failed / 21 intentional skips**,
  one worker, zero retries. Receipt: .tools/axiom-fourth/full-e2e.log, with the
  original report, screenshots and traces preserved beside it. One failure was
  real About/menu overflow at 280px and 200% text; scoped wrapping and zero-minimum
  grid tracks correct it. Four no-JavaScript cases waited for offscreen images
  before reaching any assertion; navigation now waits for DOM content, retaining
  all readability checks and adding visible-image loading evidence. Two venue
  tests tried a language link after map focus correctly dismissed its menu; they
  now reopen that menu through the shared helper. No retries or relaxed timeouts.
- PASS: final CSS production rebuild, 83 static pages, after the About/menu fix.
  Receipt: .tools/axiom-review-build.log. The preceding full source check remains
  the unit/typecheck evidence; the final changes are CSS and test interactions.
- PASS: final affected-file browser confirmation: **71 passed / 4 intentional
  desktop-only skips**, zero failures, one worker, zero retries. All seven cases
  that failed in the full run passed. The five files cover About, transforming
  navigation, countdown/no-JavaScript, homepage fallbacks and venue guidance in
  desktop/tablet/mobile scopes. Receipt: .tools/axiom-final-confirmation.log.
  This is a focused confirmation, not a second complete 588-case run.
- PASS: final 11 captures show zero horizontal overflow and no page errors at the
  captured sizes. Additional media-gallery-verdict.png and its computed-color
  receipt show the corrected interior archive instructions against the ink field.

The first full unit pass found the missing analytics classification of the two
new pages. They are now explicitly excluded; the repeated unit pass passed.
The initial browser suites identified a real low-contrast gallery instruction,
nowrap rail controls at 200% Arabic text, intrinsic-width grid overflow at 280px,
Arabic paragraph tracking and residual reduced-motion transitions. These source
defects were corrected. Superseded chapter-navigation interactions, zero-padding
rules mistakenly applied to clock fields, and a focus test missing keyboard
modality were corrected without weakening their underlying invariants.

One focused run began before the test-edit handoff settled and consequently
executed five old assertions. That receipt is preserved in .tools/axiom-third;
the settled 14-case run passed. Earlier interrupted/failed receipts are preserved
in .tools/axiom-first and .tools/axiom-second. No retries or relaxed timeouts are used.

The independent Impeccable review returned **fix** at
[its full-review scope](../reviews/axiom-finish-review.md). Its requested gallery
contrast, FAQ spacing, metadata placement and documentation corrections are
implemented. The same reviewer's final verdict is **ship for those four scored
fixes**, all resolved, with no regression observed in their regions. The original
full review and scoped verdict are both preserved. This is not whole-site motion
or production approval. DESIGN.md and .impeccable/design.json now describe the
Axiom-inspired system. This used fresh general subagents following the shipped
reviewer and documenter contracts; typed agent templates were unavailable.

## Review and delivery

Local English demo: http://127.0.0.1:3211/en

Local Arabic demo: http://127.0.0.1:3211/ar

The current local production build is running on port 3211. Browser automation
could not reopen the app's old failed preview tab: automatic URL review rejected
its internal error-page protocol. No workaround was attempted. Direct local
links and the current screenshot are supplied for human review; the successful
Playwright receipts above are independent of that app-tab limitation.

The isolated checkout is on codex/msrc-design-engineering. The original checkout
and its user changes are preserved. No merge, push, hosted deployment, DNS,
database change, production media promotion or participant communication occurred.
Native-reader Arabic review, human accessibility/device UAT, final media approvals
and production release gates remain separate from this local design demo.
