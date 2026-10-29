# Research competition and abstract submission v2

ENG-088 implements ORG-068, PR 1 of 2. ABS-01–04/07/08/12/13/15, REV-01/06–09,
PRV-03–06, SEC-01/02/06, LOC-01–03, TIM-01/02 and ACC-01 apply with the recorded
owner overrides. Screening, scoring/rubric changes, thresholds and supervisor
email are outside this slice. All hosted workflows and delivery remain closed.

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

## TEMPORARY owner review mode — remove before release

On a Vercel **preview** deployment, visit `/en/abstracts?review=1` or
`/ar/abstracts?review=1`, acknowledge every checklist item and continue. Direct
links `/en/abstracts/submit?review=1` and `/ar/abstracts/submit?review=1` also work.
Development (`NODE_ENV=development`) supports the same URLs. This is temporary
owner design review, not a participant workflow, and needs no hosted migration,
feature flag, account, delivery configuration or Vercel environment changes.

`review-mode.server.ts` accepts the exact single query value `review=1` only when
`VERCEL_ENV=preview` or `NODE_ENV=development`. `VERCEL_ENV=production` always
vetoes the mode, including a contradictory development NODE_ENV. Ordinary URLs,
other values and repeated query parameters retain the existing operational gates.
The public route reads search parameters on the server for this guard, making it
dynamic for now; it still reads no private session data. Allowed public review
URLs are noindex; the private form remains noindex in every mode.

The form receives a fresh synthetic ready state before any hosted/account read:
Review Presenter, reviewer@example.test, Synthetic Review Institution, complete
profile, eligible presenter, open synthetic window and no submissions. The full
blank editor is available immediately. A sticky banner above the rules reads
“Review mode — preview only. Nothing is saved or submitted.” (Arabic DRAFT).
Save, autosave, preview and finalization operate only in mounted component state;
they make no `/api/abstracts` requests. Reloading discards that state. Scientific
content remains English/LTR and the same field validation and one-chance locked
presentation can be reviewed. No operational window dates/reference or real acceptance
outcome is created.

**Removal gate:** before release, remove the review helper/synthetic state,
query/metadata/CTA plumbing, local workspace mutation branch and banner copy;
remove the review-only tests/capture opt-in and the isolated preview test server.
Restore the public route's static-friendly signature once it no longer reads
search parameters. Retain the acknowledgement dialog, rules panel, design and
normal operational regression coverage. Do not use this review surface as hosted
database or release evidence. [Polish receipt](../progress/2026-10-29-codex-abstract-polish.md).

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
status, unused chance and document validity, then preserves the existing
confidential-evidence gate. A finalized rejection or withdrawal still consumes
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

All new Arabic labels/copy, and EN/AR ethics and registration helpers, are DRAFT.
Approved Terms v1.0 still describe 300 words, ongoing research and two submissions
per PI. Owner/legal reconciliation is required before opening this form; no new
legal version was invented. Actual Supabase lint, pgTAP and database concurrency
must pass in disposable CI. Hosted migration/configuration, human Arabic review,
real account/device/inbox UAT and existing evidence/privacy gates remain separate.
