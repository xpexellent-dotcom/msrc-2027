# Authentication

Staff security is needed before M4 CMS. Participant onboarding/dashboard is M5. Managed identity is not a blanket data grant.

<a id="bl-auth-01"></a>

## BL-AUTH-01 — Implement edition-scoped grants and privileged access enforcement
- **Source IDs:** ROL-01, ROL-02, ROL-03, ROL-04, ROL-05, ROL-06, ROL-07, ROL-08, ROL-09, ROL-10, ROL-11, ROL-12, SEC-02, AUTH-04.
- **Status:** In progress — closed persisted authority/context foundation; no operational role system or staff activation. See [feature note](../features/persisted-authorization.md) and PROGRESS for actual deployment/check receipts.
- **Purpose:** Allow each staff member only the duties and assigned records authorized for them.
- **Scope:** Individual edition/track/assignment grants, server/database permission helpers and direct-access tests; privileged operations fail closed without MFA assurance; suspension/offboarding revokes grants.
- **Exclusions:** Roles in user-editable metadata, shared staff accounts, generic admin full-data access, unrestricted scientific evidence for Scientific Administrator.
- **Dependencies:** BL-FND-02; BL-SEC-01; managed identity integration and agreed MFA assurance contract. Land closed grant checks before MFA enrollment UI.
- **Roles:** All thirteen source roles; exactly three named Super Admins before production.
- **States/transitions:** No grant → authorized scoped grant → revoked/suspended; revocation affects subsequent requests with existing tokens.
- **Data touched:** Edition-scoped grants, staff assignments, assurance/revocation evidence and audits.
- **Acceptance criteria:** Additive scopes do not leak unrelated editions/assignments; only Super Admin accesses stage-one confidential originals/full personal exports/audits; reviewer peer status and identity hidden; Check-in Staff minimal fields only.
- **English/Arabic:** Role administration bilingual; reviewer/faculty assessment surfaces English-only.
- **Accessibility:** Keyboard-operable role controls, explicit scope labels and consequential-change confirmation.
- **Security/RLS:** Exercise each role against direct API, views/functions and storage; no client-only guard or stale-token privilege.
- **Audit/email:** Audit grant/revoke/override actor, target, scope and result; no participant email merely for staff permission edits.
- **Automated tests:** Permission matrix including cross-edition, no-MFA, user-metadata spoof, unassigned reviewer, finance/scanner overreach and suspension.
- **Manual UAT:** Staff representatives perform one permitted and one forbidden duty; offboard an active session.
- **Release gate:** M4 before CMS/admin use; BL-AUTH-05 enrollment/recovery must pass before staff activation; every subsequent REL gate.
- **Owner type:** Security/backend engineer.
- **TBD blocked:** Synthetic matrix no; actual privileged identities/grants DR-CFG-11.

<a id="bl-auth-02"></a>

## BL-AUTH-02 — Add managed email/password account creation and sign-in
- **Source IDs:** AUTH-01, AUTH-06, LOC-01, DAT-01, DAT-04, SEC-01.
- **Status:** Planned.
- **Purpose:** Let a participant create one account without revealing other users' account existence.
- **Scope:** Managed email/password sign-up/sign-in, normalized unique email, minimal name/email profile and safe verified/unverified session boundary.
- **Exclusions:** University SSO, national ID, collecting every later pathway field during sign-up, operational entitlement from account creation.
- **Dependencies:** BL-FND-01; BL-FND-02; BL-SEC-01. Sign-up/sign-in may land while all verification-dependent operations remain closed.
- **Roles:** Visitor; participant.
- **States/transitions:** Visitor → unverified account → verified account through verification flow; account creation is not registration.
- **Data touched:** Managed identity, minimum participant profile and applicable notice version.
- **Acceptance criteria:** Duplicate/normalized email handled without public enumeration; unverified users cannot register/pay/book/submit; no password or verification secret enters logs.
- **English/Arabic:** Bilingual forms/errors with preserved values on locale switch; original names retained.
- **Accessibility:** Labelled password/email fields, autocomplete, accessible errors and keyboard flow.
- **Security/RLS:** Profile ownership policies; protected session cookies and CSRF where applicable; server checks verification.
- **Audit/email:** Safe account/security events; verification delivery through approved English template/test adapter.
- **Automated tests:** Duplicate case/whitespace email, enumeration-equivalent responses, unverified operation denial and another profile denial.
- **Manual UAT:** Sign up, retry existing address and verify unrelated account state is not exposed.
- **Release gate:** M5; BL-AUTH-03 before verification-dependent operations; CFG-09 privacy and configured identity/email before real users.
- **Owner type:** Authentication/full-stack engineer.
- **TBD blocked:** Synthetic auth no; production notices/provider/sender DR-CFG-09/10.

<a id="bl-auth-03"></a>

## BL-AUTH-03 — Implement single-use verification codes with abuse protection
- **Source IDs:** AUTH-02, ACC-01, EML-01, SEC-01.
- **Status:** Planned.
- **Purpose:** Verify email possession without reusable codes or inaccessible challenges.
- **Scope:** Six-digit numeric verification, protected-at-rest single-use codes, replacement invalidation, account/IP controls and configurable source defaults: 10-minute validity, 60-second resend cooldown, three issues/email/15 minutes, five failed entries/code.
- **Exclusions:** New business expiry values, permanent lockout, inaccessible CAPTCHA, email verification treated as privileged MFA.
- **Dependencies:** BL-AUTH-02; BL-FND-05; BL-SEC-01.
- **Roles:** Unverified participant; abuse-control operator.
- **States/transitions:** Issued → verified/expired/replaced/attempts exhausted; old code cannot reactivate.
- **Data touched:** Protected verification credential, counters and minimal security events.
- **Acceptance criteria:** Only newest valid code works once; concurrent verification cannot reuse it; resend limits apply across sessions/IP attempts without leaking account state; input survives recoverable failure.
- **English/Arabic:** Bilingual verification/resend/error messages; English-only email; digits and code field have stable LTR entry in RTL.
- **Accessibility:** Paste and autofill supported, screen-reader status, keyboard anti-bot alternative and readable cooldown.
- **Security/RLS:** Verification occurs server-side; raw codes absent from logs/client bundles and protected at rest.
- **Audit/email:** Restricted issuance/failure metadata, never code value; bounded test/approved email delivery.
- **Automated tests:** Expiry boundary, rate limits, replacement, parallel single-use, paste/autofill and malformed code.
- **Manual UAT:** Expired code, resent code, assistive technology and recovery after throttling.
- **Release gate:** M5 verified operational access; configured email/privacy prerequisites.
- **Owner type:** Authentication/security engineer.
- **TBD blocked:** No new business TBD for defaults; live email/anti-bot configuration DR-CFG-10.

<a id="bl-auth-04"></a>

## BL-AUTH-04 — Add throttled password recovery and safe reset
- **Source IDs:** AUTH-03, AUTH-05, SEC-01, EML-01, ERR-01.
- **Status:** Planned.
- **Purpose:** Let users recover access without exposing account existence or retaining stolen sessions.
- **Scope:** Progressive throttling of failed password sign-in attempts using the five-failures/15-minute default; separately rate-limited generic recovery response, expiring single-use reset credential and session invalidation after recovery.
- **Exclusions:** Permanent account lockout, support access to passwords, privileged MFA bypass via email reset.
- **Dependencies:** BL-AUTH-02; BL-FND-05; BL-AUTH-06.
- **Roles:** Participant; privileged user recovering password, still subject to MFA.
- **States/transitions:** Reset requested → valid credential consumed → password changed/session revocation; expired/reused credential denied.
- **Data touched:** Managed recovery/session records and minimal attempt counters.
- **Acceptance criteria:** Existing and nonexistent addresses receive equivalent public response; repeated failures progressively throttle; reset does not reset MFA or role scope; old sessions denied.
- **English/Arabic:** Bilingual recovery/sign-in feedback; email English-only with intended locale return path.
- **Accessibility:** Accessible challenge alternative, autocomplete, clear errors and focus on recovery outcome.
- **Security/RLS:** Server token validation/rate controls; no credentials in URLs/logs beyond managed short-lived recovery exchange requirements; redacted diagnostics.
- **Audit/email:** Record safe recovery/security outcome; recovery mail through deduplicated outbox/approved provider integration.
- **Automated tests:** Enumeration, expiry/reuse/race, throttle, revoked session and still-required MFA.
- **Manual UAT:** Recover on a second device; verify original sessions lose access and safe retry works.
- **Release gate:** Before production authentication use.
- **Owner type:** Authentication engineer.
- **TBD blocked:** Synthetic recovery no; live provider/sender configuration DR-CFG-10.

<a id="bl-auth-05"></a>

## BL-AUTH-05 — Add privileged TOTP enrollment and audited factor recovery
- **Source IDs:** AUTH-04, ROL-12, SEC-01, SEC-06.
- **Status:** Planned; required before CMS editing.
- **Purpose:** Require an independent second factor for every privileged operation.
- **Scope:** Authenticator-app TOTP enrollment/challenge, factor-loss recovery and explicit audited administrative reset; assurance enforced through API/database authorization.
- **Exclusions:** Email OTP as MFA, automatic reset on password recovery, shared factors or unverified support override.
- **Dependencies:** BL-AUTH-01; managed identity; approved staff recovery procedure DR-CFG-11.
- **Roles:** All privileged users; separately authorized factor-reset administrator.
- **States/transitions:** Privileged grant without assurance → enrollment/challenge required → assured access; factor reset revokes applicable sessions and requires reenrollment.
- **Data touched:** Managed factor records, reset evidence and session revocation metadata.
- **Acceptance criteria:** Direct privileged mutation fails with valid password session but missing assurance; reset requires verified authorized process and produces no silent fallback; secrets/recovery material never stored in project docs.
- **English/Arabic:** Staff enrollment/recovery bilingual; assessment workflow remains English-only after entry.
- **Accessibility:** Manual setup-code alternative to QR, keyboard entry and screen-reader instructions without exposing factor secrets in logs.
- **Security/RLS:** Check assurance server/database layer; forbid self-escalation/reset bypass and stale assurance after reset.
- **Audit/email:** Audit enrollment/reset/revocation without factor secret; approved English security notification only.
- **Automated tests:** No-MFA API/DB denial, factor reset invalidation, unauthorized reset and reenrollment.
- **Manual UAT:** Enroll on real authenticator; simulate lost factor via approved test recovery process.
- **Release gate:** M4 and all privileged production access.
- **Owner type:** Security/authentication engineer.
- **TBD blocked:** Synthetic integration no; approved recovery custodians/procedure DR-CFG-11.

<a id="bl-auth-06"></a>

## BL-AUTH-06 — Enforce session lifetimes and revocation with draft recovery
- **Source IDs:** AUTH-05, ROL-12, SEC-06, ERR-01.
- **Status:** Planned.
- **Purpose:** Expire or revoke access predictably without losing already saved work.
- **Scope:** Server-enforced configurable defaults: participant absolute 24h, privileged idle 30min and absolute 8h; recent-auth checks, warning, logout/suspension/recovery/factor-reset invalidation.
- **Exclusions:** Client timer as authority, unsaved input promised durable, arbitrary permanent session extension.
- **Dependencies:** Managed identity; BL-AUTH-01; BL-FND-06; BL-AUTH-05 for assurance invalidation tests.
- **Roles:** Participant; privileged staff; suspension administrator.
- **States/transitions:** Active → warning → expired/revoked; reauthentication restores only current authorized access and saved draft.
- **Data touched:** Session timing/revocation evidence and references to separately saved drafts.
- **Acceptance criteria:** Idle and absolute limits both enforced at server; sensitive changes demand recent authentication; old token cannot retain suspended grants; saved version remains recoverable.
- **English/Arabic:** Bilingual warnings/recovery and unchanged locale after sign-in.
- **Accessibility:** Expiry warning announced without focus theft; keyboard reauthentication and visible recovery instructions.
- **Security/RLS:** Test direct API/DB with expired/revoked assurance; no client-controlled timestamps.
- **Audit/email:** Audit relevant revocation/security events; no routine email for every session refresh.
- **Automated tests:** Clock boundaries, idle activity, absolute cap, logout/suspension/reset and saved-draft recovery.
- **Manual UAT:** Expire an editing staff session and resume safely after reauthentication.
- **Release gate:** Before production participant or privileged access.
- **Owner type:** Authentication/backend engineer.
- **TBD blocked:** No business TBD for adopted configurable defaults; provider implementation must prove enforcement.

<a id="bl-auth-07"></a>

## BL-AUTH-07 — Add minimal profile editing and verified support requests
- **Source IDs:** AUTH-06, AUTH-07, PRV-03, PRV-04, DAT-01.
- **Status:** Planned.
- **Purpose:** Let participants correct permitted information while sensitive identity changes receive verification.
- **Scope:** Owner-only profile form with pathway-conditional fields; verified-support request entry for email change/deletion, replacement-email reverification and retention assessment handoff.
- **Exclusions:** National ID, universal licence/phone requirements, immediate destructive self-delete, creating a general helpdesk.
- **Dependencies:** BL-AUTH-02; BL-AUTH-06; privacy request handling and DR-CFG-09.
- **Roles:** Participant; authorized verified-support/privacy operator.
- **States/transitions:** Permitted correction saved; sensitive request → identity verification → reviewed change/retention exception → response; email changes only after reverify.
- **Data touched:** Minimal profile, conditional professional fields and restricted privacy/support evidence.
- **Acceptance criteria:** Name/email minimum preserved; optional country/city/phone stay optional absent approved purpose; licence never universal for students/non-medical attendees; deletion does not destroy required financial/audit records blindly.
- **English/Arabic:** Bilingual labels/instructions/errors; original personal/institution names preserved.
- **Accessibility:** Field purpose/required status clear, error summary, autocomplete and keyboard recovery.
- **Security/RLS:** Owner-only update allowlist; no editable role/email verification fields; recent authentication for sensitive operations.
- **Audit/email:** Safe correction/request audit; verified email-change confirmation/revocation notices English-only without excess data.
- **Automated tests:** Overposted role/identity fields, non-owner access, conditional required fields and unreverified email change denial.
- **Manual UAT:** Student/non-medical/professional synthetic profiles and a retained-record deletion request.
- **Release gate:** M5 and privacy policy before production data collection.
- **Owner type:** Full-stack engineer with privacy owner.
- **TBD blocked:** Conditional field purposes/retention procedure DR-CFG-09; minimal synthetic form unblocked.

<a id="bl-auth-08"></a>

## BL-AUTH-08 — Add a scoped participant dashboard shell
- **Source IDs:** SCP-03, ROL-02, LOC-01, DAT-03, ERR-01.
- **Status:** Planned.
- **Purpose:** Let a verified participant distinguish each independent workflow and next permitted action.
- **Scope:** Owner-scoped dashboard sections and empty/closed/error states for registration/orders, submissions/revisions, workshop bookings/waitlists, tickets and certificates; later slices supply their read models.
- **Exclusions:** Public participant directory, personal schedule builder, coauthor listing treated as attendance, exposing unpublished decisions or scores.
- **Dependencies:** BL-AUTH-02; BL-AUTH-03; BL-AUTH-06; approved domain read contracts.
- **Roles:** Participant only for own records.
- **States/transitions:** Not authenticated → sign-in; authenticated → only own current published workflow states; closed module has no mutation path.
- **Data touched:** Minimal owner-scoped projections of independent records; no new combined entitlement state.
- **Acceptance criteria:** No module implies another is complete; published outcomes visible even if email fails; My Bookings reflects real bookings only; unavailable modules remain explicitly closed.
- **English/Arabic:** Bilingual shell/status/help; scientific titles remain English/LTR.
- **Accessibility:** Logical headings, readable status text, loading/error announcements and keyboard next actions.
- **Security/RLS:** Ownership in server/database, safe unrelated-ID errors, no confidential notes/reviewer identities in response.
- **Audit/email:** Read-only shell creates no business audit or email; mutations belong to domain issues.
- **Automated tests:** Cross-user read denial, empty/closed states, unpublished-decision exclusion and locale preservation.
- **Manual UAT:** Compare two synthetic participants with different workflow histories.
- **Release gate:** M5 shell; each displayed action opens only under its domain REL gate.
- **Owner type:** Participant-portal engineer.
- **TBD blocked:** Shell no; individual operational actions inherit domain decision gates.

<a id="bl-auth-09"></a>

## BL-AUTH-09 — Clean abandoned unverified accounts without harming retained records
- **Source IDs:** AUTH-08, PRV-05, PRV-06, API-03.
- **Status:** Planned.
- **Purpose:** Reduce abandoned account data while honoring retention exceptions.
- **Scope:** Idempotent scheduled cleanup using seven-day unverified-account default, verified/account-record recheck and restricted outcome evidence.
- **Exclusions:** Deleting verified participants, cascading through retained operational records, inventing universal retention rules.
- **Dependencies:** BL-FND-04; BL-AUTH-02; approved retention exception map DR-CFG-09.
- **Roles:** Restricted cleanup worker; privacy operator for exceptions.
- **States/transitions:** Unverified beyond default threshold → eligible after recheck → removed; verified/retained obligation → protected or reviewed exception.
- **Data touched:** Managed identity/minimum profile and deletion/exception evidence without secrets.
- **Acceptance criteria:** Verification racing cleanup cannot delete a newly protected account; required retained records block deletion; retries safe and restoration procedure respects deletion evidence.
- **English/Arabic:** Bilingual operator results where surfaced; no participant screen required for deleted abandoned account.
- **Accessibility:** Operator outcome table/status readable by keyboard/screen reader.
- **Security/RLS:** Narrow worker privilege; participants cannot schedule other accounts for cleanup.
- **Audit/email:** Minimal cleanup counts/reasons; no code/password logs or automatic marketing email.
- **Automated tests:** Age boundary, verified/retained protection, race, retry and unauthorized job invocation.
- **Manual UAT:** Dry-run synthetic eligible/protected accounts and inspect resulting evidence.
- **Release gate:** Before sustained production account collection; approved retention process.
- **Owner type:** Backend/privacy engineer.
- **TBD blocked:** Default cleanup logic no; retention exception approval DR-CFG-09.
