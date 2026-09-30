# Governance

Planning only; decisions require recorded evidence, not a developer's inference. See the [backlog contract](README.md).

<a id="bl-gov-01"></a>

## BL-GOV-01 — Maintain the authoritative requirement and decision baseline
- **Source IDs:** SCP-01, SCP-04, SCP-05, SCP-06, SCP-07, CFG-01, CFG-13, REL-06.
- **Status:** Partial — source snapshots and decision register exist; reconciliation is ongoing.
- **Purpose:** As a product owner, preserve confirmed scope while preventing proposals becoming public commitments.
- **Scope:** Reconcile each new organizer decision with source IDs, affected issues, defaults, release gates and superseded text; retain immutable old source snapshots.
- **Exclusions:** Resolving a TBD by assumption; converting planning estimates to capacity; adding excluded products.
- **Dependencies:** Current source snapshot; [Decision Required list](DECISION_REQUIRED.md).
- **Roles:** Product engineer; conference leadership; relevant domain approver.
- **States/transitions:** Proposed decision → evidenced approval → recorded baseline change; unresolved proposals stay open.
- **Data touched:** Requirements, decisions, issue links and approval evidence references; no participant records.
- **Acceptance criteria:** Every change identifies source/date/approver, preserves old text, names affected tests/configuration and leaves unrelated gates unchanged; estimates remain labelled estimates.
- **English/Arabic:** Track impact on both languages; scientific content remains English.
- **Accessibility:** Decision tables and links have meaningful labels and readable structure.
- **Security/RLS:** No database mutation; approval evidence excludes credentials and unnecessary personal data.
- **Audit/email:** Git history records document changes; no participant email.
- **Automated tests:** Validate source IDs, unique issue IDs, links and mandatory issue fields.
- **Manual UAT:** Domain lead checks one approved change and one still-open proposal end to end.
- **Release gate:** M0 and REL-06 continuously; documentation is not release authorization.
- **Owner type:** Product engineer with accountable domain lead.
- **TBD blocked:** No for maintaining the record; each substantive decision remains blocked by its DR-CFG issue.

<a id="bl-gov-02"></a>

## BL-GOV-02 — Record organizational custody and authorized release owners
- **Source IDs:** INF-03, ROL-10, CFG-11, REL-01.
- **Status:** Partial — authorized private personal GitHub repository exists; institutional organizational custody, named owners and release authority remain unverified (1 October 2026 audit).
- **Purpose:** Give the conference durable ownership beyond a developer or annual committee.
- **Scope:** Record institutional authorization, primary/backup custodians for repository/domain/providers/billing/recovery, support/incident owners, exactly three website Super Admin identities and release approvers.
- **Exclusions:** Treating infrastructure custody as a website role; provisioning paid resources; publishing personal recovery details.
- **Dependencies:** BL-GOV-01; [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).
- **Roles:** Club/leadership; institutional authority; technical custodian; Super Admin.
- **States/transitions:** Unassigned or unverified ownership → evidence checked → authorized handover record.
- **Data touched:** Restricted ownership register, authorization and recovery references; no secrets in Git.
- **Acceptance criteria:** Every service has named continuing and backup custody, renewal responsibility and tested recovery evidence; three named Super Admins are distinguished from infrastructure owners.
- **English/Arabic:** Owner onboarding/instructions available to the appointed bilingual operating team; identifiers preserve original spelling.
- **Accessibility:** Checklists are keyboard-readable and do not depend on images of credentials.
- **Security/RLS:** Least-privilege invitations and individual MFA; verify departing staff cannot retain access.
- **Audit/email:** Record invitations, acceptance and custody changes securely; no automated participant messages.
- **Automated tests:** Check required register fields without storing secret values.
- **Manual UAT:** Backup custodian demonstrates authorized recovery and reads the release responsibility matrix.
- **Release gate:** M0; CFG-11 before production deployment.
- **Owner type:** Organizational owner with technical custodian.
- **TBD blocked:** Yes for final ownership — DR-CFG-11; drafting the checklist is unblocked.

<a id="bl-gov-03"></a>

## BL-GOV-03 — Establish evidence-based release approval packets
- **Source IDs:** REL-01, REL-02, REL-03, REL-04, REL-05, REL-06, SCP-07.
- **Status:** Partial — release checklist exists and the public draft is deployed; the complete REL-01 approval/evidence packet remains outstanding (1 October 2026 audit).
- **Purpose:** Release each usable workflow only after its own business, privacy and operational evidence passes.
- **Scope:** One reusable release packet with source IDs, code/configuration versions, test evidence, open gates, rollback/recovery, runbook and named sign-off; apply separately to public, research, registration, competitions, event and certificate releases.
- **Exclusions:** One global approval opening every workflow; postponing attendance/privacy design until certificate UI work.
- **Dependencies:** BL-GOV-01; BL-GOV-02; relevant epic acceptance evidence.
- **Roles:** Release approver; domain lead; QA; security/privacy owner; operator.
- **States/transitions:** Evidence incomplete → reviewable release candidate → authorized opening or retained closure; rollback recorded.
- **Data touched:** Release packet and server configuration references.
- **Acceptance criteria:** Missing gate keeps only the affected live capability closed; synthetic work continues; each opening has tested recovery and an accountable operator.
- **English/Arabic:** Approval checks include both applicable interfaces and English-only scientific/email boundaries.
- **Accessibility:** Accessibility evidence records executed checks, failures and manual limitations rather than a blanket compliance claim.
- **Security/RLS:** Require allowed/denied direct-access evidence and production secret/access review.
- **Audit/email:** Record who authorized opening/closure and why; operational email templates require their own sign-off.
- **Automated tests:** Release configuration fails closed when mandatory inputs/evidence are absent.
- **Manual UAT:** Rehearse an incomplete packet and a synthetic approved packet without opening production.
- **Release gate:** All REL gates, independently.
- **Owner type:** Release manager/product owner.
- **TBD blocked:** Named approval and live inputs depend on DR-CFG-01 through DR-CFG-13; packet preparation unblocked.
