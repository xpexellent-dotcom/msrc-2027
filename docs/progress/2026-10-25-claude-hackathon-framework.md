# Task n18 — MSR Accelerate Hackathon framework

25 October 2026 receipt; owner decisions dated 24 October 2026.
Worktree `C:\m\codex-n18`, branch `claude/hackathon-framework`.
This resumed an interrupted run's existing uncommitted changes; correct work was
preserved and extended. Decisions **ORG-065 / ENG-080**; review-only migration
`20261025120000_hackathon_framework.sql`. No commits, pushes or branches.
`docs/PROGRESS.md` is untouched as explicitly required by this task.

Requirements: TRK-01, HAC-01–11, TMT-01/02 and CFG-13, with EML-01/03/04,
SUP-01/02, PRV-02/03/05/06, SEC-01/02/03/05/06, LOC-01/02/03 and ACC-01.

## Sources and authority

Read all three owner-supplied sources fully: Operational Framework v1.0 (23 Oct
2026), Stage 1 Preliminary Screening Rubric and Stage 2 Final-Stage Judging
Rubric. Registered as S9–S11 in `docs/SOURCE_REGISTER.md`. They remain internal
working drafts. ORG-065 records the explicit owner choices that supersede the
bounded older HAC-01/02/03/04/05/06/10/11 and ENG-077 uncertainties.

The draft's eight finalists per track, Mini Auditorium, proposed theme,
assignments/partners, support mailbox and cash amounts are not converted into
approved settings or public claims. New business settings have no invented
defaults; only owner-authorized track copy and editable rubric defaults preload.
The Hackathon phone exception is contact-only and does not alter ORG-016's
authentication-phone/SMS exclusion. English outcome templates follow this task's
explicit override of the general participant-email language rule.

## Implementation

- Extend the existing ENG-077 competition records, participant/staff/reviewer/
  judge routes, settings versions, immutable submissions/decisions/audit and
  private file scanning pattern. 3MT keeps its separate schema and stage rules.
- Use Evidence to Impact and Research Reimagined with framework scopes and
  editable EN/AR display settings; retain stored track keys. Public copy gives
  the working eligibility/team/format/evaluation overview, free Hackathon entry
  and separate conference registration, with pending logistics clearly marked.
- Require a separate private university/field/phone profile and Saudi university
  student/intern self-declaration. Eligibility staff verify identities; private
  profile/proof never enter ordinary scientific/reviewer/judge projections.
  Optional enrollment proof uses the closed private-file/scan gate. No national
  ID, SMS, automatic matching or new messaging integration.
- Enforce one team per person across solo/team, one project per team, roster at
  most five, accepted invitations and complete profiles before submission and
  the application deadline. Later roster changes need committee authority,
  reason and audit. Finalist roster confirmation remains separate.
- Keep one 300-word English pitch with five guided prompts, separate references
  outside the count, optional links and closed optional attachments. Record the
  requested project-history, AI-use/tools, contribution, originality/permissions,
  rules, ethics and media/data-processing notice-awareness declarations.
- Administrative eligibility/history/integrity clearance and an explicit staff
  anonymization check precede two independent blinded reviews. Exact editable
  default rubric wording, questions and anchors appear in English on assessment
  screens: 4 × 1–5 screening (20), 7 × 1–5 final judging (35). Preserve versioned
  assessment bases and the optional-prototype fairness rule.
- Third review is required at or above the configured score difference or after
  manual escalation; no trigger default. Rank average valid reviewer totals
  within each track with configured tie handling; track reserves and reasoned
  offers recheck rank and current finalist cap. Cap and solo quota policy stay
  unset until authorized.
- Accepted-finalist workspace contains separate conference-registration reminder,
  staff-entered orientation/timetable/instructions, accepted-only external
  WhatsApp group URL, published final-deck lock time, closed English deck upload
  and confirmation. Acceptance remains provisional until roster confirmation.
- Separate final panels use a configured 3–5 judges; originality/ethics/privacy/
  safety concerns are separate committee flags. Record one winner per track,
  without prize amounts/payment. Never expose reviewer identities or scores to
  applicants. Existing Contact configuration already has the Hackathon topic,
  so no new address or routing rule is added.
- Certificate hook is existing per-person activity evidence only. Future
  finalist certificate work needs approved final-material/survey/activity
  criteria, individual attendance/absence handling, templates/signatories,
  privacy/retention and administrator release. Nothing is issued here.

## Verification

The table is updated from command output as checks finish. Synthetic browser
providers demonstrate UI contracts only; they do not establish real database
authorization, sessions, scans, concurrency, mail delivery or production UAT.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | NOT TESTED yet in this resumed run |
| `pnpm typecheck` | NOT TESTED yet in this resumed run |
| `pnpm test` | NOT TESTED yet in this resumed run |
| `pnpm build` | NOT TESTED yet in this resumed run |
| `pnpm exec playwright test --config playwright.competitions.config.ts` | NOT TESTED yet in this resumed run |
| `pnpm exec playwright test --config playwright.competitions-staff.config.ts` | NOT TESTED yet in this resumed run |
| Public Hackathon EN/AR Playwright | NOT TESTED yet in this resumed run |
| `git diff --check` | Pending final source check |
| `pnpm db:test` / pgTAP | BLOCKED locally: no local Docker/Supabase stack; disposable CI required |
| `pnpm db:lint` (`--fail-on warning`) | BLOCKED locally: disposable CI required |
| Real multi-connection integration database tests | NOT TESTED locally; disposable CI required |
| Hosted migration/settings, real email, participant opening, production UAT | NOT TESTED / not performed; not authorized |

## Remaining gates and next task

`COMPETITIONS_ENABLED` stays absent/off. Per-kind enabled/evidence/files values
are not activated or seeded; account/privacy/age/retention/session gates remain
independent. Settings presence and editable defaults do not establish approval.
Third-review difference, cap, solo quota, ties, dates/locks, panel count,
finalist details and all relevant policy settings must be supplied before their
stages are ready. Source public legal/IP/media/consent wording, attendance
exceptions and certificate requirements still require institutional/organizer
approval. No fallback candidate venue, address or capacity is assumed.

File scanning, production Storage, template review/test delivery, human operator
UAT, hardware/real assistive technology and native-reader Arabic review remain
separate release evidence. Optional proof/supporting/final files stay closed
until the existing scanner and file-policy release checks pass.

Next: Claude reviews this uncommitted diff and receipt, then runs migration
reset, strict lint, pgTAP and genuine database integration/concurrency checks in
disposable CI. Resolve owner settings/approvals and independent release evidence
before any separate authorized activation. No hosted operations, real messages,
feature flag changes, certificates or prize payments occurred.
