# Authentication

Staff security is needed before M4 CMS. Participant onboarding/dashboard is M5. Managed identity is not a blanket data grant.

ORG-037/041 (6 October 2026) approve the Privacy Policy v1.0 notice and require
minimum age 18, passwords of at least 10 characters and never-verified account
deletion after 30 days. Privacy publication does not open accounts. Age enforcement
and cleanup are separate implementation/activation tasks; current password code,
hosted migrations/settings and `PARTICIPANT_ACCOUNTS_ENABLED` remain unchanged.
ORG-039 requires identity numbers at registration only, adding no sign-up field.

<a id="bl-auth-01"></a>

## BL-AUTH-01 — Implement edition-scoped grants and privileged access enforcement
- **Source IDs:** ROL-01, ROL-02, ROL-03, ROL-04, ROL-05, ROL-06, ROL-07, ROL-08, ROL-09, ROL-10, ROL-11, ROL-12, SEC-02, AUTH-04.
- **Status:** Partial — closed persisted authority/context foundation deployed to the selected hosted project; actual schema CI and hosted ACL/anonymous-denial checks passed. No operational role system or staff activation. See [feature note](../features/persisted-authorization.md) and PROGRESS for receipts and AUTH-05/domain integration gates.
- **Purpose:** Allow each staff member only the duties and assigned records authorized for them.
- **Scope:** Individual edition/track/assignment grants, server/database permission helpers and direct-access tests; privileged operations fail closed without the strongest current approved staff email check or Super Admin MFA assurance; suspension/offboarding revokes grants.
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
- **Status:** Partial — participant managed sign-up/sign-in foundation has verified owner access and enumeration protection. ORG-037 approves the v1.0 repository Privacy notice; live activation, age enforcement/cleanup and hosted release gates remain open. See [participant guide](../features/PARTICIPANT_ACCOUNTS.md).
- **Purpose:** Let a participant create one account without revealing other users' account existence.
- **Scope:** Managed email/password sign-up/sign-in, normalized unique email and name; ORG-016 requires verified email only, without authentication phone collection/verification or participant MFA. Collect only approved authentication fields with approved notices; safe verified/unverified session boundary. Separate pre-activation work must enforce ORG-041's minimum age 18 without inventing unnecessary date-of-birth fields, and verify the existing ten-character password minimum.
- **Exclusions:** University SSO, national ID, collecting every later pathway field during sign-up, operational entitlement from account creation.
- **Dependencies:** BL-FND-01; BL-FND-02; BL-SEC-01. Sign-up/sign-in may land while all verification-dependent operations remain closed.
- **Roles:** Visitor; participant.
- **States/transitions:** Visitor → unverified account → verified account through verification flow; account creation is not registration.
- **Data touched:** Managed identity, minimum participant profile and applicable notice version.
- **Acceptance criteria:** Duplicate/normalized email handled without public enumeration; users missing email verification cannot register/pay/book/submit; verified email permits only separately authorized own workflows without MFA. No password or verification code enters logs. Email change/loss requires its approved verification/recovery process.
- **English/Arabic:** Bilingual forms/errors with preserved values on locale switch; original names retained.
- **Accessibility:** Labelled password/email fields, autocomplete, accessible errors and keyboard flow.
- **Security/RLS:** Profile ownership policies; protected session cookies and CSRF where applicable; server checks verification.
- **Audit/email:** Safe account/security events; verification delivery through approved English template/test adapter.
- **Automated tests:** Duplicate case/whitespace email, enumeration-equivalent responses, unverified operation denial and another profile denial.
- **Manual UAT:** Sign up, retry existing address and verify unrelated account state is not exposed.
- **Release gate:** M5; BL-AUTH-03 before verification-dependent operations; CFG-09 privacy and configured identity/email before real users.
- **Owner type:** Authentication/full-stack engineer.
- **TBD blocked:** Synthetic auth no; production notices/email provider/sender/abuse/recovery DR-CFG-09/10/11.

<a id="bl-auth-03"></a>

## BL-AUTH-03 — Implement single-use verification codes with abuse protection
- **Source IDs:** AUTH-02, ACC-01, EML-01, SEC-01.
- **Status:** Partial — closed participant six-digit verification, native bypass guards, expiry/replacement/replay and account/IP abuse controls are implemented in draft PR39. Live delivery and human UAT remain gated. See [participant guide](../features/PARTICIPANT_ACCOUNTS.md).
- **Purpose:** Verify email possession without participant MFA, reusable codes or inaccessible challenges (ORG-016).
- **Scope:** Participant email verification only, protected-at-rest single-use codes, replacement invalidation and account/IP controls. Source defaults remain10-minute validity,60s resend,3/email/15min,5failures/code. Managed direct-API enforcement and live email/privacy configuration remain gates; lab controls are separate development bounds.
- **Exclusions:** New business expiry values, permanent lockout, inaccessible CAPTCHA, email verification treated as privileged MFA.
- **Dependencies:** BL-AUTH-02; BL-FND-05; BL-SEC-01.
- **Roles:** Unverified participant; abuse-control operator.
- **States/transitions:** Issued → verified/expired/replaced/attempts exhausted; old code cannot reactivate.
- **Data touched:** Protected verification credential, counters and minimal security events.
- **Acceptance criteria:** Current email verification required; it creates no privileged assurance or workflow activation. Only newest valid code works once; concurrent verification cannot reuse it; approved resend limits apply across sessions/IP attempts without leaking account state; input survives recoverable failure.
- **English/Arabic:** Bilingual verification/resend/error messages; English-only email; digits and code field have stable LTR entry in RTL.
- **Accessibility:** Paste and autofill supported, screen-reader status, keyboard anti-bot alternative and readable cooldown.
- **Security/RLS:** Verification occurs server-side; raw codes absent from logs/client bundles and protected at rest.
- **Audit/email:** Restricted issuance/failure metadata, never code or recipient; console/test English email only until provider/settings approved.
- **Automated tests:** Expiry boundary, rate limits, replacement, parallel single-use, paste/autofill and malformed code.
- **Manual UAT:** Expired code, resent code, assistive technology and recovery after throttling.
- **Release gate:** M5 verified operational access; configured email/privacy prerequisites.
- **Owner type:** Authentication/security engineer.
- **TBD blocked:** Email defaults already recorded; live email, email recovery and production abuse controls DR-CFG-09/10/11. Local synthetic verification preview in BL-AUTH-05 is not participant signup or production verification delivery.

<a id="bl-auth-04"></a>

## BL-AUTH-04 — Add throttled password recovery and safe reset
- **Source IDs:** AUTH-03, AUTH-05, SEC-01, EML-01, ERR-01.
- **Status:** Partial — participant code recovery, progressive login limits and native old-session revocation are implemented in closed draft PR39; stronger staff recovery remains separate. Live email and second-device UAT remain gated. See [participant guide](../features/PARTICIPANT_ACCOUNTS.md).
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

## BL-AUTH-05 — Staff email check, Super Admin authenticator MFA and audited recovery
- **Source IDs:** AUTH-04, ROL-12, SEC-01, SEC-06.
- **Status:** Partial — closed development foundations implemented and verified; current receipts in PROGRESS. ORG-016 removes phone/SMS authentication and restores Super Admin authenticator setup. Review-only migrations and production/recovery release gates remain open. No participant signup/live delivery/recovery activation. See [feature note](../features/staff-security-foundations.md).
- **Purpose:** Require the approved staff check or Super Admin MFA before scoped privileged access.
- **Scope:** Regular staff password then fresh code at trusted verified email/private exact-user/session/email/password/grant receipt at AAL1 (ORG-015); Super Admin password then current authenticator TOTP at AAL2 (ORG-016). Participants retain verified email/password only, no phone/MFA. Approved staff email6digits/5min,60s resend,3/account/15min,10/rolling24h,20/IP/hour,5failures/15min cooldown,newest only. Recovery remains gated.
- **Exclusions:** Email OTP sign-in as proof of both steps/native AAL2; email receipt replacing Super Admin MFA; phone/SMS verification, automatic reset on password recovery, shared factors/support bypass, production/general-recipient delivery or hosted migration apply. Approved isolated self-recipient test mail stays separate.
- **Dependencies:** BL-AUTH-01, managed identity, approved staff recovery DR-CFG-11 and live email/privacy configuration.
- **Roles:** Individually identified privileged users; separately authorized distinct recovery approver/operator.
- **States/transitions:** Staff password→email challenge→single-use exact-session receipt; Super Admin password→TOTP enrollment/challenge→verified current factor/AAL2. Missing/stale/foreign/out-of-order proof denies. New login needs fresh appropriate checking; refresh does not.
- **Data touched:** Private keyed email hashes/receipts, safe audit, managed authenticator factors and session/revocation metadata; no authentication phone fields.
- **Acceptance criteria:** Password-only/direct API/database/storage bypass denies. Strongest tier across editions is enforced with current roles/scopes. Metadata/client flags, generic AAL2/phone/primary OTP, foreign session or stale email/grants/factor cannot substitute. Email inbox compromise may allow password reset and login-code receipt; staff checking is weaker than authenticator MFA. No development-email fallback.
- **English/Arabic:** Bilingual staff instructions/recovery; authentication emails and assessment screens English-only.
- **Accessibility:** Labelled LTR code input in RTL; keyboard/paste/autofill/Arabic digits, clear expiry/resend/delivery-failure/retry, screen-reader status. Super Admin QR plus keyboard manual key; no camera requirement.
- **Security/RLS:** Current assurance server/database predicate with scoped grants/ownership/readiness; no escalation/reset bypass; no code/secret/password in logs/browser storage/audit.
- **Audit/email:** Safe enrollment/challenge/verification/revocation events; approved English email only when configured.
- **Automated tests:** Password-only/incorrect/expired/reused/replaced code, quotas/concurrency, stale/foreign factor/receipt, strongest roles, refresh/new login, email/role revocation, expiry/logout/suspension, failure recovery and unauthorized reset.
- **Manual UAT:** Organizer reported that the isolated staff email preview works; exact device/locale/accessibility extent unspecified. Super Admin authenticator-device/QR/manual-entry UAT, combined genuine-managed-login/real-inbox UAT, screen readers and actual recovery remain NOT TESTED. No additional synthetic recovery rehearsal is included in the foundation closeout.
- **Release gate:** M4 privileged production access; all operational flags false.
- **Owner type:** Authentication/security engineer.
- **TBD blocked:** Production English email provider/sender/SMTP; precise verified lost-email/authenticator procedure/evidence and named distinct Super Admin custodians; recent-auth age/warning lead; privacy/retention/location and release approvals. SMS provider/sender/budget is retired. See [decision packet](../features/managed-authentication-plan.md).

<a id="bl-auth-06"></a>

## BL-AUTH-06 — Enforce session lifetimes and revocation with draft recovery
- **Source IDs:** AUTH-05, ROL-12, SEC-06, ERR-01.
- **Status:** Partial — configurable staff foundations plus the participant 72-hour original-session cookie/admission and native reset/revocation are implemented and verified; migrations review-only, no live activation or saved-draft module. See [staff note](../features/staff-security-foundations.md), [participant guide](../features/PARTICIPANT_ACCOUNTS.md) and PROGRESS.
- **Purpose:** Expire or revoke access predictably without losing already saved work.
- **Scope:** ORG-019 participant absolute maximum 72h; privileged idle 30min and absolute 8h. Refresh never restarts absolute origin. Recent-auth age/warning lead TBD; dependent sensitive actions closed. Logout/suspension/recovery/factor-reset invalidation foundations; draft recovery belongs to its later workflow.
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
- **TBD blocked:** Recent-auth age, warning lead, named recovery custodians/verified procedure, privacy/retention/location and live security-email configuration remain TBD. ORG-016 preserves distinct-person/in-person recovery targets and disposable no-delivery managed API tests; live activation requires approved email/database enforcement and human UAT.

<a id="bl-auth-07"></a>

## BL-AUTH-07 — Add minimal profile editing and verified support requests
- **Source IDs:** AUTH-06, AUTH-07, PRV-03, PRV-04, DAT-01.
- **Status:** Planned.
- **Purpose:** Let participants correct permitted information while sensitive identity changes receive verification.
- **Scope:** Owner-only profile form with pathway-conditional fields; verified-support request entry for email change/deletion, replacement-email reverification and retention assessment handoff.
- **Exclusions:** National ID in account/profile fields (ORG-039's identity requirement belongs only to registration), universal licence requirements, authentication phone collection/verification or SMS, immediate destructive self-delete, creating a general helpdesk.
- **Dependencies:** BL-AUTH-02; BL-AUTH-06; privacy request handling and DR-CFG-09.
- **Roles:** Participant; authorized verified-support/privacy operator.
- **States/transitions:** Permitted correction saved; sensitive request → identity verification → reviewed change/retention exception → response; email changes only after reverify.
- **Data touched:** Minimal profile, conditional professional fields and restricted privacy/support evidence.
- **Acceptance criteria:** Name/email preserved; no authentication phone collection/verification; country/city optional, licence never universal for students/non-medical attendees; replacement email requires its approved verification/recovery process; deletion does not destroy required financial/audit records blindly.
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
- **Status:** Partial — closed owner-only My MSRC shell shows account state/name and “Registration not open yet” in EN/AR in draft PR39. Domain read models and operational actions remain separate. See [participant guide](../features/PARTICIPANT_ACCOUNTS.md).
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
- **Scope:** Idempotent scheduled cleanup using ORG-041's approved 30-day threshold for never-verified accounts, superseding AUTH-08's seven-day default; verified/account-record recheck and restricted outcome evidence. This remains backlog work, with no retention code or migration changes in the policy publication PR.
- **Exclusions:** Deleting verified participants, cascading through retained operational records, inventing universal retention rules.
- **Dependencies:** BL-FND-04; BL-AUTH-02; approved retention exception map DR-CFG-09.
- **Roles:** Restricted cleanup worker; privacy operator for exceptions.
- **States/transitions:** Never verified for 30 days → eligible after recheck → removed; verified/retained obligation → protected or reviewed exception.
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
