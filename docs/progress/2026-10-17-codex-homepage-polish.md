# Homepage mobile polish — 17 October 2026 (O9)

Owner-requested implementation on `codex/homepage-polish`, starting at `1105a93`.
No branch creation, commit, push, PR, hosted changes or operational activation.
Claude owns the option/program work, ORG-054, combined review and PR.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01, MED-01/04, CRT-01.

## Audit and implementation

- Read the project brief, decisions, progress, design guidance and relevant baseline
  requirements. The checkout was clean. Installed the frozen lockfile first using
  Node 24.21.0 / pnpm 11.19.0 from `C:\m\tools\bin`; no dependency changes.
- Benefits: content-sized cards, 16px phone padding, purple titles of 25.6–26.52px
  at 320/390px, and one sentence per body. The first card's more-specific padding
  rule is overridden too. CME's illustrative seven is unchanged and the accredited
  number remains unconfirmed; prize categories/details remain unannounced.
  Both day check-ins plus the survey remain the conference certificate condition;
  workshop certificates remain separate. Existing workshop-specific eligibility
  rules are unchanged.
- Copy: shortened six benefits, the benefits introduction, venue and community
  leads, and two homepage pathway descriptions in EN/AR. Registration imports the
  original CME body, so the new `homepageBody` overrides only the homepage display.
  No option-page source or copy was edited.
- Statistics: retained semantic `dl`, final screen-reader values, localized digits,
  count-up, reduced-motion behavior and glass surfaces. Three compact desktop
  cards become a full-width total plus two compact phone cards, collapsing to a
  single column at enlarged text sizes when two readable columns cannot fit.
  The total label wraps below its number when needed. Final measured
  group heights: EN 320/390 = 256/264px; AR 320/390 = 233/219px; both 1440 = 159px.
  The previous phone minimum was 264px per card, before gaps.
- Shared rail: replace the `.82 * clientWidth` increment with clamped stops from
  actual child offsets and widths. Measure from the reading edge, negate the
  scroll target in RTL, center intermediate items and clamp first/last items to
  reachable edges. Existing `stepByItem` venue galleries keep start alignment.
  The workshop cards use the same center snapping. The destination ref preserves
  each rapid tap while native smooth scrolling is underway; scroll end, manual
  pointer/wheel input and resizing reset it. Keyboard and reduced motion are
  instant; Home/End remain local to the rail, with child controls untouched.
  ResizeObserver covers the rail and its items; scroll events maintain disabled
  edge buttons. Native horizontal scrolling remains available.
- Films: at <=700px (the existing portrait source breakpoint), normal homepage
  pause/play targets are hidden from display, keyboard and the accessibility tree.
  Opening and closing videos retain their existing loading/playback logic. The
  opening target was already a transparent full-background button; desktop/tablet
  semantics are retained. Explicit full-screen film viewing keeps its controls
  and gesture recovery. Reduced-motion homepage visits request neither film and
  show posters. No video asset, source selection or autoplay policy was changed.

## Local verification

Receipts and reviewed screenshots are ignored local artifacts under
`.tools/homepage-polish/` and `homepage-*.log`; they are not source deliverables.
The temp Playwright config is a copy of the repository config on port 3294.
Only the server started for this task is stopped. No service on port 3210 is touched.

Commands (PowerShell PATH prefixed with `C:\m\tools\bin`):

```text
pnpm install --frozen-lockfile
pnpm exec eslint . --max-warnings=0
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test --config=playwright.homepage-temp.config.ts --project=chromium-desktop --project=chromium-mobile
pnpm exec playwright test homepage-polish editorial-motion cinematic-film --config=playwright.homepage-temp.config.ts --project=chromium-desktop --project=chromium-mobile
pnpm exec playwright test real-user-media --grep 'film preserves' --config=playwright.homepage-media-temp.config.ts --project=chromium-desktop --project=chromium-mobile
git diff --check
```

- PASS `pnpm install --frozen-lockfile` (pnpm 11.19.0).
- PASS `pnpm exec eslint . --max-warnings=0`.
- PASS `pnpm typecheck` (`next typegen && tsc --noEmit`).
- PASS `pnpm test`: 67 files, 2,797 cases.
- PASS `pnpm build`: 81 generated pages; `/en` and `/ar` remain SSG.
- Initial targeted browser run: 131 passed / 17 skipped / 2 failed. Preserved under
  `.tools/homepage-polish/initial-targeted/` with the log alongside it. The failures
  were Arabic 280px doubled-text statistics clipping (a later, more-specific count
  style won; corrected specificity) and a cinema assertion expecting an accessible
  name on the newly hidden phone control (now asserts hidden). No retries or longer
  timeouts were added.
- PASS final full Chromium desktop/mobile run: **723 passed / 81 skipped /
  zero failures / zero retries**, 804 total cases, 11.7 minutes. Includes the
  12 EN/AR viewport/motion homepage cases, two rapid/unequal-width rail cases,
  existing count-up and accessibility checks, phone film assertions, and the
  corrected 280px doubled-text EN/AR regressions. Receipt:
  `homepage-full-e2e-final.log`; the unchanged repository exclusions are
  `staff-security`, `contact-delivery` and `real-user-*` (the affected native film
  cases from the latter were run separately).
- Interrupted intermediate full run: 234 passed / 24 skipped / 1 failed before
  stopping to correct the remaining Arabic 280px enlarged-text grid clipping.
  That failure needed an adaptive column minimum, not just the earlier count
  specificity correction. Log and failure artifacts are preserved under
  `.tools/homepage-polish/intermediate-full*`. The final full run uses the rebuilt
  source, with the original assertions and timeouts.
- PASS additional film breakpoint probes: eight EN/AR states at 700/701/791/390px
  keep native playback and show controls only above 700px; two live preference
  changes remove both videos when reduced motion is enabled.
- PASS corrected targeted suite (`homepage-polish`, `editorial-motion`,
  `cinematic-film`, desktop + mobile): 69 passed / 19 intentional matrix skips /
  zero failures, before the final label-wrap-only polish at extreme enlarged text.
- PASS separately included `real-user-media --grep 'film preserves'`:
  four EN/AR desktop/mobile cases covering native playback, rotation, offline and
  visibility recovery, and reduced-motion switching. This file is excluded by
  the repository's normal public-suite configuration, so it used a second
  untracked temp config and its own output directory.
- PASS shared Workshops rail geometry: six EN/AR 320/390/1440px states; each of
  eight phone arrow clicks reveals the complete expected next card. At 1440px
  all three cards fit and both arrows are disabled. These read-only probes use
  this base checkout; Claude still owns review of the combined option-page branch.
- Visual review: EN/AR at 390x844, 320x568 and 1440x900. Cards hug their text and
  the stats are compact; all six states have zero document horizontal overflow.
  Section screenshots hide the fixed header only during capture so it does not
  obscure the tall card list. The live layout and tests retain the header.
- PASS final `git diff --check`.

Cleanup: removed both untracked Playwright configs, stopped the task's final
server (PID 34604), and restored the three tracked venue tooltip JPGs rewritten by
the full suite. The worktree's Git index is read-only, so `git restore` could not
create its lock; exact `git show HEAD:<path>` bytes restore only those known
generated files without writing the index. No tracked screenshot or `.tools`
diff remains. The final branch is still `codex/homepage-polish` at `1105a93`.

The initial Windows Playwright web-server teardown waited after all cases had
finished; stopped only its logged PID (30148), which released the normal summary.
The full run uses an explicitly started task-owned server and temp-config reuse.
Recursive removal of `.next` was rejected by automatic command policy. The first
build had no `.next`; for the second clean build the verified workspace-local
directory was archived beneath `.tools/homepage-polish/` before each rebuild.
Every rebuild started with no `.next` directory; the ignored build archives remain
local alongside the diagnostic receipts.

## Remaining review

Owner approval of the 22 changed EN/AR display strings is pending in the combined
PR. Physical devices and assistive technology, hosted CI/deployment and Claude's
combined Workshops/option-page review are NOT TESTED here. Nothing is merged or
published. No `docs/PROGRESS.md`, decision register or protected option-page file
was edited. The next task is Claude's combined branch review and owner copy approval.

## Copy for owner review

| String | Before | After |
|---|---|---|
| introduction (EN) | Come to learn, present and connect. Leave with skills, recognition and connections that last. | Learn, present and connect to build skills and earn recognition. |
| venueBody (EN) | At King Abdulaziz University in Jeddah, the conference brings our research community together in one place. Plan your arrival, explore the venue and make the most of your two days. | Join our research community at King Abdulaziz University in Jeddah, and plan your two-day visit. |
| historyBody (EN) | From the first conversations to a room full of new possibilities. Every edition adds another chapter to MSRC. | Every edition brings new conversations and possibilities to MSRC. |
| CME hours. (EN) | Earn continuing medical education hours. The accredited number will be announced once confirmed. | Earn continuing medical education hours, with the accredited number to be confirmed. |
| Hands-on workshops. (EN) | Build practical skills in focused, hands-on workshops alongside the main programme. | Build practical skills in workshops alongside the main programme. |
| Network with experts. (EN) | Meet researchers, clinicians and speakers over two days. | Meet researchers, clinicians and speakers across both days. |
| Research exposure. (EN) | Submit your abstract and present your work to peers, faculty and judges. | Submit your abstract to share research with peers, faculty and judges. |
| Awards and cash prizes. (EN) | Compete in the conference competitions for awards and cash prizes. Categories and details will be announced. | Compete for awards and cash prizes, with categories and details to be announced. |
| Certificates for every step. (EN) | Attend both days and complete the survey for your conference certificate. Each workshop you complete earns its own. | Earn your conference certificate with both day check-ins and the survey, plus separate workshop certificates on completion. |
| Abstract submission pathway (EN) | Present your findings, including work in progress, and open a scientific conversation. | Discuss your findings, including work in progress. |
| Workshops pathway (EN) | Build practical skills through focused, hands-on learning. | Build practical skills through hands-on learning. |
| introduction (AR) | تعالَ لتتعلّم وتعرض أبحاثك وتتواصل، واخرج بمهارات وتقدير وعلاقات تدوم. | تعلّم واعرض بحثك وتواصل لتنمّي مهاراتك وتحظى بالتقدير. |
| venueBody (AR) | في جامعة الملك عبدالعزيز بجدة، يلتقي مجتمعنا البحثي في مكان واحد. خطّط لوصولك، وتعرّف إلى المقر، واستفد من يومَي المؤتمر. | انضم إلى مجتمعنا البحثي في جامعة الملك عبدالعزيز بجدة، وخطّط لزيارتك خلال اليومين. |
| historyBody (AR) | من الحوارات الأولى إلى آفاق جديدة تجمعنا. تضيف كل نسخة فصلًا جديدًا إلى رحلة المؤتمر. | تضيف كل نسخة حوارات وآفاقًا جديدة إلى المؤتمر. |
| ساعات تعليم طبي مستمر. (AR) | احصل على ساعات تعليم طبي مستمر، ويُعلن عددها المعتمد فور تأكيده. | احصل على ساعات تعليم طبي مستمر، ويُحدَّد عددها المعتمد لاحقًا. |
| ورش عمل تطبيقية. (AR) | طوّر مهاراتك العملية في ورش عمل تطبيقية مركّزة إلى جانب البرنامج الرئيسي. | طوّر مهاراتك العملية في ورش إلى جانب البرنامج الرئيسي. |
| تواصل مع الخبراء. (AR) | تعرّف إلى باحثين وأطباء ومتحدثين على مدى يومين. | التقِ بباحثين وأطباء ومتحدثين خلال اليومين. |
| منصة لبحثك. (AR) | قدّم ملخصك البحثي واعرض عملك أمام الزملاء وأعضاء هيئة التدريس والمحكّمين. | قدّم ملخصك لعرض بحثك أمام الزملاء والأساتذة والمحكّمين. |
| جوائز ومكافآت نقدية. (AR) | نافس في مسابقات المؤتمر على جوائز ومكافآت نقدية. تُعلن الفئات والتفاصيل لاحقًا. | نافس على جوائز ومكافآت نقدية، وتُعلن الفئات والتفاصيل لاحقًا. |
| شهادة لكل خطوة. (AR) | احضر اليومين وأكمل الاستبيان لتحصل على شهادة المؤتمر، ولكل ورشة تُكملها شهادتها الخاصة. | احصل على شهادة المؤتمر بتسجيل حضور اليومين وإكمال الاستبيان، وشهادات منفصلة للورش عند إكمالها. |
| تقديم الملخصات pathway (AR) | اعرض نتائجك، بما فيها الأبحاث الجارية، وافتح باب النقاش العلمي. | ناقش نتائجك، بما فيها الأبحاث الجارية. |
| ورش العمل pathway (AR) | طوّر مهارات عملية من خلال تعلّم مركّز وتطبيقي. | طوّر مهاراتك العملية بالتعلّم التطبيقي. |

## Owner follow-up: desktop composition and continuous surfaces

The same authorized scope and file ownership apply. All first-pass copy,
compact cards/counts, item-based rail and phone film-control changes are retained.
No additional public string changed; the 22-string table above remains complete.

- Above 800px, logical grid columns place the benefits on the inline-start side
  and the artwork on the inline-end side. The opening row places the introduction
  and participation link at inline-start, with the title at inline-end and
  `text-align: end`. English therefore has cards left/artwork right; Arabic is
  the visual opposite. DOM reading order and the existing phone stack stay intact.
  Existing vertical reveals and the artwork's brief settling motion remain valid
  on either side; no directional slide is introduced.
- Benefits and speakers now meet at the same `#f0eaf5` colour, with gradients
  blending into each section's existing surface. Both ambient layers fade through
  masks before their section edges instead of ending with cut strokes. No section
  spacing, content, speaker component or gallery layout was redesigned.
- The dark community section reuses two instances of the existing ambient SVG,
  placed on logical opposite sides in an `aria-hidden`, non-interactive layer
  below the content container. Lilac strokes use 14% alpha and ivory orbits 8%.
  The layer covers the stats and gallery, showing around photos and through the
  glass treatment without painting over photo content. A gentle 32-second drift
  runs only for no-preference; reduced motion removes it immediately. Print and
  forced-colour modes hide the decoration.
- React review: reuse existing artwork/reveal infrastructure, no new dependency,
  request, state, hook, media asset or client-side data boundary. EN/AR homepages
  continue to be static generated routes.

Follow-up verification artifacts use `homepage-followup-*.log` and
`.tools/homepage-polish/followup/`. Eighteen requested-area captures cover EN/AR
at 390x844, 1440x1080 and 1920x1080: benefits, the benefits/speakers boundary,
and the full community section. Whole-section captures temporarily hide the
fixed header and grain overlay to avoid compositor crop bands; viewport boundary
captures retain the normal grain. This affects capture styling only. The helper
eagerly decodes gallery images for complete captures, without altering source.

Final follow-up checks:

- PASS `pnpm exec eslint . --max-warnings=0`: zero errors/warnings.
- PASS `pnpm typecheck`.
- PASS `pnpm test`: 2,797 tests across 67 files.
- PASS `pnpm build`: 81 generated pages, including static EN/AR homepages. The
  final clean build includes the lower-opacity linework chosen after visual QA.
  As in the first pass, the verified workspace `.next` directory was archived
  locally before rebuilding because recursive removal is blocked by policy.
- PASS `pnpm exec playwright test homepage-polish editorial-motion cinematic-film
  --config=playwright.homepage-temp.config.ts --project=chromium-desktop
  --project=chromium-mobile`: 75 passed, 25 intentional skips, zero failures or
  retries, 1.8 minutes. Desktop: 48 passed / 2 skipped; mobile: 27 passed /
  23 skipped. Exact viewport cases run in the desktop project instead of being
  duplicated in the phone project. This final run includes all six new surface
  checks, existing 320/390/1440 EN/AR one-item rail and film assertions, and the
  enlarged-text/reveal regressions. The initial follow-up run also passed 75/25;
  it preceded the final stroke-alpha refinement and is retained as a receipt.
- PASS six full-page WCAG A/AA axe scans within those new cases: zero violations,
  EN/AR at 390, 1440 and 1920. Live reduced-motion changes stop the drift.
- PASS visual review of all 18 area captures; six states have zero document
  horizontal overflow and zero page errors. The benefits/speakers boundary has
  no gap or hard background edge, including 1920px. Decorative lines remain
  behind the glass stats and photos. Phone card and count dimensions are retained.
- The earlier full public suite result remains 723 passed / 81 skipped / zero
  failures. It was not rerun after this visual follow-up; the requested homepage,
  editorial and film specs were rerun on the final build as recorded above.

No additional approval or unresolved implementation blocker. Owner copy/design
approval and Claude's combined branch review remain pending. Physical devices,
assistive-technology sessions and hosted CI/deployment remain NOT TESTED here.

Cleanup confirmed: temporary config removed, task-owned final server PID 5300
stopped, port 3294 no longer listening, and final `git diff --check` passes.
Only the 16 authorized source/test/note files are changed; no generated screenshot
diff remains. Branch and HEAD remain `codex/homepage-polish` / `1105a93`, with
no commit, push or branch creation.
