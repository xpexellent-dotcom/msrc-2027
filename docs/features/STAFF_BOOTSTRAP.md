# First staff Super Admin operator procedure

BL-AUTH-01, BL-AUTH-05/06 staff, ROL-10/12. This procedure is documented and has
**NOT BEEN RUN**. Real identities belong only in DECISIONS and operator-supplied
private inputs. The script is inert unless `--execute-bootstrap` is supplied.

Prerequisites: reviewed pending migrations through the staff portal foundation;
independent activation/privacy/email/recovery/UAT approvals; native PostgreSQL
operator access; managed Supabase Admin key available only in the operator process.
Keep `STAFF_PORTAL_ENABLED=false` and the private database `msrc_staff.policy.enabled`
false until the activation guide permits first-account onboarding. No browser/client
key can perform bootstrap. Do not run this script from CI or application request handlers.

1. The operator independently verifies the first designated person's supplied email.
   Generate a temporary password privately (at least ten Unicode characters, maximum
   72 UTF-8 bytes). Transfer it to that person through the approved private operational
   channel. Never put it in a repository, command argument, transcript, ticket or log.
2. Supply process environment variables using the organization's private secret runner:
   `STAFF_BOOTSTRAP_EMAIL`, `STAFF_BOOTSTRAP_DISPLAY_NAME`,
   `STAFF_BOOTSTRAP_EDITION_KEY`, `STAFF_BOOTSTRAP_PASSWORD`,
   `STAFF_BOOTSTRAP_DATABASE_URL` (native postgres connection),
   `STAFF_BOOTSTRAP_APPROVED_PROJECT_REF` (the separately approved project), `SUPABASE_URL`, and
   `SUPABASE_SECRET_KEY` (modern server secret). The script requires HTTPS Auth and
   a matching native database target: either direct `db.<approved-ref>.supabase.co`
   with username `postgres`, or the independently verified shared **session** pooler
   `aws-0-ap-northeast-1.pooler.supabase.com:5432` with username
   `postgres.<approved-ref>`. Both require database `postgres`; transaction port
   6543, other hosts/roles/regions and URI queries/fragments are rejected. The pooler
   host is the actual Connect-dialog endpoint, never derived from a region guess.
   The SQL child receives only necessary OS execution variables and explicit
   validated PostgreSQL settings. Ambient libpq host-address/service/options and
   application/bootstrap secrets are not inherited; only the database password
   goes to that child in its environment. TLS encryption and a ten-second
   connection deadline remain mandatory; if the operator supplies `PGSSLROOTCERT`,
   the script uses that certificate with `verify-full` rather than downgrading TLS.
   Before each private SQL operation, that same native connection must prove
   `current_user=session_user=postgres` and `current_database()=postgres`; a caller
   role label cannot substitute for this check. SQL/provider output stays withheld.
   Verify the intended project privately before running. The display name and email
   are runtime inputs and are never copied into source or fixtures.
3. Run `node scripts/bootstrap-first-staff.ts --execute-bootstrap` from the reviewed
   revision. The operator SQL first reserves the exact random actor UUID/email for
   five minutes; managed Auth creates and hashes the credential; a second operator
   transaction calls `msrc_staff.bootstrap_first`. The private reservation and native
   transaction guard prevent public/native signup from producing a staff account.
   The final transaction creates the edition scope if absent, individually identified
   active staff profile and edition Super Admin role, with an immutable bootstrap audit.
4. First-account bootstrap refuses any existing staff profile, completed bootstrap,
   existing email or existing verified authenticator. It never overwrites a person.
   A partial failure preserves evidence and keeps the portal closed; inspect Auth,
   reservation and audit privately. Do not rerun blindly or delete history to retry.
   A reviewed operator repair must resolve the specific partial transaction before
   returning to the same intended actor. Native Auth owns all credentials.
5. When the separate activation guide authorizes onboarding, configure the approved
   staff daily email ceiling and enable the private staff database policy and server
   flag. The first person signs in with the temporary password and must enroll/verify
   a TOTP authenticator using the QR screen. Password-only access cannot enter the portal.
6. That first Super Admin invites the second using the portal and the second person's
   independently supplied email, with the Super Admin role. The single-use English
   invitation expires after 72 hours. The second person chooses a password, enrolls
   and verifies their own authenticator. Wider role/account administration remains
   denied until two active Super Admins have current verified authenticators.
7. Privately verify both people can sign in with their distinct authenticators and
   that the roster/audit show the intended edition roles. Test recovery with synthetic
   users first. An authenticator or account reset is initiated by the other Super Admin;
   self-reset, self-demotion and self-suspension are denied and audited. Authenticator
   reset revokes every target session before native factor removal. Account reset also
   rotates the password and sends a fresh single-use invitation. Partial provider
   failures keep a durable database recovery hold, even after the provider reservation
   expires. The target cannot use a fresh password session to enroll a replacement
   authenticator or regain staff authority. The other administrator must retry the
   same required mode; an incomplete full account reset cannot be replaced with a
   factor-only reset. Completed full recovery remains held until the latest linked
   invitation finishes native password setting, followed by fresh TOTP enrollment.
   Earlier callbacks or revoked/expired invitation links cannot release the hold.

The safeguard protects at least two active Super Admin accounts and grants against demotion or
suspension. The one-account bootstrap and approved other-admin recovery temporarily
require enrollment; they do not relax privileged assurance or make the bootstrap a
repeatable admission path. No ordinary workflow, participant export or production
setting is activated by this procedure alone. Rollback is closure of both staff gates;
retain immutable authority/audit history and inspect partial native operations privately.
