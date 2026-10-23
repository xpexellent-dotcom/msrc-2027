# Abstract dates timeline — 24 October 2026

Owner request: show the abstract "Important dates" as an animated timeline with a hover glow, placed below the "Give your work a wider conversation." section on the Abstract submission page.

## Change
- `src/components/conference-experiences.tsx`: the dates section moves from directly after the "not open yet" notice to after the benefits section. Same dates, same EN/AR copy, still an ordered list under the "Important dates" region.
- `src/styles/participation-flow.css`: new `abstract-timeline*` styles.
  - Desktop (≥900px): a centre gold line with cards alternating sides. Mobile: a single line on the inline-start side.
  - Logical properties, so Arabic mirrors.
  - Hover: a gold glow on the card and its dot, plus a gentle dot pulse.
  - Scroll reveal and line draw use CSS scroll-driven animations, only under `prefers-reduced-motion: no-preference` with `@supports (animation-timeline: view())`.
  - Without support, JavaScript or motion, everything is simply visible.

## Evidence
- `tsc --noEmit`: PASS. `eslint` on the changed component: PASS.
- Visual checks in the in-app browser (dev server):
  - EN desktop at 1400px: alternating layout.
  - Hover glow: confirmed.
  - AR mobile at 390px: right-to-left, no horizontal scroll (scrollWidth 390).
  - AR desktop: mirrored.
  - Section order: notice → wider conversation → Important dates → Simple steps.
- Playwright e2e: NOT TESTED locally; CI runs it.
