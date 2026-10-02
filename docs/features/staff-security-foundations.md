# BL-AUTH-05/06 — Closed staff MFA and session policy foundations

Requirements: AUTH-04/05, ROL-12, SEC-01/02/06, LOC-01, ACC-01, ERR-01.
Authority: explicit bounded organizer task, 2 October 2026; ORG-010/011/012 and ENG-011.

## Scope and release state

This is a reviewable local synthetic enrollment/challenge and policy lab. It creates no
managed account, grant, invitation, live factor, domain record or email. All 15 operational
workflows and both operational/privileged readiness flags remain false. Participant signup,
CMS editing, payments, scientific review and other operational modules remain excluded.

Production Supabase `ecemjggwlzqpjcwmchrl` is isolated from test data. Its existing
`20261002173712_persisted_authorization.sql` is unchanged and never reapplied here.
The new CLI-generated `20261002193800_staff_mfa_session_foundations.sql` is **review-only**:
GitHub's isolated synthetic stack runs it; this task applies no hosted migration.

## Local preview and failure recovery

Use Node 24.x and pinned pnpm 11.19.0 in the new worktree. On this Windows machine, first
add the original checkout's `.tools/node` directory to this terminal's PATH, then dot-source
`scripts/use-local-node.ps1`. Run `pnpm install --frozen-lockfile`, set the server-only
environment variable `MSRC_AUTH_PREVIEW=synthetic`, clear `VERCEL_ENV` and run `pnpm dev`.
Next binds to 127.0.0.1. Open `/en/staff-security-preview` or `/ar/staff-security-preview`.
Do not configure a hosted database for the lab; its ephemeral service has no provider client.

Start a synthetic staff session, enroll its fresh QR/manual key in a test authenticator,
enter the six-digit code, and exercise the synthetic assurance probe. Genuine app code
verification, single-use counters, bounded challenge attempts and serialized concurrent
requests are implemented. Lab abuse/challenge limits are engineering bounds, not approved
live business settings. The page labels successful assurance as synthetic and live access
as closed. Use a test factor only; discard it after review. Restarting the process discards
every synthetic identity, factor and session. Keys and codes stay out of browser storage,
URLs, audit events and diagnostic logs; setup material appears only during enrollment.

Keyboard focus, retry errors, polite success/expiry announcements and manual key setup
support English and Arabic/RTL. Entered codes/setup stay in transient memory across
in-app locale changes; reload clears them. A failed provider/QR/audit operation returns a
sanitized failure and denies existing synthetic assurance. No unsaved work is promised
durable: actual saved-draft restoration remains for the future editing workflow.

## Transport and provider boundary

Page/API gates require exact opt-in, loopback Host and no deployment environment.
Every Vercel environment returns 404 even if the flag is set; local production builds
can run the lab. POST requires matching Origin, JSON, an exact action allowlist and a
512-byte body ceiling. Actor IDs, timestamps, roles and factor IDs cannot be overposted.
An opaque HttpOnly SameSite=Strict cookie is scoped to `/api/auth-preview`; it conveys only
synthetic state and is never returned in JSON. Responses use private/no-store headers.
Production analytics excludes this route; the existing robots exclusion remains.

The injectable typed Supabase SDK adapter covers enroll/challenge/verify with sanitized
results. It has no live configured client or reset/unenroll operation, and provider success
confers no authority. `MANAGED_STAFF_MFA_READY` remains false. Current official
[TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp) and
[session documentation](https://supabase.com/docs/guides/auth/sessions) informed the contract;
installed SDK types check the integration. Full live SDK/cookie/refresh exchange is later.

## Session and database evidence

ORG-012 adopts participant 72h absolute maximum from original session creation;
privileged limits stay 30min idle/8h absolute. Refresh and MFA challenge never change
the absolute origin, and refresh/context reads never count as activity. Server policy
checks fixed origin, current account and session existence/revocation, token expiry,
managed not-after, individual identity and current verified TOTP assurance. Equality at
a limit expires. Suspended/offboarded or factor-removed sessions cannot preserve authority
with a previously issued token. Sensitive policy checks deny with recent-auth age unset.
Any active staff grant selects the privileged limits across editions; selecting another
configured edition cannot downgrade a staff session to participant policy.

The additive private `msrc_sessions` schema holds approved policy, immutable session
origin/server activity, revocation cutoffs and append-only safe audit references. Forced
RLS and denied client/service-role table grants apply. Narrow own-context/logout RPCs
inspect current managed Auth evidence with fixed search paths and explicit execution
grants. The public activity wrapper observes only while closed; only the private activity
primitive is reserved for future successful domain transactions. No resource facts or
operational authorization are returned. Security
audit failure rolls back database transitions. Named references in maintenance evidence
are attribution foundations; they do not establish a verified live human operator.

## Verification, UAT and configuration

Executed commands, exact CI/Preview receipts and failures are recorded in PROGRESS.
Local SQL tests are intentionally unrun: no Docker requirement on this computer.
Database migrations, pgTAP and Data API checks run solely in isolated GitHub CI.
Actual parallel database connections test expired-session activity and suspension races.
Their write fixtures require GitHub Actions, the exact isolated project/container and
validated loopback settings; rows disappear with the disposable stack. Private forced-RLS
tables intentionally have no client policies. The narrow authenticated SECURITY DEFINER
RPC advisory remains a reviewed exception, with fixed search path and own-session checks.
Automated browser traces/screenshots are disabled while secrets could be visible; visual
evidence masks setup key, QR and entered code. Human screen-reader and real authenticator
UAT are separate release gates, and synthetic success is not production readiness.

Remaining decisions: recovery approver/operator/verified reset procedure, recent-auth
maximum age, timeout-warning lead, privacy/retention/location, live security-email
provider/sender, production plan/region/operational approvals and two intended Super Admins.
No real invitation, factor reset or email is performed. Console/test email only.

## Rollback and next slice

Stop the local process and clear `MSRC_AUTH_PREVIEW`; memory-only factors/sessions vanish.
Revert this branch's application changes if needed. No production schema rollback is
needed because the new migration is not applied there. On an isolated CI database, recreate
the disposable stack rather than deleting retained production evidence. A future hosted
deployment requires separate source review and explicit authorization, with a data-aware
rollback plan; never blindly push historical migrations.

Next smallest task: approve the recovery/recent-auth policy and complete an isolated
managed-Auth test environment with named-human MFA and session-lifecycle UAT. Integrate
successful domain actions with server activity and feature-specific AuthorityReader/RLS
only in a later bounded task. Keep staff grants/CMS and all operational releases closed.
