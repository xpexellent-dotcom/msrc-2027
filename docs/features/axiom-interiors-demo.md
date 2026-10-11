# Axiom-inspired public interiors — local approval demo

11 October 2026. Scope: DSN-01/02, ACC-01, LOC-01/02/03, CMS-04,
PRG-01, MED-01/02/03/04 and REL-01. Implements the current requester's
[demo brief](../reviews/axiom-inspired-demo-brief.md); this is not a production release.

## Implemented

- `src/styles/axiom-interiors.css` gives programme, speakers, participation,
  media, About, venue, Contact and policy pages the shared larger Manrope/Noto
  Sans Arabic headings, readable supporting text and 12–16px surface corners.
  Its selectors exclude staff and authentication pages. Approved public and
  legal wording, catalogue filter logic and closed workflow checks are unchanged.
- `/en/team` and `/ar/team` show grouped illustrative leadership, committee and
  advisory cards. Every card has an explicit portrait placeholder, and the page
  explains that the roles and structure are illustrative. No people are named.
- `/en/sponsors` and `/ar/sponsors` show requested illustrative Platinum, Gold
  and Silver layouts. Every mark says “Brand”; the visible note makes clear that
  tiers and partnerships are unconfirmed. Reusable `SponsorTiers({ locale,
  compact? })` also supports the homepage. There are no external brand affiliations.
- Both new destinations have localized metadata, canonical/hreflang twins,
  sitemap entries and active footer links. Existing preview/development noindex
  behavior is retained. Navigation is handled by the separate shared-header work.
- The speakers page preserves its unpublished notice and adds a native horizontal
  preview rail. Four authentic 2026 archive images illustrate the design; captions
  explicitly deny a 2027 lineup implication. There are no invented identities.
- The programme page has one wide 2026 archive photograph. Media has a separate
  six-photo 2026 demo gallery below the unchanged catalogue and filter controls.
  Both use [the recorded local-demo sources](../media/axiom-demo-assets.md).

## Targeted evidence

Executed with portable Node v24.21.0 and pnpm 11.19.0:

- **PASS:** `pnpm exec vitest run tests/unit/public-indexing.test.ts
  tests/unit/design-contracts.test.ts` — 25 tests. Existing sitemap assertions
  now require 30 localized entries and verify the new pages' language twins.
- **PASS:** `pnpm exec vitest run tests/unit/public-catalogue.test.ts
  tests/unit/catalogue-hydration.test.ts tests/unit/public-participation-copy.test.ts`
  — 18 tests after scoping the media hydration assertions to its catalogue.
- **Historical FAIL preserved in the session output:** the first run of those
  three files produced 14 passes and four failures because the media hydration
  helper counted the separate gallery's arrow buttons. The corrected test still
  requires exactly three/four filter controls and every filter to be disabled in
  server HTML; no timeout, retry or disabled-state assertion was removed.
- **PASS:** targeted zero-warning ESLint for new routes, components, content,
  footer, metadata, conference experiences and the changed hydration test.
- **PASS:** `git diff --check` at the first integration checkpoint.
- Impeccable's detector ran once over changed interior targets. It reports
  advisory typography/radius differences against the preceding DESIGN.md;
  these requested larger sizes and 12–16px corners belong in the final shared
  design-system documentation. This is not a clean-detector claim.

## Remaining integration verification

The parent task owns importing `axiom-interiors.css` after the earlier public
styles, final typecheck/build, the full test run and the combined desktop/phone
EN/AR visual review. Those are **NOT TESTED by this subtask**. Shared horizontal
rail controls and speaker-card styling are supplied by the homepage work.

No dependency, hosted configuration, database, workflow activation, communication,
production publication or legal-copy change was performed by this subtask.
