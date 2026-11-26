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

### Shared navigation and design refinements, 26 November 2026

- ORG-078 applies the split desktop navigation to the shared public header.
  It restores on upward scroll or keyboard entry and continues to mirror in
  Arabic. Menus and visible focus support reading at enlarged text sizes.
- A larger official seal anchors the footer. The homepage Speakers teaser
  pairs portrait illustration with a direct catalogue action. Up to two
  approved profile previews take its place when the catalogue is published.
- The research page distinguishes the oral and poster formats using the
  supplied icon artwork with different brand surfaces. The eligibility list
  presents presenter qualifications, presenter and co-author roles, and the
  completion window as separate scan points.

The shared navigation suite passed 26 Chromium desktop and phone cases
with 14 profile-specific skips. Footer artwork decoding and layout passed
20 Chromium and WebKit probes, including 280px at 200% text. Scoped checks
for the portrait teaser and research formats covered English, Arabic,
reduced motion, enlarged text and automated accessibility. Physical
handsets and assistive-technology sessions remain open.

### Attend, abstracts and workshop review, 26 November 2026

- ORG-079 replaces the illustrative CME number with a branded hourglass.
  Attend and Workshop benefits use the supplied illustrations, including
  the extracted certificate artwork. The Attend certificate uses the
  requested two-day wording and a separate survey requirement.
- The public abstracts roadmap shows six illustrated steps without
  dates. The distinction callout announces cash prizes for the top
  three in each category. The decorative magnifier sits behind the
  rubric introduction.
- Workshop catalogue cards reserve a 16:10 cover using conference
  artwork while individual images are pending. The existing horizontal
  scroll, keyboard controls and booking states continue to work.

The targeted Chromium checks covered the homepage, Attend, Workshop
catalogue, public research layout and the synthetic submission-window
states. Chromium and WebKit also verified the English and Arabic
responsive artwork. Twelve scoped axe checks on the new benefits found
zero violations, including at 280px and 200% text. Four synthetic
published workshop cases passed locally. Physical devices and screen
readers remain open.

### Community gallery and evaluation design, 26 November 2026

- ORG-080 ties the gallery fade to vertical scroll, leaving its existing
  community photo visible on approach. Interacting with the rail shows the
  photos immediately. Reduced-motion and JavaScript-free visits show the
  gallery in full. The three history statistics use translucent glass with a
  strong text contrast and a solid fallback for reduced transparency.
- The public Abstracts evaluation cover uses the selected gold conference
  seal. The seven criteria use larger labels and descriptions in a grid that
  stacks on narrow screens. The evaluation shortcut lands at the full section.

The bilingual Chromium and WebKit checks covered desktop and phone
gallery opacity, reverse scrolling, native rail input, focus and reduced
motion. The rubric also passed 16 browser, locale and viewport combinations
for reflow, artwork decoding and scoped accessibility, including 280px at
200% text. Venue stepper coverage passed three repeat runs per locale after
the test began its return from a settled native scroll within capture range.
The glass cards passed ten browser cases, including high-contrast modes,
and retained at least 5.04:1 sampled contrast over the treated photograph.
Physical devices and screen readers remain open.

### Gallery fade, evaluation list and survey copy, 26 November 2026

- ORG-081 uses the homepage's 700ms ease-out timing for the gallery fade.
  It starts after the background-first entrance and completes even when
  scrolling stops. The photos stay visible on return. Keyboard, touch,
  reduced-motion and JavaScript-free access are immediate.
- All seven evaluation criteria use one ordered list at any width.
  English retains Roman numerals and Arabic retains localized numerals.
- ORG-082 aligns the Abstracts breadcrumb with the shared layout and
  removes advance survey reminders in English and Arabic. Published survey
  forms remain available within My Certificates under the existing release
  and eligibility settings.

Scoped checks covered Chromium and WebKit desktop and emulated phones.
They verified the gallery animation at intermediate and finished opacity,
the evaluation list at 280px with doubled text, and the shared breadcrumb
alignment, accessible navigation and keyboard focus.

The final production build passed lint, TypeScript and 5,665 unit tests.
Twenty-two public browser cases passed. The synthetic participant suites
passed twelve certificate cases and six registration cases in both
languages. These checked unpublished and actionable survey states,
completion after reload and day-by-day attendance without survey reminders.

### Compact evaluation criteria, 26 November 2026

ORG-083 places the gold-seal introduction beside a single vertical list
of all seven criteria on desktop. Brand contour lines sit behind the seal
and extend into the section background. At 1440 × 900 and standard text,
the entire section measured about 838px in English and 825px in Arabic.
On phones and at enlarged text sizes the layout stacks and expands.
The browser regression checks cover row order, compactness, RTL alignment,
artwork accessibility and enlarged-text reflow.

### Release QA, 26 November 2026

ORG-084 authorizes publication after GitHub and Vercel review. The narrow
layout was checked in English and Arabic with doubled text. Participate
keeps its directional links readable. The native Contact and Media selects
fit inside their filter or form surfaces. The Venue continuation and 3MT
availability copy wrap. The Venue journey keeps its existing gesture and
keyboard behavior.

The initial GitHub PR revision `7654706` passed all 20 reported checks.
The protected Vercel preview opened in an authorized browser. Its
Abstracts evaluation shortcut landed on the criteria region and moved
keyboard focus there. The production release uses a Git-triggered Vercel
build on `main`. Read-only checks compare the live public routes and
availability states before and after the release.
