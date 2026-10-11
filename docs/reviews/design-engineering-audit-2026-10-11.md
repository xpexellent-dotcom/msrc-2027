# MSRC 2027 design engineering audit and improvement plan

11 October 2026 · Audit stage; application code unchanged.

**Expanded follow-up:** The requester subsequently authorized a full visual overhaul
with creative freedom and a working demo for approval. The original audit below is
preserved; the [expanded plan](visual-overhaul-brief.md) and
[demo record](../features/public-visual-demo.md) describe the later scope.

**Implementation follow-up:** This preserves the audit written before source edits. The subsequent refinement uses current main `340e36df20f601c3fa05c4aa82d8f256df7471bc`, rather than the older checkout below. ORG-012's reversible chapter-title scenes and hero entrance/departure supersede this report's older motion inventory and are retained. Ordinary content reveals and routine navigation are refined separately. See [the implementation and verification record](../features/design-engineering-refinements.md) for reconciled scope and current evidence; the audit measurements below remain historical.

## Verdict and scope

The implementation expresses a coherent MSRC identity. Preserve it and refine usability. The purple/gold/ivory palette, bilingual typography, historical conference film, restrained research illustrations and editorial sections already provide a recognizable foundation. The highest-value work is reliable interaction, readable mobile content and clearer information priority.

Method: independent source reviews for Emil Kowalski motion/interaction principles and Impeccable visual/accessibility principles, a separate Impeccable detector pass, then live browser verification by the primary reviewer. This is the requested audit and prioritized plan, not implementation or release approval.

Inspected public homepage in English/Arabic, homepage participation/programme/film sections, Arabic programme page, mobile disclosure navigation, shared components and public-route source. Browser evidence comes from the Codex in-app Chromium browser, using desktop and responsive viewport overrides, not physical touch devices. Public visitors and prospective participants are the primary audience.

Local revision: `4534452` (`docs: record cinematic production release and live verification`), with pre-existing documentation, skills and output changes preserved. The live site is newer than this checkout: it displays King Faisal Conference Center and Contact/Privacy/Terms links; local `conferenceConfig.venue` remains null and local footer routes differ. Live deployment revision was not established. Source locations below identify this checkout, not a claim that its full tree matches production. Reconcile the current implementation and organizer decisions before editing; do not revert live content using this snapshot.

Requirements: DSN-01/02, ACC-01, LOC-01/02/03, PRG-01, MED-01/04, CMS-04, CFG-01/12 and REL-01. ORG-006 governs public video interaction: retain the semantic background pause mechanism, preference-aware delivery, film viewer and native scrolling. The old visible-Pause and unconditional-autoplay directions are superseded.

## Existing identity and composition

| Area | Observed baseline | Assessment |
| --- | --- | --- |
| Brand | Purple `#3B1E6D`, gold `#C9A24A`, ivory `#F8F6F0`, lilac `#DCCFF0`, ink `#1F1930` | Distinct and consistent. Keep the exact identity and scoped asset approvals. |
| Typography | DM Sans public headings/actions; Inter body; Noto Sans Arabic and RTL adjustments | Strong display hierarchy. Small supporting and control text is the main weakness, rather than font selection. |
| Layout | Full-height filmed entrance; floating ivory header; editorial splits; four desktop participation cards; purple programme section; numbered desktop chapter navigation | The opening is immersive and subsequent reading surfaces feel related. Phone cards and catalogue preambles need a tighter relationship to the visitor's task. |
| Components | Shared buttons/links/statuses; native labelled controls and FAQ disclosures; reusable section, programme, speaker and media patterns | Good structure. Focus and selected-state overrides have drifted across surface styles. |
| Motion | 180 ms feedback, 98% press scale, 1 px lift; one-time 400 ms reveals; directional route/anchor arrivals | Already restrained. Repair interaction first; shorten routine navigation selectively. |
| Bilingual behavior | Mirrored Arabic navigation/cards, Arabic digits, scientific titles explicitly LTR in source | Preserve equal visual treatment. Live mobile Arabic layout was reviewed; editorial and screen-reader sign-off remain separate. |

The film viewer opened successfully, exposed its close action and previous-edition label, and Escape returned focus to Watch the film. Core text palettes, visible closed-pathway states, native scrolling and approved-publication filtering are strengths to retain. Final mark/asset/editorial approval remains a separate release gate.

## Audit health

These are reviewer scores for the inspected sample, not WCAG certification, measured Core Web Vitals or a whole-site release verdict.

| Dimension | Score / 4 | Evidence and limit |
| --- | --- | --- |
| Accessibility | 2 | Semantic/keyboard foundations exist, but live inverse focus and pointer pause defects remain. |
| Performance | 3, provisional | Source uses bounded observers, responsive media and mostly transform/opacity motion. No current device/network performance benchmark; header geometry transition and offscreen video warrant measurement. |
| Theming/consistency | 3 | Coherent tokens and identity; inverse focus and control typography diverge. Dark mode is excluded by DSN-02 and is not penalized. |
| Responsive design | 2 | EN/AR reflow exists; compact cards, small control text and 320 px scrollbar overflow need correction. |
| Implementation integrity | 3 | Product-specific system with isolated cascade defects. The detector's two warnings are contextual false positives, not public defects. |
| **Total** | **13/20** | **Acceptable; targeted usability work required. No broad redesign indicated.** |

Seven prioritized live findings: zero P0, two P1 and five P2. One additional source-level recovery defect requires runtime reproduction. Motion tuning below is a proposal, not counted as a verified failure.

## Prioritized findings

| ID / priority | Before | After proposed | Why / evidence |
| --- | --- | --- | --- |
| A01 · **P1** · Accessibility | Keyboard focus on the gold homepage programme action draws purple on its purple section. | Apply an ivory inverse focus token to dark programme/legacy surfaces; keep a consistent visible outline. | Live keyboard reproduction measured outline and surrounding background both `rgb(59,30,109)`—1:1 contrast. ACC-01; WCAG 2.4.7 / 1.4.11. `src/styles/components.css:72`, `src/styles/homepage.css:76`; analogous legacy source at line 96 needs the same validation. Use Impeccable harden. |
| A02 · **P1** · Interaction/accessibility | Foreground hero containers intercept clicks on visually empty video space. | Let empty foreground space pass pointer events to the existing semantic background button while preserving links, text selection and keyboard access. | Live at 1440×900: center `(900,250)` hit `.hero-layout` and playback stayed running; edge `(20,250)` hit `.hero-media-toggle` and paused it. This breaks the intended ORG-006 interaction. `src/styles/homepage.css:3`, `src/styles/media.css:7`, `src/components/homepage.tsx:31`. Keep the current no-permanent-Pause policy. Use Impeccable harden. |
| A03 · **P2** · Consistency/orientation | Every open mobile menu item looks the same, including the current programme page. | Add a restrained lilac selected surface or inline marker for `aria-current="page"`. | Live Arabic menu: current and other links all purple, weight 600, no underline and transparent background. Semantics alone do not tell sighted visitors their location. `src/styles/components.css:36`, `src/styles/public-interface.css:18`. Use Impeccable harden/polish. |
| A04 · **P2** · Responsive typography | At 390 px, homepage participation remains two narrow columns; descriptions measure 12.64 px and wrap into many short lines. | Use one column on compact phones (initial proposal: below 640 px), with descriptions near 16 px; retain the same content and artwork. | Live EN/AR screenshots show cramped cards; desktop descriptions also measure only 13.28 px. Increase useful reading width rather than shrinking type to keep a grid. `src/styles/homepage.css:131`, `:161`, `:169`. Use Impeccable adapt/typeset. |
| A05 · **P2** · Component typography | Programme search text measures 13.76 px and mobile select text 12.48 px. | Bring editable control text to 16 px, retaining secondary labels and the existing 52–54 px control heights. | Measured on the live Arabic programme page; shared fields already use 1rem. Small text makes scanning harder; iOS focus zoom is a risk, not a reproduced finding. `src/styles/conference-experiences.css:34`, `:179`; shared baseline `src/styles/components.css:102`. Use Impeccable typeset/adapt. |
| A06 · **P2** · Responsive reflow | At a 320 px window with a 15 px classic scrollbar, the page retains 320 px content in a 305 px client area and exposes horizontal scrolling. | Remove the document-level fixed minimum width and let component constraints reflow; verify against `documentElement.clientWidth`. | Live settled Arabic viewport: `innerWidth=320`, `clientWidth=305`, `scrollWidth=320`; horizontal scrollbar visible. EN also showed the scrollbar. `src/app/globals.css:19` sets `body { min-width:320px }`. Relevant to ACC-01/reflow; a full 400% zoom audit remains unrun. Do not mask it with blanket overflow clipping. Use Impeccable adapt. |
| A07 · **P2** · Hierarchy | Programme visitors encounter a large title/art preamble, then controls, before learning that no programme has been published. | Place the existing publication state directly beside/below the page introduction; compact the pending-state preamble. Keep day/category/room filters available as appropriate. | At 768×1024 the pending state is below the initial viewport; mobile requires more scrolling. The visitor needs to know availability early. This is a design judgment, not an invented schedule or a demand to remove pending states. `src/components/conference-experiences.tsx:42`, `:98`, `:113`; `src/styles/conference-experiences.css:1`. Use Impeccable layout/clarify. |

### Source-only recovery risk

**A08 · P2 candidate:** `.cinematic-start` centers itself with `transform: translate(...)`, while higher-specificity shared hover, active and reduced-motion button rules replace `transform`. Centering can be lost when the direct-film Play recovery action is used. Separate layout centering from feedback transforms, for example with a wrapper or independent `translate`, and preserve RTL. Evidence: `src/styles/cinematic-film.css:8`, `src/styles/components.css:74`, `:175`. **Runtime reproduction NOT TESTED**: the inspected browser API did not expose reduced-motion emulation. Verify pointer/keyboard recovery, bounding-box stability and reduced-motion direct `#film` entry before calling this fixed.

## Emil motion plan

Apply only after A01–A06. Exact timings are proposed engineering choices; they do not silently replace recorded ORG-004/006 behavior.

| Before | After proposed | Why |
| --- | --- | --- |
| Mobile menu uses the 400 ms editorial entrance. | Pointer opening around **180 ms**, at most **4 px** travel, `cubic-bezier(.23,1,.32,1)`; immediate keyboard opening. Keep closing immediate unless testing establishes a benefit. | Frequent navigation should respond promptly. Reuse CSS; no animation dependency needed. |
| Anchor/route arrivals combine 400 ms / 16 px slides with scrolling and sometimes child reveals. | Compare a single **220 ms / 8 px** pointer arrival with the current implementation; use immediate keyboard destination/focus. | Avoid stacked movement while preserving orientation. Update the decision record and affected acceptance tests if adopted. |
| Some fill and arrow hover effects are unconditional although lift is already hover-gated. | Gate decorative hover effects to fine pointers; retain separate tap/press feedback. | Avoid simulated hover sticking on touch. Physical-device confirmation remains necessary. |
| Header changes its inset using a transition. | Preserve its positions and duration using a transform where practical. | Avoid animating layout geometry; this is not evidence of measured jank. |

Keep the existing 180 ms buttons, restrained press scale, opaque content, one-time editorial reveals and reduced-motion alternatives. No additional parallax, springs, looping ornaments, scroll interception or blanket motion increase is needed. Consider pausing the hero while far offscreen only after measuring its benefit and preserving manual pause/film state.

## Applying the requested references

These are transferable principles, not replacement art direction. Current reference homepages were read; Stripe, Slush and Config were also visually inspected. ESC's landing page and programme link were read; its entire interactive scheduler was not audited.

| Reference | MSRC application |
| --- | --- |
| [Stripe](https://stripe.com/) | Adopt the discipline of a clear reading axis, succinct section purpose and obvious primary action. Use this to simplify catalogue preambles and align spacing; retain MSRC colors/type. |
| [Slush](https://slush.org/) | Preserve the conference atmosphere and immersive opening already achieved by the approved MSRC2026 film. Make that film interaction reliable and keep practical information reachable. |
| [Config](https://config.figma.com/) | Use a consistent graphic vocabulary, strong typography and repeatable component states. Tighten MSRC focus/selected/control contracts without borrowing Config's palette or expressive assets. |
| [ESC Congress](https://www.escardio.org/events/congresses/esc-congress/) | Give scientific programme access and publication status priority. Within MSRC's existing PRG-01 model, retain day → time → session → room/category hierarchy, timezone clarity, filters and separate detail pages. No personal schedule or invented sessions. |

## Implementation sequence and acceptance

1. **Reconcile the source baseline.** Identify the current deployed/repository revision and later organizer decisions; preserve newer venue/contact/legal content. This is a prerequisite to edits, not a new approval gate.
2. **Repair interaction/accessibility (A01–A03; reproduce A08).** Verify actual pointer hit areas, keyboard focus contrast, current-page visual state, film recovery, Escape and return focus in EN/AR. Test hero text selection and all foreground CTAs as regression cases.
3. **Improve mobile reading and hierarchy (A04–A07).** Check EN/AR at 320/390/768/1440 px, 200% text and 400% reflow, long labels, classic scrollbars and real touch. Keep public operational states closed and scientific text LTR.
4. **Tune motion with Emil's criteria.** Compare the proposed menu/navigation timings; test interruption, rapid toggles, repeated anchors, Back/Forward, preference changes, denied autoplay and failed media. Keep only motion that clarifies state or orientation.
5. **Run Impeccable polish and re-audit.** One combined desktop/mobile/LTR/RTL visual pass, targeted browser regressions and relevant accessibility checks. Measure mobile LCP/frame behavior under recorded conditions before making performance claims. No broad redesign or production-readiness claim follows from this audit.

## Observed checks and limits

| Check / command | Result |
| --- | --- |
| `git status --short`; `git log -1 --format='%h %s'` | Baseline recorded, including existing user work. No app files changed by this task. |
| `git diff --check`; source-path existence check; `git diff --name-only -- src package.json pnpm-lock.yaml` | PASS after report edits; all referenced source paths exist; no application/package/lockfile diff. Documentation diff totals also contain pre-existing user changes. |
| `.\.agents\skills\impeccable\scripts\impeccable.cmd context --base-dir .agents/skills/impeccable` | PASS; existing PRODUCT.md loaded, incumbent implementation detected; no DESIGN.md. Existing design guide/tokens remain authoritative for this audit. |
| `.\.agents\skills\impeccable\scripts\impeccable.cmd detect --json src` | Completed, exit **2**: two `side-tab` warnings at `design-system.css:42` and `feedback.css:4`. Both are semantic validation/feedback borders used in the guarded component preview, not decorative public card defects. |
| Live desktop 1440×900 | Hero composition/hit testing, programme focus, chapter navigation and film open/Escape inspected. A01/A02 reproduced; return focus passed. |
| Live compact-phone view | EN/AR participation layout and Arabic menu inspected at 390 px; programme controls also measured during an observed 325 px viewport state. Text sizes and missing selected appearance reproduced. |
| Live 768×1024 | Arabic programme layout inspected; availability sits below initial viewport. Actual dimensions confirmed by DOM readback. |
| Live 320×800 | EN/AR homepages inspected; settled Arabic client/scroll widths confirm 15 px horizontal overflow. |
| Responsive-tool false starts | Two requested viewport changes initially affected another temporary reference tab; DOM readback still reported 1440 px. Those attempts were discarded, reference tabs closed, then 768/320 measurements repeated and confirmed. |
| Full app suites/build/database tests | NOT TESTED; audit/documentation only. Historical green suites are not represented as fresh evidence. |
| Physical iOS/Android, Safari, Firefox, screen readers, preference emulation, enlarged text/zoom, performance/load | NOT TESTED in this audit. No current claim of full WCAG AA, gesture parity or NFR-02 compliance. |

Detector raw output and contextual triage are retained in ignored `deliverables/design-audit-2026-10-11/`. Browser screenshots were viewed in the session, not persisted as committed fixtures. Temporary audit/reference tabs were closed and the viewport override reset. No live detector overlay was injected, no local server was started, no production deployment/configuration/workflow/communication changed.

Next task: reconcile the current source, then implement the bounded interaction/accessibility slice before mobile typography and motion refinement.
