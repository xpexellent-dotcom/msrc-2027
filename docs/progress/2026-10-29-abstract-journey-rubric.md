# abs4 — Editorial journey numerals and evaluation rubric panel

29 October 2026. Worktree `C:/m/codex-abstract`, branch
`claude/abstract-journey-rubric`, starting HEAD `36106e1`. Changes are uncommitted.

Authority: the owner's abs4 designs and larger rubric-heading addition.
Requirements: DSN-01/02, ACC-01, LOC-01/03, ABS-12; existing ORG-058 calendar
and ORG-068 public evaluation content remain the content authority. No new
decision number or migration was assigned or introduced. `docs/PROGRESS.md`
and `docs/DECISIONS.md` were not edited.

## Implementation

- The public journey becomes six equal columns from 60rem (960 CSS px), with
  one continuous top hairline, light serif numerals, bold titles, existing dates
  and permanently visible details. The complete fifth title is preserved.
  English is zero-padded; Arabic keeps `formatIndex`'s Arabic-Indic digits.
- Native focusable list items support keyboard navigation. Hover, focus-within
  and `aria-current="step"` show the gold segment and purple numeral; normal
  motion draws the line from the reading edge and lifts the numeral 3px over
  400ms. Reduced motion removes transforms/transitions and preserves the state.
- Below 960px the list becomes a vertical rail at inline-start. The finalized
  participant receipt retains three columns on wider screens and a vertical
  list on narrow screens, including its permanent current-step label/state.
- The evaluation section is one white bordered panel with 14px corners. Its
  purple side column occupies 30% on desktop and stacks above the list on
  phones. The gold count comes from `copy.criteria.length`. The original h2 ID
  and section label remain; the ivory heading uses `clamp(1.9rem, 3vw, 2.6rem)`
  and bold display typography, with an Arabic line-height adjustment.
- Seven ordered list items each contain a semantic `dl` name/description pair.
  Decorative Roman numerals become Arabic-Indic digits in Arabic. Rows have
  hairlines, ivory hover backgrounds and a gold inline-start border.
- The site loads Manrope, DM Sans, Inter and Noto Sans Arabic, with no serif.
  Numerals use `Georgia, "Times New Roman", serif` only. Decorative ornaments
  are explicitly hidden SVG text so they are separate from meaningful text;
  Arabic SVG anchoring mirrors the reading edge. List order/count remains
  available to assistive technology. Contrast checks were not disabled.
- The only copy changes are the final colon becoming a period in the EN/AR
  evaluation introduction. No evaluation weights, scores or percentages added.

## Verification

Final commands against the implemented source (Node 24.21.0, pnpm 11.19.0):

| Command | Observed result |
|---|---|
| `pnpm lint` | PASS, exit 0 |
| `pnpm typecheck` | PASS, generated route types and TypeScript, exit 0 |
| `pnpm test` | PASS, 5,509 tests in 135 files, exit 0 |
| `pnpm build` | PASS, production build and prerender, exit 0 |
| `pnpm exec playwright test --config playwright.abstracts.config.ts` | PASS, 86 passed, 2 intentional width-matrix skips, zero retries, exit 0 |
| Public e2e command below | PASS, 150 passed, 22 intentional project/device skips, zero retries, exit 0 |
| `git diff --check` | PASS |

```powershell
pnpm exec playwright test tests/e2e/participation-flow.spec.ts tests/e2e/fluid-journeys.spec.ts tests/e2e/conference-experience.spec.ts tests/e2e/axiom-navigation.spec.ts tests/e2e/private-csp.spec.ts tests/e2e/qa-regressions.spec.ts
```

The regression coverage checks single-row/equal-column geometry at 1440/1024px,
stacking at 390/320px, RTL order, the full fifth title and six details, seven
criteria and localized count, display heading size, computed hover/focus color
and lift, reading-edge transform origin, reduced-motion state without transitions
or transforms, criterion hover styling, receipt layout/active state, axe, and
320px with 200% text including rendered text bounds.

Contrast calculations in `output/abs4/contrast.json`: ivory/purple 12.20:1,
lilac/purple 8.93:1, gold/purple 5.49:1, purple/white 13.19:1,
muted/white 6.42:1, ink/ivory 15.67:1, muted/ivory 5.94:1,
date/ivory 8.73:1. Pale journey numbers and gold list numbers are decorative.

The initial browser run caught nine English decorative-numeral contrast
failures. Its log is preserved in
`output/abs4/abstracts-playwright-initial-fail.log`; the final rendering uses SVG
ornaments instead of low-contrast ordinary text. No axe rule was excluded and
no retries or timeouts were added. Subsequent visual review corrected Arabic
SVG alignment and removed floating-header occlusion from section-only captures.
Screenshot-only header hiding does not change application behavior.

Windows web-server teardown lingered after all test cases had reported. Stopped
only each run's own server PIDs recorded in its log using `Stop-Process`; the
Playwright process then emitted its summary and exit code. No other job's
server or port was changed, and no retry was needed for a port conflict.

## Evidence and remaining scope

Screenshots and command logs are in `output/abs4/` (gitignored local artifacts).
The requested EN/AR 1440px and 390px journey/criteria sections and desktop hover
states are accompanied by 1024px sections and desktop/mobile receipt views:
18 PNGs total, indexed in `output/abs4/README.md`, with dimensions in
`output/abs4/screenshots.json`. Visual review covered desktop, tablet, mobile,
hover and receipt examples in both languages. The complete copy-file comparison
against HEAD confirms only the two authorized punctuation changes
(`output/abs4/copy-preservation.log`).

NOT TESTED: physical devices, human screen-reader operation, hosted deployment
and CI on these uncommitted changes. Database tests are not applicable to this
presentation-only change; no migrations or backend contracts changed.

No hosted settings, feature defaults, workflow activation, participant delivery,
commits, pushes or branches were changed. The existing synthetic Playwright
configuration is the only account-enabled environment used for verification.

Next: owner/Claude visual review and commit of the uncommitted changes.
