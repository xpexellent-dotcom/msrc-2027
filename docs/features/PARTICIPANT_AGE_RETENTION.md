# Participant age declaration and unverified-account retention — closed foundation

AUTH-01/06/08, PRV-02/04/05/06/08, SEC-01/02/06, LOC-01/03, ACC-01;
BL-AUTH-02/09. Authority: ORG-041 and approved Privacy/Terms v1.0.

Status: implementation/review in progress. No hosted migration, cleanup schedule,
participant activation, production setting, real account or email is authorized
by this PR. Observed final checks are recorded in PROGRESS and PR checks.

## Minimum age

Signup requires an unchecked, explicit 18+ declaration in English and Arabic.
The server accepts only boolean `true`, before any native account or delivery
work. Missing/false declarations get a labelled error; strings, numbers and
extra birth-date fields are rejected. Other account actions do not accept the
signup-only field. Password bytes, existing ten-codepoint/72-byte limits,
enumeration-safe responses, rate limits, code expiry and session rules remain.

The assertion is bound to the exact private signup reservation, actor, email
and approved notice. Native admission copies an immutable declaration/time proof
into the participant profile. User-editable native metadata and JWT claims
cannot create that authority. Legacy profiles without a proof are not assumed
to be adults. This is self-declaration, **not independently verified age**.
No birth date, numeric age, additional authentication identifier or new registration field
is collected. The approved Privacy/Terms texts are unchanged.

The declaration remains transient while switching EN/AR and clears with the
existing credential/outcome lifecycle. Native labels, errors and keyboard flow
remain accessible; Arabic uses RTL with LTR email/password entry.

## Retention clock and protection

The deadline is the original native account creation time plus 30 days. Resends,
new codes, application completion, profile edits and refresh cannot restart it.
The private original timestamp is immutable. Native verification is recorded
monotonically, including a provider confirmation whose application completion
was interrupted. A previously verified person never becomes eligible by later
clearing a native confirmation field. A never-verified account cannot complete
verification after its deadline while waiting for cleanup.

Eligibility requires a pending participant profile, matching original native
origin, no native/ever-verification and no erasure tombstone. Protection covers
any staff/authority history, invitation/bootstrap/recovery/account association,
retained session/security evidence, non-email factors/identities, owned Storage
objects and explicit retention holds. Unexpected external foreign keys roll back
all erasure for that subject rather than cascading through an operational record.
Unclassified native security/audit records are held for review.

## Worker and erasure

The native-Postgres-only `msrc_participant.cleanup_unverified(batch_size, dry_run)`
is bounded, defaults to dry-run and returns aggregate counts only. There is no
public or service-key cleanup RPC, participant deletion interface, export or
automatic email. The independent `retention_policy.enabled` switch defaults
false. This migration installs **no cron job or active scheduler**.

The worker uses the same staff-authority serialization as grants/invitations and
locks account/native rows in the reviewed order, skipping busy subjects. It
rechecks current verification/profile/retention facts after locks. Each actor's
erasure is atomic and authorized by a private job bound to the native transaction;
there is no generic immutable-audit bypass.

Approved erasure removes pending account/profile/admission/challenge/operation
personal data and native identity/session credentials. Application consent and
audit snapshots remain unchanged, using minimal opaque subject/proof anchors.
Eligible native signup audit records retain IDs, timestamps, action and UUID
references while account personal payload/IP fields are removed. Mixed or
unexpected security histories block deletion. Failures retain only bounded
reason/SQLSTATE evidence; secrets, addresses, names, codes and digests are not
returned or logged. The durable actor-UUID tombstone blocks same-actor resurrection.

Provider-exported logs, SMTP/Resend records and existing backups have their own
approved retention obligations. This PR does not claim to erase those systems.
A full backup restore stays closed until the latest independently retained
erasure and ever-verification ledger has been reconciled. Restoring an older
database's own older tombstones is insufficient. No restore is performed here.

## Independent release gates

The application requires installed age/retention capability fields and actual
cleanup activation from its database readiness response. Missing fields in the
older hosted schema, malformed values or `cleanupEnabled=false` close requests
before parsing personal input or native/delivery work. The database also requires
the independent cleanup switch for participant admission/access. The server-only
`PARTICIPANT_ACCOUNTS_ENABLED` remains false/absent by default; native signup,
staff authentication and unrelated operational gates retain their own guards.

Activation is a later separately authorized operator task:

1. Reconcile the actual deployed source, immutable migration ledger and captured
   backup/restore evidence. The earlier nine versions are already recorded in
   [the staff execution history](STAFF_PASSWORD_RELEASE_EXECUTION.md); do not
   replay them or bootstrap. Review the sole new file
   `20261008160137_participant_age_retention.sql` independently and apply it only
   through the approved operator procedure, with catalog/data/ACL verification.
2. Pass disposable SQL/native Auth/concurrency tests, RLS/grant/advisor checks,
   complete EN/AR/mobile/keyboard/axe tests and reviewed synthetic dry-run counts.
   Approve the retention exception map and native/provider-log handling.
3. Establish restricted scheduler custody, monitoring/failure handling and
   out-of-band deletion/ever-verification ledger retention plus restore proof.
   There is no scheduling cadence or live scheduler invented in this PR. Review
   its configuration separately; do not enable account collection without it.
4. Verify all existing participant provider, notice, support, quota and human
   inbox/recovery gates in [the participant guide](PARTICIPANT_ACCOUNTS.md).
   A native database operator may enable the cleanup switch only after these
   operating prerequisites pass. Run/verify a bounded dry-run before authorized
   erasure. Changing a server flag or database `policy.enabled` alone is insufficient.
5. Participant collection still needs its separate database/server enablement
   and exact serving deployment/UAT verification. That activation is outside this
   PR; staff pairing, registration and all other operational workflows stay closed.

## Failure handling and rollback

Stop for target/permission/ledger mismatch, failed checks or unclassified retention
facts. Keep the original failed receipts. Do not retry an uncertain identity or
destructive operation automatically; reconcile its exact transaction/job first.
The worker rolls back all personal-data changes for a failed actor and leaves
bounded evidence. A later explicitly authorized attempt rechecks every condition.

Close participant admission and the independent cleanup switch if operation must
stop, then disable the separately configured scheduler and verify actual gates.
Do not reopen by removing capability checks or fabricating an age proof. Schema
rollback before any collection/erasure must be rehearsed on a disposable clone.
After erasure, never restore deleted accounts from an old snapshot as a rollback;
preserve/reapply the latest ledger and keep access closed until reconciliation.
