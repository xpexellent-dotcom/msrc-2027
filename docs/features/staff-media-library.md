# Staff media library — ENG-062

Night-3 Task 2 implements the image tools at `/en/staff/content` and
`/ar/staff/content`. Task 3 owns structured content editing. The existing staff
portal gates remain authoritative and unchanged. No participant route is opened.

Requirements: MED-01–04, CMS-01/02/04, ROL-09/10/12, LOC-01/03, ACC-01,
SEC-01/02/06. Current `contentMediaEditor` or `superAdmin` edition grants and
their existing session assurance are required at both HTTP and PostgreSQL layers.
The migration is pending owner-authorized application by Claude.

## Storage and processing

- Private `msrc-media-drafts`: immutable raw upload paths and sanitized WebP
  originals/derivatives. No anonymous/authenticated direct read or write policies.
- Public `msrc-published-media`: explicitly approved sanitized display images.
  Restrictive INSERT/UPDATE/DELETE policies protect both buckets against future
  unrelated permissive policies. Public bucket retrieval intentionally bypasses
  read RLS, as documented by Supabase; secrecy is never inferred from its paths.
- Staff authorize and reserve an upload before the server signs its exact raw path.
  The native capability lasts two hours (Supabase's fixed lifetime); the app accepts
  completion only within 15 minutes. Neither deadline is an upload timer shown as
  a promise that the provider token was revoked.
- Accept actual JPEG, PNG, WebP or AVIF bytes, maximum 10 MiB, single-frame only.
  Bound decoded images to 40 million pixels and 12,000px per input dimension.
  `sharp@0.35.5` auto-orients, strips metadata, and emits a maximum 2560×2560
  WebP master plus 640/1280/1920px variants without enlargement. The canonical
  sanitized SHA-256 deduplicates across differing EXIF metadata within an edition.
- Re-encoding happens in the Node route after direct-to-Storage upload, so the
  10 MiB file does not pass through a Vercel request body. A streamed byte limit
  protects server downloads too. Raw objects are removed after success/rejection.
- Engineering abuse limit: 20 upload reservations per actor per 15 minutes,
  serialized in the database, in addition to the existing staff form quota.
- Publish requires EN and AR alt text, a current rights confirmation, and a
  private evidence reference describing the approved wording/version, purpose,
  applicable subject/group permissions and grant. This is evidence entry, not
  newly approved legal wording. Published metadata cannot clear these gates.

Explicit Publish reserves an operation, copies the four sanitized files into a
new operation-specific public path, then finalizes metadata. Unpublish/Archive
remove all four public objects before acknowledging the state change. Updates
use version compare-and-swap; a pending operation blocks edits and other
transitions. A completed operation can be replayed without repeating Storage
writes. Every accepted mutation and reservation is recorded in the private,
append-only `msrc_content.media_audit`, including before/after metadata snapshots.
This audit is not yet merged into the general console audit feed.

Storage and PostgreSQL cannot commit atomically. Between explicit Publish and
final metadata acknowledgement, copies may already be publicly readable. If a
remote operation or final acknowledgement fails ambiguously, its durable lock
remains and the API reports failure. It does not falsely claim publication or
removal succeeded. No lease expiry can start a stale second executor. The
reconciliation steps below are a release-review requirement.

`cacheControl: 0` avoids long browser caching; unique publication paths are never
reused. Supabase Pro Smart CDN invalidates deleted objects automatically, with
documented propagation up to 60 seconds. Browser/offline/third-party copies
cannot be recalled. No photo download button is added.

## HTTP and reusable contracts

`/api/staff-portal/media` returns private, no-store JSON (or authorized WebP
preview bytes). GET accepts `q`, `state=all|draft|published|archived`, or a single
`preview=<asset UUID>`. The library returns at most 100 matching assets and the
total count; narrower search/filter can find additional records. Unknown and
duplicate query keys fail validation.

POST JSON actions: `upload-url`, `complete-upload`, `save`, `publish`,
`unpublish`, `archive`. POST requires same-origin headers and a fresh single-use
staff form token. Versions protect edits/transitions; transition operation UUIDs
protect acknowledgements. Clients cannot submit a Storage path, checksum, MIME,
dimensions, or successful upload/publication result. Optional missing RPCs return
`area-not-ready` while preserving valid sessions and rotated cookies.

`media-contract.ts` defines `MediaAsset`, `MediaFields`, `MediaFilter`,
`MediaPayload`, `MediaResponse` and `MediaTransition`. Private paths, uploader
identities and hashes stay server-side. Duplicate uploads retain existing metadata
and state and receive a distinct localized result. Archived assets are read-only.
The permission contract adds `media.library.manage` on `mediaAsset`, with the
`mediaMetadata` projection and `media.change` audit requirement, restricted to
the current edition's `contentMediaEditor` and `superAdmin` grants.

Task 3 imports `MediaPicker` (searching published assets) or
`MediaPickerChoices` (a preloaded list). Save only the selected UUID and recheck
its edition, current published state and pending-operation status on the server
when saving/publishing content. Never trust the picker callback as authorization.
`MediaImage` renders responsive public derivatives with locale-specific alt and
the focal percentages as physical `object-position`. The content read layer must
resolve a current published reference; copying stale URLs into static content is
not a publication-state check.

Only the media document permits a connection to the configured Supabase origin.
Entering/leaving it performs document navigation so CSP changes take effect.
Private previews stay same-origin and bypass image optimizer caches.

## Owner-reviewed recovery and cleanup

No recovery job, schedule, hosted invocation, or destructive cleanup is enabled.
Before activation, rehearse this procedure against disposable Storage, including
timeouts after each of the four copies/deletions and after database completion.

1. Inspect the affected `media_uploads`, `media_operations`, `media_assets` and
   `media_audit` rows through authorized private database access. Record only the
   opaque operation/upload/asset IDs in the incident receipt, not private evidence
   or signed URLs. Identify the exact edition and all derived paths.
2. Prove the original server invocation has stopped and no provider operation is
   still in flight. A network timeout alone is not proof. Do not clear the durable
   lock or call the begin operation again while this is uncertain.
3. For interrupted publication, remove all four operation-specific public paths
   using the Storage API and verify their absence and CDN propagation. Then an
   owner-reviewed maintenance transaction can record the failure, mark the
   operation failed, clear its asset lock and preserve the prior draft/version.
   For interrupted unpublication/archive, finish removing every public copy and
   reconcile the target state with a new immutable audit event. Do not use a fresh
   staff session to impersonate the original session's service completion.
4. For abandoned uploads, wait beyond the native two-hour capability expiry and
   prove no processing invocation is active. Remove raw and unreferenced sanitized
   variants via Storage API; preserve any path referenced by the canonical asset.
   Reconcile pending/processing reservations and append an owner-reviewed cleanup
   audit. A completed dedupe reservation points to another asset and must not
   cause that asset's files to be removed.
5. Never delete `storage.objects` rows directly: database metadata deletion does
   not remove the underlying file. Never remove a prefix based only on a filename
   supplied by a browser. No automatic retry or broad bucket deletion is safe here.

Outstanding owner review: applicable rights evidence and withdrawal process,
private upload retention/cleanup ownership and budget, the recovery rehearsal,
and native Storage/CORS/deletion behavior after approved migration application.
The evidence fields do not implement a separate structured consent lifecycle;
MED-02's permission wording/version, purpose, subject/group permissions and
grant/withdrawal handling must be covered by the reviewed operational process.

## Verified provider references

Checked 23 October 2026:
[bucket visibility](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[Storage RLS](https://supabase.com/docs/guides/storage/security/access-control),
[signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl),
[Pro transformations](https://supabase.com/docs/guides/storage/serving/image-transformations),
[Smart CDN invalidation](https://supabase.com/docs/guides/storage/cdn/smart-cdn),
[sharp metadata defaults](https://sharp.pixelplumbing.com/api-output/),
[Next Node package support](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages).
