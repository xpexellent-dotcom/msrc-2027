# Sitewide visual update

25 November 2026 · ORG-076 · PR #155 baseline `8184a50`

## Visitor experience

- The homepage retains its cinematic entry and desktop split navigation.
  The official thesis and FAQ illustrations connect it to the rest of the site.
- The public mastheads share a ruled breadcrumb and use existing photography
  or subject-specific illustrations. The Venue map has a direct jump link.
  The footer offers a keyboard-accessible return link.
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
