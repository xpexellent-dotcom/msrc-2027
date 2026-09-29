# MSRC 2027 project instructions

## Start

Read `docs/PROJECT_BRIEF.md`, `docs/DECISIONS.md`, and `docs/PROGRESS.md`. Then read the requirements and source sections relevant to the assigned task. The full product baseline is `sources/Development_Specification_v0.5.txt`; preserve its requirement IDs in issues and implementation notes.

Authority: current explicit organizer decisions > the latest reconciled product specification > this handoff's summaries > older proposal/design/playbook material. Never convert an option, example, estimate, engineering default, or TBD into an approved public claim. Log conflicts in `docs/DECISIONS.md`. `sources/previous_starter_pack/` is archived reference, not the current task list.

## Current starting state

This package contains documentation, source snapshots, and prompts. It does not establish that application code or infrastructure already exists. Inspect the repository and environment first, preserve user work, and report what actually exists. Use synthetic records for development. Start with the assigned milestone; do not implement all operational modules in one pass.

## Product rules

- Managed Vercel and managed Supabase are selected. Next.js App Router, TypeScript, Tailwind, and pnpm are recommended foundation choices, pending a recorded implementation decision. Verify supported runtime/package versions and current official APIs before installation; commit the resulting lockfile.
- Public browsing is open. Registration, orders, abstract submission, hackathon entries, 3MT, workshops, tickets, attendance, and certificates have distinct records and transitions.
- Public/auth/participant/non-review organizer interfaces support English and Arabic with full RTL. Scientific/project content stays English and LTR; reviewer and faculty-judge screens and transactional emails are English-only.
- Registration and workshop booking require manual approval even with a full discount. Use a mock payment adapter until the actual authorized KAU confirmation/reconciliation contract is supplied and approved.
- Research: 300 body words; ongoing work allowed; two finalized applications per PI per edition; no supervisor requirement until a research award winner is selected; confidential stage-one evidence is restricted to Super Admins.
- Hackathon: solo and preformed teams, maximum five team members, two specified tracks, no automatic team matching. Preserve unresolved solo quota and membership policies.
- Ordinary full conference certificate: both day check-ins plus general survey. No one-day certificate. Workshop certificate has its own booking/check-in/completion/survey requirements. Feedback answers must remain unlinked to participant completion evidence.
- Email-only platform communications. No national IDs, public attendee directory, public abstract search/directory, sponsor portal, personal schedule builder, full-site search, university SSO, SMS, WhatsApp integration, or push notifications.
- Advisory assessment cannot publish outcomes. It remains disabled until its provider, data handling, evaluation, and operating configuration are approved.

## Implementation

- Use the working design defaults in `docs/DESIGN_GUIDE.md` while final brand approval is pending. Keep native scrolling, reduced-motion support, accessible video controls, keyboard access, and Arabic layouts.
- Enforce authorization server-side and at the database/storage layer. Use explicit grants and RLS, assignment/ownership checks, private files, and individually identified privileged users with MFA. Never use user-editable metadata for authorization.
- Keep secrets server-side and out of documents, source control, logs, public environment variables, and client bundles.
- Validate mutations on the server. Use immutable submission/decision snapshots, transactional scarce-seat allocation, idempotency, audit records, and durable jobs where required.
- Keep operational workflows closed until their specific release gates pass. Do not invent dates, prices, capacities, review weights, payment callbacks, integration support, prizes, certificates, or legal approvals.
- Follow current official documentation and installed CLI help for version-sensitive commands. Archived setup commands are examples to recheck.

## Finish each task

Run checks proportionate to the change and required release gate. For functional/security changes include meaningful permission, failure, concurrency, and regression coverage. For reversible copy/style changes use targeted visual and content verification. Record commands and observed results; mark unrun checks as NOT TESTED or BLOCKED. Never call a mock payment or synthetic-data demo production-ready.

Update `docs/PROGRESS.md`, changed decisions, and relevant feature notes. Report the result, evidence, remaining blockers, and next task in plain language. Do not provision paid production resources, change DNS, open live workflows, or send real participant communications unless the current task authorizes those actions. Do not add repetitive permission gates to routine reversible implementation.
