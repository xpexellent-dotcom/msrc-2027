# Premium navigation and invitation controls — 11 October 2026

Scope: ENG-024 / DSN-01/02, ACC-01, LOC-01/03. This lane preserves the seven
destinations, five Participate paths, closed registration route and native scrolling.

## Audit before implementation

Vitarc was inspected in a separate hidden browser tab at 1265px. Its rendered
center shell starts at 580px and opens to 1216px after downward scrolling; the
logo and action move physically toward the corners. The link group scales to
0.9 while the glass plate disappears. These observations, not its unrelated
health claims or content, informed this revision.

| Before | After | Why |
| --- | --- | --- |
| Nearly full-width MSRC shell; 12px logo/action nudges | Centered 1200px maximum shell, viewport-based outward travel (108px at 1440px) | Make the separation read as an outward swipe, not an in-place fade |
| One plate contracts toward its center | Two clipped glass halves slide out and scale; middle links slide and shrink | Give the exit clear spatial direction and make reversal legible |
| Flat dark plate | Purple gradient, backdrop blur, existing raster grain and a one-pixel white edge | Carry the requested softly illuminated material into the header |
| Flat yellow-gold action | Champagne material, firmer typography, highlight sweep and soft offset glow | Make the invitation feel considered without competing with the content |

## Implementation

- Navigation travel uses transforms, not animated width/layout. The centered
  width leaves seven links readable. The two controls remain visible and usable.
- Header motion settles within 300ms with exponential easing; hover highlight is
  240ms, action press 120ms. All are interruptible CSS transitions.
- Upward scroll, the existing top-edge pointer approach, and focus recover the
  full shell. Keyboard recovery is immediate. The empty compact center has no
  pointer target. Arabic mirrors the control movement and link direction.
- Touch/menu layout stays unchanged. Reduced motion removes transitions;
  forced colors restores system surfaces. Disabled actions retain neutral shared
  styling. Public action styling is scoped to pages with the public header.
- No new dependency, route, data collection, registration state or public claim.

## Verification handoff

- Extended the existing bilingual navigation regression to measure real outward
  logo/action movement, visible zoom, return position and empty-center hit testing.
- **PASS:** targeted ESLint for the component and navigation test, zero warnings.
- **PASS:** scoped `git diff --check`, no whitespace errors.
- Color calculation: action ink on the darkest champagne stop is 8.15:1;
  the header's pale accent on its lightest opaque purple stop is 5.81:1.
  Final rendered contrast remains part of the parent's batched visual inspection.
- Parent owns the integrated build, browser matrix, screenshots and final receipt.
  This note does not claim those checks have run.

Files: `src/components/site-header.tsx`, `src/styles/axiom-navigation.css`,
`src/styles/premium-actions.css`, `tests/e2e/axiom-navigation.spec.ts`.
