# BL-SEC-01 — Authorization contract and synthetic permission checks

Source: v0.5 **ROL-01–12, SEC-01/02/06, AT-02**, with AUTH-04, REV-01/03/10,
ABS-15, SEC-03/05, LOC-01/03 and ARC-02 where relevant. Engineering decision: ENG-009.

## Scope and release state

Define a reviewable operation/role/scope contract, a server-only evaluator, safe error
copy and independent allowed/denied tests. Demonstrate database grants, forced RLS,
invoker views/functions and private-file metadata policies using rollback-contained
synthetic fixtures. This is a prerequisite for M4, not a live account or grant system.

Excluded: authentication/enrollment/recovery, actual domain records/forms, role-editor
UI, CMS writing/publication, registration/payments/booking, submissions/review decisions,
AI, attendance/certificates, actual uploads/signing/scanning, live audit jobs/email,
hosted migrations, buckets, settings or workflow opening. All 15 operational gates remain
hard closed. No dependency, environment, original-media or public-interface change.

Named privileged identities, exactly three production Super Admins, institutional custody,
MFA recovery, feature-specific field/state/approval contracts, privacy/retention and annual
data separation remain later gates. Synthetic IDs and fields describe test authority;
they are not approved production data collection or a domain schema.

## Actors and minimum projections

Every permit requires current active verified account/session, matching actor/resource
IDs and an active edition-scoped grant. All staff require an individually identified
account and trusted AAL2 **plus TOTP** assurance. Participant permission does not require
staff MFA, but still requires its explicit grant and own-record boundary.

| Role | Representative allowed purpose | Mandatory boundary / exclusions |
|---|---|---|
| Participant | Own permitted record, editable own record, own published outcome | No other participant, unpublished result, score/reviewer or original administrative evidence |
| Abstract Reviewer | Assigned research packet; own open review; conflict declaration | Sanitized scientific projection, correct track, no self/co-author/conflicted/unassigned work or peer status |
| Hackathon Reviewer | Assigned sanitized hackathon packet and own open review | Correct competition/track; no identities or identifying team references |
| 3MT Reviewer | Assigned sanitized 3MT packet and own open review | No inherited hackathon/research permissions |
| Scientific Administrator | Validation outcome; scoped assignment administration | No original IRB/similarity file or unrestricted identity/profile export |
| Judging Committee | Assigned category readiness | Explicit function/resource scope; no edition-only blanket category access or acceptance-review authority |
| Faculty Judge | Assigned approved event material/file; own unlocked score | Assignment/conflict/ownership checks; event and acceptance assessment remain distinct |
| Registration/Workshop Administrator | Scoped registration operational purpose | Necessary operational projection only; no science or full personal export |
| Finance | Scoped reconciliation read | Necessary financial projection; no scientific records, full profiles or automatic refund authority |
| Check-in Staff | Assigned entry entitlement | Explicit function/resource scope; minimum entry fields, no edition-wide participant list |
| Content/Media Editor | Assigned public draft management | Explicit function/resource scope; media approval/publication omitted and denied |
| Sponsorship/PR | Scoped sponsor inquiry purpose | No scientific/profile access, sponsor account or helpdesk |
| Super Admin | Scoped grant/audit/export preparation and cleared original evidence | No implicit owner/infrastructure authority or unrelated participant/reviewer duty; audit obligation |

The 21 examples in `PERMISSION_RULES` are a bounded executable contract, not all future
feature actions. Omitted operations (including actual publication, refunds or override)
deny. Add source-backed operations and feature-specific tests in later PRs.

## Request and current-authority boundary

`authorize` accepts only an operation/resource ID request, a previously verified principal
reference, and an injected **server-only** `AuthorityReader`. No production reader exists
yet. M4 must implement managed verification and fresh transactional data reads; user
metadata, request fields, JWT role lists and a process cache cannot supply authority.

The reader resolves current actor/session, grants, assignments and resource facts on every
request. No default credentials or hosted client is used. Subsequent revocation, suspension,
assignment withdrawal or session/factor invalidation must affect unchanged old tokens.
Returning an actor/session/resource different from the requested verified references denies.
Reader failure returns a generic unavailable result; protected data/error text is not echoed.

Grant scopes: edition, known track plus opaque track ID, assignment, function or exact
resource. Scoped IDs must be nonempty; null/empty equality cannot confer access. Every grant
also matches actor and edition. Restricted entry/category/content duties accept only explicit
function/resource scopes. Review/judging always require a current relevant assignment even
if a broader edition grant exists. Pre-event `review` and event-day `eventJudge` assignment
kinds are distinct; an assignment-bound grant must reference that purpose's own stage.

Original subject ownership is distinct from authorship of a review/score. Missing ownership
facts deny scientific assessment access. Own work includes known co-authors/team members;
a known conflict on a withdrawn assignment cannot be cleared by adding an active duplicate.
Conflict declaration remains permitted for the actor's active editable assignment without
permission to read its scientific packet. Production identity matching/conflict adjudication
must be implemented by each scientific feature; these fixtures do not solve it.

Permission is only one gate. Future handlers must additionally enforce workflow release,
resource source state, field validation, approval, idempotency and concurrency. They must
recheck authoritative permissions within consequential transactions; this checker does
not remove a time-of-check/time-of-use race or open an endpoint.

## Records, projections and files

The server returns a projection **identifier**, not domain data or a serializer. Later
loaders must select only the authorized projection. Database tests physically separate
identity-bearing details from scientific packet rows, then deny table/view/function access
to identities. No peer status/score/evidence columns exist on the sanitized packet fixture.

Confidential originals require scoped MFA Super Admin permission and a trusted approved/
cleared resource state, independently of participant ownership. Scientific administrators
receive validation results only. Assigned event presentation files are a distinct class.
The SQL fixture's `ownership_established` flag represents trusted projection provenance;
actual scientific author relationship lookup remains feature work.

Local Storage is disabled. The synthetic `private_metadata` policy proves class, scope,
assignment and clearance predicates; **actual Storage API authorization, file delivery,
quarantine/scanning, signed-link expiry and withdrawal/cache behavior are NOT TESTED**.
Future handlers must verify private bucket/object metadata and permissions before issuing
short-lived access, with durable audit completion before consequential access.

## States, audit, email and privacy

- Grant: absent → scoped active → revoked. Account/session: active → suspended/revoked.
  Assignment: active → withdrawn; conflict blocks assessment. No live mutation is supplied.
- Participant outcome: unpublished denies; published own projection may permit. Review/
  score immutable/locked state denies write. Permission never publishes a decision.
- Allowed consequential examples return an `auditRequirement` identifier. Future mutation/
  access handlers must atomically persist actor, operation, edition/scope, opaque target,
  reason where required, result and trusted time. A missing audit write must not silently
  complete a grant/export/download/publication. Denied-access monitoring must avoid content.
- No actual audit table/job/event is persisted here; no grant email or new channel is assumed.
  No scientific text, evidence, personal profiles, tokens or signed URLs in ordinary logs.
- Fixtures contain no real users, national IDs, files, credentials or participant records.
  Retention/legal/provider decisions remain CFG-09/10/11; cross-edition checks do not replace
  ARC-02's annual database/storage/configuration isolation.

## Language, accessibility and UAT

Safe denied/unavailable explanations support EN and AR. Assessment surfaces explicitly keep
English copy. No new UI exists; future denied/recovery screens must use headings, RTL,
keyboard-reachable recovery and appropriate status announcements, without exposing whether
another account's resource exists. Existing UI regression remains relevant.

Manual acceptance: trace one synthetic record through each allowed/denied role, revoke its
grant and reuse the same principal, withdraw an assignment, attempt direct-ID/view/function
access, and compare original/presentation file classes. Automated contract cases cover those
synthetic scenarios. Named human security/domain-owner and real staff/MFA UAT remain pending
before M4 or any sensitive release (REL-06).

## Verification and files

- `README.md`: link to this authorization contract.
- `docs/ARCHITECTURE.md`: identify the implemented contract and pending reader integration.
- `docs/DECISIONS.md`: record ENG-009 without changing organizer permissions.
- `docs/PROGRESS.md`: executed checks, failures, release limits and next slice.
- `docs/backlog/21-privacy-security.md` and `docs/backlog/ISSUE_INDEX.csv`: bounded BL-SEC-01 status.
- `docs/features/authorization-contract.md`: this source/acceptance/integration note.
- `src/lib/permissions/README.md`: library boundary and current-authority requirements.
- `src/lib/permissions/contract.ts`: role/scope/resource/reader types and frozen purpose rules.
- `src/lib/permissions/authorize.server.ts`: fresh-reader evaluation and generic failure.
- `src/lib/permissions/messages.ts`: bilingual/assessment error contract.
- `tests/unit/authorization-contract.test.ts`: independent role/action matrix and regressions.
- `supabase/tests/database/authorization_contract.test.sql`: transaction-only pgTAP fixture;
  all schema/grant/data changes roll back, no migration or API-exposed production object.
- Existing `pnpm test` and `pnpm db:test`/CI discover both suites automatically.

Executed evidence is recorded in PROGRESS. `pnpm check` passed lint, types, 739 unit cases
(440 new) and the 40-page production build. The 43 targeted public-shell/closed-workflow
desktop/mobile Chromium cases passed, including EN/AR keyboard, axe and reduced motion.
Locked installation passed; offline installation first missed an uncached font tarball. Initial
type-check found a narrowed union referenced inside a callback; corrected, rerun PASS.
Initial unit positive fixtures used scientific input owner as reviewer; corrected fixture
semantics before final passing rerun, without weakening self-review enforcement. Final
adversarial review found review/event assignment-stage confusion; corrected both the server
contract and assignment-bound SQL grant predicate, adding 29 unit and two SQL regressions.

Windows database execution remains blocked by unavailable Docker engine/WSL, despite the
CLI being installed. The existing GitHub Linux [database job110917372506](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194/job/110917372506)
actually passed at `39877f2`:110 pgTAP assertions (90 new +20 foundation),10 Data API tests,
schema lint, security advisors, generated strict types and local stack shutdown. No hosted
fallback was used. Only the existing foundation migration was applied; test objects rolled
back and did not enter the generated public schema. [Full PR workflow37030963194](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194)
and [push workflow37030920867](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030920867)
both passed at code commit `39877f2`: lint/types,739 unit cases, production build and
284 browser cases PASS /3 explicitly skipped. PROGRESS records all commands actually run.
Vercel Preview deployment6812599008 reports successful build; hosted visual/session checks
are not claimed. No Production release. The later receipt-only commit changes documentation.

Independent final security review repeated three in-memory stage probes: wrong-stage-only
DENIED; wrong-stage assignment grant plus separate correct-stage assignment DENIED; properly
scoped event assignment ALLOWED. The reported finding is closed; named human/domain-owner
UAT and actual identity/Storage integration are not established by those probes.

## Setup and rollback

No migrations, environment variables, new dependencies, secret keys or manual hosted setup.
Use Node 24/pnpm 11.19.0 and `pnpm install --frozen-lockfile`; local DB tests require a working
Docker-compatible engine. The managed worktree is based on audited main `017220e`, preserving
the original checkout's uncommitted documents. One exact safe.directory exception was added
for the user-provided original Git checkout so the Codex worktree tool could access it;
no wildcard trust. Reverting this PR removes only the contract/tests/docs; no hosted/data
rollback applies. Test SQL rolls back itself and must never be run on a linked project.

Next: BL-AUTH-01 scoped persisted grants and verified identity integration, followed by
BL-AUTH-05 TOTP enrollment/recovery before privileged activation; then protected CMS.
