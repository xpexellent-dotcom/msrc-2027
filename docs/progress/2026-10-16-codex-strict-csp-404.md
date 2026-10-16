# 16 October 2026 — Strict private CSP and localized unmatched-route 404

Implementer handoff for Claude review/QA. ENG-045; SEC-01/06, ACC-01,
LOC-01/03, ERR-01, NFR-02, REL-06; ORG-008/013.

Initial state: clean `codex/strict-csp-404` at `7da658b`, containing three existing
public QA/image commits after supplied base `2406a17`. Those commits are preserved.
No branches, commits, pushes, PRs, environment files, hosted settings, database
changes or operational activations were made. `docs/PROGRESS.md` is untouched (O9).
No excluded implementation file from PRs #86–90 was edited; registration becomes
dynamic in a new nested layout, leaving its page untouched. Changes in existing
staff/participant test files are fixture imports, CSP-compatible text enlargement
and waiting for streamed metadata before axe.

## Result

- Fresh enforced nonce CSP on EN/AR staff, all six participant account pages,
  registration and the synthetic staff-security preview, including descendants
  and percent-encoded locale aliases. Request/response propagation, private
  no-store, hostile header rejection and concurrent nonce isolation are covered.
- A full document load across the shared Link's public/private boundary installs
  the destination CSP. Other navigation, native scrolling and reduced motion are
  preserved. No production unsafe-inline/eval script allowance or foreign origin.
- The Next 16.3.8 throwing catch-all generated a bare `__next_error__` document.
  A server-only minimal reproduction has the same failure, proving that removing
  the client useParams call alone is insufficient. The catch-all is removed;
  documented experimental globalNotFound renders the complete EN/AR document,
  unchanged 404 content, lang/dir, localized title and noindex with status 404.
  Existing deliberate in-route notFound() boundaries remain unchanged.
- Public header remains exactly the four structural directives. The final build
  retains 28 EN/AR public information-page SSG entries (14 per locale), plus the
  existing static ICS/OG assets. Registration and the global 404 are dynamic;
  staff/account pages remain dynamic. Prerender manifest contains 39 entries.
  The build reports 81 generated pages; this is not 81 public routes.

Full policy, origin-by-origin reasons, implementation choices, official Next
references and test limitations: [feature note](../features/strict-csp-localized-404.md).

## Verification receipts

PATH begins `C:\m\tools\bin`: Node 24.21.0, pnpm 11.19.0, Next 16.3.8.
`.next` was deleted before each app build, with the absolute target checked.
Playwright retries remain zero. Ports were checked before each owned server;
only recorded processes started by this task were stopped.

| Check | Observed result |
| --- | --- |
| `pnpm exec eslint . --max-warnings=0` | PASS, zero warnings (`.csp-eslint-final.log`) |
| `pnpm typecheck` | PASS, route generation and TypeScript (`.csp-typecheck-final.log`) |
| `pnpm test` | PASS, 2,433 cases / 62 files (`.csp-unit-final.log`) |
| `pnpm build` | PASS, 81 generated pages; SSG/dynamic split above (`.csp-build-final.log`) |
| First full `pnpm test:e2e` | PASS, 727 passed / 63 skipped, all three Chromium projects (`.csp-public-e2e.log`) |
| Final full `pnpm test:e2e` after encoded-locale correction | PASS, 735 passed / 63 skipped, 798 cases including all 30 new CSP/404 cases; Chromium desktop, tablet and mobile (`.csp-public-final.log`) |
| Participant synthetic suite `pnpm exec playwright test --config playwright.participant.config.ts --workers=1` | PASS, final rebuild: 62 passed / 4 skipped; desktop, tablet and mobile (`.csp-participant-final.log`) |
| Staff synthetic suite `pnpm exec playwright test --config .tools/playwright.csp-staff.config.ts` | PASS, final rebuild: 32 passed / 6 skipped (`.csp-staff-final.log`) |
| Synthetic auth lab `pnpm exec playwright test --config playwright.auth.config.ts --workers=1` | PASS, final rebuild: 81 cases / desktop, tablet, mobile (`.csp-auth-final.log`) |
| Local production-mode observability `pnpm exec playwright test --config playwright.csp-observability.config.ts` | PASS, final rebuild: 6 cases, zero CSP/page errors; same-origin script responses stubbed, no telemetry (`.csp-observability-final.log`) |
| `git diff --check` | PASS, final rerun after generated JPEG restoration |

The 30 new cases include JS on/off 404s, deep unmatched URLs, hostile locale
headers, encoded locales, all private-route headers, parser script nonces,
concurrent uniqueness, actual enforcement failures, public SSG/header checks and
public-to-registration navigation. Closed-route and synthetic fixtures assert zero
unexpected browser CSP violations throughout their flows. 404 axe has zero
violations in the final full run; no-JS axe uses the rendered DOM snapshot
method documented in the feature note because Chromium suppresses axe timers with
JS disabled. Site JavaScript remains disabled for the original document and home
navigation. Four no-JS screenshots were captured in `deliverables/strict-csp-404/`;
EN desktop and AR mobile were visually inspected after CSS entrance completion.
Final per-spec counts: private-csp 16 passed, localized-not-found 10 passed,
csp-enforcement 4 passed. All 16 404 axe audits (two locales, JS on/off, two
missing-path depths, desktop/mobile) report zero violations. The six additional
production-mode SDK tests are in their separate runner. The four tracked JPEGs
rewritten by the existing Venue tests were restored byte-for-byte from HEAD;
no generated screenshot remains in the source diff. The pre-existing 3220 process
is the only remaining listener among the task/test ports; all owned servers stopped.

Earlier failures are preserved rather than called passes:

- Initial 76-case target run: 62 passed / 14 failed, then interrupted during
  Windows server teardown (`.csp-targeted-e2e.log`). These exposed the missing
  document title, the diagnostic axe/no-JS timer limitation, an incorrect demand
  that dynamically trusted chunks also carry nonces, and a desktop-only test link
  selector on phones. The final tests retain source/DOM/axe assertions and use the
  correct navigation control. No retries or timeout increases were added.
- First participant run: 60 passed / 2 failed / 4 skipped
  (`.csp-participant-e2e.log`). CSP correctly blocked test-injected unnonced style
  elements. Both enlarged-text checks now set the allowed style attribute.
- First isolated staff run: 29 passed / 3 failed / 6 skipped
  (`.csp-staff-isolated-e2e.log`). Two unnonced test styles and one streamed-title
  race; styles changed as above and axe waits for a nonempty MSRC title. The title
  rule remains enabled.
- The production suite logs `Internal: NoFallbackError` for rejected static
  policy versions, returning the asserted 404. A separate minimal reproduction
  with globalNotFound disabled logs the same error. It is framework fallback
  diagnostics, not a new passing claim of a clean server log.

## Blocked / not tested / owner actions

- **BLOCKED:** the unmodified `pnpm exec playwright test --config
  playwright.staff.config.ts` cannot bind 3220 (`EADDRINUSE`,
  `.csp-staff-e2e.log`). PID 22004 was already an older Next process and remains
  untouched. The standard HTTP readiness fixture is replaced only in an ignored
  process-local runner: `.tools/playwright.csp-staff.config.ts` plus
  `.tools/csp-staff-readiness.cjs`. The preload returns the same readiness object
  as `scripts/staff-ui-provider.mjs`, rejects unexpected calls and makes no request
  to the occupied service. Browser fixtures and UI assertions are unchanged.
- **BLOCKED / unnecessary:** local Docker/Supabase database checks; unavailable
  in this environment. This task changes no database or authorization behavior.
- **NOT TESTED:** hosted CI/deployment, real Vercel beacon/script content, real
  email/Auth/database/provider workflows, physical devices, Safari/Firefox and
  human assistive technology. Production-mode script loading was local/stubbed.
- Next action for Claude: review the diff/ENG-045 and experimental globalNotFound
  convention, re-run required checks, free 3220 through its owner and run the
  standard staff config, then commit/open the PR. No product/content question is
  unresolved; no release or live-change authorization is implied.
