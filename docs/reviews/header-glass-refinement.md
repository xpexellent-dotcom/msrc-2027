# Header glass and scroll behavior — ENG-028

The organizer reports a vertical join in the expanded capsule, requests roughly
10–15% more transparency, removes pointer-proximity reopening, and asks for a
smoother Vitarc-inspired transition. This is a focused repair of the approved
public header. DSN-01/02, ACC-01 and LOC-01/03 remain applicable.

## Audit and priorities

| Before | After | Why |
| --- | --- | --- |
| Two independently painted translucent plates clipped at 50% | One continuous background, border, blur and grain surface | Avoid a center rasterization edge, including fractional viewport widths |
| Top-edge and logo hover restores the capsule | Upward native scroll restores it; pointer proximity does nothing | Implements the organizer's explicit new interaction rule |
| Broad focus-within restoration includes pointer focus | Keyboard-visible focus restores navigation immediately | Retains accessible recovery without accidental pointer-triggered movement |
| 280ms corner travel with a steep ease-out | Interruptible 520ms travel with cubic-bezier(.76,0,.24,1) | Gives outward movement and its reversal a smoother acceleration/deceleration |
| Purple alpha .80/.86/.82 | .72/.77/.74, with a matching compact logo tint | Approximately 10% less tint; lighter grain/highlight preserve contrast |

Vitarc was inspected live at https://vitarc.org/ on 11 October. Its visible
navigation wrapper uses a 700ms cubic-bezier(.76,0,.24,1) width transition and
300ms center-link opacity/scale. MSRC adapts that movement with transforms and a
shorter 520ms travel, preserving seven readable links and its own identity. It
does not copy reference-site factual claims or add a motion dependency.

The short 220ms text blur/fade, 180ms anchored dropdown feedback, 140ms forgiving
dropdown exit, reduced-motion suppression and normal mobile menu remain. Scroll
updates are passive and coalesced once per animation frame, with cleanup.

Independent review caught a keyboard-to-pointer handoff regression before
publication: clearing keyboard focus ownership on pointerdown moved a center
link before pointerup, swallowing its click. Preserve that focus session until
focus leaves the header. EN/AR regression cases assert the pressed link retains
its hit target and navigates on release; pointer focus alone cannot open a
previously compact header.

Conservative white-backdrop compositing of the new gradient stops and maximum
2.5% white grain gives ivory contrast >=4.67:1 and pale champagne accent contrast
>=4.61:1. This calculation informs the material; real rendered review and browser
checks remain separate evidence.

## Verification plan

- Actual EN/AR downward/upward scrolling, hover non-expansion, interrupted
  reversal, settled logo/button geometry and usable center hit testing.
- All five Participate options through the physical gap, keyboard/Escape,
  responsive language switching, mobile/enlarged text and reduced motion.
- One batched desktop/mobile visual review over bright and dark surfaces, with
  odd-width rendering to expose subpixel seams; one bounded confirmation if needed.
- Lint, types, units/build and the required hosted release checks before updating
  the live site. Record observed results in PROGRESS; no workflow/settings changes.
