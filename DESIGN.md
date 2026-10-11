---
name: MSRC 2027 Public Website
description: A cinematic bilingual congress experience with selective keyword accents, a native-scroll pathway index, translucent community cards, artistic reading surfaces and outward navigation; local approval demo.
colors:
  purple: "#3b1e6d"
  purple-hover: "#4b2c80"
  gold: "#c9a24a"
  gold-hover: "#d6b566"
  ivory: "#f8f6f0"
  lilac: "#dccff0"
  ink: "#1f1930"
  white: "#ffffff"
  muted: "#645b70"
  line: "#d9d2df"
  line-strong: "#91839e"
  inverse-line: "#dccff033"
  surface-lilac: "#efeaf3"
  surface-warm: "#efeadf"
  info-surface: "#ebe3f4"
  disabled: "#655e70"
  disabled-surface: "#e8e3ec"
  error: "#a02935"
typography:
  display:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontSize: "clamp(4rem, 7.8vw, 8.75rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontSize: "clamp(3rem, 5.6vw, 5.8rem)"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  interior-display:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontSize: "clamp(3.4rem, 7.1vw, 6rem)"
    fontWeight: 500
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontSize: "clamp(2.1rem, 3.5vw, 3.8rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  benefit-title:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 2.05vw, 2.05rem)"
    fontWeight: 750
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  photo-hero-title:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  public-gold-label:
    fontFamily: "Manrope, DM Sans, Arial, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  lead:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.8vw, 1.4rem)"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
  arabic-display:
    fontFamily: "Noto Sans Arabic, MSRC Arabic Fallback, Tahoma, Arial, sans-serif"
    fontSize: "clamp(3.5rem, 6.8vw, 7.4rem)"
    fontWeight: 500
    lineHeight: 1.42
    letterSpacing: "0"
  arabic-headline:
    fontFamily: "Noto Sans Arabic, MSRC Arabic Fallback, Tahoma, Arial, sans-serif"
    fontSize: "clamp(2.8rem, 5vw, 5.3rem)"
    fontWeight: 500
    lineHeight: 1.48
    letterSpacing: "0"
rounded:
  small: "0.2rem"
  nav-item: "8px"
  field: "12px"
  dropdown: "14px"
  panel: "16px"
  sheet: "32px"
  sheet-mobile: "24px"
  pill: "999px"
  circle: "50%"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.5rem"
  6: "2rem"
  7: "3rem"
  8: "4rem"
  9: "6rem"
  10: "8rem"
  section: "clamp(4.5rem, 8vw, 8rem)"
  cinematic-section: "clamp(5rem, 10vw, 10rem)"
  gutter: "clamp(1.25rem, 3.2vw, 4rem)"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.purple-hover}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  button-gold-hover:
    backgroundColor: "{colors.gold-hover}"
  public-gold-action:
    textColor: "#281f32"
    typography: "{typography.public-gold-label}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  benefit-card:
    textColor: "{colors.purple}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.4rem, 2.5vw, 2.5rem)"
  history-panel:
    textColor: "{colors.ivory}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.5rem, 2.5vw, 2.5rem)"
  conference-day-panel:
    textColor: "{colors.purple}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.4rem, 3vw, 2.5rem)"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.purple}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.purple}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1.5rem"
  button-home:
    rounded: "{rounded.pill}"
    padding: "1rem 1.5rem"
  field-input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "0.75rem 0.85rem"
  field-public-contact:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0.75rem 0.85rem"
  status-neutral:
    backgroundColor: "{colors.disabled-surface}"
    textColor: "{colors.disabled}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.7rem"
  photographic-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.panel}"
  anonymous-portrait:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.lilac}"
    rounded: "{rounded.panel}"
  content-sheet:
    backgroundColor: "{colors.ivory}"
    rounded: "{rounded.sheet}"
  research-artwork:
    backgroundColor: "{colors.ivory}"
    rounded: "{rounded.panel}"
  glass-navigation:
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "0.5rem"
  navigation-dropdown:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.purple}"
    rounded: "{rounded.dropdown}"
    padding: "0.6rem"
  rail-control:
    backgroundColor: "transparent"
    textColor: "{colors.purple}"
    rounded: "{rounded.circle}"
    width: "52px"
    height: "52px"
  faq-summary:
    textColor: "{colors.purple}"
    padding: "1.8rem 0.5rem"
---

# Design System: MSRC 2027 Public Website

## Overview

**Creative North Star: "The Cinematic Congress"**

**LOCAL APPROVAL DEMO — pending user approval. This is not final brand approval or a production release.** ENG-026 refines the accepted fluid experience. A five-track reading index follows native scrolling beside the photographic pathways. The latest request supersedes ENG-025's all-over heading gradients: ordinary heading words are solid ink on light surfaces and ivory on dark surfaces; selected keywords carry the gradient and lilac highlight. Community figures use translucent plum cards, meaningful icons and a larger 2,257 visitor figure. The expansive imagery, rising paper surface, coherent glass navigation and photograph-led participation pages remain. Restricted staff and authentication interfaces retain their established design.

Ivory, purple and ink carry the story. Manrope combines generous headline scale with carefully placed heavier words and controlled gradient color; Inter carries the reading text. A champagne material gives invitations a warm, responsive highlight. Fine raster grain, scientific contour linework and brief settling entrances provide atmosphere without moving reading text. Real community photography blends into adjoining sections. Arabic keeps independent Noto Sans Arabic metrics and mirrored RTL composition.

Native scrolling, keyboard access, preference-aware motion and truthful pending names remain integral. This document records implemented choices; browser evidence, human approval and production release status belong in the task receipts.

**Key Characteristics:**

- Real conference and venue imagery with provenance; anonymous forthcoming portraits.
- Solid display typography with selective gradient keywords, lilac highlights and independent Arabic metrics.
- A scroll-aware five-track reading index and edition-scoped glass community cards.
- Smooth rectangular information panels, champagne pill actions and fine luminous navigation edges.
- A translucent glass capsule whose logo and invitation travel outward while dropdown travel remains reliable.
- Native layered scrolling, brief artistic entrances, photographic fades and stable accessible counter values.
- Concise participation cards, practical next actions, geographic arrival context and closed workflow destinations.

Source evidence: `src/styles/tokens.css`, `homepage.css`, `editorial-motion.css`, `premium-home.css`, `premium-interiors.css`, `premium-actions.css`, `axiom-navigation.css`, `axiom-interiors.css`, `fluid-surfaces.css`, `fluid-journeys.css`, `pathway-track-nav.css`, `community-numbers.css` and the corresponding homepage, header, pathway-track-nav, ambient-artwork, benefit-artwork, conference-experiences, history-numbers, conference-day-links, venue-geographic-map and public-page components. Authority: `PRODUCT.md`, `docs/PROJECT_BRIEF.md`, `docs/DECISIONS.md` and the current task's review brief. Earlier ENG-022/023/024/025 records remain historical evidence. Requirements: DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04.

## Colors

Congress purple, conference gold, ivory, ink and lilac remain the base identity. The frontmatter preserves the existing palette primitives. Gradients, champagne stops, pale header highlights, photographic scrims and statistic-panel surfaces are component materials, not newly approved brand colors or global token replacements. Sidecar tonal ramps remain preview swatches only.

- **Congress Purple:** headings, emphasized words, primary controls and dark photo overlays.
- **Conference Gold:** retained base token. Public invitations use a champagne material; the shared base definition remains unchanged outside that override.
- **Lilac:** supporting copy on dark fields and selected keywords on photo headers.
- **Ivory and White:** page ground, benefit surfaces, menus and light date panels.
- **Ink and Muted:** ordinary reading text; muted text stays on light surfaces.
- **Lines:** functional boundaries and rules, with inverse lines on dark fields.
- **Disabled and Error:** labeled semantic states, never conference outcomes.

Public actions use `linear-gradient(120deg, #ead9ac 0%, #d6b76e 55%, #e5cc94 100%)` and `#281f32` text. The header's small year/current-link accent is `#f4e7c8`; the larger 2026 visitor count uses `#f0dfb6`, while the aggregate is ivory. These values belong to those components.

The keyword material on light surfaces is `linear-gradient(115deg, #28163f 8%, #57317e 53%, #7b4e99 92%)`; selected words on dark fields use `linear-gradient(115deg, #fff 12%, #e9daf8 58%, #eddaaf 98%)`. Selected homepage words receive a shallow lilac highlight at (25%) opacity, reduced to (20%) over history. ENG-026 restricts heading gradients to keywords, never the entire title. Unaccented heading words are ink on light fields and ivory on dark fields. Forced colors and print restore solid text.

**The Readable Overlay Rule.** Keep dark scrims under photographic copy, opaque caption surfaces over animation, and adequate contrast throughout a material's lightest state.

## Typography

**Display:** Manrope, with DM Sans and Arial fallbacks. **Body:** Inter with Arial. **Arabic:** Noto Sans Arabic, measured MSRC Arabic Fallback, Tahoma and Arial. The MSRC wordmark and scientific English content remain LTR.

- **Display:** ENG-029 gives the film opener Manrope at weight 600 with a static ivory/lilac/champagne gradient. Arabic remains Noto at weight 700 and zero tracking. The large reading-edge title stays solid-text fallback in forced colors and print; this explicit hero exception does not extend gradient color to all chapter words.
- **Homepage chapters:** solid ink at weight (550), with selected weight-(750) keywords carrying the purple gradient and shallow lilac highlights. History uses ivory ordinary words with inverse-gradient keywords. This latest requested treatment supersedes ENG-025's all-over gradient lettering.
- **Photographic interior headers:** bold ivory titles, with the final phrase accented only when the heading has multiple phrases. One-phrase titles remain solid. The participation hero uses weight (750) and line height (1.08); shared people/contact/venue titles use weight (700). Light people-page headings use ink. Arabic keeps zero tracking and larger line boxes.
- **Benefits:** weight (750), `clamp(1.5rem, 2.05vw, 2.05rem)`, line height (1.3), and open prose beneath.
- **Dates:** `clamp(1.7rem, 2.5vw, 2.35rem)`, weight (650), line height (1.3); day labels remain readable and subordinate.
- **Public invitations:** the heading family, weight (700), tracking (−0.01em), with clear functional names.
- **Body:** public prose generally (1.0625rem–1.4rem), line height (1.65–1.85), with content-led measures. Navigation remains (1rem).

**The Bilingual Metrics Rule.** Arabic uses zero tracking, independent line boxes and equivalent content. Benefit titles use line height (1.6); photographic headings and dates use (1.5). Mirror layout and directional icons, never geography or the Latin wordmark.

Phone opener sizes remain English `clamp(2.8rem, 11.2vw, 4rem)` and Arabic `clamp(2.4rem, 9.5vw, 3.6rem)` below (540px). Intermediate and short-screen adjustments remain. Let content grow and wrap rather than clipping it to force a fixed first viewport.

## Layout

Public content caps at (1600px), with fluid reading-edge gutters; narrow prose caps at (860px). Homepage chapters retain generous cinematic spacing. Five photographic pathways and the benefits artwork hold adjacent context on wide screens and return to normal flow at (800px).

The hero has a (100svh) minimum, not a fixed content height. Desktop native sticky staging provides (65svh) of paper overlap. At 800px and below, ENG-029 uses normal document flow with no added hold travel or scroll-faded hero text; the following rounded sheet overlaps by 1rem. A taller desktop opener first exposes its bottom controls, then holds that edge. Missing JavaScript or ResizeObserver leaves normal flow; reduced motion removes hold and overlap.

Navigation is a (64px) minimum-height capsule, (1200px) maximum width, with (20px) outer inset. Corner travel is `max(12px, (100vw - 1200px) / 2 - 12px)`: a wide display sees actual outward movement rather than a fixed nudge. Only transforms animate; shell layout width stays fixed. The rem-based menu switch is below (75rem), including text enlargement; fine-pointer compact behavior begins at (1200px). Below (35rem), Reserve your seat remains in the menu rather than crowding the top line. No second chapter navigation.

Benefits are spaced rectangular panels alongside the artwork, with a 4.5rem desktop pictogram column. Phones use a 3–3.25rem icon beside the centered, wrapped heading; the description spans both columns. The desktop five-track index is hidden at 800px and below, where five photographic cards provide direct paths. History retains three translucent panels with the middle 2,257 visitor figure emphasized and a 1/1.18/1 desktop ratio. The community image, native rails and four/two/one-column team grids retain their responsive behavior; phones from 360px keep two team columns and a two-column footer directory, with one column only below 360px.

Participation requirements and resource groups use two columns, becoming one below (650px). Photographic hero content becomes one column at (1000px). Information is consolidated into one card set; useful next actions follow without repeating the process. Contact pairs its heading with email context, then a separate introduction/form grid; both stack at (800px). The sponsor invitation is a medium action near the title, not a second oversized section.

Program and Venue headers pair title and light date panel, becoming one column at (1000px). Venue facts change from two columns to one at (650px); travel cards become one column at (1000px). Maps change from landscape (1200:650) to portrait below (650px). Geography stays north-up in both locales.

**The Native Movement Rule.** Keep native scrolling and visible rail controls. Keyboard and reduced-motion navigation never wait for animated travel. Motion must not intercept the wheel or hide content.

## Elevation & Depth

Depth is selective: luminous header glass, warm public invitations, faint inset light on benefits and a gentle response around date panels. The requested tactile panels supersede the earlier shadow-free action rule. Photographs remain grounded in the page; elevation does not belong on every image or text block.

The header combines translucent dark purple gradient stops at (.80–.86), (24px) backdrop blur, a one-pixel white edge and raster grain at (.08) opacity. Global grain remains (.075) opacity with multiply blending and no pointer events; forced colors and print remove decoration. Community photography uses (4px) blur and (1.14) scale under purple scrims; section-edge fades join it to the venue and join the FAQ to the closing city footage. Artwork and contour geometry imply no medical claim or invented venue view.

### Shadow Vocabulary

- **Glass masthead:** `inset 0 1px 0 rgb(255 255 255 / .2), 0 10px 30px rgb(20 10 36 / .14)`.
- **Navigation menu:** `0 14px 38px rgb(20 10 36 / .2)`.
- **Champagne action:** `inset 0 1px 0 rgb(255 255 255 / .52), 0 5px 16px rgb(48 29 61 / .12)`.
- **Champagne hover:** `inset 0 1px 0 rgb(255 255 255 / .75), 0 9px 24px rgb(191 152 67 / .28)`.
- **Date response:** `0 12px 45px rgb(220 207 240 / .35)`, revealed by hover or focus within.
- **Shared dialog/toast:** retained `0 16px 48px #1f193033` and `0 6px 24px #1f19301f`.

**The Selective Depth Rule.** Use each material in its established role, with distinct rest and interaction states. No global glow is implied.

## Shapes

Benefits, statistics, dates, venue facts, travel information, photos and portraits use smooth (16px) corners. Date-link hit areas use (12px). Masthead, compact logo and invitations remain pills; the paper sheet has larger upper corners; rail/media controls remain circles. Fine rules still organize FAQs and scientific sessions.

SVG icons share a consistent stroke and accessible labels. Benefit pictograms use purple/lilac/gold stroke gradients to distinguish research, practice, community, certificates and awards. The CME graphic uses a large illustrative numeral and label, not an accredited-hours claim. Backgrounds use mathematically specified curves and ellipses, not invented scientific charts. The map is geographic source data, not a decorative hand-drawn route; Arabic does not mirror its coordinates.

## Components

### Public invitations

The public gold variant uses champagne material, bold heading typography and a highlight from the reading edge. Hover lifts (2px); press scales (0.975). Transform feedback is (160ms), highlight (240ms), opacity (180ms), shadow (220ms), press (120ms). Keyboard focus highlights immediately. Reduced motion removes travel; disabled controls keep the neutral shared state; forced colors uses system button colors. Heights remain (50px) shared, (56px) homepage, (48px) header, and at least (44px) small targets. Sponsors now places a medium (54px) Become a sponsor action near the title. Abstract submission has a medium action near the top which reaches availability information while submission remains closed.

### Outward glass navigation

Exact order: Participate, Program, Speakers, Sponsors, Venue, Our Team, Contact. Participate exposes five paths; Program is a direct link; the native logo reloads home. ENG-028 replaces two clipped paint plates with one continuous glass surface, which scales (1.06, .96) and fades as the logo and invitation travel to their corners. The middle rises (8px), scales (.96), blurs (7px), and its link groups slide outward. The visible corner controls remain. Purple stops use alpha (.72/.77/.74), approximately 10% less tint; grain is capped at (.025), and the small pale champagne accent is (#fff4d6) to retain contrast.

Upward scroll restores the bar; top-edge and logo hover never do. Keyboard-visible focus restores it synchronously. The entire expanded header, including its dropdown, is one interaction region; an open dropdown prevents compaction. A (140ms) cancelable pointer-leave allowance and invisible gap bridge tolerate diagonal travel. True exit closes the menu unless keyboard-visible focus remains inside. Escape, outside interaction and route activation cancel pending work. The empty compact middle ignores pointer input. Geometry uses interruptible (520ms) transitions with `cubic-bezier(.76,0,.24,1)`; glass/middle opacity and text blur use (220ms), anchored dropdown feedback (180ms). Reduced motion removes transitions. Touch/coarse-pointer navigation remains fully present. Native scroll updates are frame-coalesced.

### Benefit and history panels

Six benefit articles have bold headers, open prose, a light surface, thin purple boundary and authored gradient pictograms. Fine-pointer hover lifts 3px over 260ms with a 240ms inset glow. These remain reading articles, not false links or extra tab stops. The large **7 / CME** graphic remains **illustrative only**, with localized visual and accessible qualification and pending factual copy. ENG-029 changes the decorative sculpture to one 4.5s settling entrance, pauses it when unseen, retains its final position on re-entry and renders statically for reduced motion. It adds no focus stop or visible pause control.

Choose your path and benefits use restrained curve/orbit artwork over lilac fields. The new artwork settles once over (4.2s) for its ribbon and (3.8s) for its orbit; reduced motion is static and no new pause control is added. Decorative geometry never replaces content or occupies the focus order.

History figures sit in translucent plum panels with (16px) backdrop blur and decorative globe, visitors and document icons. The number-first grouping keeps labels and edition scopes together. The larger middle 2,257 Visitors card has a champagne numeral and pale-gold edge; 4,007+ Total visitors and 83 Research abstracts submitted stay ivory. The organizer's ENG-026 wording explicitly replaces the earlier research-project label. Total visitors is scoped to 2023–2026; the other two cards are scoped to MSRC 2026. The aggregate remains summed edition attendance, not a deduplicated count of people.

Majed IMG_9804 fills the reading-opposite half-field with a zoomed, blurred purple treatment, retaining the audience rather than the ceiling. A lower gradient blends into the next section. Counting remains one-shot (1400ms), begins around (70%) visibility and keeps a constant accessible final value. Reduced motion/no JavaScript show that value immediately. Icons add no redundant accessible announcement or tab stop.

### Pathway reading index

The five actual participation tracks sit below Choose your path in the sticky reading-side introduction. Native scrolling changes the active track at a shared (45%) viewport reading line. Purple color, weight, an underline and a directional arrow communicate the current location; the link uses `aria-current="location"`. Color changes use (180ms) ease and the arrow uses (220ms) `cubic-bezier(.23,1,.32,1)` travel over just (4px). Keyboard focus and reduced motion respond immediately. Each item is a genuine in-page link to its corresponding photographic card, so it also works without JavaScript.

The introduction returns to normal flow below (800px) and whenever its measured height would exceed the viewport. Phone links wrap rather than introducing another horizontal control. Arabic keeps zero tracking and a mirrored directional arrow. This is a local reading index, not a second site-wide navigation bar, and it does not intercept scroll input.

### Participation and useful resources

Attend uses Majed IMG_9744 in its photographic header. Abstract submission and Workshops reuse the requested Manar Jamal IMG_2560. Hackathon and 3MT follow the same photograph/scrim, solid title with selective phrase emphasis, essential-card and useful-resource structure. Duplicate registration-process and pathway-boundary sections are consolidated into the primary requirements. Research keeps submission-guideline and FAQ access; no eligibility or workflow rule is discarded for visual brevity.

Workshop browsing is a native horizontal rail of unannounced cards with empty image fields. It establishes composition without inventing sessions, instructors, schedules or availability. View my ticket and Download the program brochure are unavailable controls with a short explanation because no approved ticket destination or brochure exists. Explore other paths, FAQ and existing Program destinations remain genuine links.

### Speakers and photographs

The rail retains anonymous portraits and opaque dark captions over a softly tinted field. Fine ellipse contours make one brief entrance: the orbit lasts (4.5s), the echo (4.2s), then both stay still after (4.5s). Unseen motion pauses, reduced motion remains static, and no additional pause control is introduced. This follows the user's latest preference. Forced colors and print remove the atmosphere. No confirmed people, roles or capacity are implied.

Pathways and archive rails retain dark readability scrims, stationary text and native browsing. Three pathway images follow the user's exact filenames and crop instruction, recorded in media provenance. Speakers uses Rania IMG_9801 as its blurred/tinted header, with anonymous portrait cards over artistic linework. Our Team uses the same public heading language and a pale designed card field. The real King Faisal photograph supports the venue story. Context imagery is not evidence of a current speaker appointment.

### Program dates and venue orientation

Program uses its conference-panel photograph as a blurred, purple-tinted header; Venue uses the actual center photograph. Images are blurred (5px), rest at scale (1.015), and ease to (1.045) over (700ms) on fine-pointer hover. Reduced motion keeps the resting crop. Bold text and date panels stay stationary.

White/gray date panels display configuration-driven days as substantial links to the matching `/program?day=day1` or `day2` view. Hover/focus produces a glow; links use (180ms) feedback, small lift and press response. Venue facts, transport and arrival guidance use icon-led boxes with generous heading spacing, pale gradients and restrained circular decoration. Get directions is a (60px) action, separate from the larger invitation.

Arrival uses locally served OpenStreetMap geometry, attribution, north arrow, scale and a venue marker, in EN/AR landscape and portrait assets. Arabic labels do not reverse geography. It shows campus streets and surroundings; current driving navigation stays in ordinary external map links. No SDK, provider prefetch or live-route assertion is introduced. Final geographic and browser verification are recorded separately by the task owner.

### FAQ, status and media

FAQ remains native disclosure with circular plus and ordinary reading text. Pending names and closed destinations stay honest; redundant archive/demo disclaimers remain removed. Sponsor placeholders appear only on their dedicated page.

Contact separates its solid ivory title and email context from the light form surface. Its two responsive grids, labeled fields, closed-delivery note and short reading measures replace the crowded layout. Formatting changes do not activate message delivery.

The opener, cinema recovery, existing media controls and poster fallbacks remain. The supplied Jeddah source (0–23s) becomes an (8.2s) silent montage at (2.8×); crop changes are recorded with its media asset. An ivory-to-film fade replaces the hard FAQ boundary. It is neither venue footage nor an original time-lapse. Media mounts only when approach/preferences allow, pauses when unseen and retains failure posters. Local editing does not establish public reuse clearance.

## Do's and Don'ts

### Do:

- **Do** preserve the MSRC base identity and distinguish component materials from approved brand tokens.
- **Do** clarify hierarchy with selective weight/color and generous reading space.
- **Do** ground dates, names, history and availability in configuration and evidence.
- **Do** preserve RTL, Arabic metrics, visible focus, native scrolling and reduced motion.
- **Do** keep background animation brief and reading surfaces stable.
- **Do** retain photograph, footage, artwork and geographic provenance.
- **Do** keep this public refinement out of operational shells.

### Don't:

- **Don't** call the local demo final brand approval or a production release.
- **Don't** invent identities, affiliations, capacity, accreditation, eligibility or reuse clearance.
- **Don't** turn reading panels into false controls or delay keyboard recovery.
- **Don't** apply decorative gradients to ordinary reading copy, mirror geography or fabricate routes.
- **Don't** present the illustrative 7 CME graphic, unannounced workshops or unavailable resources as approved event facts.
- **Don't** spread glow to every surface or promote champagne into an unapproved global palette.
