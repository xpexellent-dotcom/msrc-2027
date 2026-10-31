# Research competition and abstract submission v2

## Submission window — ENG-092

ORG-058 dates are owner-confirmed accurate on 31 October 2026. The existing staff
research workspace now has an EN/AR Submission window section. Scientific
Administrators can inspect it; only Super Admins can save dates and Accept
submissions. Inputs/display use Asia/Riyadh, transport/storage use explicit UTC,
and saves share the incumbent settings CAS version, immutable history and audit.
The published-date button fills 23 November 00:00 / 13 December 23:59 Riyadh only;
it never saves or enables anything. Opening is inclusive; closing is exclusive.

The saved readiness checklist includes the switch, ordered dates, current window,
latest screening threshold, participant account,
privacy, email, retention and server flags/configuration. The public CTA reads
only state and saved instants from `/api/abstracts/window` without cookies or
private data; the calendar remains informational. Private page-state observation
uses the same saved window via its existing abstract handler. Missing database
capabilities return area-not-ready and never clear the account session.

ORG-070 supersedes ABS-09/11's participant similarity-report upload and AT-08's
stage-one similarity PDF requirement: organizers run screening Gate 7. ORG-068
item 7 already replaces ethics and study-registration files with reference text.
No current stage-one abstract requirement needs participant file uploads.
Stage-one readiness/status/finalization are independent of `evidence_ready`; its
code remains for file workflows such as ABS-14 stage-two materials. Existing
confidential stage-one evidence remains Super Admin only under ABS-15. No external
plagiarism-provider integration is assumed or approved. The latest screening
threshold must be saved before opening and remains a database finalization gate;
clearing its latest version closes entry even if older versions had thresholds.

Migration `20261031140000_abstract_submission_window.sql` is review-only and must
follow ENG-088, ENG-090 and ENG-091; it preserves advisory and held supervisor-mail
behavior. All settings/flags and hosted environments stay closed.
Arabic copy remains DRAFT pending human review. Details and verification:
[abs8 receipt](../progress/2026-10-31-abstract-submission-window.md).

## Earlier implementation context

ENG-088 implements ORG-068, PR 1 of 2. ABS-01–04/07/08/12/13/15, REV-01/06–09,
PRV-03–06, SEC-01/02/06, LOC-01–03, TIM-01/02 and ACC-01 apply with the recorded
owner overrides. Screening, scoring/rubric changes, thresholds and supervisor
email are outside this slice. All hosted workflows and delivery remain closed.

ENG-090 / ORG-069 now adds the staff screening checklist, fixed seven-criterion
human rubric, inactive provisional band suggestions and internal similarity
checks in the existing research workspace. Participant document validation,
one-chance locking, public copy and opening gates are unchanged. See
[current scientific review](ABSTRACT_REVIEW.md#current-screening-and-recommendations--eng-090)
and its [receipt](../progress/2026-10-31-abstract-screening-scoring.md).

## Public information

`/{locale}/abstracts` is indexable on production. It contains
the owner-supplied competition copy, public ORG-058 calendar roadmap, oral/poster
descriptions, eligibility, guidelines and seven simplified evaluation criteria
without weights/thresholds. The preparation checklist is an acknowledgement
dialog on the submit/draft CTA states; the nine submission rules appear above
the private form. Hero and closing links retain a real form destination without
JavaScript. The dialog requires each checklist item, supports native modal
keyboard/Escape behavior and returns focus to its initiating link on dismissal.
Oral/poster descriptions retain the owner's paragraphs in complementary editorial
panels; the three-winners statement is a separate distinction band.
`/submissions` redirects permanently to this page. Navigation, participation,
footer and sitemap point to the public route. The client-only CTA starts with
the signed-out label, then checks the public opening calendar and an existing
session hint; account/profile/draft/finalized state updates its destination.
Calendar display does not configure an operational opening instant.

The abs3 independent review uses three wider journey columns on desktop, stronger
form section headings, regular-weight entered text and explicit dialog focus.
Title-count, ethics and registration helpers are associated with their controls.
Short public headings and availability messages use concise EN/AR wording;
Arabic is owner-approved under ORG-069. Rules and owner paragraphs are unchanged. Full wording,
screenshots and check results: [abs3 review](../progress/2026-10-29-codex-abstract-polish.md#abs3-review).

## Owner approval and Terms v1.1

ORG-069 approves the existing Arabic and ethics/registration helper copy without
wording changes. ENG-089 removes the preview bypass, synthetic workspace branch,
banner and separate test server. The acknowledgement dialog and Submission rules
panel remain on the normal signed-in flow, covered by synthetic signed-in fixtures.
Terms v1.1 EN/AR reconciles the research rules; approval is by owner review and merge.
See [receipt](../progress/2026-10-31-abstract-content-terms.md).

## Private submission

`/{locale}/abstracts/submit` is noindex and force-dynamic, uses private no-store
responses and the incumbent session/origin/CSRF protection. Participant actions
and email workspace links use this route. The one-page form has six numbered
sections, autosave and explicit full read-only review before finalization.
Drafts may remain incomplete. Over-limit titles/body and invalid taxonomy IDs
cannot be saved. Suggested section ranges are not individual constraints.

`src/content/abstract-taxonomy.ts` contains the fixed ten study types and 21
specialties. Staff taxonomy/keyword/corresponding-author settings remain because
profiles and existing review/settings consumers still use their contracts;
they do not determine abstract v2 choices or submission-window readiness.
Profile interest behavior and completeness are unchanged. The profile and
supervisor forms now share the same contact-only phone component/validation.

All six abstract sections require at least one countable token at finalization.
The counter adds six fixed heading words to whitespace-separated tokens that
contain a letter or number, using the same pinned Unicode ranges in SQL and TS.
The title uses the same token rule separately, maximum 20 words. Scientific
fields remain English/LTR in Arabic chrome. Co-author email is optional; name
and affiliations are required. Presenter identity is rebound from authoritative
account/profile data on save/finalize, never trusted from request metadata.

Finalization checks the configured window, complete profile, allowed presenter
status, unused chance, document validity and the saved G7 similarity threshold,
without an upload gate (ORG-070). A finalized rejection or withdrawal still consumes
the chance. The server-only transactional RPC owns the one-chance check so a
lost successful response can replay its existing idempotency receipt. The UI
offers no participant revision/resubmission after finalization.

## Database and compatibility

The only migration is `20261029120000_abstract_submission_v2.sql`, review-only.
Forced RLS and private-schema no-client-grant boundaries remain. The existing
transaction/edition lock plus actor advisory lock serializes chance checks;
a partial unique index prevents two active drafts. Historical multiple
finalizations remain intact and consume the chance. Surplus never-finalized
legacy drafts are retained privately as withdrawn with an audit receipt, while
one active draft remains; these archived drafts do not consume a final chance.

Editable drafts are projected to v2. Finalized documents and historical
snapshots remain unchanged: readers map aim to objectives, add empty limitations,
remove obsolete fields from the view, and leave new confirmations false.
Review/sanitized/advisory/judging packets use explicit scientific whitelists and
legacy projections. Existing rubric/scoring and winner-stage evidence rules stay
unchanged. Reporting includes actual new specialty IDs alongside legacy ones.
Shared Hackathon word counting explicitly subtracts the six abstract headings,
preserving its incumbent behavior.

Supervisor contact values are available only in owner and authorized scientific
detail paths. They never enter reviewer or AI packets; local canary screening
also recognizes supervisor identity. Existing account erasure/retention paths
blank supervisor values in submissions, snapshots and cached operation results.
A narrowly authorized immutability exception permits only that redaction and
retains the scientific content; audits contain no contact values. The broader
pre-existing abstract author/document retention gap is still a release blocker.

Code requires database documentVersion 2. Deploying code before the migration
therefore yields area-not-ready while keeping the session. The migration creates
no schedules, seeds, windows, grants or activation defaults. See the
[verification and rollout receipt](../progress/2026-10-29-codex-abstract-page.md).

## Owner review and release gates

All new Arabic labels/copy, and EN/AR ethics and registration helpers, are owner-approved under ORG-069.
The owner reviewed Terms v1.1 EN/AR (ORG-069/ENG-089), recorded in ORG-070. v1.0 remains archived and recorded
acceptances are unchanged; no forced re-acceptance is added. The ENG-091 supervisor email subject is approved,
while delivery and the other release gates remain closed. Actual Supabase lint, pgTAP and database concurrency
must pass in disposable CI. Hosted migration/configuration, real account/device/inbox UAT, ABS-14 file-workflow
evidence and privacy gates remain separate.
