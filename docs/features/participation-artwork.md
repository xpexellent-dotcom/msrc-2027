# Participation background artwork — 17 October 2026

Scope: Attend, Abstract submission, Workshops, Hackathon and 3MT, in English and
Arabic. Requirements DSN-01/02, LOC-01/03 and ACC-01. The owner requested distinct,
restrained motifs in genuinely empty space, with fuller wide-screen margins and
at most one quiet phone accent. Copy, routes and participation gates are unchanged.

## Audit and implementation

The starting revision was `59b21ba`. The shared checkout contained unrelated local
work, so implementation used the isolated `codex/participation-artwork` worktree.
Open PR #99 concerned the staff console and did not overlap the changed application
files. The prior art relied on radial fades to protect the content. Its margin
formula allowed an extra 80px inside the column and did not activate until 1800px.
The actual site container grows to 1600px, overriding the token's 1280px default.

The implementation prioritizes physical separation, then composition:

- Heading artwork occupies an independent grid cell. It cannot change the row's
  height; oversized drawings are clipped and softly faded within that empty cell.
- Outer slots use the actual responsive gutter and container width, with 16px
  clearance. Starting at 1600px they reveal narrow fragments, expanding naturally
  through 1920px and 2560px. Both logical sides have distinct sizes, heights,
  rotations and deterministic seeds. At 1440px the narrow gutters remain clear.
- Attend uses eight smooth contours and one gold point; abstracts use 39 findings
  and a fitted gold line; workshops use a cutting-mat grid and unfinished gold
  marks; Hackathon uses six traces and nodes; 3MT has a compact stopwatch, a gold
  three-minute arc and six spreading sound arcs.
- Phones show one 112 × 32px accent inside the Benefits section's existing top
  padding. Tablet widths from 701–899px have no decorative artwork.
- Every piece is static, deterministic, noninteractive and hidden from assistive
  technology. Forced colors hides every slot. No new library, image asset, timer,
  scroll listener or animation is added to the website.
- Hackathon retains its dark interlude, glass day cards and gold labels. Separate
  eased entrance/exit gradients have fixed lengths; heading and cards remain on
  the dark plateau regardless of Arabic wrapping or content height.

The first visual pass found miniature complete motifs beside short headings.
The single correction pass enlarged/cropped those within the same safe slots.
The React review found no actionable issues; it checked the four-file code/test
diff for scope, deterministic hydration, accessibility and clipping.

## Verification

Runtime: Node 24.21.0, pnpm 11.19.0; frozen lockfile installation. The package and
lockfile remain unchanged. Commands ran in the isolated worktree with the pinned
runtime on PATH.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 2,797 tests, 67 files |
| `pnpm build` | PASS — production build, existing route rendering modes retained |
| Targeted Playwright: artwork, participation-flow, fluid-journeys, premium-interface | PASS — 86 passed, 56 intentional project skips |
| Full `pnpm exec playwright test`, after final CSS correction | PASS — 821 passed, 137 intentional skips, zero failures/retries (13.3 minutes) |
| EN/AR × five pages × 390/1440/1920 screenshots | PASS — 30 before + 30 final after captures; visual confirmation complete |
| Artwork geometry / axe | PASS in final full run — 50 layout cases, 30 axe scans clean |
| Before/after rendered text and overflow comparison | PASS — 30 states, zero text changes, zero horizontal overflow |
| Native phones / assistive technology / hosted production | NOT TESTED — local browser emulation only |

`tests/e2e/participation-artwork.spec.ts` compares real text fragments, card/control
surfaces and actual container bounds against clipped artwork slots. It also checks
RTL sides, 1600/2560px gutters, horizontal overflow, phone density, static motion,
forced colors, decorative attributes, page errors and exact server/client SVG
markup equality. The explicit width matrix runs in Chromium desktop once; its
mobile-project duplicates are intentionally skipped. Existing participation tests
continue to exercise navigation, closed actions and the workshop rail.
The 137 skips comprise the baseline suite's 87 project/device skips plus 50
duplicate mobile-project artwork cases. Three tracked Venue screenshots regenerated
by the full suite were restored to their baseline; they are outside this PR.

Before/after images and the visual index are in
[the screenshot evidence](../reviews/participation-artwork-2026-10-17/README.md).
Full-resolution PNGs, local logs and browser traces remain under ignored
`.tools/participation-artwork`, `test-results` and `playwright-report`.
Compressed screenshot copies in the review folder are documentation evidence,
not website assets.

No hosted settings, database, account, email, workflow flag or production deployment
was changed. The pull request is for owner review; merging remains a separate step.
