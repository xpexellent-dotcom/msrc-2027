# 2026-10-23 · Content pages stay prerendered (ENG-063 follow-up)

Branch `claude/night3-3` (PR #116). Fixes the CI failures "404 is usable without JavaScript" on every visitor shard.

## Cause
`getPublishedContent` called `connection()`, which turned the homepage, speakers, sponsors and team into request-time routes. `[locale]/layout.tsx` `dynamicParams = false` does not apply to request-time routes, so `/team`, `/random` and `/program` reached the `(preview)` layout's `notFound()` with no boundary above it. Next then served its bare `__next_error__` document (status 404).

## Change
- `src/features/content/published.server.ts`: no `connection()`. Configuration is still read on every render, and `unstable_cache` keeps its 60 s and tag settings.
- Homepage, speakers, speakers/[slug], program/[slug], sponsors and team: `export const revalidate = 60`. Program and media read query strings and stay request-time, as on main.
- `scripts/content-e2e-env.ts` and `scripts/build-content-e2e.ts`: one build per synthetic state into `.next/content-<state>`. Type checking is skipped for those builds only (the regular build checks the same sources), and `tsconfig.json`/`next-env.d.ts` are restored afterwards. `next.config.ts` accepts only the three allowed folder names.
- `playwright.content.config.ts` uses the shared env. The CI content step runs the build script first.
- `tests/unit/published-content.test.ts`: now asserts `connection()` is NOT called.

## Checks (local, Windows)
- `pnpm lint`: pass. `tsc --noEmit`: pass. `vitest run`: 90 files, 3,893 tests passed. `pnpm build`: pass. The route table shows the homepage, speakers, sponsors and team as prerendered.
- curl against `next start`: `/random`, `/team`, `/program` and `/en/random` return 404 with `<html lang="en">`; `/en`, `/ar`, `/en/team` and `/en/speakers` return 200.
- Content suite (published/empty/down × desktop/mobile): 24 passed.
- `real-user-links.spec.ts` on chrome-chromium, safari-webkit and android-chromium: 13 passed.
- Full visitor/staff/registration suites: CI.

## Not changed
Unknown speaker/session slugs without JavaScript still render the bare document, the same as main. An empty `generateStaticParams` fixed that but broke client navigation into detail pages ("Expected RSC response"), so it was reverted. Recorded in docs/features/staff-content-editor.md.
