# Night-3 Task 2 — staff Media editor

Local, uncommitted implementation in `C:\m\codex-night3`, building on Task 1.
ENG-062; MED-01–04, CMS-01/02/04, ROL-09/10/12, LOC-01/03, ACC-01,
SEC-01/02/06. Read AGENTS.md, PROJECT_BRIEF, DECISIONS (including current
ORG-055/056/057), PROGRESS, DESIGN_GUIDE and the relevant specification sections.
The starting worktree was clean. `docs/PROGRESS.md` was not edited (O9).

## Result and audit

The existing Content and media destination was a planned landing. It now hosts
an EN/AR media library for current-edition `contentMediaEditor` and `superAdmin`
staff, retaining the existing staff session assurance and closed deployment gates.
It provides search/state filters, click/drop uploads with progress, private
previews, bilingual alt/caption/credit fields, keyboard/pointer focal selection,
rights evidence, versioned saves and confirmed Publish/Unpublish/Archive actions.
Missing migrations produce `area-not-ready` without clearing a valid session.

Before Publish, all bytes remain in a private bucket. Server-side checks use
actual signatures, a streamed 10 MiB bound and bounded decoding; accepted JPEG,
PNG, WebP and AVIF are auto-oriented and re-encoded with metadata removed.
`sharp@0.35.5`, previously transitive, is now pinned directly at the same version;
its 27 September 2026 publication exceeds the two-week requirement. Four WebP
sizes are generated without upscaling. ENG-062 explains this choice and records
the checked official Supabase bucket/RLS, signed-upload and Pro-transformation
documentation. Native signed uploads expire after two hours; the application
only accepts completion within 15 minutes. These are distinct guarantees.

Publication requires nonblank EN/AR alt text and confirmed rights with private
evidence. Every accepted mutation/reservation creates an immutable private audit
event. SHA-256 dedupe retains the original asset's metadata/state and returns
truthful localized feedback. Archived assets are read-only. Compare-and-swap
versions and durable operation reservations reject competing saves/transitions.
Ambiguous Storage failures retain a lock for reviewed recovery; they never return
false success or allow a stale second executor after an arbitrary lease timeout.

Task 3 can use the published-only `MediaPicker`/`MediaPickerChoices` and responsive
`MediaImage`. Its server must revalidate the selected ID, edition, current
publication state and pending operation. No content editor was implemented here.

## Files changed

- Storage/database: `supabase/migrations/20261023014219_staff_media_library.sql`,
  `supabase/tests/database/staff_media_library.test.sql`,
  `tests/integration/staff-media-concurrency.test.ts`, `.github/workflows/ci.yml`.
- Server: `src/app/api/staff-portal/media/route.ts`; staff-portal
  `media-handler.server.ts`, `media-processing.server.ts`,
  `media-storage.server.ts`, `backend.server.ts`, `handler.server.ts`.
- UI/contracts: staff-portal `media-contract.ts`, `media-client.ts`,
  `media-copy.ts`, `media-library-panel.tsx`, `media-picker.tsx`, `copy.ts`,
  `menu.ts`, `staff-portal.tsx`; `src/components/media-image.tsx`,
  `src/styles/staff-media.css`, `src/app/[locale]/staff/layout.tsx`,
  `src/lib/permissions/contract.ts`.
- Document-scoped upload CSP/navigation: `src/lib/content-security-policy.ts`,
  `src/proxy.ts`, `src/components/ui/link.tsx`.
- Verification: `tests/staff-e2e/media-library.spec.ts`,
  `tests/e2e/staff-portal-closed.spec.ts`, `tests/helpers/csp.ts`; unit tests
  `staff-media-handler`, `staff-media-processing`, `staff-media-storage`,
  `media-image`, `media-picker`, `authorization-contract`,
  `content-security-policy`, `staff-action-summary`.
- Dependency/notes: `package.json`, `pnpm-lock.yaml`, `docs/DECISIONS.md`,
  `docs/features/staff-media-library.md` and this receipt.

## Migration and callable contracts

Pending migration: **20261023014219_staff_media_library.sql**. It creates
`msrc-media-drafts` (private) and `msrc-published-media` (public sanitized images),
restrictive client write/private-read Storage policies, private forced-RLS
`msrc_content.media_assets`, `media_uploads`, `media_operations`, `media_audit`,
and supporting private helpers. There are no direct client table grants.

All public function names below have the prefix **`msrc_staff_media_`**.
All nine enforce READ COMMITTED at entry, empty search_path, current native
session/edition authorization, audit and relevant row/authority locks.

| Suffix and argument signature | Caller |
| --- | --- |
| `list(edition_key text, search_query text default '', state_filter text default 'all')` | Authenticated staff |
| `get(edition_key text, asset_id uuid)` | Authenticated staff |
| `upload_reserve(edition_key text, file_name text, file_size integer)` | Authenticated staff |
| `upload_claim(edition_key text, upload_id uuid)` | Authenticated staff |
| `update(edition_key text, asset_id uuid, expected_version integer, fields jsonb)` | Authenticated staff |
| `transition_begin(edition_key text, asset_id uuid, expected_version integer, action text, operation_id uuid)` | Authenticated staff |
| `upload_complete(edition_key text, upload_id uuid, session_claims jsonb, media jsonb)` | Service only, native-verified session claims |
| `upload_reject(edition_key text, upload_id uuid, session_claims jsonb)` | Service only, native-verified session claims |
| `transition_finish(edition_key text, operation_id uuid, session_claims jsonb, success boolean)` | Service only, native-verified session claims |

`/api/staff-portal/media` accepts GET list/search/state or an authorized image
preview; POST actions are `upload-url`, `complete-upload`, `save`, `publish`,
`unpublish`, `archive`. Same-origin, form nonce/quota, role and session checks run
before storage access. The browser cannot supply trusted paths, hashes,
dimensions, processing results or publication success. Private storage paths,
hashes and uploader identities are excluded from asset projections. Only the
media document permits the configured Storage upload origin through CSP.

The permission contract adds `media.library.manage`, resource `mediaAsset`,
projection `mediaMetadata` and audit `media.change`, scoped to the edition.
The UI contract adds `MediaAsset`, `MediaFields`, `MediaFilter`, `MediaPayload`,
`MediaResponse`, `MediaTransition`, version/busy/publication state, focal
percentages, bilingual text, rights evidence and duplicate-upload feedback.

## Verification

Node 24.21.0 / pnpm 11.19.0, `C:\m\tools\bin` first on PATH. No retries,
timeouts or assertions were relaxed. Final application sources were built before
the final staff suite. Browser storage/session boundaries use synthetic fixtures.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS; exit 0, zero warnings |
| `pnpm typecheck` | PASS; exit 0 |
| `pnpm exec vitest run` | PASS; 3,814 tests / 88 files, exit 0 |
| `pnpm build` | PASS; Next 16.3.8, 110 static pages, exit 0 |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS; 226 passed / 12 intentional skips / 0 failed, exit 0; 238 scheduled cases |
| Full public browser suite on isolated port 3231 | PASS; 867 passed / 161 intentional skips / 0 failed, exit 0 |
| New media EN/AR desktop/mobile axe and interaction coverage | PASS; all 32 new cases, 54 axe analyses with zero violations; desktop/mobile AR details and enlarged EN mobile grid visually reviewed |
| `git diff --check` | PASS; exit 0 after documentation and screenshot restoration |
| Genuine `pnpm db:lint` and `pnpm db:test` | BLOCKED; local PostgreSQL 127.0.0.1:54322 connection refused; Docker unavailable (`uv_spawn docker` EPERM) |
| New pgTAP permission/state/audit/policy assertions | 136 authored; NOT TESTED against genuine Supabase locally |
| New database concurrency/isolation cases | 6 authored; NOT TESTED locally; isolated CI reset and `STAFF_MEDIA_DB_TESTS=true` step added |
| Supplemental PostgreSQL WASM smoke only | PASS; migration creation, 49 synthetic branch/policy checks and 136 SQL assertions with simplified assertion/authority/storage stubs; **not** Supabase lint, genuine pgTAP or concurrency evidence |
| Hosted migration, native Storage/CORS/CDN, physical devices and assistive technology | NOT TESTED; require approved release verification |

The public suite used a temporary copy of `playwright.config.ts`, replacing
3210 with 3231: `pnpm exec playwright test -c playwright.night3-public.config.ts`.
It retained all project/test settings and did not touch the owner's port 3210.
Windows server teardown stalled after all cases in both public and final staff
runs; stopping only their identified test servers (public 3231, staff 3219/3220)
allowed successful report generation and exit 0 for each run.

The first staff run was not a valid final result: four existing role-summary
assertions saw a build created before the new media action copy, and one existing
email-preview case lost its trace artifact when the parallel public runner cleaned
the parent `test-results` directory. It was stopped after the scheduled cases.
The final run uses a fresh build and runs after public testing, addressing both
causes. Initial failure contexts are preserved in ignored
`.tools/night3-media-first-run/`; they are not hidden by retries. Public HTML
evidence is in `playwright-report/`; final staff evidence is in
`playwright-staff-report/` and `test-results/staff-evidence/`.

The temporary public config was removed. The requested
`git checkout -- .impeccable/review/` could not create the worktree index lock
outside the writable workspace. Restored the four regenerated files from exact
`git show HEAD:<path>` bytes without modifying the index instead;
`git diff --exit-code -- .impeccable/review/` passed. The approved screenshots and
`docs/PROGRESS.md` have no diff.

## Owner/Claude review and remaining gates

1. Review the pending migration and actual Linux CI results before applying it
   with owner authorization. Native Storage behavior, signed upload/CORS,
   service-only transport and object removal still need disposable verification.
2. Confirm the operational MED-02 permission evidence/withdrawal process. These
   fields record evidence; they do not implement a structured consent lifecycle
   or supply approved legal wording. MED-03 cannot recall downloaded/browser or
   third-party copies. CDN deletion propagation is not instantaneous.
3. Assign private abandoned-upload cleanup ownership/retention/budget and rehearse
   durable-lock recovery using `docs/features/staff-media-library.md`. No cleanup
   scheduler or unsafe automatic retry is enabled. Private media audit events
   are recorded but are not yet merged into the general console audit feed.

No hosted migration, settings seed, feature-flag change, participant opening,
real email, public/legal/email wording change, branch, commit or push occurred.
Task 1 remains intact. Next task: the content editor, consuming the picker and
reauthorizing published asset references on the server.
