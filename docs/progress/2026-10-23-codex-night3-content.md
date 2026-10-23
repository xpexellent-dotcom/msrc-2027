# Night-3 Task 3: staff content editor (O9)

Date: 23 October 2026. Decision: ENG-063. Requirements: CMS-01–04, PRG-01,
SPN-01, MED-02, ROL-09/10/12, LOC-01/03, ACC-01, SEC-01/02/06.

## Scope and starting evidence

Read AGENTS.md, PROJECT_BRIEF, DECISIONS and PROGRESS, the current requirements,
and the existing staff/media contracts before implementation. ORG-055/056/057
remain binding. The worktree started clean with Tasks 1–2 present, including
the media library and published-asset picker. The implementation remains
uncommitted. No branches, hosted migrations, settings seeds, flags, participant
openings, real email or approved legal/email wording were changed.
`docs/PROGRESS.md` was not edited.

Static-source audit covered `people-and-partners.ts`, `team.ts`,
`conference-catalogue.server.ts`, `homepage-narrative.ts`, `dates-venue.ts`, and
their home/programme/speaker/sponsor/team/media/workshop consumers. The current
speaker and session catalogues are empty; the existing approved team roster and
public placeholder/partner material remain the fallback. No people, programme,
sponsor, date, price or capacity was seeded. Synthetic browser fixtures are
loopback-only and do not write database records.

## Delivered

- Four editable bilingual collections: speakers, programme sessions,
  sponsors/partners, and committee/team members. Roles are exactly
  `contentMediaEditor` and `superAdmin`.
- New pending migration `20261023022851_staff_content_editor.sql` creates five
  private forced-RLS tables in `msrc_content`. Expected versions, serialized
  edition mutations, immutable revision/publication/audit records and versioned
  many-to-many session speakers protect concurrent work. Authority is rechecked
  after lock waits; READ COMMITTED is checked at entry.
- The staff API follows current native session/assurance, same-origin,
  single-use-token and missing-RPC patterns. Missing migration returns
  `area-not-ready` without signing staff out. Invalid/provider responses expose
  no raw diagnostics. Content payloads alone allow a bounded 128 KiB.
- The EN/AR interface provides create/edit/list, RTL Arabic fields, both-language
  public-card previews, the Task 2 media picker, drag and keyboard reorder,
  confirmation before Publish/Unpublish, version history and restore to a new
  draft. Translation and sponsor display-permission gates apply at publication.
  Stale versions preserve the unsaved form and require reload. A referenced
  speaker withdrawal explains that its published sessions must be revised first.
- Server-only published projections omit draft/history/audit/permission fields.
  Cached server reads use a 60-second bound and immediate Next 16 tag/path
  invalidation after publication/withdrawal; media withdrawal invalidates all
  four content caches. Content-backed pages observe runtime configuration instead
  of permanently baking in a pre-migration fallback. Other static routes retain
  their static generation and existing public CSP.
- Each collection independently falls back to its existing static source when
  empty, unconfigured, missing, malformed or unavailable. One published row
  replaces that entire static collection. Unpublishing the final row restores
  the static source. Restoring/reordering only changes drafts until published.
- CI gains a public published/empty/down browser matrix and an isolated database
  reset before the eight content concurrency cases.

The complete RPC signatures and request/response contract are in
[staff-content-editor.md](../features/staff-content-editor.md). New contract
types include `ContentCollection`, `ContentFields`, `ContentItem`,
`ContentRevision`, `ContentPayload`, `ContentResponse`, `ContentState`, and the
allowlisted public published-content projection. Staff routes are
`GET/POST /api/staff-portal/content`.

## Verification receipts

All commands use `C:\m\tools\bin` first on PATH (Node 24, pnpm 11.19.0).
No result below represents hosted deployment or organizer UAT.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS, no warnings. |
| `pnpm typecheck` | PASS, Next route type generation and TypeScript. |
| `pnpm exec vitest run` | PASS, 90 files / 3,893 tests. Includes 48 content-handler and 31 published-content tests, plus media cache-invalidation regression coverage. |
| `pnpm build` | PASS, Next 16.3.8 production build after final runtime changes; 110 static outputs. |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS, 250 PASS / 12 SKIP, exit zero. Includes all 24 new content cases and 44 content-editor axe scans without violations. |
| `pnpm exec playwright test -c playwright.content.config.ts` | PASS, 24/24 across published, empty and unavailable database states; EN/AR desktop/mobile, 48 axe scans with no violations. |
| Full existing public suite, temporary port 3241 config | Initial run: 863 PASS, 161 SKIP, 4 FAIL. All failures were the old assertion that content-backed routes remain SSG; updated to assert runtime content reads while preserving all other SSG and baseline CSP checks. |
| Final relevant public regression rerun | PASS, 108 PASS / 22 SKIP, exit zero; private CSP, conference experience, homepage, programme cards and public media, using the temporary port 3241 config. |
| `git diff --check` | PASS. |
| Supabase lint and genuine pgTAP | BLOCKED locally: no Docker. Authored 163 pgTAP assertions; disposable CI execution required. |
| Content database concurrency | BLOCKED locally: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/staff-content-concurrency.test.ts` stops at the local-stack configuration guard before running tests. Eight authored cases await CI. |

The eight database cases cover simultaneous saves, publish/stale-save,
reorder/stale-save, assurance lost while queued, session-publication/speaker
withdrawal, media-withdrawal/content-publication and rejection of REPEATABLE READ
and SERIALIZABLE. pgTAP covers grants/roles/edition scope, draft/published
separation, immutable history/audit, restore/order CAS, translations, partner
consent and stale media.

Supplemental PASS only: local PostgreSQL WASM created the migration objects and
executed all 163 assertion statements plus ten malformed-payload branches using
simplified authority, Storage and assertion stubs. This is not genuine Supabase
permission, pgTAP, lint or concurrency evidence.

Earlier staff run: 249 PASS, 12 SKIP, 1 FAIL. The failure was a strict test locator
matching both loading and saved status nodes. The corrected selector targets the
saved-feedback region and retains the order/enabled assertions; no retries or
timeouts were added. Visual review also found the native dialog lost its auto
centering under the CSS reset; explicit centering and a geometry assertion were
added before the final build. Earlier unit-copy expectations were updated for
the newly available content tool; the complete unit rerun is green.

On this Windows runner, Playwright's process-tree teardown hangs after the final
test. After all test cases completed, only each run's recorded local web-server
Node PIDs were stopped to release teardown and obtain the actual exit code and
summary. No owner's server was stopped. The final staff, public fixture and
focused public regression suites all exited zero.
Initial public failure traces are retained locally in
`.tools/content-editor-qa/initial-public-failures/`; final public fixture images
are in `test-results/content/`, and staff review images in
`test-results/staff-evidence/`. These are ignored local artifacts.

Visual review PASS: twelve published EN/AR desktop/mobile programme, partner and
team screenshots, four static-fallback representatives, and all four staff
draft/confirmation viewport-language combinations. No clipping, overlap or RTL
blocker remained. The full initial public run emitted Next `NoFallbackError`
diagnostics during unknown/encoded-route checks; the associated assertions passed.
The final focused public run passed all CSP and unknown-detail checks.

The requested `git checkout -- .impeccable/review/` was attempted but the sandbox
denied the worktree index lock outside the writable root. The four regenerated
images were instead restored byte-for-byte from `git show HEAD:<path>` into the
workspace. Their Git diff is empty. The temporary port 3241 config was removed.

## Changed-file inventory

```text
.github/workflows/ci.yml
.gitignore
docs/DECISIONS.md
docs/features/staff-content-editor.md
docs/progress/2026-10-23-codex-night3-content.md
playwright.content.config.ts
scripts/public-content-ui-provider.mjs
src/app/[locale]/(preview)/media/page.tsx
src/app/[locale]/(preview)/page.tsx
src/app/[locale]/(preview)/program/[slug]/page.tsx
src/app/[locale]/(preview)/program/page.tsx
src/app/[locale]/(preview)/speakers/[slug]/page.tsx
src/app/[locale]/(preview)/speakers/page.tsx
src/app/[locale]/(preview)/sponsors/page.tsx
src/app/[locale]/(preview)/team/page.tsx
src/app/[locale]/(preview)/workshops/page.tsx
src/app/[locale]/staff/layout.tsx
src/app/api/staff-portal/content/route.ts
src/components/conference-experiences.tsx
src/components/homepage.tsx
src/components/people-and-partners.tsx
src/content/conference-catalogue.server.ts
src/content/conference-experiences.ts
src/features/content/README.md
src/features/content/catalogue.ts
src/features/content/public-cards.tsx
src/features/content/public-content.css
src/features/content/published.server.ts
src/features/content/published.ts
src/features/content/revalidate.server.ts
src/features/program/README.md
src/features/staff-portal/content-client.ts
src/features/staff-portal/content-contract.ts
src/features/staff-portal/content-editor-copy.ts
src/features/staff-portal/content-editor-panel.tsx
src/features/staff-portal/content-handler.server.ts
src/features/staff-portal/copy.ts
src/features/staff-portal/media-copy.ts
src/features/staff-portal/media-handler.server.ts
src/features/staff-portal/security.server.ts
src/features/staff-portal/staff-portal.tsx
src/styles/staff-content.css
supabase/migrations/20261023022851_staff_content_editor.sql
supabase/tests/database/staff_content_editor.test.sql
tests/content-e2e/published-content.spec.ts
tests/e2e/private-csp.spec.ts
tests/integration/staff-content-concurrency.test.ts
tests/staff-e2e/content-editor.spec.ts
tests/unit/published-content.test.ts
tests/unit/staff-action-summary.test.ts
tests/unit/staff-content-handler.test.ts
tests/unit/staff-media-handler.test.ts
```

## Owner / Claude review and next step

1. Review the pending migration after Task 2's
   `20261023014219_staff_media_library.sql`; require genuine database lint, pgTAP
   and concurrency CI results before any authorized hosted application. The
   hosted database was not queried or changed by this task.
2. Review whole-collection replacement and last-unpublish fallback, particularly
   restoration of the existing team roster. Organizers should prepare the full
   replacement collection before publishing its first member.
3. The optional one-time static importer was not added. Organizers can enter
   approved content using the editor; no automatic import or seeded roster was
   necessary for the requested four collection workflows.

No new organizer content decision is required to review this code. Content and
media publication remain unavailable until the existing staff/configuration and
database release gates are satisfied. Real device checks and hosted end-to-end
organizer UAT are NOT TESTED.
