# M2 / homepage review — 29 September 2026

Reviewed change: `8f6d020` compared with foundation `0d2f728`. The repository was clean
at review start. The user authorized review, routine scoped fixes, and continuation with
the bilingual About page. The latter is recorded separately in `docs/features/about.md`.

Source requirements: SCP-01/02/05, LOC-01/02/03, ACC-01, CMS-04, DSN-01/02,
MED-01 through MED-04, CFG-12, REL-01, plus the existing SEC/ROL closed-workflow boundary.
AGENTS.md, current decisions/progress and the relevant v0.5 sections were read.

## Findings

No actionable defects were found in the inspected M2 change. This is a scoped review,
not proof that all future workflows or public-release requirements are implemented.

One verification gap was identified: the existing browser test resumed the synthetic video
before toggling reduced motion, so it did not show that a visitor's explicit pause survived
that preference change. The pure media-policy test covered the intended rule. The browser
regression has now been extended to pause, enable/disable reduced motion, confirm the
recreated video stays paused, then explicitly resume. Execution evidence is in the latest
PROGRESS entry; do not interpret a test's presence as a passing execution.

## Inspection and risk coverage

| Area | Code inspection result | Executed evidence / limits |
|---|---|---|
| Public content and source drift | Edition/context and illustrative sections are separated from unconfirmed dates, venue, roster and sponsor claims. Full typed sitemap retained; no uncleared conference media. | Prior M2 screenshots were reviewed; current browser regression also checks closed/unpublished content. Final human editorial approval remains open. |
| Permitted browsing | EN/AR public pages, informational anchors and language switch require no login. Arabic uses RTL, scientific demo text stays English/LTR. | Current browser suite covers navigation and language continuity; About adds its own route checks. |
| Forbidden operations | No operational form, privileged data or new mutation was introduced by M2. Server guards remain hard-closed; the showcase flag is server-only and never enables CMS. | All existing denial tests are retained. No database execution is claimed; the missing Docker runtime remains an M1 blocker. |
| Preview boundaries | Dynamic showcase is default-closed in a production build and always denied when Vercel marks the environment production. Noindex is not authentication; remote draft protection remains a release dependency. | Six environment cases and browser-exposed flag rejection were executed in focused unit checks. Actual HTTP production-denial evidence from M2 is historical, not rerun in this review. |
| Media/failure | Static homepage poster, approved local-path check, muted inline playback, pause state, preferences, visibility handling and error fallback inspected. No external conference clip or embed. | Focused media tests executed; browser test exercises the synthetic clip. Actual final footage/crops/frame contrast remain untested. |
| UI/accessibility | Semantic headings/labels, native buttons, disabled/busy state, validation focus, mobile disclosure, keyboard skip, shared focus tokens and reduced motion inspected. | Chromium/axe evidence is bounded; screen-reader/real-device/Firefox/WebKit and full WCAG review remain unperformed. |
| Data loss, idempotency, scarce capacity, payment and review anonymity | No such records or transitions are implemented in M2. Demo choice is a whitelisted synthetic enum, never participant input. No new persistence or privilege path. | Not applicable to this read-only slice; closed guards are tested. This review does not certify the future operational modules. |

## Commands run during the review

`git status --short`, recent `git log`, change inspection against the two revisions, source
reads, and `. ./scripts/use-local-node.ps1; pnpm exec vitest run
tests/unit/design-contracts.test.ts tests/unit/media-policy.test.ts`.

Focused execution result: 2 files, **28 tests passed**, exit 0. The independent review did
not run a database, deploy, or start a browser/server. The integrated About task runs the
broader application/browser suite and records its actual results in PROGRESS.md.

Release conclusion: M2 remains a local design preview. CFG-12 and REL-01 are still closed.
No bug-fix claim or severity finding is manufactured from a missing future feature or approval.
