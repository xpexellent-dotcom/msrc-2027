# 2026-10-23 · Local QA proxy replays keep-alive resets once

Branch `claude/qa-proxy-retry`. Test infrastructure only; no product code.

## Problem
Visitor suites intermittently failed on a single `HTTP 502` for a static asset (fonts and images, e.g. `film-grain.jpg` and `dm_sans…woff2`) on PRs #122, #123 and #124. The local HTTPS proxy (`scripts/real-user-test-server.ts`) reuses kept-alive upstream sockets. When Next closed one just as it was reused, Node raised `ECONNRESET` with `reusedSocket` set and the proxy answered 502.

## Fix
Bodiless GET/HEAD requests are replayed once on that specific error, before any response header is sent. This is Node's documented handling of the keep-alive race. All other errors still return 502 and are logged.

## Checks
- `tsc --noEmit`, eslint on the script, `pnpm build`: pass.
- `real-user-links.spec.ts` on chrome-chromium and safari-webkit: 9 passed. Links and discovery on chrome-chromium: passed. The only logged transport error was the expected `ECONNREFUSED` readiness probe while `next start` booted.
