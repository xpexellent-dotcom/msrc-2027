# Bilingual participant email drafts and banner

Date: 23 October 2026. Worktree: `C:\m\codex-emails`.
Branch: `claude/bilingual-emails`. Decisions: ORG-058 and ENG-066.
Requirements: EML-01–05, LOC-01/03, ACC-01, REG-04/06/07 and REV-07.
`docs/PROGRESS.md` is unchanged. The task authorizes a local commit, without push.
Staging is BLOCKED by filesystem permissions on the Git directory outside this
worktree; the implementation remains uncommitted for Claude. No push was attempted.

## Implemented result

All eight participant registration templates and the accepted, not-accepted and
revision abstract outcomes render a top banner, complete English message,
divider and complete Arabic translation. Subjects contain English and Arabic.
Arabic HTML has `dir="rtl"`, `lang="ar"` and the local Arabic font stack; dates
use Gregorian Arabic month names/numerals and Riyadh time. Plain text contains
the banner alt text/absolute HTTPS URL and both complete language blocks.
Existing English wording, configured facts and stored deadlines are preserved.

`public/brand/email-banner.png` is a 600 × 338px resize of the existing approved
previous-edition homepage still `public/media/msrc2026/poster-desktop-v1.jpg`.
The reproduction script is `scripts/build-email-banner.mjs`; the existing crop
is preserved. Alt text identifies the MSRC 2026 audience as a previous edition.
The incumbent media approval is for homepage use: email placement remains DRAFT
for owner review with the complete composition. No artwork, logo, tracking
pixel, remote font, date, price, policy or participant claim was invented.

The private EN/AR Super Admin email-preview area shows all eleven variants with
the banner and separate English/LTR and Arabic/RTL message blocks, full plain
text, escaped HTML source and keyboard copy/manual-copy fallback. All variants
are marked DRAFT. Preview rendering uses fixed synthetic samples and creates no
outbox event or email. Existing staff assurance and server role checks remain.
The browser never executes email HTML received from the preview response.

Every participant template is worker-blocked pending owner approval, including
a job carrying an older frozen English-only provider request. Frozen requests
are not rewritten, rerendered or requeued. Staff/reviewer/faculty-judge emails,
staff session email checks, Contact delivery and the internal synthetic outbox
fixture retain their English-only policy.

## Files and contracts

- Rendering and delivery guard: `src/lib/email/outbox.server.ts`, new
  `src/lib/email/participant-message.server.ts`, and `src/lib/jobs/outbox.server.ts`.
- Staff previews: `src/features/staff-portal/email-previews.server.ts`,
  `email-previews-panel.tsx`, `email-previews-copy.ts`, `copy.ts`, `ui-contract.ts`,
  and `src/styles/staff-console.css`.
- Asset: `public/brand/email-banner.png` and `scripts/build-email-banner.mjs`.
- Tests/fixtures: `tests/unit/registration-emails.test.ts`,
  `__snapshots__/registration-emails.test.ts.snap`,
  `fixtures/registration-email-english.json`, `abstract-decision-email.test.ts`,
  `participant-email-drafts.test.ts`, `staff-email-previews.test.ts`,
  `staff-action-summary.test.ts`, and `tests/staff-e2e/email-previews.spec.ts`
  with `fixtures/email-previews.json`.
- Documentation: `AGENTS.md`, `docs/DECISIONS.md`, `docs/REQUIREMENTS.md`,
  `docs/MEDIA_REGISTER.md`, `docs/features/REGISTRATION_EMAILS.md`,
  `EMAIL_OUTBOX.md`, `ABSTRACT_REVIEW.md`, and this receipt. Complete synthetic
  plain-text previews are recorded for every outcome and both confirmation policies.

**Migrations: none. New or changed RPC signatures: none.** Template keys and
versions remain unchanged at version 1. Database producers retain `locale: "en"`.
Registration payloads and the abstract decision payload's four fields
(`reference`, `outcome`, `instructions`, `revision_deadline`) are unchanged.

The server-only rendering contract adds an optional second argument:

```ts
renderOutboxMessage(
  message: OutboxMessage,
  translations?: ParticipantEmailTranslations,
): EmailRequest

type ParticipantEmailTranslations = Readonly<{
  abstractInstructions?: Readonly<{ english: string; arabic: string }>;
}>;
```

Nonempty authored instructions require an explicit Arabic companion whose
English matches the stored text; absent, empty or mismatched translations fail
closed. This is server-supplied review context, not a new persisted payload
field or runtime translation service. The revision preview supplies a fixed
synthetic pair. A reviewed authoring/persistence path for real Arabic committee
instructions remains a release gate. Long abstract references are abbreviated
only in the subject to respect its existing limit; the full reference remains
in the body.

`StaffEmailPreview` adds `previewKey`, `englishText`, `arabicText` and
`banner: { src, alt, width, height }`; `wordingStatus` is now only `"draft"`.
Existing `templateKey`, `templateVersion`, `recipient`, `subject`, `text` and
`html` remain available. `previewKey` distinguishes three outcomes of the same
abstract template. No preview RPC or browser-supplied translation endpoint was added.

## Observed checks

Environment: Node `v24.21.0`, pnpm `11.19.0`; `C:\m\tools\bin` first on PATH.
The primary application checks below ran against this worktree. The disposable
browser execution is identified separately from the blocked canonical command.

| Status | Command/check | Observed result |
|---|---|---|
| PASS | `pnpm install --frozen-lockfile` | Installation completed with the existing lockfile |
| PASS | `pnpm lint` | No lint warnings/errors |
| PASS | `pnpm typecheck` | Next route type generation and TypeScript completed |
| PASS | `pnpm exec vitest run` | 95 files, 4,139 tests passed |
| PASS | `pnpm build` | Production build completed; 112 pages generated |
| PASS | `git diff --check` | No whitespace errors at this checkpoint |
| PASS | `pnpm exec vitest run tests/unit/email-doc-fixtures-export.test.ts` | Temporary exact-preview export: 1 file, 1 test; temporary test/script/JSON removed |
| BLOCKED | `pnpm exec playwright test -c playwright.staff.config.ts` | Existing listeners occupy canonical ports 3219/3220; owner processes were preserved |
| FAIL | Configuration-only alternate-port staff startup | Existing loopback-origin guard prevents running the fixture mode on an arbitrary port; no browser pass inferred |
| BLOCKED (final runner exit) | Disposable `pnpm exec playwright test -c playwright.staff.config.ts` | All 302 cases completed: 290 passed, 12 intentional skips, no failed cases. Runner stalled after the final case before report/exit and was interrupted; no command-level PASS claimed |
| BLOCKED (final runner exit) | Disposable `pnpm exec playwright test -c playwright.staff.config.ts email-previews.spec.ts --reporter=list` with `DEBUG=pw:webserver,pw:runner` | 14 cases passed, 2 intentional desktop skips. Includes 14 clean axe checks. Debug log stops at `pw:webserver Terminating the WebServer`; interrupted after confirming the shutdown stall |
| PASS | Visual EN/AR desktop/mobile review | Four captured previews inspected: banner, complete bodies/divider, controls, URL wrapping and bounds |
| PASS | Disposable source parity | 563 source/public/script/staff-harness files match primary worktree apart from the declared loopback port substitutions |
| BLOCKED | `git add -- AGENTS.md` and requested screenshot restore command | External Git index lock permission denied; all task work remains unstaged/uncommitted. Tracked review screenshots are unchanged |
| NOT TESTED | Real email clients/inbox delivery and human native-Arabic UAT | No real email sent; no delivery or human approval claim |
| NOT RUN | pgTAP/database lint/integration database suites | No SQL or RPC change; local Docker unavailable; no database result inferred from unit/browser tests |

The initial full Vitest run failed one stale staff action-summary expectation
after the UI label changed from registration emails to participant emails.
The expectation was updated to the actual new EN/AR tool scope; the subsequent
full run passed all 4,139 tests. No production behavior was weakened to satisfy it.

Unit coverage includes every participant template and both confirmation policies,
both language bodies, Arabic RTL, banner alt/absolute HTTPS URL, unresolved
placeholders, faithful retained English, escaping, invalid inputs, translation
companion failures, and refusal of draft/frozen participant messages. Staff
browser cases cover EN/AR presentation, keyboard copy, clipboard failure,
role denial, malicious-HTML nonexecution and axe assertions. Their observed
case results are green; the command-level shutdown blocker is separate.

## Owner and Claude review

Review the Arabic wording with a native reader, especially confirmation policy
sentences and scientific outcomes; approve the complete bilingual compositions
and email placement of the previous-edition image before sending. Approving
ORG-058's language direction does not approve the translations themselves.
Decide how reviewed Arabic companion text for real committee-authored abstract
instructions will be collected and retained before decision email activation.
Review the worker guard and immutable frozen-envelope handling when authorizing
a future template-approval change.

Review the final browser receipt, screenshots and commit before accepting this
slice. Actual inbox/client behavior, image blocking and screen-reader/human UAT
remain untested. Existing provider, privacy, quota, cadence and delivery gates
remain in force. No hosted migration, setting/seed, flag activation, participant
opening, DNS change, paid resource, real message or push was performed.

## Local browser isolation and Git constraints

The canonical staff ports were occupied by other worktrees. Those processes were
preserved. A configuration-only alternate-port attempt returned HTTP 404 because
the test-mode server deliberately pins its loopback origin. It was stopped, and
its temporary root config/test copies were removed.

The disposable copy at `.tools/bilingual-emails/port-build` contains the same
`src`, `public`, `scripts`, `tests`, `evaluation`, package/lock and build config.
Only literal synthetic loopback ports change: 3219 to 3259 and 3220 to 3260 in
`playwright.staff.config.ts`, the staff browser specs/CSP helper, the synthetic
provider, and the staff config/email-link/CSP loopback guards. The real worktree's
guards and canonical config remain unchanged. Dependencies were installed there
with `pnpm install --offline --frozen-lockfile --store-dir C:\m\codex-emails\.pnpm-store`.
The final disposable `pnpm build` passed (112 pages) before browser execution;
log: `.tools/bilingual-emails/isolated-build-final.log`. The browser command is
`pnpm exec playwright test -c playwright.staff.config.ts`, run in that disposable
directory, with log `.tools/bilingual-emails/staff-playwright-final.log`.
The configuration used is retained as `.tools/bilingual-emails/staff-config-used.txt`;
the temporary runnable config was removed after the runs. The normal worktree's
`playwright.staff.config.ts` remains unchanged.

Earlier disposable attempts are retained as diagnostics: reusing a dependency
junction first triggered pnpm's workspace-verification guard; the first compiled
copy lacked the `evaluation` directory and failed TypeScript; copying that
directory corrected the cause. An intervening webpack build was interrupted and
is NOT a passed check. The final run uses the normal Turbopack build. These are
local test-copy setup failures, separate from the passing primary-worktree checks.

All four EN/AR desktop/mobile email-preview screenshots were visually inspected:
banner, both complete language blocks, divider, wrapping, copy control and narrow
layout passed. Copies are retained in `.tools/bilingual-emails/email-previews-*.png`.

`git add -- AGENTS.md` failed with:
`Unable to create 'C:/m/msrc/.git/worktrees/codex-emails/index.lock': Permission denied`.
No files were staged and no commit could be made. The required
`git checkout -- .impeccable/review/` command hit the same permission error
(exit 128); `git diff --name-only -- .impeccable/review/` is empty, so those
tracked screenshots are unchanged. No Git lock, permission or outside-workspace
file was altered to bypass this restriction. Claude must stage and commit the
28 changed/new task files on `claude/bilingual-emails` from an authorized session.

The focused run identified the final-exit stall at Playwright's webserver
termination step, not an assertion failure or HTML-report generation. An attempt
to start the isolated Next server directly with fixed synthetic staff test
settings was rejected by automatic approval review (`blocked by policy`, no
further reason supplied). No approval setting or feature configuration was
changed to bypass that rejection. All local test processes started by this task
were stopped; the owner's original 3219/3220 processes were preserved. A clean
runner exit remains to be verified in disposable CI or an authorized local
session with working process teardown. No retries or timeouts were increased,
and no assertions were removed.
