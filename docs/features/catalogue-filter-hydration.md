# Programme and Media filter hydration

## Current reconciliation, 8 October 2026

The organizer reviewed PR #52's screenshots. GitHub inspection found PR #51
already merged at main `4952e5a4c27c718ecb07b6a78f8d79f21f515588`; this branch
now includes that exact main. Only PROGRESS conflicted, and both histories were
retained. The filter source and assertions are unchanged from reviewed `e90fac54`.
The original failed receipt and all participant failure archives remain preserved.

Reconciled local `npx --yes pnpm@11.19.0 check` PASS: lint, types, 2,383 units/59
files and 79-page build. The same focused Playwright command below passed all
30 cases in 39.7 seconds, zero skips/retries, including the original rapid-change
assertions. Fresh combined-head CI must pass before organizer merge; no merge,
production settings, hosted SQL, scheduler, account, password or email action
was performed. Participant collection/cleanup remain closed.

## Original implementation checkpoint

Scope: PRG-01, MED-01/04, CMS-04, LOC-01/03 and ACC-01. This is a public
interface bugfix on `codex/public-filter-hydration`, based on main
`b1c3763a062f12fa2ae419b2645dd48b34eb17a7`. It is not merged or deployed.

## Observed failure and inference

The retained [Foundation failure](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37807214814/job/113414512943)
at head `f7bc82c884529f51a55af082c3797c993dbfdb31` failed the mobile
`quick successive filter changes keep each other` case. Artifact `11564056886`
contains the original trace, screenshot and context. The original public source
was unchanged by that documentation-only PR.

The trace records two synchronous filter changes about 28 milliseconds after
page load. The URL correctly retained `edition=2026&kind=recording`, but both
rendered selectors remained at their unfiltered values through the five-second
assertion window. There was no captured console error. The existing query-delta
merge retained both keys; the failure was URL/render divergence.

Installed Next.js 16.3.7 registers its native-history synchronization in a React
effect. The evidence supports an early interaction before that synchronization
was ready. **This is an inference:** the trace does not record the exact effect
installation time. The retained failure remains evidence; it is not replaced by
a rerun. The original trace SHA-256 is
`5a17c1aeb8f32be386d8b0fbad3b5e76f368a61b4a4976e965d9644b32642f5e`.

## Change

Programme and Media use the existing `useSyncExternalStore` hydration pattern:
the server snapshot is false and the committed client snapshot is true. Native
search, select, day and clear controls are disabled until the client is ready;
change handlers also reject early events. Initial deep-link selections still
render in server HTML. Existing category/room availability guards remain.

The URL delta merge, filtering, history behavior, public content, layout and
language copy are unchanged. Workshops is a static catalogue without query
controls and needs no change. There is no new location store, timer, retry or
timeout. Operational flags, participant age/retention work, authentication,
database policy and providers are outside this fix.

## Verification

Node 24.21.0 and the locked pnpm 11.19.0 dependencies were used. Commands below
ran in this worktree with the portable Node initializer. No private inputs,
provider credentials or hosted operations were used.

| Command | Observed result |
| --- | --- |
| `npx --yes pnpm@11.19.0 exec vitest run tests/unit/catalogue-hydration.test.ts tests/unit/public-catalogue.test.ts` | PASS: 14 tests in two files, including eight EN/AR server-render cases with synthetic populated Programme options. |
| `npx --yes pnpm@11.19.0 exec eslint src/components/conference-experiences.tsx tests/unit/catalogue-hydration.test.ts tests/e2e/catalogue-hydration.spec.ts tests/e2e/qa-regressions.spec.ts` | PASS. |
| `npx --yes pnpm@11.19.0 build` | PASS: TypeScript and 79 generated pages. |
| `npx --yes pnpm@11.19.0 exec playwright test tests/e2e/catalogue-hydration.spec.ts tests/e2e/qa-regressions.spec.ts tests/e2e/conference-experience.spec.ts --grep 'held JavaScript\|quick successive filter\|programme exposes\|media filters distinguish\|same-route programme\|rendered language\|programme, media and participation pass'` | PASS: 30 cases, no skips, retries zero. |
| `git diff --check` | PASS. |

The eight new desktop/mobile EN/AR cases hold JavaScript explicitly and assert
disabled native controls with preserved deep-link fields. After release they
check rapid changes, keyboard day selection, URL/render agreement, hash
preservation, browser Back, language switching and WCAG 2.2 AA axe checks. They
assert GET/HEAD-only requests. The two existing rapid-change cases still dispatch
both changes synchronously and retain the original URL and selector assertions;
they now wait for enabled controls. Twenty related catalogue, navigation,
language and accessibility cases also pass.

Independent source review PASS; that reviewer did not rerun the checks. Full
public-suite CI, live routes and deployment verification for this new fix are
NOT TESTED at this checkpoint. The next step is review and an isolated PR.
