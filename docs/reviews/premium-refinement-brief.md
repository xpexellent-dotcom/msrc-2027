# Premium surface refinement — ENG-024

11 October 2026. Audit and prioritized plan recorded before this revision's UI edits.
Build on the accepted ENG-023 local demo; preserve MSRC purple, ivory, lilac and
gold, existing content authority, native scrolling and EN/AR parity.

| Before | After | Why / priority |
| --- | --- | --- |
| Six benefits are plain ruled rows | Pale, softly rectangular cards with bold headings and controlled hover light | Requested tactile reading surface; high |
| Speakers sit on plain ivory | Low-contrast animated geometric light contours behind opaque readable cards | Requested background depth without losing contrast; high |
| Historical counts sit on one open rule | Three spacious framed statistic panels | Stronger grouping without changing sourced values; high |
| Header center fades/contracts | Quick outward slide/scale and blur; gradient grain surface and thin highlight | Match the requester's Vitarc motion reference more closely; high |
| Gold actions are flat | Refined champagne tint, highlight and short press feedback | Consistent premium call to action; high |
| Program and Venue have flat title fields | Sourced photographic header layers, purple tint, limited pointer zoom | Carry event imagery into interiors; high |
| Venue date card and schematic compete with content | Light day-link panel, factual information boxes, accurate map and clearer directions | Improve arrival planning and remove overlap; high |
| Earlier pathway image choices and city label | Three specifically selected photos; left crop for IMG_9846; video crop removes top-right 4K badge | Explicit latest asset selection; high |

Mode: Persuade on home; Read on arrival/program information. No change to closed
workflow behavior, unconfirmed claims, speaker identities or source attribution.
Interactive effects use interruptible transitions, fine-pointer hover gating,
keyboard focus equivalents for actions and static reduced-motion fallbacks.
The requester subsequently said not to add pause controls. Speaker ambience runs
once for at most 4.5 seconds of visible time, rests offscreen/in a hidden document,
and settles permanently without adding a control.
Read-only benefit and statistic panels do not become fake buttons.

Implementation lanes: root owns homepage/cards/background/type; navigation lane
owns header/actions; interior lane owns Program/Venue; media lane sources exact
photos and edits the city crop. No new dependencies or hosted changes planned.

Verification: one batched desktop/mobile EN/AR visual pass, one correction batch
and at most one visual confirmation. Run checks for changed interactions, routing,
accessibility, reduced motion and reflow. Preserve failed receipts and distinguish
targeted confirmation from a full-suite result.
