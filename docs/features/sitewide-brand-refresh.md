# Sitewide visual update

25 November 2026 · ORG-076 · PR #155 baseline `8184a50`

## Visitor experience

- The homepage retains its cinematic entry and desktop split navigation.
  The official thesis and FAQ illustrations connect it to the rest of the site.
- The page headers retain their PR #155 type, colour and photographic
  treatment, as confirmed by the organizer. The Venue map has a direct
  jump link, and the footer offers a keyboard-accessible return link.
- Program, Speakers and Media have clearer results, filters and publication
  states. Team adds in-page committee navigation. Contact and legal pages
  group the details and links visitors use most.
- Participation, the research competition and each journey give the
  requirements, resources and current status clearer hierarchy. The research
  journey is readable without a pointer over the timeline. Sponsors, accounts,
  registration and tickets use the same public typography and controls.

## Scope

SCP-01/02, DSN-01/02, ACC-01, LOC-01/03, MED-02, CFG-12, NFR-02 and REL-06.
The [asset record](../MEDIA_REGISTER.md) describes the supplied Canva artwork.
The [decisions](../DECISIONS.md) record the typography choice and the authorized
preview scope. The changes are in public and participant-facing presentation.
Production data, private staff screens, and operational activation follow their
existing release decisions.

## Local verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` passed
  with Node 24 and pnpm 11.19.0. The unit suite passed 5,665 tests
  and the production build generated 142 static pages.
- Six bilingual Chromium cases cover the Venue map and footer links by
  keyboard on desktop, tablet and phone sizes. They verify that the map
  destination receives focus and the footer link returns to the top.
- Targeted Playwright checks across desktop Chromium and emulated iPhone
  WebKit exercised public layouts, media filters, the research timeline,
  and the new section indexes. Editorial and participation axe scans
  reported zero violations in the tested routes and states.
- Physical phones, assistive-technology sessions and staff workflows are
  outside this visual review. A Windows WebKit emulation probe reproduced
  the incumbent Fraunces optical-size rendering difference on the
  homepage. The review retains the calibrated PR #155 heading and font.

### Header preservation follow-up

- Compared the Program header with the live PR #155 design in Chromium
  at 390px and 1440px for each locale. The headings matched on type,
  position, size, accent gradient and the photographic scrim.
- Twenty-two focused Chromium checks passed after preserving the 16:9
  archive photos and explicitly selecting the skip-to-content control in
  keyboard tests. The Venue test also checks the existing Program title
  gradient and separately verifies the new footer return link.

### Organiser follow-up, 26 November 2026

- ORG-077 marks the public registration opening and closing dates as pending
  in both languages. Free attendance remains visible.
- The older abstracts roadmap returns as a six-stop desktop timeline with
  a vertical phone layout. Reduced motion and JavaScript-disabled browsing
  show every detail.
- The footer displays the existing Research Principles Club seal at 72–96 CSS
  pixels at standard text scale. The homepage uses a single Speakers teaser
  and reserves the full directory for the dedicated page.
- The Program time-zone label wraps without horizontal scroll, the day
  shortcuts form a compact row when space allows, and the Contact notice
  has tighter insets. Desktop Venue spacing fits its original overview frame
  without changing its one-stop-per-gesture behavior.

Local follow-up checks passed for 32 homepage and readability cases, with
eight duplicate profile cases skipped. The six previously failing abstract
cases and both desktop Venue overview cases passed. Chromium and WebKit
screenshots verified the pending registration card, roadmap, speaker preview,
and 96px desktop and 72px phone seal. The 280px enlarged-text test covers the
Program time-zone label and remains at its original width limit. Physical
devices and screen-reader sessions remain open.

The production-build registration, copy and readability suites passed 40
cases with four duplicate profile skips. The official synthetic content
suite passed 12 cases across the published, empty and provider-down states.
A separate 280px doubled-text check found that the Arabic native selects
needed more inline space in WebKit. The tighter filter frame passed
English and Arabic reflow, day selection and clearing in both engines.
