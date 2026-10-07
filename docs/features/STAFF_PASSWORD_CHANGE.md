# Authenticated staff password change

BL-AUTH-01/05/06, AUTH-03/04/05, SEC-01/02/06; ORG-044/047.

The organizer requested an actual password change after completing staff sign-in
and own-device authenticator enrollment. The replacement password remains in the
private input file; it has not been applied to the account. The original six
migrations and restricted setup are recorded separately in
[draft PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45).

This slice prepares an owner password-change flow for Super Admins with an intact
verified authenticator. Both `STAFF_PORTAL_ENABLED` and the new server-only
`STAFF_PASSWORD_CHANGE_ENABLED` must be true, and both database gates must be
true. The new gate defaults false. Participant and other operational gates stay
closed. No hosted migration, setting, password, account or email changes are
performed by this implementation task.

## Owner flow

The Super Admin signs in with the current account password and their own
authenticator. The Security page accepts the replacement password and matching
confirmation. The database requires fresh native password and TOTP evidence
within a two-minute admission window, using the exact current session, factor,
identity revision, account and edition-scoped grant. An older session requires a
fresh sign-in. The password policy remains ten Unicode codepoints minimum and
72 UTF-8 bytes maximum, without trimming or normalizing the password.

Only the signed-in person's password can change. The verified authenticator,
email, name, roles and account status stay intact. On a committed change,
immutable audit records identify the owner/action/result and all prior
application sessions are revoked. The cookie is cleared and a new password/TOTP
sign-in is required. No password, code, operation capability or provider payload
is projected to the browser or audit viewer.

This operation requires retained access; lost-access recovery still requires the
other Super Admin. No own authenticator reset, self-demotion, self-suspension,
minimum-two exception or bootstrap replay is added. Incomplete, failed or
interrupted recovery continues to deny access through the existing persistent
recovery hold.

## Native transaction binding

Native Auth does not provide a reliable owner session ID to its SQL identity
trigger. The pinned GoTrue Admin update writes the password before the supplied
protected app metadata, inside one transaction. Consequently a pending owner
reservation alone cannot authorize the password commit.

The reviewed gate stages the password mutation against the fresh owner
reservation and binds its exact native transaction. A later statement in that
same transaction must supply the unpredictable server-only operation capability
through protected app metadata. The trigger removes it before persistence;
existing app metadata is preserved. A deferred constraint denies commit unless
the same transaction confirmed that capability. A raw user password update,
another session, missing/wrong marker, stale reservation, changed authority or
recovery hold cannot commit through this path. Atomic completion consumes the
reservation, records the audit and revokes old application proofs while keeping
the authenticator.

The dedicated backend method is separate from invitation acceptance and peer
account reset. An API/provider timeout does not prove either rollback or success.
Clear the cookie, report that completion could not be confirmed, and reconcile
the exact operation/native transaction before any retry. Do not automatically
replay the provider update or remove a recovery hold.

## Review and activation prerequisites

1. Review the additive migration, owner API, EN/AR/RTL page and tests. Record the
   exact reviewed commit and migration hash. Require green application, database,
   staff-native, participant regression and closed-route/browser CI for that
   commit. Synthetic presentation checks alone do not prove native enforcement.
2. Merge the reviewed change before deploying its main revision. PR #45 remains
   draft and independent; its completed six-migration receipts do not certify
   this extra migration or a later application revision.
3. Verify the exact approved Supabase/Vercel project and current hosted ledger.
   Confirm all original six staff/participant migrations are already applied,
   existing restricted staff policy/account/factor counts are expected, and
   participant/generic operational readiness remains false. Stop on drift.
4. Take a fresh protected logical backup and demonstrate restore of that exact
   backup in a disposable isolated database. The earlier pre-bootstrap backup
   contains no account and cannot by itself restore the now-enrolled first
   account. Keep real identity/factor material private, unlogged and outside Git;
   reconcile post-backup changes and preserve immutable audit/revocations.
5. Apply only the new reviewed migration with the new feature gate false. Verify
   new forced-RLS objects, explicit grants, native transaction guard and existing
   recovery/session/authentication guards. Align the exact original migration
   version with the hosted history without editing old ledger entries.
6. Verify the actual pinned/native Auth transaction sequence remains compatible.
   Keep native token/mail suppression and notifications disabled. No SMTP,
   provider quota, Auth password-recovery, participant setting or paid resource
   change is required for this operation; its email volume is zero.
7. Enable only the new database password-change gate, then Production-only
   `STAFF_PASSWORD_CHANGE_ENABLED=true`, deploying the reviewed merged main.
   Verify the new page stays noindex, robots/public navigation exclusion remains,
   anonymous/other-role/stale-session calls deny, and participant/all other
   operational boundaries stay closed. Do not create another account.
8. The owner privately completes fresh password/TOTP sign-in, password change and
   new-password/TOTP sign-in. Verify committed owner audit, unchanged verified
   factor/roles, revoked old sessions and closed unrelated workflows through
   reviewed read-only queries. Keep authenticator material and passwords outside
   tool output, logs, source control and screenshots.

## Failure and rollback

Stop on failed checks, unapproved costs, missing private inputs or unknown native
transaction outcome. Disable the new database password-change gate first, then
set `STAFF_PASSWORD_CHANGE_ENABLED=false` and deploy/verify closure. If the
failure also affects staff authorization, close the existing staff database gate
and `STAFF_PORTAL_ENABLED` using the established restricted-setup procedure.

Gate closure prevents further password changes; it does not undo a committed
password change, recall a session revocation or authorize a self-reset. Preserve
the working authenticator, deferred guard, private reservation history, immutable
audit and peer-recovery holds. Reconcile the exact original native transaction
and committed reservation state before choosing a forward correction. Never
retry uncertain mutations blindly, restore an obsolete password hash, weaken
RLS/grants, delete history or repurpose bootstrap. Managed restore requires a
reviewed plan that reconciles all post-backup identity/security changes.

Verification results and unrun gates are recorded in PROGRESS. The account's
requested password change remains NOT APPLIED until actual owner completion is
independently verified.
