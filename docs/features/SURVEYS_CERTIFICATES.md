# Surveys and certificates (closed)

ENG-075; CRT-01..06 and AT-14. Additive review migration:
`20261024130000_surveys_certificates.sql`. Built on ENG-074 workshop evidence,
registration's server-only participant/session boundary, conference-day attendance
and the existing held transactional outbox. No hosted application or activation.

## Evidence and ordinary templates

The only ordinary pathways are Full Two-Day Conference Attendance and Workshop
Participation. Conference eligibility requires exactly two configured conference
days and one current, non-undone valid check-in on each, plus general-survey
completion. Duplicate scans cannot replace a missing day. Workshop eligibility
uses the prior task's confirmed-booking, check-in, separate completion and conflict
evidence, plus that workshop's survey. It has no full-conference prerequisite.
Current account and evidence checks run again before delayed generation finishes.

Template/signature edits clear approval. A current Super Admin approves and
releases; immutable batch/template snapshots and operation IDs make staff retries
safe. Approval and release compare the reviewed template version under the row
lock, so another administrator's edit cannot approve an unseen signature. The
release dialog retains that reviewed version. Release creates pending certificates.
A service-only worker leases at most
three documents per drain, generates immutable PDFs and atomically issues each
document with its held email. Interrupted work stays pending until lease recovery.
Revocation invalidates the original; approved corrections create a new opaque
code and leave the original publicly marked replaced. Managers can prepare
surveys, view evidence, revoke and reject corrections; Super Admins approve
template/signature, release and correction reissue.

Presenter, reviewer, speaker, organizer, hackathon and 3MT certificates are an
explicit extension point, requiring their own approved evidence and release
rules. They cannot be inserted as a third ordinary kind. There is no hours field,
one-day ordinary variant, CME wording or accreditation entitlement.

## S2 feedback boundary and remaining privacy review

Staff start with an empty editable question set. The editor supports rating
scales, single choices and short text, with bilingual staff-authored labels and
choices. Publishing requires a nonempty approved set and an explicit deadline.
Question sets become immutable once completion evidence exists.

Completion retains only survey/account membership. Answers are individual
question values with the relevant survey/question and Riyadh calendar date:
no response identifier/grouping key, account, email, IP, token, precise timestamp,
operation ID, input fingerprint or request log. Completion and feedback commit
atomically; a serialized repeat returns completion without inserting answers.
Only categorical survey/question keys are shared, never a response-specific key.
No foreign key starts at the answers table. No API role, including application
Super Admins, has schema/table access or an answer-to-identity/export RPC. Staff
projections show completion counts and separate eligibility, never answers joined
to identities. Tests assert the column/ACL/FK boundary and absence of submission
audit/fingerprints.

Free text is not a promise of absolute anonymity. The form warns against personal
information and directs personal follow-up to Contact; known participant
name/email and obvious email, IPv4/IPv6 and UUID identifiers are rejected. Other
names, unusual identifiers, question content and very small groups need review.
The application boundary does not erase PostgreSQL physical transaction metadata
(`xmin`), WAL/backups or infrastructure access logs. A database operator with
unrestricted access can correlate physical transactions. Before enabling S2,
approve the threat model, database/log access controls and retention, suppress
request bodies/parameters in infrastructure logging, assess small-group disclosure
and confirm the unlinking method. `unlinking_approved` defaults false. Do not
describe this closed implementation as anonymous against database operators.

## Private documents, public verification and retention

PDFKit **0.20.2** is MIT-licensed and was checked against its
[current font API](https://pdfkit.org/docs/text.html),
[getting-started API](https://pdfkit.org/docs/getting_started.html) and
[package metadata](https://www.npmjs.com/package/pdfkit). No PDF library existed.
It supplies maintained Node streaming, vector drawing and font embedding without
a browser or remote rendering service. Static Inter and Noto Sans Arabic
**5.3.0** (OFL) are embedded from Fontsource: the site's variable WOFF2 files
failed Fontkit's subset test, so PDF-only static WOFF fonts are pinned. Existing
web typography stays intact. The private artwork is purple/gold and visibly
PLACEHOLDER; the signature is approved text, with no invented signature image.
One-page English and Arabic-name samples were rendered and inspected.

PDF bytes are stored privately in PostgreSQL, bounded to 1 MB by the server, with
no public bucket, file URL or bearer-download capability. Owner downloads
independently check current native session, ownership, workflow and retention.
`/[locale]/my-msrc/certificates` is linked from signed-in My MSRC only when enabled.
The verification page `/[locale]/certificates/verify/[code]` exposes only
recipient name, type, edition/activity and validity. Codes
are 64 opaque hex characters from two random UUIDs (244 random bits). A separate
HMAC IP counter limits lookups; it stores no code/request/actor mapping. Trusted
Vercel IP evidence is required in production. Verification uses noindex metadata
and headers, private/no-store caching and no-referrer policy; it is outside the
public analytics allowlist.

Feedback, private-download and public-verification retention values have no
defaults. Expiry denies private/public reads. The authenticated generation drain
performs bounded deletion of expired feedback and expired PDF bytes; no new
scheduler is installed. Certificate identity/audit redaction beyond public expiry
requires an approved privacy policy before activation; expiration is not claimed
to delete all certificate/audit identity records.

## Release gates

Runtime flag, database issuance/survey gates, participant readiness, retention,
unlinking review, approved questions/deadlines and approved template/signature
all remain separate. Staff settings preparation cannot switch workflows on.
English `certificate_notice` v1 deliberately follows this task's narrow language
override; it does not alter other ORG-059 bilingual messages. SQL delivery hold
and the worker's independent DRAFT guard prevent delivery, even for a frozen
provider snapshot. Email wording and real delivery require later review.

CI runs the new browser config and includes `msrc_certificates` in strict DB lint.
pgTAP covers privacy structure, eligibility, approval/release, verification,
correction/reissue, revocation and permissions. Local PostgreSQL parser/WASM
checks are supplemental only; they do not replace managed Supabase, pgTAP,
concurrency or integration CI. See the receipt for observed commands and limits.
