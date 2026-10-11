disposition: fix

Typed reviewer unavailable: an independent subagent applies the shipped degraded finish-reviewer contract. No approved comp, separate quality-bar card or detector packet was supplied; ENG-024 is a pinned, code-led refinement, so no comp or random-seed obligation is inferred.

## persistence

PASS. PRODUCT.md, DESIGN.md and `docs/reviews/premium-refinement-brief.md` retain the accepted MSRC purple, ivory, lilac and gold identity, the local-demo boundary and the latest requested refinements. The brief explicitly preserves native scrolling, bilingual parity, source authority and one-pass speaker ambience without adding pause controls.

Evidence check PASS: all 30 captures under `.impeccable/review/premium/` were opened: `{en,ar}-{1440,390}-{hero,program,speakers,legacy,benefits,program-page,dates-venue-page}.png` and `{en,ar}-1265-header.png`. Full-page captures include the document top; no malformed or blank capture requires recapture. The blank speaker panels are a rendered application defect. `captures.json` reports equal document/client widths and empty captured page-error arrays. Full-page images were supplemented by viewport-sized section captures and original-resolution inspection where needed.

This is one initial read-only visual review on 11 October 2026. Relevant component and stylesheet source was inspected to identify the two defects below. No app source was changed and no browser session, build, test, detector or image generation was run by this reviewer. Functional checks, motion playback and production readiness are outside this screenshot verdict.

## fidelity

| Element or promise | State | Evidence |
| --- | --- | --- |
| TYPE | match | English display scale and purple/gold keyword emphasis remain recognizable. Arabic stays connected and wraps naturally. Benefits have stronger headings without crowding the body text; Program and Venue dates are prominent at both widths. |
| MATERIAL | match | Real conference photography, the actual venue exterior, scientific artwork, restrained grain and champagne actions preserve the established material language. The requested new photo selections and left-priority Build an idea framing remain in the homepage. |
| GROUND | match | Purple photographic headers, pale gray/ivory cards and lilac section fields retain the named MSRC world. Speaker ambience is subtle enough to support readable foreground content; the speaker-card defect is isolated below. |
| Header and primary action | match | The seven-link thin capsule fits at 1265px in EN/AR without collision. The gradient surface, fine white edge and warmer action treatment are visible. Swipe, blur, recovery and press timing cannot be assessed from stills. |
| Benefits cards | match | EN/AR desktop and phone captures show six spacious, softly rectangular cards with readable purple headings and body copy. The artwork and card column remain balanced; no false button semantics or added control appears. |
| Speaker card foreground | contradicted | Every speaker section capture shows blank ivory panels instead of the anonymous portrait placeholders, with pale captions losing contrast. The new opaque `.speaker-preview-content` background paints the entire absolutely inset content layer; the companion card background is also an unintended ivory override. |
| Speaker atmosphere | match | Restrained contours add background depth without competing with the section heading. Source confirms a maximum 4.5-second one-pass effect that rests offscreen and settles; no extra pause button was introduced. Playback was not independently observed. |
| Growing community | match | Three framed statistic panels distinguish the 4,007+ attendance total from the 2,257 visitors and 83 research projects in 2026. The bilingual labels remain clear and do not imply unique people. |
| Program photograph and dates | match | The photographic title field has a purple blur treatment with clear foreground text. The light day panel makes both dates readable and preserves the two direct day links. No text overlap is visible in either locale or width. |
| Venue hero and date panel | match | The actual center photograph anchors the header; the light date panel has clear day links and readable contrast. Information boxes, icons and the directions action have appropriate visual weight. |
| Venue section rhythm | contradicted | EN/AR full-page captures show the location, travel and schedule sections touching adjoining backgrounds and section boundaries. Their `.editorial-section` class receives no block padding outside the scoped homepage rule. |
| Geographic map | adaptation | The detailed self-hosted map includes streets, venue context, north and a scale, with attribution and a separate current-directions action. Its geographical orientation stays fixed across EN/AR. The captures establish readable presentation, not an independent geographic survey or current traffic guidance. |
| Responsive composition | match | The reviewed 390px EN/AR surfaces stack without horizontal document overflow, preserve comfortable readable text, and keep date panels and map framing within the viewport. The speaker and Venue spacing defects remain the two exceptions to fix. |

## ceiling

The requested native devices are present: photographic headers, tactile pale cards, restrained glow surfaces, framed historical numbers, anonymous portraits, fine-grain chrome and a subtle speaker field. No further ornament, new background concept, map redesign or typography change is required. Still evidence cannot score hover interpolation, nav interruption, keyboard focus, reduced motion or routing; those belong to the separate functional receipt.

## material_fixes

| Before | After | Why |
| --- | --- | --- |
| **1. Speaker foreground — fidelity/accessibility:** new ivory card/content overrides conceal the portrait and reduce caption contrast. | Remove both new ivory overrides from `premium-home.css`, restoring the existing opaque dark card and transparent content layer. Replacement EN/AR speaker captures must show the complete anonymous portrait and legible caption at 1440px and 390px. | The user requested contrast and placeholder portraits; the background atmosphere must sit behind readable cards. Preserve the existing portrait artwork and one-pass ambience. |
| **2. Venue section spacing — fidelity/rhythm:** location, travel and schedule content touches section boundaries. | Give `.dates-location`, `.dates-travel` and `.dates-schedule` responsive block padding around `clamp(4rem, 7vw, 7rem)`. Replacement Venue captures must show consistent separation before headings and after their content in EN/AR desktop and phone layouts. | Restore the intended page rhythm and eliminate the visibly compressed transitions without changing facts, map geometry, card styling or header composition. |

## keep

Keep the MSRC palette, thin capsule, champagne actions, spacious benefits, restrained speaker contours, sourced figures and photography, clear day panels, detailed geographic map and equivalent EN/AR composition intact; correct only the two material defects above.

## verdict

Scored correction pass, 11 October 2026. The initial review above is preserved. Opened all 20 supplied `*-final.png` captures: speaker cards, Venue full pages and section spacing, plus the explicitly requested Build an idea and Jeddah crop evidence at EN/AR 1440px and 390px. `verdict-captures.json` reports matching client/document widths and empty page-error arrays for all four locale/width groups. No browser, build, test or detector was rerun.

1. **Speaker foreground: partial.** All four `speakers-cards-final.png` captures restore the anonymous portraits and light captions against opaque dark cards. Desktop EN/AR and Arabic phone captions are clear. In `en-390-speakers-cards-final.png`, the circular arrow overlaps the end of “Name and session to be announced.” Reserve logical end space for that caption or give the arrow its own row; this remaining collision prevents a fully resolved foreground verdict.
2. **Venue section spacing: resolved.** All four `venue-spacing-final.png` captures visibly separate the location heading and information boxes from the header and next chapter. The four `dates-venue-final.png` full-page captures also show consistent breathing room around travel and schedule content, with no boundary collision or horizontal overflow introduced by the spacing correction.

The additional requested crop evidence reveals one brief mismatch: `ar-1440-build-photo-final.png` prominently includes the right-side standing man while excluding the physical-left subject; the English equivalent correctly crops him out. Arabic phone framing is also shifted toward the original photo's right side. Keep this photograph physically left-anchored across locales while retaining RTL copy. The four city captures show the blurred Jeddah image without the top-right 4K label; playback and all-frame video behavior are not asserted from stills.

## remaining

Two narrow items remain: give the English phone speaker caption clear space from its arrow, and stop RTL from reversing the requested Build an idea photo framing. No further design changes are requested. The Venue spacing correction is visually clear. This scored verdict does not establish completed functional confirmation, user approval or production readiness.

disposition: fix

## Implementation resolution after the scored review

Root follow-through, 11 October 2026: caption text now reserves logical end space;
the oversized Build an idea image is physically anchored with left zero/right auto
in both locales. Responsive image sizes request adequate detail for its tall crop.
The final production build and targeted ESLint passed. Four browser checks passed
at EN/AR 1440px and 390px: caption glyph rectangles do not intersect the action,
the visible photo remains within the left 71% of its source, decoded bitmaps are
at least 960px wide, and no horizontal document overflow occurs. Evidence:
`.tools/premium-framing-confirmation.log` and its attached measured values.
These resolve the two identified defects through measured functional evidence;
they do not replace the independent screenshot verdict with an unperformed review.
