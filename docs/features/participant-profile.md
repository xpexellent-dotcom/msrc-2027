# Optional participant profile — ENG-086 / ORG-066

Task n21, 27 October 2026. Implementation receipt:
[participant profile](../progress/2026-10-27-codex-participant-profile.md).
Requirements AUTH-05/06/07/08, PRV-02/03/04/05/06, SEC-01/02/06, LOC-01/03,
ACC-01. All fields are optional; no directory or public profile is introduced.

`PARTICIPANT_PROFILE_ENABLED` is server-only and absent/false by default. It
controls the My MSRC card, participant API and avatar routes, header avatar lookup,
and the staff display. Accounts retain their independent readiness gates. A missing
profile RPC returns `area-not-ready`; it never prevents existing account sign-in.

The My MSRC card sits above ENG-084 next steps. Four completion items are picture,
institution, status (including year when medical student), and at least one interest.
The editor supports removing every optional item. Unsaved edits survive language
changes in browser memory, scoped to the account and saved version; sign-out clears
them. They are never written to localStorage/sessionStorage. Scientific specialty
labels remain English/LTR inside the bilingual interface.

## Private storage and authorization

Review-only migration `20261027120000_participant_profile.sql` creates
`msrc_participant.profile_details` and `avatar_objects`, both forced RLS without
client policies or direct application-role grants, and the private
`participant-avatars` bucket. Restrictive Storage policies deny clients even if an
unrelated permissive bucket policy exists. The server accepts JPEG/PNG/WebP at
2 MiB maximum, verifies decoded format and dimensions, rejects animation, rotates,
resizes within 512 × 512 and re-encodes as WebP using installed sharp. Metadata is
removed. No new dependency is installed.

Participant RPCs use service-role transport with native-verified session claims,
the existing participant authority/retention gates, READ COMMITTED guards,
per-participant locks and optimistic versions. No target participant ID comes from
the request. `GET/POST /api/participant-accounts/profile` preserves the account
origin, exact session, CSRF and database IP-rate-limit checks. Multipart streams are
bounded before parsing. `GET /api/participant-accounts/profile/avatar` authorizes
the current participant on every request. Responses are private/no-store and never
pass through the public image optimizer.

The ENG-083 staff detail RPC retains its existing role checks and `participants_read`
audit. Only Super Admins and registration/workshop administrators see these fields.
Its avatar route repeats the audited authorization, obtains a 60-second signed
Storage URL server-side, and proxies the bytes with private/no-store headers. Raw
Storage paths and signed tokens are not returned in the staff detail JSON. The
existing image CSP is preserved.

## Removal, retention and release

Upload reservation precedes Storage upload. Saving scalar fields and activating a
replacement avatar is atomic. Replacement/removal queues old objects durably and
the API deletes their bytes before acknowledging success. A failed/ambiguous save
can abandon only an object the database confirms remains staged; an active avatar
is preserved. Stale staging, account deletion (including the existing 30-day
never-verified rule), and the configured conference-end-plus-one-year deadline feed
the same durable deletion queue. The native cleanup inventory explicitly recognizes
the new cascade FK.

The existing authenticated outbox cron drains a bounded batch through Storage API
deletion and acknowledges it afterward. This maintenance is independent of the
profile editing flag and email daily cap, so disabling editing or mail does not
prevent authorized deletion. Failed byte deletion remains pending; lost
acknowledgements are safe to repeat. No scheduler is added or enabled by this work.
Future activation must verify both the existing retention job and authenticated
outbox maintenance actually run, monitor pending deletions, and verify Storage bytes
are removed. Removing a Storage metadata row alone is not deletion evidence.

Privacy v1.1 adds only the approved optional fields, private visibility, purposes,
consent/removal and existing retention dates in EN/AR. Privacy v1.0 remains archived;
Terms and registration Terms acceptance remain v1.0. Signup records privacy v1.1.
There is no separate privacy-version environment variable: accepted version derives
from the approved notice, while hosted participant policy readiness must separately
match it. Deploying this code while the hosted policy still requires v1.0 makes
the existing account readiness check close; coordinate the owner's version setting
before deployment. No hosted policy setting is changed here. The existing display effective
date remains unchanged under the task's “change nothing else” instruction.

Before owner activation: obtain CI migration reset/strict SQL lint/pgTAP and real
two-connection concurrency results, review private bucket and cleanup behavior,
check hosted readiness/privacy version explicitly, and complete human EN/AR UAT.
Announcing the change and emailing account holders under Privacy Policy section 9
are owner actions. This implementation sends no announcement or account email.
