# Phone experience and venue refinement — ENG-029

The organizer requests a smaller translucent Program date panel, replacement of
the duplicate venue date box with the supplied conference-room photograph,
gradient hero lettering, and a full phone usability pass. Preserve MSRC's
purple/champagne identity and all approved copy, EN/AR, native scrolling,
reduced motion and closed operational boundaries. DSN-01/02, ACC-01 and
LOC-01/02/03 apply. This continues the approved public design release.

## Audit and prioritized plan

| Priority | Before | After | Reason |
| --- | --- | --- | --- |
| 1 | Phone language access exists only inside the menu | Direct 48px globe control beside Menu | Make language discoverable without another disclosure |
| 1 | Skip link uses only an offscreen transform and ordinary focus | Robust clipped hiding, keyboard-visible reveal | Avoid a floating touch-focus artifact while keeping the keyboard bypass |
| 1 | Phone hero remains sticky with 35svh hold space and scroll-driven text fading | Natural phone flow, shallow content-sheet overlap, stable svh sizing | Remove the prolonged handoff and keep touch scrolling native |
| 2 | Five-track index wraps above already visible phone cards | Desktop index only; phone cards carry the pathways | Remove redundant navigation without removing a participation route |
| 2 | Benefit icons stack above copy below 420px | Icon beside wrapped heading; body uses the card width | Improve reading and alignment at 320–430px and enlarged text |
| 2 | Large opaque date panels dominate two heroes | Compact white/lilac glass at roughly 80–85% opacity on Program | Keep confirmed dates clear without dominating the page |
| 2 | Venue repeats the date card | Room photo with a thin tint; Program retains dates and calendar | Give the venue a useful visual identity |
| 3 | Main hero title is plain ivory | Static ivory/lilac/champagne gradient with stronger lettering | Implement the requested finish while preserving readable contrast |

Live incumbent phone evidence at 390×844: hero height about 994px; sticky hold
about 295px; direct language control has zero rendered width. Desktop screenshot
supplied by the organizer shows the large venue date panel. Asset inspection and
provenance will distinguish a real room photo from any fallback; never label an
exterior as the interior. No map embed or background third-party request is added.

## Verification

Batch EN/AR desktop and 320/390px phone views once after implementation; correct
any defects together and confirm in at most one further visual round. Check
keyboard bypass, direct language/query/hash continuity, menu/Escape, upward and
downward scrolling, typography and card alignment, 44px targets, 200% text,
reduced motion, no horizontal overflow, Program day links/calendar and page axe.
Run proportionate local and required hosted release checks. Real iOS/Android
browser-chrome, momentum and safe-area feel remain hardware UAT if no physical
device is connected; emulation must not be reported as physical-phone evidence.
