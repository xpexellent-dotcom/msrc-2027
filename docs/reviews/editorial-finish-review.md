disposition: fix

Typed reviewer unavailable: an independent subagent applied the shipped degraded finish-reviewer contract. No approved comp or separate quality-bar card was supplied; ENG-023 is the explicitly pinned, code-led extension, so no random-seed, comp-round or comp-diff obligation is inferred.

## persistence

PASS. PRODUCT.md, DESIGN.md, `.impeccable/design.json`, the homepage surface brief, ENG-023 and the editorial revision/media briefs exist and describe the rendered purple/gold/ivory world. The recorded local-demo boundary and media provenance remain explicit.

Evidence check PASS: all 20 named captures were opened. The 11 main files are `desktop.png`, `mobile.png`, `desktop-page.png`, `mobile-page.png`, `arabic-mobile.png`, `user-1265.png`, `program-desktop.png`, `program-arabic.png`, `team-desktop.png`, `speakers-desktop.png` and `sponsors-mobile.png`; the nine section files are `{en-1440,en-390,ar-390}-{program,legacy,venue}.png`, all under `.impeccable/review/editorial/`. Their content and viewport dimensions match the calling packet; full-page files include the document top. No blank or malformed capture requires recapture. `captures.json` reports equal document/client widths and empty page-error arrays for the 11 main files. Grain was judged from actual viewport images, not the fixed-layer discontinuity in long screenshots.

Read-only receipt inspection: `.tools/editorial-final-check.log` records lint, route types/TypeScript, 2,385 tests in 59 files and an 81-page production build. The supplied detector JSON contains 65 advisory findings: 63 type-ramp and two color findings, with no primary finding. Neither check was rerun. `.tools/editorial-confirmation.log` was still incomplete when inspected; no final functional pass is claimed here. No source, browser, build or detector action was performed by this reviewer.

## fidelity

| Element or promise | State | Evidence |
| --- | --- | --- |
| TYPE | match | Large medium-weight Manrope remains the English display voice; independent Arabic metrics retain connected lettering, natural wrapping and zero decorative tracking. The requested oversized hierarchy is preserved at desktop, 1265px and phone sizes. |
| MATERIAL | match | The viewport captures visibly render real archive/venue photography, generated glass-like scientific artwork and subtle raster grain. Anonymous portraits are deliberately geometric placeholders, as the user requested, rather than simulated real identities. |
| GROUND | match | The named ivory, lilac, congress purple and ink fields remain recognizable in the actual viewport captures; no warmer/cooler replacement world is introduced. This is visual comparison to the named world, not a measured comp-color match. |
| THESIS / first viewport | match | Expansive conference media, the reading-edge headline, corner countdown and reduced-weight capsule retain the intended memory of film and large typography. |
| Navigation / action | match | Desktop and user-1265 show the exact seven links, direct Program, Participate disclosure, locale switch and Reserve your seat. Phone chrome reflows to the compact menu. The history/venue desktop captures show the reduced logo/action state. Recovery and transition behavior require the separate functional receipt. |
| Native hero cover | adaptation | Static captures retain a readable normal-flow baseline. The documented reduced-motion adaptation is required by PRODUCT.md and ENG-023; held-film movement cannot be proven from stills, and its functional confirmation remains separate. |
| STORY | match | The homepage sequence is arrival, five participation paths, benefits, speakers, historical attendance/gallery, actual venue, FAQ and Jeddah; About and homepage sponsor sections are absent. |
| Benefits and scientific artwork | match | The wide two-column composition and phone stacking preserve generous separation, six ruled benefits and prominent artwork. CME and award language remains pending, and certificate copy states the completion requirements. |
| Anonymous speaker previews | match | Home and Speakers show anonymous purple/ink portraits and pending names/sessions without repeated demo labels or invented appointments. |
| Anonymous team cards | contradicted | `team-desktop.png` shows eight portrait panels but only the second row's four pending-name captions. The next row covers the first row's captions. The sampled styles give `.portrait-placeholder` `block-size: 100%` inside a card that also contains copy. |
| Historical facts | match | EN/AR history captures retain 4,007+ total attendance across four editions, distinct 2,257 visitors and 83 research projects in 2026. No unique-person claim or invented future statistic appears. |
| Venue and city material | match | The venue capture visibly shows the actual King Faisal Conference Center sign. The closing shows the supplied Jeddah poster and retained creator mark; trim/speed/playback are supported only by the separate media/functional receipts. |
| Sponsors destination | adaptation | The dedicated Arabic page retains neutral Brand slots and a prominent sponsor inquiry action, consistent with the user-authorized local placeholders; no real sponsor identity is substituted. |
| Shared interior breadcrumb | contradicted | `team-desktop.png` and `sponsors-mobile.png` show the home link and separator but no readable current-page label against ivory. Program/Speakers demonstrate the intended breadcrumb on their dark surface. |
| FORM / floor | match | The explicit reference-led extension supplies the form authority. No decorative eyebrow, section-number scaffold, gradient text, glyph-icon replacement or hard offset shadow is visible. Pinned capsule/glass and historical metrics are intentional brief choices. |

## ceiling

The pinned devices are present: full media framing, large lettering, native rail affordances, restrained material grain, one prominent scientific artwork, fine rules and a capsule that separates during reading. No additional ornament or new conceptual direction is required. Still captures cannot score animation timing, pause behavior, focus recovery or preference handling; those remain bounded by the independent functional confirmation.

## material_fixes

1. **Team card geometry — fidelity/floor:** keep each portrait and pending-name caption within its own grid item; bound the portrait by its intended aspect ratio instead of filling the entire article height. In the replacement `team-desktop.png`, every first-row caption must be visible before the second row begins, with no overlap; preserve the same behavior in EN/AR responsive layouts.
2. **Light-surface breadcrumb — floor/accessibility:** give the current-page label and separator readable light-surface colors in the Team/Sponsors intro. Replacement `team-desktop.png` and `sponsors-mobile.png` must visibly show the full breadcrumb, while retaining the existing dark-surface Program/Speakers treatment.

## keep

Keep the thin seven-link capsule, expansive film/title/countdown, spacious benefits artwork, sourced historical figures, anonymous pending identities, real venue image, supplied Jeddah material and equivalent EN/AR composition intact while fixing the two interior defects.

## verdict

Scored correction pass, 11 October 2026. Reopened the same `team-desktop.png` and `sponsors-mobile.png` paths; both replacement captures are valid. `verdict-captures.json` reports matching document/client widths and empty page-error arrays for both. The initial review above remains preserved.

1. **Team card geometry: resolved.** `team-desktop.png` now shows each of the eight portraits followed by its own visible pending-name caption. All four first-row captions end before the second row begins, with clear separation and no overlap.
2. **Light-surface breadcrumb: resolved.** The Team capture now visibly reads `Home / Our Team`; the Arabic Sponsors capture visibly shows the home link, separator and current sponsorship label in purple against ivory.

No regression introduced by these two corrections is visible in the supplied replacement captures. No new surface hunt, source edit, browser action, build, test or detector run was performed.

## remaining

Clear for the two scored visual fixes. This ship verdict covers the scored fixes, not the whole surface. It does not establish a completed functional confirmation, user approval or production readiness.

disposition: ship
