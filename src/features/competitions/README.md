# Closed competition infrastructure — ENG-077

TRK-01, HAC-01–11, TMT-01–02 and CFG-13. Hackathon and 3MT use distinct
documents and configuration. Shared infrastructure follows the abstracts module:
verified accounts, saved drafts, optimistic versions, operation-key idempotency,
immutable snapshots and audit, sanitized review packets, scoped assignments,
conflicts and separate event judging. Abstract eligibility, PI limits, templates,
word limits and award rules are not inherited by 3MT or Hackathon.

Participant `/[locale]/entries?kind=hackathon|three_minute_thesis` and non-review
staff `/[locale]/staff/competitions` have English/Arabic shells. Scientific content
stays English/LTR. `/en/reviewer/competitions` and `/en/judge/competitions` are
English-only; Arabic routes redirect to English. Public entry buttons stay closed.

`COMPETITIONS_ENABLED` is absent/off by default. Participant-account policy,
privacy, verified identity/session/age, per-kind enablement and evidence gates
remain independent. No RPC or UI enables these release gates. Missing pending
RPCs produce `area-not-ready` and retain the session. Settings start entirely
null; recording configuration does not open stages.

Hackathon has exactly the HAC-02 tracks, solo roster exactly one, preformed teams
at most five including their lead, no matching, an English pitch at most 300
words and originality declarations. The SQL word counter delegates to the same
frozen Unicode tokenizer used by the client. The application roster consists of
verified accounts; committee acceptance and later member confirmation are
separate. Pre-event reviewers do not wait for later confirmation.

Files use private `msrc-competition-files` Storage objects, opaque entry-scoped
paths, server-authorized signed transfers and quarantine. The technical transport
accepts PDF/PNG/JPEG up to 25 MiB; these are safety bounds, not approved competition
file requirements. No participant can mark a file clean. A scanner integration,
approved file policy and separate `files_ready` evidence remain release gates.
Storage upload links do not permit upsert. Read links expire after 60 seconds;
this is an engineering transport bound. Never publish or automatically record
pitches. Final material closes once an event panel is assigned.

Eligibility, sanitation attestation and independent assignment precede review.
Hackathon has two independent assignments; configured quorum and criteria gate
selection. Authorized staff record a manual rank and tie resolution; no aggregate
weights or automatic ranking are invented. Finalist capacity is displayed from
configuration and allocated under the edition/type settings lock. Solo accounting
has no default. Final judging uses distinct panel assignments/cards and exposes
no pre-event cards. Compulsory activity evidence is recorded for each roster
participant. Outcomes are records; prize distribution and certificates are not
implemented here.

The complete unresolved-policy inventory is appended as ENG-077 in
`docs/DECISIONS.md`. Evidence: `docs/progress/2026-10-24-claude-hackathon-3mt.md`.
No hosted changes, settings seeds, real email, feature activation, commit or push.
