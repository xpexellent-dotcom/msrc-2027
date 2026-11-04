# Immersive mobile homepage

Owner direction: 3 November 2026; implementation: 4 November 2026, home1 worktree
`claude/mobile-immersive-home`, baseline `13469ad`. Decisions: ORG-071 and ENG-093
in [DECISIONS](../DECISIONS.md). Requirements: SCP-01, DSN-01/02, ACC-01,
LOC-01/03, MED-01/04 and CFG-12. Command results and visual evidence are recorded
in [the receipt](../progress/2026-11-04-mobile-immersive-home.md).

## Scope and authority

The owner's final v2 build spec is authoritative for this homepage presentation.
Phones through 800px use full-bleed photographs and MSRC colour fields, giant
chapter/category headings and gradient arrow orbs. The rhythm is hero film →
ink pathways deck → lilac program → purple speakers curtain → community photo →
ink venue tile → ivory FAQ → Jeddah closing. Existing approved EN/AR strings and
media are reused. No new copy key, factual claim, dependency or operational
activation is part of this slice. Hero film/poster and ENG-039's Venue journey
stepper stay unchanged. All work remains uncommitted; there is no branch, push,
PR or hosted preview publication in this task.

The user explicitly requires the dated receipt instead of a PROGRESS.md edit.
The full spec's generic PR/preview checklist is superseded by the same request's
binding “No commits, pushes or branches; Claude commits it” instruction.

## Rendered copy removals

Content keys remain in `src/content/*`; only their homepage rendering changes.

| Removal | Homepage change | Preserved use or qualifier |
|---|---|---|
| R1 | Remove hero lead paragraph. | Lead remains metadata/Event JSON-LD description. |
| R2 | Remove the entire date/venue band, `#essentials` and `#event-details`. | Dates remain in hero location, countdown and closing; venue name remains in venue h3. |
| R3 | Remove pathways introduction body. | Existing pathways chapter title remains. |
| R4 | Remove Explore participation link from pathways intro. | Existing participation destinations remain in hero, program and closing. |
| R5 | Remove all five pathway descriptions. | Sentence title becomes kicker; category becomes giant h3. |
| R6 | Remove old category wrapper/span. | Full category stays the accessible heading name; status moves into meta. |
| R7 | Remove program introduction paragraph. | Keep its wrapper and How to take part link. |
| R8 | Remove practice/network/research benefit bodies. | Keep CME, award and certificate bodies, including pending qualifiers. |
| R9 | Remove unpublished speakers body and four placeholder cards/rail. | Keep a single existing speakersPending pill and Meet the speakers link; published grid unchanged. |
| R10 | Remove legacy film-note paragraph. | History scopes, gallery and CinematicFilmLink remain. |
| R11 | Hide only the homepage gallery's Scroll to explore hint. | Gallery buttons/captions/year badges remain; other HorizontalRail hints default to visible. |
| R12 | Remove venue body paragraph. | Actual venue h3, photo alt and venue link remain. |
| R13 | Move venue figure caption above h3 as a kicker. | Same existing location string; no figure caption duplication. |
| R14 | Remove FAQ dates/venue utility link. | Contact link and all FAQ answers remain verbatim. |

The withdrawn draft R15 is not implemented: Step inside / «اكتشف الأجواء» stays
visible at every width. Its destination changes from `#essentials` to
`#participate`, explicitly superseding ORG-007's old target. The mobile cue uses
a 48px ring. The CME “7”, Illustrative/«مثال بصري», accessible label, number to
be confirmed and award details-to-be-announced language remain. The four closed
pathways retain Not open yet; registration has no such pill. History retains
2023–2026 / MSRC 2026 scopes and all six physical-right edition badges.

ORG-071 replaces the homepage placeholder-roster approval at historical
DECISIONS.md line 612 and the anonymous designed portraits sentence at line 720.
The supplied spec labels that latter sentence ENG-024; current source places it
under ENG-023, with ENG-024 carrying the presentation forward. The appended
decision explicitly reconciles both without rewriting historical decisions.

## Pathway deck and link behaviour

Five `article.pathway-card` nodes remain direct children of `.pathway-list`,
with their existing ids, data-pathway and tabIndex. Each wraps a tile containing
the natural photo and bottom-anchored kicker → giant category → status/orb.
3MT visibly reads “3MT” while the sr-only full category supplies its accessible
h3 name. Each 56px orb has the existing pathway-link label plus category.
Its stretched pseudo-element makes the entire tile one link, on every width.
The body, meta and action form no positioned/transformed containing block;
only kicker/name translate. Arrow-only press feedback preserves the tap area.

Through 800px, at least 560px tall and no reduced-motion preference, cards pin
at the native viewport top. The next card slides over its predecessor; the list
is exactly five card heights with no added runway or snap. Cards use 100lvh
(100vh fallback), while tile bottom padding compensates for 100lvh − 100svh.
Text and controls stay bottom-anchored below the floating header capsule.
The fifth card releases with the list into Program. No scroll, wheel, touch or
keyboard scrolling listener is added. PathwayTrackNav remains unchanged and
hidden on mobile; its desktop grid/sticky-intro behaviour remains.

Supported browsers progressively enhance the native stack with one named view
timeline on the non-sticky list. Each covered tile shrinks toward .9 and a
separate overlay dims it; card opacity itself stays 1 and its transform none.
Photos settle from 1.12. Kicker/name rise and fade close to arrival; meta fades
only. Ordered animation longhands preserve timeline/ranges through minification.
No will-change, animated filter or deck backdrop-filter is introduced. Browsers
without scroll timeline support still pin/stack with all text visible.

Keyboard `:has(:focus-visible)` raises a card to z-index 2 and freezes its tile,
dim and text animation so focus cannot be covered; pointer taps do not raise it.
The gate uses a stable hidden 100svh probe, measured header/body heights,
ResizeObserver, resize and media-query change events. Reduced motion, landscape
height below 560px or content that cannot fit selects static growing tiles.
Cleanup removes the probe, observers/listeners and data attribute. Print is static.

The owner accepts short text dwell: fully arrived text is readable for roughly
one text-block of scroll (about 250–300px at 390×844), with an additional approach
reveal. Text is not moved upward, a hold is not added, and the chosen slide-over
deck is not replaced with a peel interaction. Before hydration/without JavaScript,
the CSS stack can clip unusually tall 200%-text content until the fit gate runs;
the CSS short-height and reduced-motion guards still apply.

## Sections and desktop consistency

Mobile hero content is bottom-anchored; existing stacked date/city and countdown
remain. The CTA is full width through 540px. The content sheet is not clipped;
the first pathways section supplies its rounded top corners. Giant title caps
retain narrow/enlarged-text reflow limits. Mobile Program uses full-bleed artwork
and unboxed benefit rows; only three qualified bodies remain. Speakers is a
bottom-start purple curtain at every width, with one pending pill when unpublished.
Published SpeakerCard surfaces retain their existing content treatment.

The mobile community photo is natural and unblurred, with a dark lower reading
band, no decorative community flow and no ivory fade before Venue. History glass
cells, numeric scopes, gallery imagery/buttons and film action remain. Venue has
a normal-flow chapter title above a full-bleed capped photo, then overlay kicker,
venue h3 and one link. FAQ uses gradient plus circles, gold when open, and rounded
sheet rhythm. Closing is a 100svh city tile with date pill and one gold CTA.

Desktop keeps existing section/card grids, title sizes and pathway tracking.
It shares copy removals, new pathway language, purple speakers curtain, FAQ orbs
and section orb links. Venue copy uses purple desktop text and the moved kicker;
its figure occupies the lower grid row. Any fallback needed for Reveal's direct-
child staggering is recorded in the visual observations below.

Arabic uses full RTL, mirrored orb placement/hairlines/glows and directional
arrows, with generous line heights. Image focal points, 3MT crop and physical-right
edition badges do not mirror. Ivory focus rings apply on dark sections; purple
on light surfaces; pathway orb focus is gold. One h1 and ordered named section
h2s remain, with `#film` and `#faq` intact. Photo text requires sampled 4.5:1
contrast against ivory in the regression gate.

## Visual observations and verification

The receipt records final command results. The local screenshot observations
below are visual evidence only; pixel contrast, overflow across the full width
matrix, keyboard, axe, minified animation declarations and regression results
are reported separately in that receipt.

The dedicated immersive and focused homepage checks pass. The broader Chromium
gate remains blocked by four reproducible EN/AR assertions in the unchanged
Venue stepper tests, documented in the receipt; ENG-039 remains untouched.

- Venue source remains `king-faisal-venue.jpg` (1000×667), capped at
  `min(66svh, 34rem)` on mobile. EN/AR 390×844 screenshot review found mild
  source softness acceptable at the capped height; the photograph is kept.
  No alternate venue source is used.
- Closing poster remains the existing 1600×900 source. Final natural-image versus
  blur(1px) choice: `filter: none`. The existing source is soft, but its natural
  treatment remains coherent with the other photo tiles; no extra blur is added.
- Desktop venue `display: contents` works in the Chromium 1440×900 screenshot:
  heading and purple copy sit side by side, with the rounded wide figure on the
  following row. Reveal settles correctly; no fallback or desktop layout
  departure is needed.
- Screenshot destination: `.qa/home-immersive/`, including EN/AR 390×844 sections,
  deck mid-transition, EN 1440×900 and mobile reduced motion.
- Final local matrix: 118 viewport screenshots, plus six contact sheets covering
  EN/AR mobile, desktop and reduced motion. All six sheets were visually reviewed;
  full-size mobile section/deck and desktop venue views were also inspected.
  The capture metrics show no horizontal overflow at these two viewport sizes.
  Every reduced-motion capture uses static cards with scale none. Phone history
  heights are 269.33px EN and 224.33px AR, both below the unchanged 350px bound.
  The venue band, giant headings, card orbs and section transitions are legible
  and coherent; no additional visual defect was found in the final matrix.
- The bottom-anchored opening remains taller than the viewport because its
  countdown and existing controls are retained. Capture both the initial hero
  and its native bottom-scroll view to show the countdown and visible cue.
  At 390×844 the final EN h1 bottom is 431.63px and AR is 454.02px, below the
  422px midpoint; the initial heading clears the fixed capsule. The pinned deck
  cards keep their text and orbs below that capsule. Ordinary content can pass
  behind the fixed capsule while scrolling out of the viewport.
- Explicitly NOT TESTED: WebKit/iOS Safari sticky and lvh toolbar behaviour;
  Safari 26 scroll timelines; real Android Chrome toolbar collapse; Firefox's
  stack without effects; pre-hydration and no-JavaScript behaviour; physical
  device and assistive-technology review.

No hosted deployment or Vercel preview is claimed. These local checks do not
open registration, payments, accounts, abstract submission or other workflows.
