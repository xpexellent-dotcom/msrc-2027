# Homepage v2

Owner direction: 4 November 2026. ORG-072 / ENG-094 supersede the immersive
homepage presentation under ORG-071 / ENG-093. Requirements: SCP-01, DSN-01/02,
ACC-01, LOC-01/03, MED-01/04, CFG-12, NFR-02, CMS-04 and REL-01.
Implementation and verification are local and uncommitted; Claude reviews and commits.

The two-line gradient hero uses Fraunces / DM Sans in English and El Messiri /
Noto Sans Arabic in Arabic. Both title lines share one gradient. Gold registration
and ivory program buttons stack on the common content edge. An inline SVG ribbon
ends on the surface below. The hero lead, date/venue band, pathways introduction,
Explore participation link and Step inside cue are absent; their content keys stay.

Five single-link bento tiles replace the sticky photo deck and track index. Attend
keeps its description and photo; four icon tiles retain the closed-status copy.
Three Minute Thesis is written in full. Program through FAQ restores the available
`origin/main` (`13469ad`) copy and structure, with chapter rules, restrained flow
lines and one-shot reveals. Program retains its approved desktop mirror. Speakers
restore four anonymous SVG portraits and rail hints. Historical scopes, illustrative
CME qualifier, gallery years, venue description/caption and FAQ dates link remain.

The official owner-supplied on-purple logo appears on a solid purple header and
footer. Ten official icons retain their artwork and physical centring correction.
Public buttons use 14px corners and arrows; icon controls use rounded squares.
Header controls remain 48px. No owner source asset is modified or removed.

Sponsor and social placeholders are opt-in and frozen at build time by
`next.config.ts`. Production takes precedence over every opt-in flag. Social URLs
remain null. The illustrative belt has a constant-name pause toggle, stops over the moving strip and on exit, and wraps statically under reduced motion. A preview build must
never be promoted to production without rebuilding.

Homepage rules live in `home-v2.css`; shared controls, identity and rails live in
`brand-system.css`. Public typography overrides also match `[lang]` descendants so
Latin fragments cannot request staff faces. Inter and Manrope remain installed
without preloads for staff. The existing Venue stepper is untouched.

The hero video pauses below 10% visibility; the countdown subscribes only while
visible and preserves focus refresh. ScrollScenes measures nearby chapters only.
No sticky phone stack, oversized image sizing, backdrop filter, blend layer, media
blur, drop shadow, scroll timeline or homepage `will-change` remains. Native
scrolling and the established ORG-012 reversible titles remain.

Review amendment: FAQ uses the original .75fr / 1.25fr desktop split with a
sticky introduction and stacked utility links. Its heading starts on E; its rows
are a documented edge exception. Phones remain single-column. Venue spans the
full content width. EN display headings use -.005em tracking / .04em word spacing;
interior display weight is 600, while Arabic retains its own typography. Rails
bleed to the viewport with a visible phone peek. Semantic dt/dd order, opaque
stat cards, guttered FAQ bars, dark focus, forced colors and global rail printing
are covered by review regressions. All design specifics are ENG-094 defaults
pending owner review. See the receipt's Review fixes section for current evidence.

The logo R-counter is **NOT FIXED** pending a transparent-counter export. The
spoken home-link name remains established despite the visible MSRC'27 lockup.
Phone film controls remain hidden under ORG-054. No operational gate is opened.

See [the receipt](../progress/2026-11-04-homepage-v2.md) for exact commands,
measurements, test changes, screenshot indexes and remaining external checks.


The generated automatic Times fallback's 127.27% adjustment rewrapped the English
600-weight, opsz-144 hero into four phone lines. Keep next/font's automatic
configuration and general fallback, with an additional exact-weight Times Bold
face calibrated by scripts/measure-hero-fallback.mjs: size-adjust 93.5665%, ascent
104.5246%, descent 27.2534%, gap 0. ENG-094 records this measured refinement of
the automatic-only fallback baseline; delayed-font CLS results are in the receipt.

## Review round 2, 5 November 2026

ORG-072 and ENG-094 retain authority. The round 2 receipt covers the responsive
Attend, Arabic grouping, rail peek/caps/overflow, CME note, static sponsor grid,
closing chip, live-target, research-heading and footer-boundary corrections,
plus the public and enabled-workflow verification matrix. The reusable closing
contrast command is `node scripts/measure-closing-contrast.mjs <base URL>`, with
output at `.tools/home-v2/closing-contrast.json`. Physical iPhone and deployed
production gating remain NOT TESTED.
