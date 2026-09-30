# Feature checklist audit — 1 October 2026

Target: [MSRC 2027 Website Feature Checklist and Project Follow Up](https://chatgpt.com/space/page_5962a54672888191869e3c6108c27678).
Scope: reconcile status, source rules, evidence and next sequence; update this Page and
repository continuity documents. Exclusions: new application features, service provisioning,
live data/schema writes, workflow activation, PR merges, deployment, DNS, email or reminders.

## Result and material findings

1. **The Page substantially understated delivery.** M1 foundation and the full M2 component
   inventory exist. Home/About are implemented in both locales and are publicly reachable.
   The former no-application assessment came from another workspace. The separate AI
   prototype remains historical reference and is not integrated into this platform.
2. **M3 and REL-01 remain incomplete.** The typed sitemap retains15 destinations, but only
   Home/About are standalone public content pages. Dates/Venue still returns404; final
   media, other pages, approved copy/contact/privacy/terms and human release UAT remain.
   No application workflow becomes complete just because hosting works.
3. **The live site is a publicly reachable draft.** It identifies itself as a development preview
   and carries noindex/nofollow/noarchive. Noindex does not restrict access. Resolve whether
   this exact draft is approved to remain public; keep unapproved material behind protected
   Preview. No access-control or deployment setting was changed during this audit.
4. **CI is successful for the deployed commit, with a main-run gap.** PR workflow36734074148
   passed every application/database step on9e018ae. Main push workflow36734737705 was
   cancelled. The branch API reports protected=false; required merge-check enforcement
   needs confirmation/configuration. PR2 remains open with its head already equal to main.
5. **Closed boundaries work in the live read-only smoke check.** All15 workflow GETs returned
   503 WORKFLOW_CLOSED. This verifies closure, not authorization of future implementations.
   The single existing migration is a synthetic fixture, not the operational data model.
6. **Some checklist decision requests reopened settled rules.** The update retains confirmed
   abstract/hackathon requirements and separates outstanding configuration. AI-03 is still
   the current independent-human-draft-before-reveal default; the Page's description of a
   later AI-proposal design lacks a cited superseding organizer decision.
7. **Backlog coverage is planning evidence.**24 epics,152 implementation issues,13 decision
   packets and212 source IDs are present. No external issue creation or appointed owner is
   implied. Current status/next-task entries are reconciled; historical validation is retained.

Source anchors: DSN-01/02, LOC-01/02/03, ACC-01, MED-01–04, INF-01/04/05,
SEC-01/02/06, ABS-01/04/07/08/09–11, AI-01–06, HAC-01/02/04/05/06/08/09,
TMT-01/02, CFG-01–13 and REL-01–06. v0.5 is unchanged.

## Repository and deployment evidence

- Local start: clean codex/m2-component-system at706219d. Read-only GitHub comparison
  showed eight newer commits, including the already-merged QA PR4. A fast-forward to
  origin/codex/m2-component-system preserved those existing changes. Audit baseline:
  9e018ae919121c4584cc83467db8e258da40a387, also current main at inspection.
- [PR1](https://github.com/xpexellent-dotcom/msrc-2027/pull/1),
  [PR3](https://github.com/xpexellent-dotcom/msrc-2027/pull/3) and
  [PR4](https://github.com/xpexellent-dotcom/msrc-2027/pull/4): merged.
  [PR2](https://github.com/xpexellent-dotcom/msrc-2027/pull/2): open; head9e018ae,
  older stacked base chore/m1-database-ci-verification. Review/close the stale PR separately.
- [PR CI36734074148](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36734074148):
  completed/success; lint, typecheck, unit, build, browser and isolated migration/RLS jobs
  all have successful steps. No test count was inferred from step labels.
- [Main CI36734737705](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36734737705):
  completed/cancelled. Do not relabel it as passing because another run on the same SHA passed.
- GitHub deployment6762942669: Production, SHA9e018ae, status success; environment URL
  `https://msrc-2027-7flq64tsc-msrc2027.vercel.app`. Commit Vercel status: success,
  [deployment dashboard](https://vercel.com/msrc2027/msrc-2027/BoNfEuBUXb7HFE1VvUV1VUmva1UW).
- One recorded Preview deployment6762818980 at
  `https://msrc-2027-8xk97f37l-msrc2027.vercel.app/en/design-system` sent the unauthenticated
  request to Vercel login. The final HTTP200 was the login page, not the showcase.
  Authenticated preview rendering and all-project protection settings remain unverified.

## Checks actually performed in this audit

| Command or inspection | Observed result |
|---|---|
| Page read of all245 blocks and open comments | Readable/writable; no instruction blocks or open comments; targeted status reconciliation preserves other content |
| `git status --short --branch`; `git log -3 --oneline` | Clean initial checkout706219d; existing remote QA work discovered |
| `git fetch origin`; `git merge --ff-only origin/codex/m2-component-system` | Fast-forward success to9e018ae; no reset, forced checkout, new application implementation or merge commit |
| Existing `.tools/ci/read-repository.ps1` GET helper: PRs1–4, main, compare, Actions jobs, commit statuses and deployments | Current metadata recorded above; credential manager used without printing keys |
| `Invoke-WebRequest` HTTPS www `/en`, `/ar`, `/en/about`, `/ar/about` | All200; EN lang/ltr and AR lang/rtl observed on home documents; preview titles/noindex headers |
| HTTPS www `/design-system`, `/en/design-system`, `/ar/design-system` | All404 |
| HTTPS www `/en/dates-venue`, `/sitemap.xml` | Both404, consistent with incomplete M3/public indexing |
| HTTPS www `/robots.txt` |200; `User-Agent: *` / `Disallow: /` |
| HTTP and HTTPS `msrc2027.com/` with ordinary redirect following | Both reached `https://www.msrc2027.com/en`,200; this audit did not independently record each intermediate status |
| `Resolve-DnsName -Name www.msrc2027.com -Type CNAME` | `faa763cc393bee28.vercel-dns-017.com` |
| GET `/api/workflows/<workflow>` for all15 configured names | All503 with error code WORKFLOW_CLOSED; no POST/body, business mutation or participant record |
| Unauthenticated recorded Preview design-system request | Redirected to Vercel login; no authenticated showcase claim |
| Guarded Page patch and fresh full read |65 targeted block updates applied; all65 replacement texts verified exactly;245 total blocks preserved |
| Vercel connector metadata | Team list empty; get-project tool validation error; explicit msrc2027 project listing returned403. No bypass or settings mutation attempted |
| Independent backlog structural/source review |24 epic files;152 implementation +13 DR rows;212 unique source IDs mapped; no duplicate IDs/missing required fields reported |
| Final documentation validation and `git diff --check` | PASS:165 index rows match issue bodies;19 required fields each;212 source IDs mapped;13 CFG paragraphs unchanged;221 relative file/anchor references resolve; no whitespace errors |

Live workflow names checked: auth, cmsEditing, abstracts, review, advisoryAssessment,
registration, payments, workshops, hackathon, threeMinuteThesis, checkIn, surveys,
certificates, support, sponsorshipInquiries.

No local lint/typecheck/unit/build/E2E/database suite was rerun: this is documentation-only
and the same source commit's executed CI was inspected. Prior QA evidence in PROGRESS
records184 unit/102 Chromium cases and WebKit public-page passes, with keyboard and
showcase failures/limitations. Earlier isolated database evidence records20 pgTAP and10
integration tests. Those historical counts are not newly executed results. This audit did
not certify the WebKit explanations or convert a partially failing suite into a full pass.

NOT TESTED: hosted Supabase current health/schema/RLS or live writes, real participant
flows, real email/payment, authenticated Vercel settings/showcase, Firefox, real devices,
screen readers, final-footage contrast/performance, backup restore, rollback rehearsal,
monitoring/incident routing, institutional custody and human editorial/media sign-off.

## Next sequences and gates

| Order | Bounded next slice | Ready to start? | Required completion evidence |
|---|---|---|---|
|1|M3 media shortlist and EN/AR Home/About review, BL-DSN-02/03 and BL-PUB-01/09|Yes, candidate/review work|Source IDs, intended slots, rights/consent, captions/alt text, crops/encoding proposal and named approval; no unreviewed publication|
|2|BL-PUB-02 Dates and Venue preview|Yes, next smallest code PR|Both locale routes, honest unpublished values, responsive/keyboard/RTL tests; dates/venue remain CFG-01/12 gated|
|Parallel|BL-SEC-01 server/RLS permission contract|Yes, synthetic actors only|Role/action/data/ownership/denial matrix; no live grants opened|
|Before release|BL-DEP-01/02/04/05/06, BL-GOV-02 and DR-CFG-09/10/11/12|Technical evidence work can start; approvals remain required|Resolve public draft boundary, main-run/check enforcement, custody, content/contact/privacy/terms, UAT, monitoring/recovery and release owner|
|M4|Staff identity/grants/MFA then structured CMS|Prepare foundation now; editing remains closed|BL-AUTH-01/05, BL-FND-06 and BL-SEC-01 before BL-CMS-01; permission tests and protected preview/publishing|
|Later|M5/M6 human submissions; M7 registration/workshops; M8 competitions; M9 operations; M10 certificates; M11 handover|One authorized slice at a time|Separate REL-02–06 and relevant DR packets; AI remains optional/advisory and cannot delay permitted manual review|

Owner types above are responsibilities to assign, not named appointments or deadlines.
Public static information may advance without an editor UI. Optional Windows Docker and
missing event dates do not block safe M3 preview work. No sequence opens by elapsed time.

## Continuity, configuration and rollback

Use this Page as the high-level status view; use PROGRESS, DECISIONS and the bounded backlog
issues for execution. At each task: cite source IDs, select one issue, list concrete files/
migrations/configuration and tests, then record executed evidence and the next issue.
Reconcile status after meaningful changes; no recurring automation was created here.

Changes authored by this task are Page/repository documentation only. Migrations: none.
Environment/configuration changes: none. Manual follow-up: assign approvers/custodians,
review public draft/content/media, complete the listed release checks; Vercel settings
inspection needs access to the msrc2027 scope. No secret needs to be pasted into chat.

Repository file inventory:

- `docs/PROGRESS.md`
- `docs/DECISIONS.md`
- `docs/reviews/checklist-audit-2026-10-01.md`
- `docs/backlog/README.md`
- `docs/backlog/01-governance.md`
- `docs/backlog/02-foundation.md`
- `docs/backlog/03-design-system.md`
- `docs/backlog/04-public-site.md`
- `docs/backlog/22-testing.md`
- `docs/backlog/23-deployment.md`
- `docs/backlog/ISSUE_INDEX.csv`
- `docs/backlog/VALIDATION.md`

Rollback: revert only this audit's documentation edits or guarded Page changes after
preserving later human edits. Do not undo the eight pre-existing QA commits obtained by
fast-forward. No database, environment, deployment or DNS rollback is needed for this audit.
