# Design system

Use [the design guide](../DESIGN_GUIDE.md) and ENG-007's approved palette/font/motion implementation baseline. Other semantic tokens remain configurable engineering defaults; final marks and content approval are separate. Current evidence is in the [1 October 2026 checklist audit](../reviews/checklist-audit-2026-10-01.md).

<a id="bl-dsn-01"></a>

## BL-DSN-01 — Retain the bilingual component and layout baseline
- **Source IDs:** DSN-02, LOC-01, LOC-02, LOC-03, ACC-01.
- **Status:** Component inventory implemented and merged through 9e018ae — bilingual layouts, forms, feedback/dialog/toast and table/pagination foundations; final editorial/brand and full accessibility review outstanding.
- **Purpose:** Give public and operational screens consistent readable, accessible controls.
- **Scope:** Preserve semantic tokens, DM Sans/Inter/Noto Sans Arabic, containers, type, header/mobile navigation/footer, language switch, buttons, headings and field/status states in the local/staging showcase.
- **Exclusions:** Final brand certification, dark mode, public admin surface or arbitrary page builder.
- **Dependencies:** BL-FND-01; existing design-system feature notes.
- **Roles:** Public visitor; participant; non-review organizer; designer.
- **States/transitions:** Default, hover, pressed, focused, disabled, loading and validation states; language changes retain route and applicable entered values.
- **Data touched:** Tokens, static translations, synthetic showcase values only.
- **Acceptance criteria:** Both directions remain usable at narrow widths/enlarged text; 44px working touch minimum; focus/disabled/loading distinguishable without color alone; production showcase gate stays closed.
- **English/Arabic:** Full RTL Arabic interface; scientific examples English/LTR; reviewer assessment remains English-only.
- **Accessibility:** Keyboard, focus visibility, contrast, labels/errors, zoom and reduced motion; record manual limitations.
- **Security/RLS:** No live data in showcase; server gate enforced; no-index is not authentication for remote preview.
- **Audit/email:** Git changes only; no business events or email.
- **Automated tests:** Existing bilingual browser, unit and axe checks; extend only for changed behavior.
- **Manual UAT:** Arabic editorial review and actual assistive-technology checks remain required.
- **Release gate:** M2 local completion; REL-01 final content/brand/accessibility still open.
- **Owner type:** UI engineer and accessibility/design reviewer.
- **TBD blocked:** Component work no; specified fonts/palette/motion adopted under ENG-007. Final marks, content and remaining brand approval require DR-CFG-12.

<a id="bl-dsn-02"></a>

## BL-DSN-02 — Validate approved hero media against fallback and motion behavior
- **Source IDs:** DSN-01, DSN-02, MED-01, MED-02, MED-04, NFR-02, ACC-01.
- **Status:** Partial — static poster and synthetic motion/fallback tests exist; cleared footage absent.
- **Purpose:** Preserve the cinematic entrance without delaying information or motion-sensitive access.
- **Scope:** When rights-cleared media arrives, replace only the designated slot; tune encode/poster/crops and overlay contrast while preserving muted inline playback, pause preference and static fallback.
- **Exclusions:** Publishing unreviewed 2026 footage, third-party embed, scroll hijacking, automatic audio.
- **Dependencies:** BL-DSN-01; BL-CMS-05; [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Visitor; content/media editor; rights approver.
- **States/transitions:** Static poster → permitted playback → paused; reduced motion, low bandwidth, hidden page or playback error returns to safe still behavior.
- **Data touched:** Approved derivative video/poster, rights references and media-slot configuration.
- **Acceptance criteria:** User pause is respected; blocked/failed video leaves full text and navigation; real bright/dark frames retain legible contrast; motion does not block main action or native scrolling.
- **English/Arabic:** Hero layout/crops support both directions; accessible pause/resume labels translated.
- **Accessibility:** Keyboard pause, reduced-motion change, poster contrast, touch targets and representative-frame manual contrast checks.
- **Security/RLS:** Only explicitly approved public derivatives; private originals remain inaccessible.
- **Audit/email:** Audit media publication through CMS; no visitor email.
- **Automated tests:** Media error, saved pause, reduced-motion/data-save/slow-network and no-video requests under fallback conditions.
- **Manual UAT:** Real mobile devices/network, poster-first load and all approved footage frames; confirm use rights.
- **Release gate:** REL-01 media publication and performance review.
- **Owner type:** UI/media engineer with content rights owner.
- **TBD blocked:** Actual asset substitution yes — DR-CFG-12; safe static preview remains usable.

<a id="bl-dsn-03"></a>

## BL-DSN-03 — Close design-system accessibility and brand review findings
- **Source IDs:** ACC-01, DSN-02, LOC-01, REL-01, REL-06.
- **Status:** Partial — Chromium evidence and recorded WebKit public checks exist; WebKit keyboard/design-system failures or limitations, Firefox, real-device and assistive-technology review remain open.
- **Purpose:** Turn measured review findings into scoped fixes before public release.
- **Scope:** Review existing primitives with keyboard and screen readers, actual Safari/Firefox/mobile devices, Arabic typography, zoom and approved brand assets; fix only demonstrated issues.
- **Exclusions:** Claiming WCAG conformance from axe alone; aesthetic redesign without approval.
- **Dependencies:** BL-DSN-01; accessibility test matrix; DR-CFG-12 for final brand sign-off.
- **Roles:** Accessibility QA; Arabic content reviewer; UI engineer; design approver.
- **States/transitions:** Untested scenario → recorded finding → fixed and retested or explicitly release-blocking.
- **Data touched:** Test evidence, components with verified defects, approved token revisions.
- **Acceptance criteria:** Each finding records scenario, impact, fix and retest; focus order, announcements, text enlargement and RTL are manually checked; no unexplained critical failures.
- **English/Arabic:** Native-language review of navigation, form instructions and mixed-direction content.
- **Accessibility:** Screen-reader landmarks/labels, logical focus, contrast, motion, 200% text and small viewport behavior.
- **Security/RLS:** Regression-check showcase gating after UI changes; no new data grants.
- **Audit/email:** Versioned review record; no participant messages.
- **Automated tests:** Targeted regression checks for demonstrated failures and affected build checks.
- **Manual UAT:** Record browser/device/assistive technology and actual observed result for each case.
- **Release gate:** REL-01; subsequent operational form releases repeat affected checks.
- **Owner type:** Accessibility QA with UI engineer.
- **TBD blocked:** Tool/device availability may block execution; final brand approval DR-CFG-12, not a blocker to accessibility fixes.
