# Closed competition infrastructure — ENG-077 / ENG-080

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
RPCs produce `area-not-ready` and retain the session. Business settings remain
unset except the owner-authorized editable Hackathon track/rubric defaults below;
recording configuration does not open stages.

Hackathon has exactly two tracks, now displayed as **Evidence to Impact** and
**Research Reimagined** under ORG-065, retaining `translating_research` and
`advancing_research` stored keys. Authorized settings include EN/AR labels and
framework scope descriptions. Solo roster is exactly one and preformed teams
have at most five including the lead, with no matching. One person can belong to
only one Hackathon entry across both modes; each entry has one project. These
new Hackathon rules do not change 3MT.

ORG-065 supersedes the earlier HAC-03 invitation timing: verified invitees accept
and complete their required private Hackathon profile before submission and the
configured application deadline. Eligibility is self-declared current university
student/intern study in Saudi Arabia, any discipline/nationality, verified by the
eligibility officer. University, field of study and contact phone are required.
Phone never enters authentication, SMS, ordinary scientific staff/reviewer/judge
packets, exports or email. Only the participant, eligibility staff and Super
Admins can access that private profile; optional enrollment proof has the same
staff restriction. No Hackathon national ID is introduced. Post-submission roster
changes require a reasoned audited committee action, with eligibility/membership
limits rechecked. Accepted finalist roster confirmation is a later step.

The English pitch stays one field with five in-field guidance prompts and a
300-word limit. Separate references and optional video/demo links do not consume
that count. The SQL counter uses the same frozen Unicode tokenizer as the
client. Declarations record history of presentation/competition/prize/funding/
commercialization with details, AI use and tools, contributions, originality and
permissions, rules, ethics applicability, authority and media/data-processing
notice awareness. Notice acknowledgment is not an opt-out or institutional legal
approval. Prior-history/integrity concerns require documented committee handling;
no automated originality/AI detector is used.

Supporting, optional proof-of-enrollment and final files use private
`msrc-competition-files` Storage objects, opaque entry-scoped
paths, server-authorized signed transfers and quarantine. The technical transport
accepts PDF/PNG/JPEG up to 25 MiB; these are safety bounds, not approved competition
file requirements. No participant can mark a file clean. A scanner integration,
approved file policy and separate `files_ready` evidence remain release gates.
Storage upload links do not permit upsert. Read links expire after 60 seconds;
this is an engineering transport bound. Never publish or automatically record
pitches. Final material closes once an event panel is assigned.

Eligibility and the staff anonymization attestation precede independent blinded
review. Identity/verification records are projected separately from scientific
administration and reviewer content. Editable versioned defaults retain exact
source wording: four 1–5 screening criteria (20 total) and seven 1–5 final judging
criteria (35 total), questions, full common scales and final 5/3/1 examples.
Reviewer/judge screens show these anchors in English. Each assignment preserves
its settings/rubric version; final cards do not expose pre-event reviews.

Two independent screening reviews are required, then a third when the difference
is at least the configured `thirdReviewDifference` or staff manually escalate a
disputed/borderline case. The trigger has no default and screening stays closed
while unset. Rank within each track by the average of valid reviewer totals;
ties require the configured protocol and staff evidence. The remaining eligible
entries form track-specific ranked reserves. A reasoned audited reserve offer
rechecks the next rank, ties and available cap after a withdrawal. Finalist
capacity and solo quota accounting have no default; the draft's eight per track
is never seeded or advertised as approved. Capacity is allocated under the
edition/type settings lock.

Accepted finalists receive a separate conference-registration reminder,
orientation, timetable, participant instructions and the configured published
English deck lock time. Staff-entered WhatsApp support group links are projected
only to accepted finalists; this is an external group link, not an integration
or automatic phone sharing. Finalist acceptance remains provisional until roster
confirmation. No conference admission/payment/booking state is granted.

Separate per-track final panels use a configured three-to-five judge count,
independent scorecards and a separately recorded originality/ethics/privacy/
safety concern for committee review. Prototype production is optional and the
source fairness rules stay in-screen. Record one winner per track; do not expose
prize amounts, pay prizes or disclose confidential reviewer identities/scores.
Brief outcome email templates are English and held DRAFT under the explicit
task-specific override; no real mail is sent. Existing Contact Hackathon routing
is reused without adopting a candidate support mailbox.

Per-participant compulsory activity evidence remains the **finalist certificate
hook only**. Future issuance needs separately approved activity/final-material/
survey criteria, individual attendance and absence handling, template/signatories,
privacy/retention and administrator release. No certificates are issued here.

Source register S9–S11 records all three supplied internal working drafts.
ORG-065/ENG-080 in `docs/DECISIONS.md` supersede the bounded Hackathon parts of
ENG-077; other unresolved policies remain gated. Public copy is a working
overview with Hackathon dates, timetable, venue and prize amounts to be confirmed,
free entry and separate conference registration. No pending institutional terms,
capacity, sponsor, candidate venue/address, named staffing or optional third track
is treated as approved.

Evidence: `docs/progress/2026-10-25-claude-hackathon-framework.md`; prior shared
foundation evidence stays in `docs/progress/2026-10-24-claude-hackathon-3mt.md`.
No hosted changes, settings seeds, real email, feature activation, commit or push;
Task n18 leaves `docs/PROGRESS.md` untouched and work uncommitted for Claude.
