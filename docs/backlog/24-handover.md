# Handover

Minimal operating instructions, monitoring, access custody and recovery evidence are prerequisites for each live release. M11 consolidates and rehearses them; it must not be used to defer launch-critical responsibilities. No individual is appointed by this backlog.

<a id="bl-hnd-01"></a>

## BL-HND-01 — Deliver a reproducible technical runbook for the opened slice

- **Source IDs:** INF-05, INF-08, REL-06, AT-18.
- **Status:** Partial: local README and progress evidence exist; production runbooks cannot yet describe an unprovisioned service.
- **Purpose:** Allow an authorized successor to build, verify and operate the exact released version.
- **Scope:** One runbook package per opened slice: pinned runtime/package setup, environment references, schema/migrations, gates, jobs, diagnostic references, approved release/restore commands and known blockers; consolidate for M11.
- **Exclusions:** Credentials in documents; rewriting source history; labeling unexecuted commands verified; deferring first runbook until final handover.
- **Dependencies:** Implemented slice and verification evidence; BL-DEP-06 release manifest; relevant domain owner.
- **Roles:** Delegated developer, continuing technical custodian, backup operator and release approver.
- **States/transitions:** Draft runbook → independently rehearsed → approved for corresponding release → revised when behavior/configuration changes.
- **Data touched:** Versioned docs, command evidence, secret-store references, schema diagrams and operational owner contacts under controlled access.
- **Acceptance criteria:** Fresh authorized environment can reproduce build/checks from lockfile; every external prerequisite and unrun check labeled; job replay and rollback links match released commit; secrets absent.
- **English/Arabic:** Participant/staff instructions cover both locales; technical commands remain exact and need not be translated.
- **Accessibility:** Structured headings, copyable commands and descriptive links; no screenshot-only critical instruction.
- **Security/RLS:** Runbook demonstrates denied access and least-privilege operator boundaries; temporary access removal documented.
- **Audit/email:** Record rehearsal/operator/version; document approved email queue/support routes without sending real messages during rehearsal.
- **Automated tests:** Documentation links/command references and fixture setup verification; rerun relevant released-slice tests from clean environment.
- **Manual UAT:** Successor follows instructions without undocumented creator knowledge and records any missing step.
- **Release gate:** Minimum package before each live REL gate; complete consolidated technical handover at M11.
- **Owner type:** Technical lead with independent receiving engineer.
- **TBD blocked:** Local runbook improvement unblocked; named recipients and remote access require [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-hnd-02"></a>

## BL-HND-02 — Rehearse staff operations on synthetic event records

- **Source IDs:** ROL-07, ROL-08, ROL-12, CHK-02, CHK-04, CHK-05, REL-02, REL-05, AT-13.
- **Status:** Planned; actual staff identities, devices and procedures not verified.
- **Purpose:** Ensure operators can handle denial, correction and outage cases before participants arrive.
- **Scope:** One training/rehearsal package for assigned check-in staff and workshop sign-off owner, using synthetic confirmed/pending/revoked tickets; include correction escalation and selected outage reconciliation.
- **Exclusions:** Training grants as permanent broad access; real refunds or certificate releases; inventing offline synchronization or sign-off authority.
- **Dependencies:** Check-in/attendance slices; approved sign-off/outage procedure; BL-SEC-01; named operational coverage.
- **Roles:** Individually identified Check-in Staff; Registration/Workshop Administrator; authorized completion signer; escalation owner.
- **States/transitions:** Assigned staff enrolled/MFA verified → practice passed → approved shift access → access revoked after duty; scans never approve admission or issue certificates.
- **Data touched:** Synthetic tickets/activity evidence, training attendance, assigned scope and rehearsal findings.
- **Acceptance criteria:** Staff distinguish wrong day/workshop, duplicate, pending/unpaid, revoked and unknown credentials; manual lookup works on assigned phones; unauthorized correction/sign-off fails; reconciliation preserves original evidence.
- **English/Arabic:** Bilingual staff instructions and status feedback; test long Arabic participant names and English references.
- **Accessibility:** Camera permission denial/manual entry, touch targets, sunlight/readability, keyboard/focus and status text tested on actual chosen devices.
- **Security/RLS:** Minimum attendee fields only; no scientific/finance/licence browsing; temporary training grants removed.
- **Audit/email:** Retain training/rehearsal sign-off and correction evidence; email operational escalation only to approved test recipients.
- **Automated tests:** Reuse AT-13 suite and assert rehearsal fixtures cannot be used as live tickets.
- **Manual UAT:** Each assigned staff member performs permitted and forbidden actions, then rehearses the chosen outage fallback.
- **Release gate:** REL-05 event opening; first training plan exists before operational rollout, not merely M11.
- **Owner type:** Conference operations lead with QA/training engineer.
- **TBD blocked:** Synthetic materials unblocked; staff, sign-off and outage approvals require [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-hnd-03"></a>

## BL-HND-03 — Verify organizational custody and annual access transfer

- **Source IDs:** INF-03, INF-05, SEC-06, ROL-10, ROL-12, CFG-11, AT-18.
- **Status:** Planned; domain purchase reported, current control/renewal evidence and remote service ownership unverified.
- **Purpose:** Keep the platform under O1 organizational control when individual developers or organizers leave.
- **Scope:** Custody checklist and one transfer rehearsal for repository, domain/DNS, Vercel, Supabase, billing, recovery, approved integrations and backups; name continuing/backup custodians and renewal responsibilities once supplied.
- **Exclusions:** Personal developer ownership; equating website Super Admin with infrastructure owner; inventing names, credentials or renewal dates.
- **Dependencies:** Governance authorization evidence; BL-DEP-03; approved service inventory; actual custodian appointments.
- **Roles:** Organizational owner, continuing custodian, backup owner, departing delegate; exactly three named website Super Admins separately verified.
- **States/transitions:** Delegated access active → successor verified → necessary credentials rotated → obsolete grants/sessions revoked → transfer accepted; service continuity preserved.
- **Data touched:** Restricted access/ownership evidence, secret-store references, recovery and renewal records, offboarding audits.
- **Acceptance criteria:** Successor proves controlled access/recovery without shared individual credentials; backup owner can recover under approved procedure; registrar/DNS/renewal responsibility documented; departing access fails afterward.
- **English/Arabic:** Custody instructions accessible to appointed owners; bilingual website-role guidance where applicable.
- **Accessibility:** Checklist and recovery instructions remain structured text with clear responsibility and next action.
- **Security/RLS:** Least-privilege transfer; test website session/grant revocation separately from infrastructure access; never paste secrets into handover artifacts.
- **Audit/email:** Record actor/time/evidence of each transfer/rotation/revocation; approved operational email informs responsible custodians.
- **Automated tests:** Secret scanning of handover artifacts and post-revocation role/API regression; provider access checks where supported.
- **Manual UAT:** Both custodians demonstrate recovery and inspect billing/renewal ownership; verify institutional authorization evidence.
- **Release gate:** O1 custody evidence before production deployment; repeat on personnel change and annual handover.
- **Owner type:** Organizational custodian with technical/security owner.
- **TBD blocked:** Checklist unblocked; actual transfer/sign-off requires [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11), provider plans/access [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).

<a id="bl-hnd-04"></a>

## BL-HND-04 — Close the edition with approved archive and acceptance evidence

- **Source IDs:** SCP-07, INF-05, PRV-05, PRV-06, PRV-08, REL-06, AT-18, CFG-12.
- **Status:** Planned; no live edition or archive policy implementation exists.
- **Purpose:** Preserve an accountable release record and approved public history while retiring operational access safely.
- **Scope:** Consolidated acceptance packet for each opened workflow, outstanding defects/blocked decisions and owner sign-off; edition-close checklist linking approved archive content, retention jobs, certificate verification continuity and domain/service renewals.
- **Exclusions:** Public attendee/abstract directories; exposing confidential rejected/withdrawn research; indefinite personal-data retention; treating archive approval as deletion approval.
- **Dependencies:** BL-HND-01; BL-HND-03; public archive/content slice; BL-SEC-07, BL-SEC-08; certificate verification retention approval.
- **Roles:** Organizational/technical custodian, privacy owner, Content/Media Editor and relevant domain release owners.
- **States/transitions:** Opened workflow → evidence accepted/defects retained → operational closure → approved archive/retained verification; private records follow separate approved retention transitions.
- **Data touched:** Release evidence, approved public archive assets/content, retention schedule references, minimal verification continuity and renewal records.
- **Acceptance criteria:** Each opened workflow has accountable evidence and unresolved items explicitly assigned by role; archived public material has rights/approval; confidential records remain protected after event; continuing verification and domain ownership have approved lifespan/custody.
- **English/Arabic:** Approved archive navigation/content bilingual with controlled translations; historical scientific content remains English where applicable.
- **Accessibility:** Archive remains keyboard/RTL/readable-media accessible; broken links and inaccessible evidence attachments tracked.
- **Security/RLS:** Retired staff access revoked; archive APIs expose only approved public content; retention and backup expiry continue after event.
- **Audit/email:** Archive publication/unpublication and closure decisions audited; no unsolicited participant campaign or new communication channel.
- **Automated tests:** Archive visibility/locale/link checks, confidential-record denial, retained certificate verification and closed workflow regressions.
- **Manual UAT:** Receiving custodian and privacy/content owners inspect archive, verification, renewals and accepted/blocked release matrix.
- **Release gate:** M11 handover and approved edition closure; prerequisites for collection/launch are completed earlier.
- **Owner type:** Product/technical handover lead with organizational and privacy owners.
- **TBD blocked:** Acceptance template unblocked; archive continuity/assets and retention decisions require [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), custody [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-hnd-05"></a>

## BL-HND-05 — Rehearse a separately isolated next edition

- **Source IDs:** ARC-02, ARC-01, INF-03, INF-04, INF-05, PRV-05, PRV-06, CRT-05, CRT-06, AT-18.
- **Status:** Planned; no future-edition environment or data transfer has been established.
- **Purpose:** Reuse the codebase while keeping annual operational data and continuing archive/verification duties separate.
- **Scope:** One synthetic next-edition bootstrap rehearsal using separate operational database, storage and configuration from the prior edition, as selected in v0.5; document approved public archive routing and protected certificate/verification continuity without moving old operational records.
- **Exclusions:** Shared annual tables partitioned only by edition ID as a substitute for separation; automatic account/submission/consent transfer; copying real participant data; inventing next-edition dates, domain or infrastructure plan.
- **Dependencies:** BL-DEP-01; BL-DEP-03; BL-HND-01; separate-edition configuration contract; approved continuity/custody decisions before any live transition.
- **Roles:** Continuing and backup organizational custodians, delegated technical engineer, privacy owner and archive/verification owner; names and transition dates remain unassigned.
- **States/transitions:** Prior edition retained/archived under its own policy → new isolated synthetic edition initialized → cross-edition denial and continuity verified → eligible for separately approved future launch; old operational gates stay closed after archive.
- **Data touched:** Separate synthetic operational databases, object stores and configuration/credential references; reusable migrations/code; approved public history and verification routing contracts.
- **Acceptance criteria:** Fresh edition begins without prior accounts, submissions, consent or entitlements; new credentials cannot read/write prior operational data or objects; historical public pages may coexist; private certificate access/public verification persist only for their approved periods and custodian.
- **English/Arabic:** Each edition has its own bilingual public configuration and truthful unpublished states; historical content retains approved language behavior.
- **Accessibility:** Archive/edition navigation labels clearly identify the edition; keyboard, RTL and accessible unavailable/error states survive routing changes.
- **Security/RLS:** Separate annual database/storage/configuration boundaries plus per-edition RLS; test direct database, file and session access with wrong-edition credentials; no secret copied into source or public routing config.
- **Audit/email:** Record bootstrap/transfer approval and custody evidence; synthetic tests use isolated email sinks; initialization cannot replay old participant notifications or renew consent automatically.
- **Automated tests:** Empty next-edition account/record assertions, cross-database/object denial, secret/config isolation, historical route correctness, retained verification and closed prior-edition mutation tests.
- **Manual UAT:** Successor initializes synthetic new edition from the runbook, verifies old archive/certificates remain governed correctly, and demonstrates no automatic participant migration.
- **Release gate:** M11 annual handover preparation; live future-edition provisioning/launch requires its own approved configuration and applicable REL gates.
- **Owner type:** Platform/handover engineer with organizational custodian and privacy owner.
- **TBD blocked:** Synthetic isolated rehearsal unblocked once local runtime supports separate stores; real resources, continuity, retention and ownership require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11), [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
