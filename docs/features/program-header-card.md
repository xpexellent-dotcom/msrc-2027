# Programme header card — 15 October 2026

Requirements: PRG-01, DSN-01/02, ACC-01, LOC-01/03. Requester screenshot is
the visual authority for this bounded refinement. Base: `origin/main` at
`4b25c12`; implementation is in the attached `program-hero-card` worktree.
PR preparation integrates refreshed `origin/main` at `ba2ff5f`; the intervening
homepage/team changes do not overlap this slice. The requester authorized the
commit, feature-branch push and PR; merge/deployment remain separate.

## Audit and implementation

1. The mobile card occupied 350 × 306px; the desktop maximum was 400px.
   The white/lilac gradient used 80–85% alpha. Reduce width, type and spacing,
   and replace it with a purple gradient at 42–66% alpha over the existing hero.
2. Day links selected `?day=day1` / `?day=day2` without a scroll destination.
   Use `#programme` on the focusable catalogue section, which remains present
   when no sessions are published. Selecting a day on this page commits its
   filter before the shared Link focus/scroll handler runs. Modified clicks and
   cross-page links retain their ordinary behavior. Existing root scroll padding
   supplies header clearance without an additional offset.
3. English desktop/390px card is now 336 × 263px; Arabic is 336 × 271px.
   Keep 44px minimum targets, RTL, native scrolling, reduced motion, print and
   forced-color styles. No public factual copy or release state changed.

Files: `src/components/conference-day-links.tsx`,
`src/components/conference-experiences.tsx`,
`src/styles/venue-program-refinement.css`,
`tests/e2e/program-card.spec.ts`, `tests/e2e/dates-venue.spec.ts`.

## Executed verification

Node 24.21.0 / pnpm 11.19.0; dependencies/lockfile unchanged. The default shell
had Node 25/pnpm 11.25, so commands used the existing `.tools/node` Node 24
runtime from the handoff root and `npx --yes pnpm@11.19.0`. Offline install lacked
an SDK tarball; the exact frozen-lockfile online install completed successfully.

| Command/check | Result |
|---|---|
| `node node_modules/eslint/bin/eslint.js src/components/conference-day-links.tsx src/components/conference-experiences.tsx tests/e2e/program-card.spec.ts tests/e2e/dates-venue.spec.ts --max-warnings=0` | PASS, no warnings |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node node_modules/next/dist/bin/next build` | PASS, TypeScript and 81 generated pages |
| `node node_modules/@playwright/test/cli.js test program-card.spec.ts dates-venue.spec.ts --grep 'programme date card\|Program date links\|calendar'` | PASS, 20 cases; no retries |
| `node node_modules/@playwright/test/cli.js test --config .tools/playwright.program-webkit.config.ts` | PASS, four WebKit phone cases; no retries |
| `node .tools/program-card-visual.mjs` | PASS, ten EN/AR layout states, zero overflow/errors/axe violations, all links at least 44px |
| `node .tools/program-card-contrast.mjs` | PASS, rendered-background bounds across 12 default/hover/focus states: lilac at least 4.506:1, ivory at least 6.155:1 |
| `git diff --check` | PASS |

The navigation cases exercise mouse/touch emulation, keyboard Enter, selected
filter, focus, final scroll alignment below the header, repeat activation, fresh
fragment entry and locale switching, with normal and reduced motion. Existing
venue/date and calendar download checks also pass. The React review found no
new effects, state subscriptions, data waterfalls or dependencies.

Final screenshots: EN/AR desktop/tablet/phone/narrow and 280px with 200% text,
under ignored `.tools/program-card`. The enlarged layout expands vertically
without clipping or horizontal overflow. Axe reports contrast as incomplete on
the gradient, so background pixels were sampled separately with text/borders/
focus outlines temporarily hidden in the verification browser. The lightest
interior background pixel bounds contrast conservatively across the card.

The first visual pass exposed inherited purple date text; the final CSS makes
dates ivory, and final screenshots confirm legibility. The first contrast probe
sampled the ivory focus outline as background; the corrected probe excludes
outlines and preserves the diagnostic receipt.

Initial Chromium run: 13 passes, one test setup failure. The arrival helper
accepted a visible toolbar midway through smooth scrolling, then immediately
interrupted it with `scrollTo(0)`. The final helper requires the target to reach
its computed scroll-padding position before continuing; no timeout, retry or
weaker assertion was introduced. Receipt:
`.tools/program-card-first-failure`. A subsequent diagnostic overlapped the CSS
rebuild and aborted its stylesheets; its unstyled result is preserved under
`.tools/program-card-diagnostic-results` and excluded from completion evidence.

NOT TESTED: physical iPhone/Android, real assistive technology, full WCAG audit,
full application regression/unit/database suites, hosted CI and production.
No workflow, hosted setting, merge or deployment occurred. Next: review the
local preview and follow the owner-controlled release process.
