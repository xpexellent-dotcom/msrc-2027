# Abstract submission and scientific review — closed implementation

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

Submission/review dates, specialties, study types, rubric criteria/scales/weights,
required review count, keyword policy, blinding, corresponding-author eligibility,
ongoing-study treatment, aggregation and not-applicable policy must be supplied
by authorized staff. No operational values are inferred from examples. Complete
settings do not prove privacy, evidence or email readiness.

The implemented scoring mode is a weighted mean of criterion scores normalized
to their configured ranges, expressed on a 0–100 scale. Staff must explicitly
select `weighted_normalized_mean` and `all_required`; neither is preselected.
An unsupported aggregation or not-applicable policy keeps readiness false.
The rubric's criteria, weights, ranges, threshold and ongoing-study instructions
remain staff inputs. A different calculation policy needs a reviewed extension.

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

Scientific Administrators maintain science work. Super Admins may edit the
explicitly requested settings but otherwise receive oversight unless they also
hold the relevant role. Review scoring additionally requires that reviewer's
current assignment. UI visibility is not authorization: the server and each
RPC recheck the current edition-scoped role and session.

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
quorum. A revision request can precede it. Revoked or conflicted reviewers do
not count toward completion; reassignment preserves their earlier history.
Each decision also freezes its exact completed scorecard versions. If a score
or comment changes after preparation, publication refuses the stale decision;
the committee must prepare a new decision against the current review basis.

## DRAFT English decision template

Registry: `abstract_decision`, version 1, **DRAFT — owner approval pending**.
Publication queues held jobs in the existing transactional outbox. The SQL
claim path excludes held jobs, and the worker independently refuses this DRAFT
template. No real message was sent. ORG-057 registration wording is unchanged.

Allowed variables: stable abstract `reference`, `outcome` (`accept`, `reject`,
`revise`), applicant-facing `instructions`, and `revision_deadline` for revisions.
No author details, reviewer identity, criterion scores, confidential reason or
caller-controlled URL is accepted. The renderer escapes all text.

- Subject: `Abstract {reference}: accepted`, `not accepted`, or `returned for revision`.
- Opening: `The scientific committee has recorded the following outcome for abstract {reference}: {outcome}.`
- Optional applicant-facing instructions, separately entered by authorized staff.
- Revision only: `Submit the revised abstract in your account by {deadline} (Asia/Riyadh). An email reply does not submit a revision.`
- The fixed `/en/abstracts` sign-in destination and configured support address.

The draft is previewable but cannot be activated merely by opening the existing
outbox switches. Owner wording approval, a reviewed change releasing template
holds, provider/delivery checks and authorized activation remain necessary.

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
