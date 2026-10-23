# Staff content editor — ENG-063

Requirements: CMS-01–04, PRG-01, SPN-01, MED-02, ROL-09/10/12, LOC-01/03,
ACC-01, SEC-01/02/06. This is closed source preparation. No content is seeded.

## Editor contract

`/{en|ar}/staff/content` retains the Task 2 media library and adds four collections:
speakers, programme sessions, sponsors/partners, and committee/team members.
Only `contentMediaEditor` and `superAdmin` have access. Every API request checks
the current native identity, current edition grant, exact-session assurance and
absolute deadline. Mutations also require same origin and a single-use form token.
The database independently checks authority and expected versions.

`GET /api/staff-portal/content?collection=speakers|sessions|partners|team` lists
drafts and published version pointers. `GET ?itemId=<uuid>` reads revision history.
Responses contain only allowlisted fields; they are private, no-store and noindex.
POST bodies use the types in `src/features/staff-portal/content-contract.ts`:

- `save`: collection, nullable itemId, version (0 for a new item), fields.
- `publish` / `unpublish`: itemId, version, confirmed: true.
- `restore`: itemId, version, restoreVersion. Restores into a new draft revision.
- `reorder`: collection, complete ordered items array with each id and version.

Every POST also includes the formToken issued by the preceding response.
Unknown keys, invalid UUIDs, non-HTTPS/credential-bearing links, oversized fields,
duplicate speaker references and invalid dates/times are rejected. Drafts may be
incomplete. Publication requires English and Arabic for required and populated
paired fields, a valid same-day Riyadh time range for sessions, and display
permission for partners. The media picker offers published assets; database
checks revalidate edition, publication and in-progress media operations.

Successful writes return the new version. Stale writes return `conflict` and must
be reloaded before retry. Missing RPCs return `area-not-ready` without clearing
the staff session. A provider failure returns `unavailable`, never raw diagnostics.
A `referenced` response explains why a speaker used by a published session cannot
be withdrawn until the session is changed or withdrawn.
Content forms alone accept up to 128 KiB for bounded bilingual biographies;
existing staff endpoints retain their prior limits.

Collections have a technical bound of 1,000 editable records to keep complete
reordering bounded. The history screen returns the newest 1,000 revisions; older
immutable records remain retained and the restore RPC can address their versions.
These are editor payload bounds, not conference capacity or participant limits.

## Database RPCs

Pending migration: `20261023022851_staff_content_editor.sql`, after Task 2's
`20261023014219_staff_media_library.sql`. All functions return JSONB. Authenticated
staff RPCs retain current edition/role/session authorization:

```sql
public.msrc_staff_content_list(edition_key text, collection_key text)
public.msrc_staff_content_save(edition_key text, collection_key text,
  item_id uuid, expected_version integer, fields jsonb)
public.msrc_staff_content_transition(edition_key text, item_id uuid,
  expected_version integer, action text, restore_version integer default null)
public.msrc_staff_content_history(edition_key text, item_id uuid)
public.msrc_staff_content_reorder(edition_key text, collection_key text, items jsonb)
-- Service role only, server runtime; no browser RPC grant:
public.msrc_content_published(edition_key text, collection_key text)
```

Private forced-RLS tables: `msrc_content.content_items`, `content_versions`,
`content_publications`, `content_session_speakers`, `content_audit`. There are no
direct anon, authenticated or service-role table grants. Revisions, publications,
speaker membership by revision, and audit are append-only. Per-edition mutation
serialization and row versions protect simultaneous edits, publication and ordering.
Native authority is rechecked after waiting. All staff entry points require
READ COMMITTED at entry, before authorization or lock waits.

## Publication and fallback

Drafts, revision history, permission evidence and private media paths never enter
public responses. A separate published snapshot and current pointer control each
item. Reordering is a draft operation: publish the reordered items to make that
order public. Restore also requires a later explicit Publish to affect the site.
Unpublish preserves immutable history. A speaker referenced by a published session
must first be removed from those published sessions or the sessions unpublished.

Public collection reads use a 60-second server-side cache, with a request-time
configuration boundary so deployments built before migration/configuration can
observe it later. Content-backed routes render at runtime; other public routes
retain static generation. Publish/Unpublish invalidates
the affected cache tags and both-language page paths, including related speaker
and session views. No staff enablement flag is flipped by this work.

Fallback applies independently per collection. No published items, unavailable
configuration, missing migration, malformed results or database failure use the
original static content. The first published record replaces the whole static
collection. Unpublishing the last record restores the static collection, including
the approved existing team roster. Staff should prepare the complete replacement
collection before first publication; there is no automatic seed/import.

## Verification boundary

Unit tests exercise handler permissions/failures/version transport and public
fallback/revalidation. Staff/public browser suites use explicitly synthetic local
fixtures and do not prove PostgreSQL enforcement. pgTAP and concurrent integration
tests require the disposable Linux CI database; local Docker is unavailable.
The exact commands/results and pending migration are recorded in the
[O9 receipt](../progress/2026-10-23-codex-night3-content.md).
