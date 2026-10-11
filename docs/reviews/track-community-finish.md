# ENG-026 track and community finish review

11 October 2026. One bounded visual review of the built local approval demo.
Reviewed the actual pixels of all 34 files listed below with `view_image`, not
only capture metadata. No UI changes or new tests were made during this review.

**Verdict: one local correction, then ready for organizer review.** The inherited
underline on every inactive track link reduces the intended distinction between
the current track and its neighbors. The active arrow, stronger weight and purple
text already make state discernible. Remove the inherited anchor underline while
keeping the current label underline and focus outline. No other material visual
defect was found in this bounded pass.

| Before | After | Why |
| --- | --- | --- |
| Left introduction lacked a reading index | Five readable anchors fit beside the cards; the middle-card captures show Workshops active and a correctly mirrored arrow in Arabic | Visitors can discover all paths and retain their place while reading |
| All track links currently inherit the global link underline | **Correction required:** override that inherited decoration on the index anchors; retain the selected label underline | Makes the active underline an additional non-color cue and follows the requested quiet list treatment |
| Whole homepage headings used gradient lettering | Plain ink words with selective highlighted purple keywords; light words on dark surfaces, and selective hero emphasis | Emphasis is localized and ordinary words stay easy to read |
| Community counts used comparatively solid panels and similar hierarchy | Translucent panels show the image through, with globe/people/document icons; 2,257 is visibly larger and accented | The latest-edition count is prominent while total visitors and research abstract counts retain explicit scope labels |
| Desktop composition could become a narrow sticky block | Mobile index wraps in normal flow; the reviewed Arabic layouts mirror the content and markers without clipping | Small-screen access remains usable |

The manifest `.impeccable/review/tracks/captures.json` reports matching viewport
and document widths for every image and empty page-error arrays for all four
locale/viewport groups. Those metadata support the visual observations; this
review does not replace the parent task's functional browser checks, formal
contrast measurements, human Arabic review, or organizer approval.

## Exact capture inventory

All paths are relative to `.impeccable/review/tracks/`.

| Group | Files opened |
| --- | --- |
| English desktop | `en-1440-paths.png`, `en-1440-paths-middle.png`, `en-1440-benefits.png`, `en-1440-community.png`, `en-1440-numbers.png`, `en-1440-registration.png`, `en-1440-sponsors.png`, `en-1440-dates-venue.png`, `en-1440-contact.png` |
| English mobile | `en-390-paths.png`, `en-390-benefits.png`, `en-390-community.png`, `en-390-numbers.png`, `en-390-registration.png`, `en-390-sponsors.png`, `en-390-dates-venue.png`, `en-390-contact.png` |
| Arabic desktop | `ar-1440-paths.png`, `ar-1440-paths-middle.png`, `ar-1440-benefits.png`, `ar-1440-community.png`, `ar-1440-numbers.png`, `ar-1440-registration.png`, `ar-1440-sponsors.png`, `ar-1440-dates-venue.png`, `ar-1440-contact.png` |
| Arabic mobile | `ar-390-paths.png`, `ar-390-benefits.png`, `ar-390-community.png`, `ar-390-numbers.png`, `ar-390-registration.png`, `ar-390-sponsors.png`, `ar-390-dates-venue.png`, `ar-390-contact.png` |

Only a focused confirmation of the index underline correction is warranted; do
not start another full surface or polish cycle from this review.

## Functional correction identified by the parent browser run

The parent reported two failures in the unchanged 320px/200%-text anchor tests.
Read-only inspection of the existing failure capture and anchor-navigation code
identified the cause: an enlarged header places a card's native anchor landing
below the fixed 45vh reading line. The EN failure places the header bottom at
272px and the 3MT card around 320px while the old reading line is 270px.
The reading line must account for the card's actual computed scroll margin and
root scroll padding, bounded within the viewport. This preserves pure positional
tracking in both directions and avoids pinning the active state to stale focus or
hash state. This reviewer did not run or change the parent browser suite.

## Focused correction confirmation

Opened all six actual correction images listed in
`.impeccable/review/tracks/confirmation-captures.json`:
`en-1440-index-confirmed.png`, `en-390-index-confirmed.png`,
`en-320-index-confirmed.png`, `ar-1440-index-confirmed.png`,
`ar-390-index-confirmed.png`, and `ar-320-index-confirmed.png`.

**Scoped final verdict: ready for organizer review.** Inactive index links now
have no underline. The current label alone retains its underline, bolder purple
type and arrow. The English and Arabic desktop and mobile index compositions show
no new regression from the correction. The 320px doubled-text captures retain
the visible focused-card outline below the enlarged header. Their manifest now
records 3MT as active in both languages, while desktop records Workshops and the
390px entry view records Attend. Every anchor has computed underline `none`, with
only the current child label reporting `underline`; all six document widths match
their viewports.

This closes the one visual finding and confirms the supplied correction evidence
for the enlarged-header reading state. It is a scoped confirmation, not a second
full audit, production release approval or a new browser-suite result. No further
polish pass is requested.
