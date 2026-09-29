# Ownership and setup checklist

This is a setup register, not evidence that accounts or integrations already exist. O1 organizational ownership, managed Vercel/Supabase, and P1 KAU collection are selected in S1. Named owners and institutional evidence still need recording.

## Account and responsibility register

| Item | Required record | Current status |
|---|---|---|
| Domain and DNS | Registrar account custodian, organization control, renewal date/responsibility, recovery and DNS access | User reports purchase of msrc2027.com; live status unverified |
| Repository | Organizational GitHub owner, repository URL, access roles, reviewed-change policy | No repository inspected or created |
| Vercel | Organizational team/project, plan, region/data flows, billing and recovery | Provider selected; provisioning unverified |
| Supabase | Organizational owner, isolated staging/production projects, regions/plans, backups/access | Provider selected; provisioning unverified |
| KAU collection | Responsible unit/contact, official payee/system, authorized confirmation or report-reconciliation procedure | Route selected; details pending CFG-02 |
| Email | Provider, branded sender, monitored Reply-To, tested inbox routes, DNS verification | Candidate configuration only; no sender verified |
| Continuing custodian | Name, acceptance of role, access and annual handover responsibility | Unassigned in this handoff |
| Backup custodian | Name, recovery responsibilities and access | Unassigned |
| Release approver | Name and scope of authority | Unassigned |
| Website Super Admins | Exactly three named individually identified accounts; MFA and recovery | Names pending; roles distinct from infrastructure owners |
| Scientific/hackathon/3MT/workshop/finance/privacy/operations owners | Named accountable people for each CFG group | Role labels only; assign in DECISIONS |
| Event support | Contact, cover schedule, outage and escalation ownership | Pending |

No passwords, API keys, recovery codes, session tokens, or private credentials belong in this register. Keep approved access in the organization's chosen credential/access system.

## Local setup sequence

1. Open the handoff folder or existing repository in Codex and run the starting prompt.
2. Inspect the computer/environment before installing anything. Record operating system, existing code, Git state, runtime/package manager, and available container tooling.
3. Verify current official framework requirements and select compatible supported runtime/dependency versions. The old starter's `Node.js 20+`, `@latest`, Corepack, and CLI commands are historical examples, not a version audit for this handoff.
4. Record the engineering stack decision, generate the application and scripts, and commit the lockfile when repository access is established.
5. Use local synthetic data and mock integrations. If local containers are unavailable, document the blocker and continue frontend/configuration work while arranging an approved isolated development environment.
6. Produce readable instructions for starting, building, testing, and resetting only the local synthetic environment. Do not run resets against an unverified database target.
7. Add a reviewed-change workflow and appropriate CI. Distinguish a CI file written from a remote run observed to pass.

## Production setup sequence

1. Complete named organizational ownership, recovery, billing and authorization evidence.
2. Review actual service data flows, plans, processing regions and required approvals before production provisioning.
3. Establish isolated staging and production configuration; keep operational flags closed.
4. Verify email sender/domain controls and tested support destinations.
5. Obtain the actual KAU integration/reconciliation process before enabling payment collection. Test synthetic/sandbox outcomes, mismatches, duplicates, failures and late settlement.
6. Rehearse database and object-file restoration, role offboarding, and incident handling.
7. Obtain the named release decision for the specific approved site/workflow. Configure domain/DNS only as part of an authorized deployment task.
8. Record release evidence, renewal ownership, monitoring coverage, rollback and annual transition instructions.

## Support routing from current specification

These are source-defined destinations to configure and test, not mailboxes verified by this handoff. Labels in the shared inbox do not enforce committee access controls. [S1 SUP-01 to SUP-03]

| Category | Destination |
|---|---|
| General | MSRC27kau+generalinquiry@gmail.com |
| Scientific | MSRC27kau+scientificinquiry@gmail.com |
| Hackathon | MSRC27kau+hackathon@gmail.com |
| Workshop | MSRC27kau+workshop@gmail.com |
| Sponsor | MSRC27kau+sponsor@gmail.com |
| Technical | MSRC27kau+technical@gmail.com |

`noreply@msrc2027.com` is a candidate sender convention in S1 EML-02. Domain ownership alone does not establish a working sender or mailbox. All platform notifications are email-only, with English transactional templates.
