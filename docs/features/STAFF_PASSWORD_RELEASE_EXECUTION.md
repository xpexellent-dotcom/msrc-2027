# Owner password-change release — stopped execution record

**8 October 2026 local checkpoint: the additional migration committed and passed
verification. The first release attempt stopped during deployment verification;
only the new password-change feature was closed. Closure and the serving closed
deployment passed verification. The account password is unchanged.**

ORG-046 remains the standing restricted setup authority. The organizer's latest
clarification makes the new private value a requested replacement password, not
the current account password. Normal owner rotation requires fresh current
password plus the person's own TOTP; it is separate from other-admin lost-access
recovery. No bootstrap replay, self-reset, authenticator deletion or other account
is authorized by this request. Names and all private inputs remain outside this
record. The designated names remain only in DECISIONS.

The reviewed application is [merged PR #46](https://github.com/xpexellent-dotcom/msrc-2027/pull/46),
main `2f677bedd9e1773508286cc5d8db79780801cc37`. Its tree exactly matched reviewed
head `1f7ef0ba95277eb9af37efc5840596676faa1fae`; expected merge parents were
verified. [PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45) remains
draft. The [reviewed migration packet](https://github.com/xpexellent-dotcom/msrc-2027/blob/2f677bedd9e1773508286cc5d8db79780801cc37/docs/features/STAFF_PASSWORD_MIGRATION_PACKET.md)
and [feature guide](https://github.com/xpexellent-dotcom/msrc-2027/blob/2f677bedd9e1773508286cc5d8db79780801cc37/docs/features/STAFF_PASSWORD_CHANGE.md)
describe the default-off feature and fresh owner proof requirements.

## Checks and execution

All timestamps below are UTC on **7 October 2026**, after midnight on 8 October
in the organizer's timezone. PASS refers only to the stated observed check.

| Stage | Observed result |
| --- | --- |
| Merged-main checks | All seven substantive jobs SUCCESS: [Foundation 37688971744](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37688971744), [Staff 37688971725](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37688971725), [Participant 37688971851](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37688971851). Fresh pre-release readback also confirmed Vercel SUCCESS. |
| Fresh backup and restore | PASS, 22:04:54.199: protected consistent exported-snapshot backup restored into the matching PostgreSQL 17.6 isolated clone. Exact 17 catalog sections, 74 tables, five sequences and 49 extension functions/ACLs compared; only the documented cron counter could advance. One existing enrolled account was restored; no new identity/factor or source write, Auth request or email. |
| Migration rollback rehearsal | PASS, 22:04:59.948: exact additional file applied inside a local transaction, native/application rows preserved, forced RLS and false new gate verified, then exact catalog/data rollback verified. |
| Actual operator protocol rehearsal | PASS, 22:05:13.826: marker persisted before the history lock; exact file and original-version ledger INSERT verified in one transaction, then rolled back. Fresh original catalog and row fingerprints matched. |
| Gate enable and close rehearsals | PASS after a local comparison correction: temporary additional migration/history and each exact policy-only action rolled back; original catalog and all rows matched. Source hashes bind the two successful private receipts. |
| Production new server flag false | PASS, 22:07:57.068: Production-only encrypted `STAFF_PASSWORD_CHANGE_ENABLED=false`; existing seven staff variables, sensitive keys, Resend and unrelated environment metadata retained. |
| Additional hosted migration | COMMITTED AND VERIFIED, 22:08:30.753: `20261007195540_staff_password_change.sql`; SHA-256 `9cbc7ee07ad8902f6e829dc9d3ac4865e62bba1632a3068cf559736ef9041924`. Exact rehearsed catalog, all existing native/application data and eight prior immutable history rows preserved. One original version/name added; new gate remained false. |
| Native new gate enable | HISTORICAL PASS, 22:09:02.725: only the new policy boolean enabled, original transaction ended, owner/authenticator/authority and closure invariants preserved. This is not password-change proof. |
| Pinned enabled deployment | Requested, 22:09:24.470: `dpl_2Wrrri4H8LpxGAHge8HFfJfb1wTt`, initially INITIALIZING at the exact reviewed source. A successful owner handoff or enabled serving READY state was not recorded. |
| Release verification | STOP: the helper required GitHub's Vercel status to remain SUCCESS while its own new deployment was still building. The normal pending state was treated as a failed prerequisite. No human password/TOTP handoff occurred. |
| New-feature closure | PASS, 22:10:45.572: exact original enable transaction proven ended; new database gate committed/read back false first, then only the new Production server flag false. Original staff access retained. |
| Closed serving deployment | PASS: `dpl_QnzXFp2hA9NqeNKeBrHGt8h9LGA2` verified READY/current Production with exact source/project/team and apex/www aliases. No password change, account creation or email. |
| Fresh live closure | PASS, 22:14:29.953: EN/AR Security pages 404; anonymous People/Audit/Participants GETs denied; participant and all 15 operational APIs closed; native Auth remains `v2.197.0`. |
| Existing staff sign-in observer | PASS, 22:16:19.283: EN/AR anonymous sign-in pages 200 with blank current-password controls, localized headings/lang/dir, noindex/nofollow, private no-store response and no cookie/private UI. Public pages contain no staff links and robots disallows staff. This is not a new human sign-in/TOTP pass. |
| Disposable clone disposal | PASS, 22:16:38.817: verified owned network-none/no-port clone removed; original protected backup and all successful/failed evidence retained. |
| Owner rotation and new-password/TOTP | NOT PERFORMED. Requested-password comparison, new signed-home DOM, live axe and current own-device strongest assurance are NOT TESTED by this release. |

No earlier migration was reapplied, reset or seeded. Original six setup receipts
remain in [the setup execution record](STAFF_SETUP_EXECUTION.md). Hosted history
now contains these **nine separate original versions**:

1. `20261002173712_persisted_authorization.sql` — previously applied, preserved.
2. `20261002193800_staff_mfa_session_foundations.sql` — original setup migration 1.
3. `20261002233353_regular_staff_email_check.sql` — original setup migration 2.
4. `20261003110812_authenticator_super_admin_policy.sql` — original setup migration 3.
5. `20261003180734_readonly_authentication_context.sql` — original setup migration 4.
6. `20261004114603_contact_abuse_counters.sql` — previously applied, preserved.
7. `20261004164034_participant_accounts.sql` — original setup migration 5; participant gate stays false.
8. `20261006224926_staff_portal_foundation.sql` — original setup migration 6.
9. `20261007195540_staff_password_change.sql` — additional migration recorded above; its gates are currently false.

The synthetic sample migration remains excluded. Migration order is the exact
original version order, not renamed files or a replay of the initial setup.

## Failures retained and corrections

The first fresh-backup attempt stopped at an incorrect client-version pin. The
installed PostgreSQL 17.11 client supports the matching 17.6 source; source and
restore-server version pins remained unchanged. A later complete captured backup
was reused locally without another source dump. Its initial broad `offline-roles`
failure label also covered database recreation. Refined safe diagnostics showed
roles succeeded and the empty database could not be dropped because it was in
use. The cron launcher was preloaded before database replacement. Initial local
startup now loads only pg_stat_statements, replaces the empty database without
force, then restarts with pg_cron preloaded and job execution off before restore.
The unchanged archive, roles, locale, extension owners and ACL equality then passed.

The first local gate-enable rehearsal rolled back because whole-catalog comparison
included the intentionally changed policy boolean. Independent review limited the
correction to that one validated boolean; all other catalog, policy, data and
ledger comparisons remain exact. UUID attempt files preserve failures; successful
receipts cannot overwrite them. No automatic retry, weaker assertion or longer timeout was
used to make a failure pass.

The deployed application and database tests did not fail in the release STOP.
The private readiness helper must distinguish a verified owned deployment's
normal progress from an actual failure. The corrected private helper first binds
the exact owned deployment, allows only INITIALIZING/QUEUED/BUILDING to wait,
keeps all seven CI jobs/main/draft/source checks strict, and requires serving
target/aliases plus no pending Vercel observation before READY. Actual failures,
unknown states or contradictory evidence cannot produce READY. Independent
source review passed; `node --test --test-reporter=dot` passed all 42 synthetic
readiness regressions, including the original pending-build failure, failed/
missing checks, wrong target/source, unknown states, and an aggregate success
with an individually pending Vercel status. These tests imported only the pure
policy: no input, network, database, provider or Auth action. The corrected
enabled-release helper has NOT been executed against Production. The closed first release must
not be replayed or relabeled successful. A future resumption needs a separately
reviewed attempt, fresh prerequisite readbacks and successful serving/live checks
under the existing authorization; it must not rerun the committed migration.

## Current state and rollback

Only `msrc_staff.policy.password_change_enabled` and Production
`STAFF_PASSWORD_CHANGE_ENABLED` are false. Existing restricted staff readiness
remains true for the single active Super Admin with one verified authenticator;
pairing remains false. Invitations/admissions remain absent; participants, wider
paired-admin administration, exports and all operational workflows remain closed. Two-admin,
no-self-demotion/suspension/reset and persistent peer-recovery protections remain.
No other account, factor reset, real email, paid resource or DNS change occurred.

For any future unknown outcome, first reconcile the exact original native
PID/backend-start/transaction-start before a follow-up write. Never infer rollback
from an absent ledger row or a different connection. Preserve all private markers,
audits, immutable history and failed receipts; do not replay DDL or bootstrap.

For feature closure, use the reviewed same-operation procedure: close/read back
the new database boolean first, then only the new server flag, request a pinned
false-flag deployment when required, verify actual READY/current Production and
aliases, then repeat anonymous/live closure checks. Keep the security migration,
guards, account, authenticator and original staff gates. Closing a feature does
not undo a committed password change. Never restore an obsolete password or use
self-recovery to bypass the other-admin recovery rule.
