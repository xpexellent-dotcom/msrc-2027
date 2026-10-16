# 16 October 2026 — Attendee-only benefits and a one-screen mobile menu (ORG-052)

- Owner request: the homepage benefits target attendees only. Removed the "For the organizing team" group and the group labels; one list of six cards (CME, hands-on workshops, networking with experts, research exposure, awards and cash prizes, certificates), EN and AR. Action "Meet the team" → "How to take part" (/participate). Removed the unused group-label CSS.
- Owner request: same menu format, slightly smaller, so everything fits without scrolling. Rows 44→36px (sub-pages 34px), link type 17→16px (sub-pages 15→14px), registration button 48→40px, tighter spacing. Staggered entrance animation added; reduced motion and keyboard opening stay instant.
- Measured locally (production build): panel 569px → 447px; no internal scrolling at 375×640 and 320×568, EN and AR; Contact visible; no wrapped labels.
- PASS (Node 24.21.0): ESLint, typecheck, unit tests, build; Chromium desktop/mobile mobile-menu-panel (now also at 320×568 and 375×640), mobile-navigation, axiom-navigation, qa-regressions, public-shell and editorial-motion suites.
