# O9 — Existing site media and content import, 23 October 2026

Authority: current task, ORG-055/056/057/059 and ENG-069; MED-01–04,
CMS-01–04, ARC-01, ROL-09/10/12, LOC-01/03, ACC-01, SEC-01/02/06.
Initial checkout: clean `claude/media-import`, HEAD
`1504055b7daf52a58277252d34b8130a47129383`, based on `claude/public-copy-dates`.
The task-specific local commit instruction supersedes the common overnight
no-commit instruction. No branch is created and nothing is pushed.
`docs/PROGRESS.md`, approved legal text and approved email wording are unchanged.

**Commit BLOCKED by filesystem permissions:** authorized `git add` failed with
`Unable to create 'C:/m/msrc/.git/worktrees/codex-media/index.lock': Permission denied`.
The worktree index is outside the writable `C:\m\codex-media` root. No staging,
commit or push occurred; the source remains uncommitted for Claude. No attempt
was made to bypass the filesystem restriction.

## Result

- Super Admin-only, origin/form-token/native-session checked import, with an
  independent database Super Admin check on every trusted operation. Regular
  media editors retain their existing media tools but cannot import.
- Checked-in manifest: 30 archive items (26 photographs, four film posters),
  18 team photographs and 23 published team records. The three supplied member
  names within the Media & Design row are preserved as paired EN/AR fields.
  Sponsor placeholders create no records; speakers/programme remain empty.
- Every source uses the existing sharp pipeline: metadata-stripped canonical
  WebP and 640/1280/1920 variants, no enlargement. Films retain their static MP4s.
  Alt text, captions, physical focal coordinates, edition years and ordering come
  from the current approved source files. ORG-060 rights evidence records the
  organizers' confirmation on 13 and 23 October; team evidence retains ORG-050.
- Durable source keys and canonical SHA-256 dedupe preserve later staff edits
  and withdrawals on repetition. Storage writes use immutable reserved paths.
  An ambiguous failure leaves a durable pending reservation for reviewed recovery.
  No lease can authorize a second competing executor. Unused files from a
  competing ordinary-upload dedupe are removed only from that reservation.
  An initial SHA collision with mismatching incumbent metadata returns `conflict`
  instead of silently omitting an archive item or overwriting staff work.
- Imported archive assets become publicly selectable only when all media sources
  validate and the complete content batch commits. A failed initial import keeps
  the complete built-in archive rather than exposing a partial replacement.
  The content batch uses existing publication validation and immutable revisions.
- Imported team content retains the incumbent hierarchy, founders placeholder,
  shared co-lead rows, member lists, localized alphabetical sorting, descriptions,
  profile links and photo placeholders. Generic content cards still work for
  ordinary content. Team description/profile fields are editable.
- Staff media controls edit/filter year, edit kind/static film/order and move
  assets earlier/later within their year, with version checks and audit.
- Public library reads use a server-only projection and a tagged 60-second data
  cache. The Media route exports `revalidate = 60`; existing URL filters keep it
  request-rendered. Empty, unavailable, missing or malformed database reads use
  the complete built-in archive. Library derivatives bypass the image optimizer.
  Publish/withdrawal/save/reorder/import invalidate the relevant tags and paths.

## Pending migration and RPC contract

`supabase/migrations/20261023145255_staff_site_media_import.sql`, after the
existing media/content-editor migrations. **Not applied to hosted Supabase.**

New media columns: `edition_year integer NULL`, `kind text`, `display_order integer`,
allowlisted `video_path text NULL`, `source_slug text NULL`, `duration_seconds numeric NULL`.
Private forced-RLS import reservations include a one-time `exposed_at` publication
boundary; private immutable import audit and unique content source keys are added.

All RPCs return JSONB:

```sql
-- Authenticated, current media editor or Super Admin:
msrc_staff_media_list(edition_key text, search_query text default '',
  state_filter text default 'all', year_filter integer default null)
msrc_staff_media_update(edition_key text, asset_id uuid,
  expected_version integer, fields jsonb)
msrc_staff_media_reorder(edition_key text, asset_id uuid,
  expected_version integer, direction text)
-- Service role only; imports independently bind verified native SA claims:
msrc_media_published(edition_key text)
msrc_staff_media_import_reserve(edition_key text, session_claims jsonb,
  source_key text, media jsonb)
msrc_staff_media_import_finish(edition_key text, session_claims jsonb,
  import_id uuid, fields jsonb)
-- Authenticated Super Admin; atomic content publication/archive exposure:
msrc_staff_content_import(edition_key text, items jsonb,
  media_sources jsonb default '[]'::jsonb)
```

`MediaAsset`/`MediaFields` add `editionYear`, `kind`, `displayOrder`, `videoPath`.
`MediaPayload` adds `import-current-site` and `reorder`; GET adds `year`.
`MediaResponse` adds `years`, `canImport`, and four created/existing summary counts.
`ContentFields.teamLayout` optionally preserves bounded committee hierarchy and
paired member names. Public projections exclude private rights/source/audit data.
Missing optional RPCs return `area-not-ready` without clearing staff sessions.

## Verification

All commands use `C:\m\tools\bin` first on PATH. Results below are local,
synthetic evidence; no production or native Storage success is claimed.

| Check | Observed result |
|---|---|
| `pnpm lint` | PASS, zero warnings |
| `pnpm typecheck` | PASS, generated route types and TypeScript |
| `pnpm exec vitest run` | PASS, 4,218 tests in 96 files, after the random-token assertion correction described below |
| Actual checked-in source processing | PASS, all 48 sources accepted through sharp; included in 56 importer cases |
| `pnpm build` | PASS, 112 generated pages, Next.js 16.3.8 |
| Content provider builds | PASS, published/empty/down builds |
| `pnpm exec playwright test -c playwright.content.config.ts` | PASS, 36 cases, zero retries; EN/AR desktop/mobile library/fallback counts/order/framing/films/axe and imported roster |
| Affected public suites on temporary port 3240 | PASS, 69 passed / three intentional skips, default two workers, zero retries: conference-experience 38/2; premium-media-framing 4/0; cinematic-film 27/1 |
| `pnpm exec playwright test -c playwright.staff.config.ts --output .tools/staff-media-browser-results` after final build | PASS, 298 passed / 12 intentional desktop skips, zero retries (310 total); four final import-summary/axe cases also PASS |
| `git diff --check` | PASS |
| Review screenshots | No tracked `.impeccable/review/` differences; requested `git checkout` blocked by the same index permission error |
| Requested local commit | BLOCKED, Git worktree index outside writable root (exact error above) |
| Strict local database lint | BLOCKED, connection refused at 127.0.0.1:54322; no local Docker database |
| pgTAP and DB integration/concurrency execution | BLOCKED locally; 103 new pgTAP assertions and 11 media integration cases (five new races) prepared for disposable Linux CI |
| Hosted migration/import, native Storage, CDN withdrawal and human UAT | NOT TESTED / not performed |

Unit coverage includes mappings/translations, actual source-byte acceptance,
idempotent completed import, SA permission denial, malformed paths/metadata,
missing RPCs, ambiguous Storage failure, competing upload cleanup, public decoding,
fallback and invalidation. Browser Storage/API mocks prove UI behavior; they do
not establish GoTrue, PostgreSQL or real Storage enforcement. pgTAP covers columns,
permissions, publication/exposure, validation, audit, order, withdrawal and dedupe.
Five additional DB races cover reserve/finish/content idempotency, atomic exposure and lost assurance
after a lock wait, with the existing isolation entry matrix extended.
New import and metadata screens include EN/AR axe, keyboard actions, narrow
layouts and 320px/200% text checks. Library card crops and imported roster
screenshots were visually reviewed. Public artifacts are under
`.tools/public-media-final-results`; library card crops under
`.tools/media-import-review`. Temporary port configs were removed.
The complete clean staff report is `.tools/media-import-staff-final-report`.
Focused final import screenshots are
`test-results/staff-evidence/staff-{desktop,mobile}-{en,ar}-media-import-summary.png`.
The enlarged Arabic mobile summary and desktop Arabic result were visually
reviewed. All test-owned servers stopped; owner port 3210 was untouched.

Preserved diagnostics: parallel public output cleanup caused one staff trace-file
ENOENT (initial full staff run: 297 passed / 12 skipped / one teardown failure);
the final isolated full run above passes, including that exact case. The failed
staff report remains at `.tools/media-import-staff-first-report`. Initial isolated
public cinematic run ended with 67 passed, three intentional skips and two English
desktop playback failures. Traces showed MP4 requests without a recorded completed
response at failure, with no console/page errors. The unchanged cinematic suite
then passed 27 cases with one intentional skip in isolation. The final complete
public run on a fresh build is recorded above. Assertions, timeouts and retries
were unchanged. The first content run's Windows server shutdown needed only
its verified owned test processes stopped before Playwright exited successfully.
One full unit run found the existing participant privacy test scanning a random
base64url HMAC signature for the substring `SQL`. An incidental matching signature
caused the failure. The test now retains exact response-key and private-field
assertions, validates token format, and checks decoded token payload as well as
public fields. No participant production logic changed; no retry was added.

## Files changed

- `docs/DECISIONS.md`; this O9 receipt; `docs/features/staff-media-library.md`;
  `docs/features/staff-content-editor.md`.
- `next.config.ts`; `src/app/api/staff-portal/media/route.ts`;
  `src/app/[locale]/(preview)/media/page.tsx`; the corresponding `team/page.tsx`.
- `src/features/staff-portal/current-site-import.ts` and
  `current-site-import.server.ts`; `media-contract.ts`, `media-client.ts`,
  `media-handler.server.ts`, `media-copy.ts`, `media-library-panel.tsx`;
  `content-contract.ts`, `content-editor-panel.tsx`; `src/styles/staff-media.css`.
- `src/features/media/published.ts`, `published.server.ts`, `revalidate.server.ts`;
  `src/features/content/published.ts`, `team-roster.ts`.
- `src/content/conference-catalogue.server.ts`, `conference-experiences.ts`,
  `edition-media.ts`, `team.ts`; `src/components/conference-experiences.tsx`,
  `people-and-partners.tsx`.
- Pending migration and `supabase/tests/database/staff_site_media_import.test.sql`;
  `tests/integration/staff-media-concurrency.test.ts`.
- `scripts/public-content-ui-provider.mjs`; `tests/content-e2e/published-media.spec.ts`,
  `published-content.spec.ts`; `tests/staff-e2e/media-library.spec.ts`,
  `content-editor.spec.ts`; `tests/unit/current-site-import.test.ts`,
  `published-media.test.ts`, `staff-media-handler.test.ts`, `media-picker.test.ts`,
  and the random-token regression fix in `participant-accounts.test.ts`.

## Owner / Claude review

No new product decision is required. Claude must review the pending SQL and
CI-only database results, rights evidence, native Storage behavior and the
existing interrupted-operation recovery process before applying migrations or
running a hosted import with the owner's approval. Claude must also create the
requested local commit from an environment allowed to write the worktree index.
The new migration is pending
alongside the code-ahead migrations already in this branch; the hosted baseline
through `20261022171108` is an owner-provided fact, not a live audit here.

Review the deliberate static fallback on empty/unavailable reads, including after
the final archive withdrawal. Imported roster order retains the current per-locale
alphabetical layout. No flag, hosted setting, participant access, account, email,
DNS or paid resource changed. Next task: owner-authorized migration/native Storage
rehearsal and Super Admin import after CI review.
