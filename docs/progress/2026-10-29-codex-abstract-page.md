# ENG-088 / ORG-068 — Research competition and abstract submission v2

Task receipt reserved for 29 October 2026; implementation and local checks were
performed on 28 October 2026. Branch `claude/abstract-page`, unchanged HEAD
`576fce900c4ee70c3a64d47d245e6f78967aaf76`. Work is uncommitted. The initial
working tree was clean. `docs/PROGRESS.md` is unchanged.

## Delivered scope

- Public EN/AR Research competition page at `/{locale}/abstracts`, using the
  incumbent purple/photo/ivory visual system and native scrolling. Includes the
  supplied copy, semantic six-step ORG-058 calendar journey, presentation boxes,
  eligibility, preparation checklist, six-section guidelines, seven simplified
  criteria without weights/thresholds, nine rules and Contact link. Server HTML
  stays static-friendly; only the state-aware CTA reads the session client-side.
- Private, force-dynamic/noindex workspace at `/{locale}/abstracts/submit`.
  Navigation, My MSRC actions, public participation, email links, sitemap,
  robots/private CSP and observability classifications are reconciled. Existing
  `/submissions` routes permanently redirect to the public page; old `/abstracts`
  links resolve to information with a state-aware route into the workspace.
- One-page six-step form: profile/account presenter card, co-author controls,
  shared contact-only supervisor phone picker, conditional ethics/registration,
  six English/LTR scientific sections, declarations, complete read-only review,
  prominent one-chance warning, reference and roadmap after finalization.
  Autosave still retains conflict/error/reload and optimistic-version behavior.
  The sticky total is confined to the abstract-writing section; preview totals
  are static. Suggested word ranges are isolated LTR in Arabic labels.
- Fixed owner taxonomy in `src/content/abstract-taxonomy.ts`; profile interests
  retain their existing settings-dependent behavior. Obsolete settings fields
  remain because incumbent profile/review/settings consumers still depend on
  their contracts. Submission readiness no longer requires those obsolete fields.
- Server/DB validation: 350 including six headings, title 20, completed analysis
  and written manuscript confirmation, required results/limitations, taxonomy,
  supervisor contacts, ethics/registration and all five declarations. Finalize
  order is window → profile complete → presenter eligible → unused chance →
  valid document, followed by the existing evidence gate. The one-chance check is
  transactionally authoritative in the server-only RPC, allowing cached success
  replay after a lost response. Withdrawn/rejected finalized records still count.
- Every existing scientific consumer retains compatibility through explicit
  scientific whitelists and legacy projections: staff detail/workspace, sanitized
  and reviewer packets/scorecards, advisory jobs/provider request, event judging,
  reporting/export specialty aggregates, email links and their tests. No rubric,
  weights, thresholds, provider behavior or decision publication policy changed.

## Migration and privacy

Exactly one new review-only migration:
`supabase/migrations/20261029120000_abstract_submission_v2.sql`.

The migration changes editable draft JSON; finalized documents and immutable
snapshots are projected at read time instead of rewritten. Legacy Aim becomes
Objectives, Limitations is empty, obsolete fields disappear from the view, and
new confirmations remain false. Surplus old drafts are retained privately as
withdrawn with an audit receipt, leaving one active draft. Those never-finalized
archives do not consume the participant's final chance. Historical finalized
duplicates remain intact and consume the chance; no destructive history cleanup.

Existing advisory/transaction locks serialize one-chance and one-draft writes;
a partial unique index also enforces one active draft. Forced RLS, private
schemas, no client policies/grants, service-role-only public RPCs, READ COMMITTED,
session/ownership checks, idempotency and immutable audit are retained. The shared
Hackathon counter is adjusted to subtract the abstract-only six headings so its
incumbent behavior is unchanged.

Supervisor fields are only in private owner/scientific detail paths. Reviewer
and provider packets explicitly exclude them. Local identity-canary context
recognizes the supervisor name to prevent identity leaks; that private context
is not transmitted to the provider. Existing account cleanup and retention
paths blank supervisor values in submissions, snapshots and cached operation
results. Only this exact authorized redaction can bypass snapshot immutability;
scientific data stays intact and audit records omit the contact values.

The incumbent advisory local identity context also retains its existing limit of
100 names/institutions. No author submission cap was added; that advisory
readiness limitation remains separate from this closed form.

The earlier abstract module has a broader author/document retention gap.
That existing gap is recorded as a release blocker; the new supervisor handling
does not claim to solve all historical submission personal-data retention.

## Checks and observed results

All browser providers/records were synthetic and loopback-only. No browser suite
proves real authentication, database permissions, delivery or production behavior.

| Status | Command / check | Observed result |
| --- | --- | --- |
| PASS | `pnpm lint` | Exit 0, zero ESLint warnings. Final UI files also passed scoped ESLint after screenshot-driven refinement. |
| PASS | `pnpm typecheck` | Route type generation and TypeScript exited 0. |
| PASS | `pnpm test` | 5,489 tests in 134 files passed. Includes 127 abstract cases for new fields, taxonomy, eligibility, gate order, one chance, lost-response replay, legacy projection and Unicode parity. |
| PASS | `pnpm build` | Production build exited 0; EN/AR `/abstracts` prerendered, `/abstracts/submit` dynamic. |
| PASS | `pnpm exec playwright test --config playwright.abstracts.config.ts` | 64 passed, zero retries/failures on desktop Chromium and 360px Android-emulated Chromium, EN/AR. Public/body/preview, no overflow, axe, conditional fields, autosave/recovery and all distinct gates. |
| PASS | `pnpm exec playwright test --config playwright.profile.config.ts` | 28 passed, zero failures/retries; EN/AR desktop/mobile profile phone reuse, profile behavior and submission-completeness gate. |
| PASS | `pnpm exec playwright test --config playwright.participant.config.ts abstracts-closed.spec.ts participant-accounts.spec.ts participant-journey.spec.ts` | 156 passed, four intentional desktop skips, zero failures/retries across desktop/tablet/mobile/360px EN/AR account and participant journeys; closed abstract boundary preserved. |
| PASS | `pnpm exec playwright test --config playwright.staff.config.ts research-workspace.spec.ts advisory-scoring.spec.ts` | 58 passed, zero failures/retries; science/reviewer compatibility, supervisor visibility/minimization, EN/AR and axe. |
| PASS | `pnpm exec playwright test tests/e2e/axiom-navigation.spec.ts tests/e2e/participation-flow.spec.ts tests/e2e/fluid-journeys.spec.ts tests/e2e/public-copy-dates.spec.ts tests/e2e/private-csp.spec.ts` | 74 passed; 18 intentional project/device skips; zero failures/retries. |
| PASS, surrogate only | PGlite with Supabase stubs, command below | 904 assertions across eight affected suites pass; not a native PostgreSQL/Supabase security or concurrency result. |
| PASS | `git diff --check`; branch/HEAD and `git diff -- docs/PROGRESS.md` | No whitespace errors, requested branch/base unchanged, no PROGRESS edits. |
| BLOCKED locally / NOT TESTED | Native Supabase reset, `pnpm db:lint`, `pnpm db:test`, genuine integration concurrency | No local Docker, per task environment. Disposable Linux CI must run strict Supabase lint, native pgTAP and integration concurrency before merge. |
| NOT TESTED / unperformed | Hosted migration/configuration, production, real participant communications, actual phones/assistive technology/native Arabic approval | No hosted changes or real delivery; human/UAT and release approval remain separate. |

Surrogate command (local pre-existing test harness outside this worktree):

```text
node C:/m/pglite/test.mjs C:/m/codex-abstract abstract_submission_v2.test.sql abstract_review.test.sql participant_profile_complete.test.sql advisory_scoring.test.sql research_judging_awards.test.sql hackathon_3mt.test.sql organizer_dashboards.test.sql announcements.test.sql
```

Observed suite counts: v2 107; abstract/review 110; profile completeness 72;
advisory 111; judging 96; Hackathon/3MT 151; dashboards 147; announcements 110.
Native multi-connection cases were updated for one chance, one draft, idempotent
retries and profile authority but remain unrun locally. Migration replay in the
surrogate passed; native migration lint is still a CI gate.

Combined `pnpm check` also passed: lint, generated
route types/TypeScript, all 5,489 unit tests and the production build. This
includes the final consumer length/canary regressions and presenter minimization
test. The final label layout then passed scoped ESLint and a fresh production
build; its create-to-finalize browser recheck passed all four EN/AR
desktop/mobile journeys, including axe and fresh visual captures, recorded in
`.tools/abstract-page/final-layout-playwright.log`. Authoritative combined log:
`.tools/abstract-page/final-check.log`.

Earlier separate logs: `.tools/abstract-page/final-{lint,typecheck,unit}.log`.
Latest build and browser logs: `final-build.log`,
`final-abstracts-playwright.log`, `final-profile-playwright.log`,
`final-participant-playwright.log`, and `.tools/abstract-v2-surrogate.log`.
Additional agent-run staff/public browser results are reported above; initial
staff screenshots were overwritten by concurrent suite output cleanup and are
not claimed as retained visual artifacts.

Initial browser findings were fixed and rerun: eight gate-state axe failures
from duplicate unnamed complementary landmarks, and four public assertions
incorrectly expecting a preview deployment to omit global noindex headers.
Actual indexing is verified by production metadata/sitemap unit checks and the
prerendered public route. No accessibility rule, assertion, timeout or retry
budget was removed or relaxed. Windows webserver helpers retained stdout after
all cases completed; only PIDs explicitly printed by each finished suite were
stopped to release teardown and obtain the normal final exit/summary.

## Visual evidence

Stable synthetic captures are under `.tools/abstract-page/screenshots/`, for
example `abstracts-desktop-en-public.png`, `abstracts-desktop-ar-form.png`,
`abstracts-mobile-360-ar-public-evaluation.png`,
`abstracts-mobile-360-en-form-supervisor.png`,
`abstracts-mobile-360-ar-form-body.png` and locale/device preview captures.
Desktop full-page and mobile viewport sections were reviewed. Mobile sections
cover hero/roadmap/evaluation/rules/closing, research/presenter/supervisor/ethics/
body/declarations and preview/submit. Native scrolling, RTL, labels, visible
focus and overflow/axe assertions passed. Tall mobile full-page images initially
contained blank raster regions; viewport captures replaced them and prove the
lower content actually renders on scroll. These are browser emulations, not
physical-device or native-reader sign-off.

## Copy approval — superseded by ORG-069, 31 October 2026

All copy listed below is now owner-approved under ORG-069, without wording changes.

- **All new Arabic**: public Research competition copy, taxonomy labels, CTA,
  journey, eligibility/guidelines/criteria/rules, navigation/footer research
  labels, participant form/preview fields, confirmations, errors and eligibility/
  one-chance messages, and private scientific supervisor labels. Existing
  approved legal policy translations were not rewritten.
- **English and Arabic ethics helper**: select the study's ethics basis;
  approved requires committee/IRB name + reference, exempt requires reference
  or short explanation, not_required requires explanation such as no human
  participants or data; no patient-identifying information.
- **English and Arabic registration helper**: enter registry + registration
  number when registered; otherwise select Not applicable. These helpers are
  organizer-requested helpers approved under ORG-069; they are not a legal or ethics determination.

## Hosted rollout order and remaining gates

1. Obtain disposable CI evidence for migration lint, native pgTAP and genuine
   concurrency; review this uncommitted code and the single migration.
   Arabic/ethics helper review is complete under ORG-069; Terms v1.1 resolves the
   recorded conflict pending owner merge (ENG-089), before any participant opening.
2. Deploy code first with operational/delivery flags unchanged. Until database
   documentVersion 2 exists, the new handler intentionally shows area-not-ready
   and retains sign-in, rather than sending a v2 document to old RPCs.
3. In a separately authorized hosted operation, apply the reviewed migration and
   verify permissions, legacy/current projections and supervisor privacy/erasure.
   This task does not authorize or perform that operation.
4. Keep workflows closed until staff deliberately configure exact opening and
   closing instants and all existing account/privacy/evidence/release gates pass.
   ORG-058 display dates never seed those settings. The existing confidential
   evidence/virus-scanning gate remains independent and closed. No real email.

Terms v1.1 EN/AR resolves the superseded v1.0 research clauses under ORG-069,
pending owner review and merge. Broader pre-existing abstract author/document
retention remains a separate release gate.

Next task: owner/Claude review and commit, CI verification, then the separately
scoped PR 2 for screening/scoring/thresholds/supervisor notification. Nothing in
this slice opens submissions, applies a hosted migration, changes a flag or
sends a message.
