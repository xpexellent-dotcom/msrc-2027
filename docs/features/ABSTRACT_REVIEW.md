# Abstract submission and scientific review — closed implementation

**ENG-088 / ORG-068 update:** The participant rules and route descriptions below
record the ENG-065 baseline. Current six-section, 350-word, completed-research,
presenter-eligibility, supervisor and one-chance rules are in
[abstract submissions](abstract-submissions.md). The public page is `/abstracts`;
the private form is `/abstracts/submit`. Review/scoring policy is unchanged by
ENG-088. Do not use the historical PI/keywords/ongoing/revision rules below for
new participant submissions.

**ENG-090 / ORG-069 update:** Current staff screening, fixed human scoring,
provisional bands and internal similarity are described below. ORG-069 is being
recorded by a parallel PR; this task cites it without creating that decision.
The [31 October receipt](../progress/2026-10-31-abstract-screening-scoring.md)
records verification and the unapplied migration. AI remains advisory and closed.

Night-3 Task 5, ENG-065. Requirements ABS-01–08/12/13/15, REV-01–09,
BL-ABS-01–03/06 and BL-REV-01–07. The current task authorizes balanced
automatic assignment, superseding the older BL-REV-03 exclusion. Event judging,
award approval, supervisor validation for selected winners and stage-two files
remain separate work.

## Release posture

All operational configuration is unseeded. The participant runtime switch
`ABSTRACT_SUBMISSIONS_ENABLED` and private database settings must independently
permit access. No flag or hosted setting was enabled by this task. Staff tools
use the existing staff portal admission and exact-session assurance. Missing
new RPCs show `area-not-ready` without invalidating a valid signed-in session.

ORG-068 fixes the submission taxonomy and document rules; ORG-069 fixes the 2027
human rubric, its seven weights and integer scores 1–4. Staff cannot replace the
rubric or configure a different initial reviewer count. Existing operational
windows, blinding and legacy compatibility settings remain unseeded. Complete
settings do not prove privacy, evidence or email readiness. Existing submission
window controls are retained, without adding a new settings screen.

Each human total is `Σ weight × (score − 1) / 3`, rounded once to two decimals.
The aggregate is the unrounded mean of eligible completed reviewer totals.
The initial pilot requires two independent reviewers. Missing, conflicted,
withdrawn and ineligible reviews never count as zero. Historical settings,
snapshots and scorecard versions are preserved. Legacy cards lacking
`msrc2027_org069` are excluded from the current aggregate; a fresh human card
must use the approved rubric. The prior deadline and assignment protections
still apply. SQL and TypeScript share parity vectors; executing the SQL half
requires disposable database CI.

## Current screening and recommendations — ENG-090

G1–G4 are computed from the finalized snapshot: 350 words including the six
headings; all six sections; at least one result using the incumbent completeness
rule; and complete presenter/profile, supervisor, co-author and study information
including the separate 20-word title. Profile changes after finalization do not
change this evidence. Legacy documents are not silently filled in or rewritten.
G5 combines ORG-068 ethics/registration completeness with an explicit staff
pass/fail and rationale. G6 records relevance judgement with the fixed specialty.
Confidential ethics/registration originals are never returned by this checklist;
their existing Super Admin restriction and independent evidence release gate stay.

G7 compares scientific body text against all other same-edition abstracts,
including drafts, and previously accepted abstracts held in the database.
Only references, titles, editions, versions and the five highest scores are
projected to authorized scientific staff. No identity fields or bodies of matching
abstracts enter the result. The migration checks `pg_available_extensions`:
`pg_trgm` is available in the [Supabase extension catalog](https://supabase.com/docs/guides/database/extensions)
and is used when present; a normalized three-token shingle Jaccard is the SQL
fallback. These are internal similarity signals, not proof of plagiarism.
The 0–100 threshold has **no default**; G7 stays pending while it is unset.
Scores must be strictly below the saved threshold. An external report attestation
and reference are also required. No external literature/plagiarism service or
upload is integrated.

Each screening action appends a version-bound round and seven gate rows with
actor, time, notes and failure disposition. Compare-and-swap, operation IDs and
the incumbent edition-then-target locking protect concurrent confirmations and
lost-success retries. The overall status is pending, passed, failed_correctable
or failed_final. A failed non-correctable mandatory gate is rejection eligible;
a human records that rejection through the existing decision workflow. This
does not grant another participant submission chance or open a correction form.
Integrity/ethics investigation is separate and blocks final decisions and batch
publication until resolved with a note. Scoring and final decisions recheck the
current threshold and corpus; a prior pass cannot bypass a changed similarity
result. A changed screening record also invalidates a prepared decision's basis.

Super Admin settings are append-only, with **no default row**. The UI offers
inactive suggested cutoffs 85 / 60 / 55; the acceptance threshold must be entered
explicitly. Bands say **Provisional — pilot required** in EN/AR. Oral candidates
must meet the saved total cutoff and **every** reviewer's Methodology and Results
scores must be at least 3; averaging those two criteria cannot hide a lower score.
Poster candidates include oral-quality work beyond an explicitly entered oral
capacity. Capacity has no default. A tie spanning its boundary is routed to
additional review, without an arbitrary identifier-based scientific tie-break.
Borderline work is also routed to additional review. Staff can explicitly request
a higher quorum and record a reason using the incumbent REV-02 assignment range
of up to five. The same assignment, conflict, scorecard and decision RPCs handle
the additional reviews. Staff see each criterion's highest-minus-lowest difference.
Materialized cohort calculation avoids recomputing the entire peer cohort for
every row of the staff list. No recommendation allocates or publishes anything.

Only Scientific Administrators and Super Admins can confirm screening or prepare
scientific decisions; only a Super Admin can save bands, threshold and capacity.
Reviewers retain their own assigned English/LTR packet and scorecard with the
owner's English anchors. Strict API projections exclude screening, settings,
supervisor/presenter identity, confidential evidence and peer cards from reviewers.
All paths retain persisted roles, current native session assurance, forced RLS,
private-schema ACLs, READ COMMITTED guards and private no-store responses.
New RPCs use `optionalRpc` / `StaffRpcMissingError` area-not-ready handling.

`screening.passed` is an immutable audit extension point for the later supervisor
email PR. A future consumer must deduplicate by edition/submission/snapshot version
and recheck current eligibility. This implementation creates no notification job,
email template, supervisor email, AI scoring change or provider switch. Existing
decision publication remains a separate explicit human action with held email jobs.

There are no uploads, buckets, signed-file URLs or attachment fields in this
slice. Required ethics and similarity evidence (ABS-09–11) remains blocked on
the virus-scanning decision and a reviewed private evidence workflow. The
database's independent `evidence_ready` gate remains false; a staff settings
save cannot enable it. Future confidential-original access belongs only to
Super Admins. No scientific administrator or reviewer gains that access here.

## Participant flow

`/en/abstracts` and `/ar/abstracts` provide bilingual chrome and English/LTR
scientific inputs. The form supports ordered authors, multiple affiliations,
separate PI/corresponding/presenting authors, ethics and other declarations,
resumable drafts, a preview, and explicit finalization. Co-authors do not acquire
accounts, admission, orders or public profiles. There is no supervisor field.
Email is required for the declared PI and corresponding author; other coauthors
may leave it blank. Supplied addresses must be valid.

Only the five structured body sections count toward 300 words. Whitespace
separates tokens; a token must contain a letter or number. Unicode 17 letter/number
ranges and ECMAScript whitespace are frozen in both implementations to avoid
browser/database Unicode-version or collation differences. Titles, keywords,
authorship and generated headings are excluded. Ongoing work may explain its
current progress without inventing results. The server and database independently
validate the submitted count and reject a forged client total.

Finalization preserves an immutable snapshot and ordered author rows. Optimistic
versions prevent a stale device from overwriting a later save. The PI limit is
checked under the edition transaction lock and counts finalized applications,
including later withdrawals, across submitters. Drafts and co-authorship do not
consume that limit. The canonical declared PI email is the current identity key;
scientific/privacy owners must approve how alternate emails and identity
corrections are reconciled before activation. This is not verified identity
deduplication across aliases.

Only published decisions reach participants. A permitted revision has explicit
instructions and an exact deadline, creates a new snapshot, and does not turn
earlier scorecards into reviews of the new version. The original snapshots and
their review links remain immutable.
This slice permits revision of title, body and keywords only. Author and other
metadata corrections require a separately authorized correction path; the
interface states the permitted fields rather than implying unrestricted edits.
Autosave has an independent actor-scoped anti-abuse budget of 60 new mutations
per minute. Reads and successful idempotent retries do not consume it, and
abstract editing does not consume authentication form/email quotas.

## Staff flow and permissions

Science provides settings, the submission list, sanitized packet preparation,
manual/balanced assignment, completion progress and decision batches. Review
provides the reviewer's own queue, approved blind packet, declared affiliations,
decline/conflict actions and rubric-bound scorecards. Review is English/LTR
even when entered from an Arabic staff route. Other staff chrome supports RTL.

Under ENG-090, Scientific Administrators and Super Admins maintain science work,
including screening, packets, assignment and human decisions. Review scoring
still requires the reviewer role and that reviewer's current assignment.
UI visibility is not authorization: the server and each RPC recheck the current
edition-scoped role and session.

Reviewer responses use a strict field projection. No authors, emails, author
affiliations, declarations, confidential evidence or peer scorecards are returned.
Staff explicitly prepare and attest a sanitized packet for the finalized
snapshot; text can still identify a person after profile fields are removed,
so a human disclosure check is a release responsibility. Both assignment paths
require declared reviewer affiliations and reject matching author affiliations,
self-review and ineligible reviewers. Normalized text matching cannot infer
institution aliases or undisclosed relationships; reviewers can flag conflicts.

Each assignment freezes its submission and rubric version. Missing or declined
reviews are not zero scores. Independent component scores and calculated totals
remain separate from authorized committee decisions. Prepared decisions do not
publish themselves or send email. Batch preview and explicit publication are
separate actions, with immutable records and retry protection.
Science shows completed component scores/comments and a mean only after the
configured valid quorum. Accept/reject preparation and publication recheck that
quorum. A rejection for a confirmed failed_final mandatory gate can precede
scientific scores; unresolved investigations still block it. A revision request
can precede quorum. Revoked or conflicted reviewers do
not count toward completion; reassignment preserves their earlier history.
Each decision also freezes its exact completed scorecard versions. If a score
or comment changes after preparation, publication refuses the stale decision;
the committee must prepare a new decision against the current review basis.

## DRAFT bilingual decision template

Registry: `abstract_decision`, version 1, **DRAFT — owner approval pending**.
ORG-059/ENG-067 adds a banner and complete Arabic translation below the complete
English message for each accepted, not-accepted and revision outcome. The
English meaning is preserved. Subjects use `English subject | Arabic subject`;
HTML separates its language blocks with a divider and gives Arabic `dir="rtl"`
and `lang="ar"` with the local Arabic font stack. Plain text includes the banner
alt text and absolute URL, English, a divider and Arabic. The image is the
600 × 338px resize of the approved previous-edition homepage still
`public/media/msrc2026/poster-desktop-v1.jpg` (MEDIA_REGISTER §9), served from
`https://www.msrc2027.com/brand/email-banner.png`. Its English alt text is
`MSRC 2026 conference audience — previous edition`; email placement awaits owner
approval with the composition. There are no tracking
pixels, remote fonts, new artwork or delivery claims.

Publication still queues held jobs in the existing transactional outbox. The
SQL claim path excludes held jobs, and the worker independently refuses this
DRAFT template. The existing `locale: "en"`, template version and database/RPC
contracts are retained; bilingual rendering needs no migration. No real message
was sent. ORG-057's original approved English registration wording is preserved,
while its new bilingual compositions also await owner approval.

Allowed variables: stable abstract `reference`, `outcome` (`accept`, `reject`,
`revise`), applicant-facing `instructions`, and `revision_deadline` for revisions.
No author details, reviewer identity, criterion scores, confidential reason or
caller-controlled URL is accepted. The renderer escapes all text.

The persisted four-field payload is unchanged. When `instructions` is nonempty,
the server-only renderer additionally requires a reviewed translation pair via
`renderOutboxMessage(message, { abstractInstructions: { english, arabic } })`.
The supplied English must match the stored instructions; missing, empty or
mismatched companion text fails closed. The synthetic preview supplies a fixed
English/Arabic pair. No automatic translation, inferred policy or repeated
English is presented as an Arabic translation. A reviewed collection/persistence
path for real committee-authored Arabic instructions remains a release gate;
this task adds no database column, payload field or RPC for that future work.

Bilingual abstract subjects abbreviate a reference longer than 100 characters
to respect the existing subject limit; the body retains the full reference.

- English subject: `Abstract {reference}: accepted`, `not accepted`, or `returned for revision`, followed by its Arabic subject.
- Opening: `The scientific committee has recorded the following outcome for abstract {reference}: {outcome}.`
- Optional applicant-facing instructions, separately entered by authorized staff.
- Revision only: `Submit the revised abstract in your account by {deadline} (Asia/Riyadh). An email reply does not submit a revision.` The Arabic block uses the same stored deadline with Arabic month names and Riyadh time.
- Corresponding `/en/abstracts` and `/ar/abstracts` sign-in destinations and the configured support address in each language block.

The draft is previewable but cannot be activated merely by opening the existing
outbox switches. Owner wording approval, a reviewed change releasing template
holds, provider/delivery checks and authorized activation remain necessary.
Staff/reviewer/faculty-judge emails, staff session email checks and Contact
delivery remain English-only under ORG-059; scientific content and reviewer
screens retain their English/LTR policy.

## Synthetic bilingual decision previews

These exact renderer fixtures use `SYNTHETIC-ABSTRACT-001` and
`sample@example.invalid`. The revision deadline and paired instructions are
fixed synthetic examples, not live decisions, policy or configured workflow dates.

### DRAFT — Accepted

Subject (DRAFT): **Abstract SYNTHETIC-ABSTRACT-001: accepted | الملخص: مقبول**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The scientific committee has recorded the following outcome for abstract SYNTHETIC-ABSTRACT-001: accepted.

Sign in to view your abstract: https://www.msrc2027.com/en/abstracts

Support: contact@msrc2027.com

---

سجّلت اللجنة العلمية النتيجة التالية للملخص SYNTHETIC-ABSTRACT-001: مقبول.

سجّل الدخول لعرض ملخصك: https://www.msrc2027.com/ar/abstracts

للدعم: contact@msrc2027.com
```

### DRAFT — Not accepted

Subject (DRAFT): **Abstract SYNTHETIC-ABSTRACT-001: not accepted | الملخص: غير مقبول**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The scientific committee has recorded the following outcome for abstract SYNTHETIC-ABSTRACT-001: not accepted.

Sign in to view your abstract: https://www.msrc2027.com/en/abstracts

Support: contact@msrc2027.com

---

سجّلت اللجنة العلمية النتيجة التالية للملخص SYNTHETIC-ABSTRACT-001: غير مقبول.

سجّل الدخول لعرض ملخصك: https://www.msrc2027.com/ar/abstracts

للدعم: contact@msrc2027.com
```

### DRAFT — Returned for revision

Subject (DRAFT): **Abstract SYNTHETIC-ABSTRACT-001: returned for revision | الملخص: أُعيد للتعديل**

```text
MSRC 2026 conference audience — previous edition: https://www.msrc2027.com/brand/email-banner.png

The scientific committee has recorded the following outcome for abstract SYNTHETIC-ABSTRACT-001: returned for revision.

Please clarify the methods in the abstract.

Submit the revised abstract in your account by 19 November 2026 at 20:00 (Asia/Riyadh). An email reply does not submit a revision.

Sign in to view your abstract: https://www.msrc2027.com/en/abstracts

Support: contact@msrc2027.com

---

سجّلت اللجنة العلمية النتيجة التالية للملخص SYNTHETIC-ABSTRACT-001: أُعيد للتعديل.

يُرجى توضيح المنهجية في الملخص.

قدّم الملخص المعدّل من حسابك بحلول ١٩ نوفمبر ٢٠٢٦ في ٢٠:٠٠ (بتوقيت الرياض). الرد على هذه الرسالة لا يُعد تقديمًا للتعديل.

سجّل الدخول لعرض ملخصك: https://www.msrc2027.com/ar/abstracts

للدعم: contact@msrc2027.com
```

## Verification and handoff

Current observed results and exact RPC signatures are in the
[O9 receipt](../progress/2026-10-23-codex-night3-abstracts.md).
Prepared pgTAP and concurrency cases require disposable database CI; local
JavaScript and browser checks are not evidence of database execution.
Review Arabic wording, scientific settings/policy, declared-identity handling,
institution aliases, privacy/retention, evidence scanning and DRAFT email wording
before any release. Hosted migration application remains owner-controlled.

Implementation follows the current [Supabase function security guidance](https://supabase.com/docs/guides/database/functions)
and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security):
private tables, explicit ACLs, forced RLS, empty search paths for privileged
functions, and independently checked current authority.
