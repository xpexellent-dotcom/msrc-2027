# Participant accounts activation runbook — owner procedure, ships closed

Prepared **13 October 2026**. Requirements: AUTH-01/02/03/05/06/08,
PRV-01/02/04/05/07/08, SEC-01/06, EML-01 and REL-02; ORG-037/041.
This document prepares a later, separately authorized owner operation. This PR
does not access hosted data, apply SQL, change settings, provision an upgrade,
send email or open participant accounts. The owner merges the reviewed PR.

The 10 October hosted checkpoint is historical: nine applied migrations through
`20261007195540`, participant policy disabled, the Vercel participant flag absent,
pg_cron 1.6.4 and one postgres-owned `msrc-contact-expiry` job. Refresh that
evidence during execution; this document is not a current hosted readback.
No pg_net extension or HTTP cron job is needed.

## Reusable hosted change routine

Use this routine for **each migration independently**, including later migrations
that cite this section. Record PASS, FAIL, BLOCKED or NOT TESTED with UTC times,
the authorized operator/approver, exact target, serving commit, migration SHA-256
and private evidence location. Never record connection strings, names, email
addresses, credentials, codes, factors or provider payloads in repository evidence.

1. **Take a fresh protected backup and prove an isolated restore.** Confirm the
   selected Production project and current closed gates. Hash the protected
   backup/archive and roles material, retain the hash manifest in the approved
   encrypted backup location, and restore the exact snapshot into an isolated,
   matching-version clone with network/email access and cron execution disabled.
   Compare schema, owners, ACLs, forced RLS, migration ledger and protected data
   fingerprints/counts. Include existing staff identity, authenticator and session
   evidence; an old pre-account backup is insufficient. Rehearse this exact
   migration and transaction rollback on that clone.
   **Check:** hash, restore comparison and rollback rehearsal all pass.
   **Rollback:** discard the failed isolated clone, preserve receipts, and stop;
   no hosted write has occurred. After any erasure, a restored database also needs
   the latest external ledger reconciliation described below.
2. **Run a fresh read-only pre-apply probe.** Use the native postgres connection
   with verified target/TLS and bounded timeouts. Compare the current ledger,
   required privileges, expected prior function definitions, new-object absence
   and gate states against the exact reviewed execution packet. Run the probe
   again immediately before application, after any delay or intervening change.
   **Check:** every expected row says PASS and there is no unexplained drift.
   **Rollback:** end the read-only transaction and stop. Do not change an expected
   ledger, loosen a check or use role impersonation to obtain a pass.
3. **Apply one reviewed migration alone.** In the established owner transaction
   protocol, bind an exact private attempt/backend marker, lock the migration
   ledger, set bounded lock/statement timeouts, apply only the hashed file and
   record only its original version/name in the immutable hosted ledger. Compare
   pre-existing data/catalog/ACLs and new objects against the clone rehearsal
   before commit; read back the committed version and closed gates afterward.
   Never use `supabase db push` against hosted. Never apply
   `20260929143136_foundation_samples.sql` to hosted. No reset, seed, bootstrap or
   bundled migration replay is part of this routine.
   **Check:** one new version, preserved old versions/data and expected catalog.
   **Rollback:** before commit, roll back the exact original transaction. For an
   uncertain outcome, reconcile its backend/transaction and ledger before doing
   anything else. After commit, use a reviewed forward correction or rehearsed
   restore with external deletion replay; never casually drop guards/history.
4. **Smoke-test the existing staff portal.** The owner uses their own password
   and authenticator to sign in, opens People and Audit, then signs out. Check
   both EN and AR, RTL, denied stale/anonymous access and preserved existing
   staff readiness. This matters because the age migration copies and renames
   the session context functions used by the live staff portal.
   **Check:** sign-in, People, Audit and sign-out all pass with private receipts.
   **Rollback:** stop participant activation, preserve the failure, and use the
   rehearsed correction/rollback route. Do not reset staff accounts or factors.
5. **Re-run security and performance advisors.** Compare individual findings,
   grants, fixed `search_path=''` and forced RLS against the recorded baseline
   below. New private tables may produce expected INFO 0008 findings; new
   executable client paths or unexpected findings require review.
   **Check:** every changed finding has a source-specific explanation and no new
   unreviewed exposure. **Rollback:** keep participant gates closed and stop the
   release; do not add permissive policies to remove a private-table finding.
6. **Record the outcome and preserve the backup.** Bind post-commit checks,
   staff smoke results, advisor receipts and exact source/file hashes to the same
   attempt. Preserve failed receipts as well as successful ones. Dispose of the
   isolated clone only after required evidence is secured.
   **Check:** another authorized operator can identify what committed and what
   remains closed. **Rollback:** missing evidence blocks the next migration or
   activation; keep the latest external ledger independently recoverable.

## Numbered owner launch steps

1. **Reconcile reviewed source, target and custody.** Confirm merged, reviewed
   source and green CI on its exact head, the Production serving source, the
   selected Supabase project, named primary/backup operators, backup encryption
   and restore custody. Keep participant database `policy.enabled=false` and
   `PARTICIPANT_ACCOUNTS_ENABLED` absent/false. Keep unrelated workflows closed.
   **Check:** current evidence agrees with the planned target and both gates.
   **Rollback:** stop before hosted changes if ownership, state or CI is unclear.

2. **Apply the age/retention migration through the hosted change routine.**
   Apply only `20261008160137_participant_age_retention.sql`, first. Use the probe
   below immediately before the transaction. Its copy-and-rename must match both
   exact function-header tokens and each edition label exactly once. The new
   `retention_policy.enabled` must remain false. Compare age capability fields,
   immutable subject/proof anchors, native deletion/audit guards and revoked
   client privileges. Expect approximately six additional INFO 0008 findings for
   its six private forced-RLS tables; capture the actual advisor output.
   **Check:** ten hosted versions, new cleanup gate false, all routine checks and
   existing staff password/authenticator smoke tests pass.
   **Rollback:** use the routine; do not replay the nine previous versions.

3. **Apply the scheduler migration through the same routine.** Apply only
   `20261013205046_participant_cleanup_scheduler.sql`, second, against the exact
   preceding ten-version ledger. The age pre-apply probe is deliberately no
   longer applicable: retention_policy now exists. Verify pg_cron, the existing
   Contact job and the three new jobs below; verify private settings/ledger tables,
   their forced RLS and operator-only functions. The participant cleanup gate
   remains false, so its scheduled run cannot delete accounts. Staff/history
   purges can run after this separately authorized migration application.
   **Check:** eleven hosted versions, no changed Contact job, all jobs owned by
   postgres, cleanup still closed and staff smoke/advisors pass. The two new
   private tables may add two INFO 0008 findings; record the actual count.
   **Rollback:** close retention first and pause the three jobs through the
   reviewed owner procedure if needed; preserve settings and ledger/history.

4. **Approve the retention and provider exception map.** The owner must record
   the actual **named privacy approver** and both approvals. CFG-09 is unassigned
   in the current register; this runbook invents no approver. Review holds for
   authority/staff/security history, native identities, Storage ownership,
   explicit legal/operational/support holds and unknown foreign keys/audit
   histories. Approve exception purpose, access, duration, review/removal owner,
   provider/exported-log handling and restoration behavior. Map Supabase native
   logs/backups, Resend email/logs, receiving inboxes and controlled exports to
   the approved policy; database cleanup does not erase those systems. Confirm
   every future schema's erasure/hold relationship before applying it.
   **Check:** signed exception map and actual data-flow/provider-retention review;
   unresolved cases stay held. **Rollback:** keep retention and accounts closed
   until both named approvals exist; never bypass a hold to meet a count.

5. **Approve settings and establish the external ledger export.** The values
   below are engineering defaults **awaiting owner approval**, not established
   production capacity. Confirm daily deletion capacity and backlog handling
   against the 30-day rule; a 100-subject run is a maximum batch, not an account
   capacity. Daily runs can leave eligible accounts until the next run, and a
   backlog can take longer. The owner/privacy approver must accept the operating
   window or approve a suitable cadence/batch before activation.

   | Job | Default for owner approval | Action |
   | --- | --- | --- |
   | `msrc-participant-unverified-cleanup` | `0 0 * * *`; daily 00:00 UTC / 03:00 Riyadh; batch 100 | `msrc_participant.run_cleanup_job()` calls `cleanup_unverified(batch,false)` |
   | `msrc-staff-abuse-purge` | `15 * * * *`; hourly at minute 15 | Delete staff limit events/login attempts strictly older than 24 hours |
   | `msrc-cron-history-purge` | `30 0 * * *`; daily 00:30 UTC / 03:30 Riyadh; retain 7 days | Delete terminal cron run history older than the setting; keep running/recent rows |

   Approve the encrypted external location, restricted primary/backup custodians,
   independent credentials/keys, backup/versioning and restore procedure. Export
   a full ledger immediately, and **after each cleanup**, including a manual run.
   Export ever-verification receipts between cleanups as part of that approved
   operating procedure, and capture a current full export before each backup or
   restore. Monitor export failure independently of the database. This PR adds
   only the database export function; it installs no external uploader, exporter
   scheduler, encryption service or notification integration. The owner must
   establish and prove that outside-the-database operation before opening.
   **Check:** decrypt/hash/schema/deduplication and isolated restore replay pass;
   an export failure is noticed and acted on by a named operator.
   **Rollback:** keep retention/accounts closed until export custody works. If
   export fails after cleanup, close further cleanup, recover a full export and
   preserve already committed receipts; never restore deleted accounts.

6. **Dry-run cleanup, then enable its independent switch.** Run the counts-only
   SQL below while accounts are closed. The dry-run transaction temporarily
   exercises retention enabled but always rolls back; it sends no email and
   erases nothing. Review eligible/held/failure totals privately against the
   approved exception map. Enable `retention_policy.enabled` only after the
   preceding scheduler/export/restore gates pass, then observe a bounded cleanup
   and its successful encrypted ledger export.
   **Check:** dry run changes no rows, returns counts only, verified/staff/held
   actors stay intact and `scheduler_health()` shows the expected job outcomes.
   **Rollback:** set retention false and verify the gate; pause the cleanup job
   if necessary. A completed erasure is irreversible; keep/replay its ledger.

7. **Upgrade Resend and agree shared daily caps.** The owner authorizes and
   performs the paid upgrade; this PR provisions nothing. Verify the actual
   team plan, monthly quota, remaining usage, overage/spending controls and rate
   limit before recording caps. Contact's existing hard cap remains **60/day**.
   Approve a staff cap `S`, participant cap `P`, other usage/inbound reserve `O`
   and headroom `H`: `60 + S + P + O + H` must fit any provider daily quota, and
   the monthly/peak forecast must fit the selected plan and budget. On Free,
   100/day leaves at most 40 for staff, participants and other usage combined.
   Paid transactional plans have no provider daily quota, but still have monthly
   quotas and a shared team request limit. API keys do not create separate pools.
   Upgrade does not raise the standard 10 requests/second limit; SMTP shares it.
   These are provider facts checked 13 October, not confirmed account settings.
   [Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
   [Resend pricing](https://resend.com/pricing),
   [SMTP limits](https://resend.com/docs/send-with-smtp).
   Raise `STAFF_AUTH_EMAIL_DAILY_LIMIT` in Vercel Production and
   `msrc_staff.policy.email_daily_limit` to the **same owner-approved S**, in one
   planned maintenance window, then redeploy and smoke-test staff. Budget mismatch
   closes staff readiness until configuration/deployment agree; plan continuity
   and rollback before changing either side.
   **Check:** approved cap arithmetic, provider readback and staff ready on the
   exact redeployed source. **Rollback:** restore both prior matching staff values
   and redeploy; preserve participant closure and avoid disrupting Contact.

8. **Set participant notice/budget while its database gate remains false.**
   Configure the singleton `msrc_participant.policy` with
   `privacy_version='v1.0'`, `email_daily_limit=P` and `enabled=false`. P must match
   the later `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` exactly, within the technical
   database range 1..100000. That bound is not approved volume. Confirm deployed
   EN/AR notice v1.0, links, age self-declaration and support/privacy custody.
   **Check:** notice and budget match, database participant enablement remains
   false and the anonymous API remains closed.
   **Rollback:** keep enabled false and restore reviewed notice/cap configuration;
   never change an immutable consent receipt to force a version match.

   ENG-060 correction (22 October 2026): the literal includes `v`, matching
   `currentPolicyVersion` and the participant handler's exact comparison.
   The earlier `1.0` instruction was stale. Use the current
   [activation package](../runbooks/ACTIVATION.md) for the owner-reported
   25-version hosted baseline and the single new readiness migration; the
   historical migration-application sequences above are not a replay plan.

9. **Configure Supabase Auth in this exact order.** Do not stage SMTP first.

   1. Confirm the Send Email hook targets
      `msrc_participant.suppress_native_email(jsonb)`, with the reviewed
      supabase_auth_admin execution grant. Test generic native recovery/OTP
      suppression and native endpoint guards with authorized owned test inboxes.
      Capture no token/hook payload; demonstrate no native email delivery or
      usable bypass credential. Keep public native signup disabled, email/password
      enabled, confirmation required, and phone/social/anonymous entry disabled.
   2. Only after suppression passes, stage Resend custom SMTP with the hook kept
      enabled: sender `MSRC 2027 <no-reply@msrc2027.com>`, host `smtp.resend.com`,
      port **465 with implicit TLS**, username `resend`, and private verified-domain
      Sending-only key. An enabled Send Email hook replaces SMTP; current app
      verification/reset codes continue through the Resend API. Do not remove
      suppression to test SMTP or switch delivery paths in this launch.
      [Hook behavior](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook#email-sending-behavior),
      [Resend SMTP](https://resend.com/docs/send-with-smtp).
   3. Set native minimum password length **10** (ORG-041), preserve the app's ten
      Unicode-codepoint creation/reset rule and 72-byte maximum, and test Arabic,
      boundary-length and existing shorter-password sign-in compatibility.
   4. Set owner-approved Auth limits using the server-IP sizing section below;
      test the measured shared-traffic scenario and 429 handling.
   5. Upgrade Supabase to Pro or above through the owner's approved budget path,
      then enable leaked-password protection and verify its behavior/advisor
      result. Until that happens, record the leaked-password WARN as unresolved;
      do not claim it is cleared by SMTP or a Resend upgrade.
      [Password security](https://supabase.com/docs/guides/auth/password-security).

   **Check:** settings/readbacks and direct-native bypass tests pass in order;
   hook remains enabled after SMTP configuration. **Rollback:** preserve the
   suppression hook and close participant gates. Restore reviewed SMTP/rate
   settings if required; never re-enable native delivery as a fallback.

10. **Prove inbox delivery and stage the seven Production config values.**
    Complete authorized delivery checks at Gmail, Outlook and a KAU mailbox:
    verify inbox receipt, From/Reply-To as applicable, DKIM/SPF/DMARC results,
    English transactional content and Arabic names/UI rendering. Provider
    acceptance is not inbox delivery. Resend retains email content/metadata,
    delivery events and logs for 30 days on Free/Pro/Scale; assess receiving inbox
    and provider handling separately against Policy v1.0.
    [Resend retention](https://resend.com/docs/knowledge-base/account-quotas-and-limits#data-retention).
    Stage the exact seven config values below in **Production only**, never
    Preview or Development. Keep the enablement flag absent/false. Existing
    `RESEND_API_KEY` is shared with other reviewed senders; coordinate custody.
    Store secrets as **Sensitive**, called **Secret** in the current Vercel UI;
    legacy Sensitive values already have that write-only behavior. Config values
    may remain readable. A `readable-secret` warning on `PARTICIPANT_EDITION_KEY`
    is a false positive: the edition identifier is public configuration, not a
    credential. Do not fabricate or rotate its value to silence that warning.
    [Vercel Secret/Sensitive types](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
    Redeploy after authorized staging and verify the serving source and closure.
    **Check:** all seven names, Production scopes and classifications match;
    inbox evidence passes without credential/token-bearing artifacts.
    **Rollback:** keep the participant flag/database gate false and redeploy a
    reviewed closed configuration; coordinate any shared key change separately.

11. **Run separately authorized human UAT in EN and AR.** Prepare the script
    while closed: age declaration/notice, sign-up, generic duplicate response,
    newest-only verification and resend/failure limits, sign-in/out, recovery,
    second-device password reset and verification that reset revokes other
    existing sessions, mobile, keyboard/screen-reader and RTL. The current UI
    offers local sign-out, not a separate self-service "revoke other sessions"
    action. If an independent action is required, that UAT case is BLOCKED on
    separately reviewed implementation; do not claim it already exists.
    Confirm registration and
    other operational routes remain closed. Real delivery uses only explicitly
    authorized owned inboxes; CI continues to use synthetic identities.
    The present application cannot perform account UAT with both participant
    gates false and has no UAT allowlist. The owner must approve a controlled
    Production UAT enablement window, including that exposure, or commission a
    separately reviewed equivalent isolated Production test arrangement. Do not
    claim closed-screen/synthetic CI checks substitute for human account UAT.
    If using the approved window, enable the exact matching database/server gates
    and redeploy solely for UAT, then close the database gate first, set the flag
    false and redeploy before final public-launch approval.
    **Check:** named human receipts cover both languages, second-device reset,
    revoked sessions and inboxes, followed by proven closed gates.
    **Rollback:** close/read back database enablement first, then the server flag
    and redeploy; preserve consent/audit/ledger evidence and investigate failures.

12. **Approve public activation, enable, and verify ready.** The owner confirms
    preceding approvals/UAT and current backups, ledger exports, scheduler health,
    exact serving source, caps, hook/provider settings and current advisor review.
    Set `msrc_participant.policy.enabled=true` through the owner procedure, then
    `PARTICIPANT_ACCOUNTS_ENABLED=true` in Vercel Production and redeploy. Verify
    anonymous same-origin `GET /api/participant-accounts?locale=en` and `?locale=ar`
    return HTTP 200, `state='ready'`, notice v1.0 and no private profile. Do not
    log the returned form token. Check a current authenticated profile separately,
    staff continuity, scheduler monitoring and subsequent encrypted ledger exports.
    Account launch does not open registration, abstracts, payments or other gates.
    **Check:** exact READY/current Production deployment, actual anonymous API
    ready and reviewed human flow with no unexplained failures.
    **Rollback:** close database participant enablement first, then server flag,
    redeploy and verify anonymous API HTTP 503 closed. Keep necessary retention
    obligations running unless their own failure requires closing cleanup.

## Operator SQL and expected results

These snippets are for the later authorized native postgres operator. They are
not instructions to run hosted SQL during this PR. Use the existing protected
connection mechanism; never paste its password/URL into the command or evidence.

### Age migration read-only pre-apply probe

The operator entry file is
[`scripts/sql/participant-age-retention-pre-apply.sql`](../../scripts/sql/participant-age-retention-pre-apply.sql).
It includes the single [canonical read-only SQL](../../supabase/tests/support/participant-age-retention-pre-apply.psql),
which is also executed inside the CLI's mounted `supabase/tests` tree. The
`.psql` helper is not collected as a standalone pgTAP test.
In an existing protected psql session from the repository root:

```psql
\set ON_ERROR_STOP on
\i scripts/sql/participant-age-retention-pre-apply.sql
```

It starts `BEGIN READ ONLY`, performs only catalog/ledger/privilege SELECTs and
local timeout configuration, and ends `ROLLBACK`. It never calls a context or
cleanup function. The expected historical-hosted output before first apply is
**12 PASS rows**, without row payloads or function definitions:

| Check | Required expected detail |
| --- | --- |
| `read_only_transaction` | `transaction_read_only=on` |
| `native_postgres_operator` | current_user and session_user both postgres |
| `exact_nine_migration_versions` | observed_count=9; latest=20261007195540; exact sorted array below |
| `retention_policy_absent` | msrc_participant.retention_policy absent |
| `own_context_header_once` | 1 exact `FUNCTION msrc_sessions.own_context(` token |
| `own_context_edition_label_once` | 1 exact `own_context.edition_key` token |
| `observe_context_header_once` | 1 exact `FUNCTION msrc_sessions.observe_context(` token |
| `observe_context_edition_label_once` | 1 exact `observe_context.edition_key` token |
| `postgres_auth_users_trigger` | postgres TRIGGER privilege on auth.users |
| `postgres_auth_users_delete` | postgres DELETE privilege on auth.users |
| `postgres_auth_audit_trigger` | postgres TRIGGER privilege on auth.audit_log_entries |
| `postgres_auth_audit_delete` | postgres DELETE privilege on auth.audit_log_entries |

The exact nine expected versions, in original order, are
`20261002173712`, `20261002193800`, `20261002233353`, `20261003110812`,
`20261003180734`, `20261004114603`, `20261004164034`, `20261006224926`,
`20261007195540`. A different hosted ledger is a STOP for reconciliation, even
if an independent registration migration is otherwise expected. The exact-nine
probe deliberately fails after age/retention is applied; it is not a general
readiness probe. An SQL error or any FAIL is not a partial pass.

### Scheduler migration read-only pre-apply probe

Run immediately before applying `20261013205046`, after successful age migration
verification and staff smoke tests. Expect **13 PASS rows** and the exact first
nine versions plus `20261008160137`. The new tables/functions/jobs must be absent;
Contact must remain one postgres-owned job. Any SQL error or FAIL means STOP.
No cleanup or context function is invoked and no setting is changed.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
WITH checks AS (
  SELECT 1 AS ordinal, 'read_only_postgres' AS check_name,
    current_setting('transaction_read_only') = 'on'
      AND current_user = 'postgres' AND session_user = 'postgres' AS passed
  UNION ALL
  SELECT 2, 'exact_ten_versions',
    (SELECT array_agg(version::text ORDER BY version::text)
     FROM supabase_migrations.schema_migrations) = ARRAY[
       '20261002173712','20261002193800','20261002233353',
       '20261003110812','20261003180734','20261004114603',
       '20261004164034','20261006224926','20261007195540','20261008160137'
     ]::text[]
  UNION ALL
  SELECT 3, 'retention_closed',
    (SELECT count(*)=1 AND bool_and(NOT enabled)
     FROM msrc_participant.retention_policy WHERE singleton)
  UNION ALL
  SELECT 4, 'participant_closed',
    (SELECT count(*)=1 AND bool_and(NOT enabled)
     FROM msrc_participant.policy WHERE singleton)
  UNION ALL
  SELECT 5, 'settings_absent', to_regclass('msrc_participant.scheduler_settings') IS NULL
  UNION ALL
  SELECT 6, 'ledger_absent', to_regclass('msrc_participant.retention_ledger') IS NULL
  UNION ALL
  SELECT 7, 'new_functions_absent', NOT EXISTS (
    SELECT 1 FROM (VALUES
      ('msrc_participant.run_cleanup_job()'),
      ('msrc_participant.purge_staff_abuse()'),
      ('msrc_participant.purge_cron_history()'),
      ('msrc_participant.scheduler_health()'),
      ('msrc_participant.export_retention_ledger(timestamp with time zone)'),
      ('msrc_participant.sync_scheduler_settings()'),
      ('msrc_participant.guard_retention_ledger()'),
      ('msrc_participant.record_retention_ledger()')
    ) AS signatures(signature)
    WHERE to_regprocedure(signature) IS NOT NULL
  )
  UNION ALL
  SELECT 8, 'pg_cron_installed', EXISTS (
    SELECT 1 FROM pg_extension WHERE extname='pg_cron'
  )
  UNION ALL
  SELECT 9, 'one_postgres_contact_job',
    (SELECT count(*)=1 AND bool_and(username='postgres' AND database=current_database())
     FROM cron.job WHERE jobname='msrc-contact-expiry')
  UNION ALL
  SELECT 10, 'cron_operator_privileges',
    has_schema_privilege('postgres','cron','USAGE')
    AND has_table_privilege('postgres','cron.job','SELECT')
    AND has_table_privilege('postgres','cron.job_run_details','SELECT')
    AND has_table_privilege('postgres','cron.job_run_details','DELETE')
    AND has_function_privilege('postgres','cron.schedule(text,text,text)','EXECUTE')
  UNION ALL
  SELECT 11, 'staff_purge_privileges',
    has_schema_privilege('postgres','msrc_staff','USAGE')
    AND has_table_privilege('postgres','msrc_staff.limit_events','SELECT')
    AND has_table_privilege('postgres','msrc_staff.limit_events','DELETE')
    AND has_table_privilege('postgres','msrc_staff.login_attempts','SELECT')
    AND has_table_privilege('postgres','msrc_staff.login_attempts','DELETE')
  UNION ALL
  SELECT 12, 'participant_operator_privileges',
    has_schema_privilege('postgres','msrc_participant','USAGE')
    AND has_schema_privilege('postgres','msrc_participant','CREATE')
    AND has_function_privilege('postgres',
      'msrc_participant.cleanup_unverified(integer,boolean)','EXECUTE')
  UNION ALL
  SELECT 13, 'new_jobs_absent', NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname IN (
      'msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge'
    )
  )
)
SELECT check_name, CASE WHEN passed IS TRUE THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks ORDER BY ordinal;
ROLLBACK;
```

### Approved scheduler settings and private health

The following reproduces the proposed defaults only. Apply it **only after owner
approval**; choose different reviewed values if required. A settings-row update
atomically reschedules the three jobs via `sync_scheduler_settings`; do not
create duplicate jobs or edit cron commands manually.

```sql
BEGIN;
UPDATE msrc_participant.scheduler_settings
SET cleanup_schedule = '0 0 * * *', cleanup_batch_size = 100,
    staff_purge_schedule = '15 * * * *', history_purge_schedule = '30 0 * * *',
    cron_history_days = 7
WHERE singleton;
SELECT cleanup_schedule, cleanup_batch_size, staff_purge_schedule,
       history_purge_schedule, cron_history_days
FROM msrc_participant.scheduler_settings WHERE singleton;
COMMIT;

BEGIN READ ONLY;
SELECT jobname, schedule, username, active FROM cron.job
WHERE jobname LIKE 'msrc-%' ORDER BY jobname;
SELECT * FROM msrc_participant.scheduler_health();
ROLLBACK;
```

Health exposes aggregate last run, last success and failures in the last 24 hours
for every msrc job, including Contact; it exposes no commands, return messages,
UUIDs, emails or row payloads. Inspect stopped/missing/stale runs as well as
failures. A cron success is not proof of an external ledger export or inbox
delivery. The private operator functions are not executable by PUBLIC, anon,
authenticated or service_role; both native current_user/session_user must be
postgres. History purge covers terminal cron rows for all jobs, not only msrc,
using the terminal timestamp; it retains recent and running rows.

The scheduled cleanup wrapper treats any failed subject as a failed batch: it
raises a constant error, rolls back the **whole scheduled batch**, and lets cron
record failure for health/triage. The underlying older `cleanup_unverified`
function, when called directly, can instead commit successful actors and retain
audited per-actor failures. Reconcile which path ran and its committed outcome;
do not infer erasure or export receipts from a failed scheduled attempt. Normal
later cadence is not an automatic retry of an uncertain manual operation.

### Counts-only cleanup dry run

The worker refuses all work while retention is false. To see eligibility before
permanent enablement, use a single transaction that temporarily enables the
switch and **always rolls back**. It neither deletes rows nor leaves the switch
enabled. Run in the approved window with participant accounts still closed.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
UPDATE msrc_participant.retention_policy SET enabled = true WHERE singleton;
WITH preview AS (
  SELECT msrc_participant.cleanup_unverified(
    (SELECT cleanup_batch_size FROM msrc_participant.scheduler_settings WHERE singleton),
    true
  ) AS counts
)
SELECT (counts->>'scanned')::integer AS scanned,
       (counts->>'eligible')::integer AS eligible,
       (counts->>'deleted')::integer AS deleted,
       (counts->>'held')::integer AS held,
       (counts->>'failed')::integer AS failed
FROM preview;
ROLLBACK;
```

Expected: only the five count columns, deleted=0 and failed=0. Review held counts
against the approved exception map; never export candidate identities. The
temporary switch update is an explicit later owner action, not read-only; the
pre-apply probe above is independently read-only. After prerequisites pass, the
owner may commit `UPDATE msrc_participant.retention_policy SET enabled=true WHERE
singleton` and verify its readback. Closing uses the matching false update.

### Export after each cleanup to the encrypted backup location

`msrc_participant.export_retention_ledger(since timestamptz)` returns exactly
`actor_id uuid`, `event text` (`ever_verified` or `account_erased`) and
`occurred_at timestamptz`. No name, email, consent/proof ID, job ID, hash, reason,
provider payload or security secret is allowed. Receipts deduplicate by
`(actor_id,event)`; ever-verification time is the first observation, and existing
verified subjects are backfilled at migration observation time rather than given
an invented original verification timestamp. These UUIDs remain pseudonymous
personal data and require restricted handling.

Use **full snapshots (`since='-infinity'`) by default** so a late transaction
commit cannot fall behind an advanced timestamp watermark. The function uses an
inclusive lower bound. Incremental exports require a separately proved snapshot/
transaction fence and overlap/deduplication procedure; inclusive comparison alone
does not prove no receipts were missed. Export only committed cleanup receipts.

In the protected operator psql session, replace only the placeholder path with a
unique filename inside the **owner-approved encrypted backup location**, already
mounted with restricted access. `\copy` writes at the operator machine, not the
database server. Do not write a plaintext intermediate into Downloads, the repo,
the CI artifact directory or a shared unencrypted location.

```psql
\set ON_ERROR_STOP on
BEGIN READ ONLY;
\copy (SELECT actor_id,event,occurred_at FROM msrc_participant.export_retention_ledger('-infinity'::timestamptz) ORDER BY actor_id,event) TO 'OWNER_APPROVED_ENCRYPTED_LOCATION/UNIQUE_FULL_LEDGER.csv' WITH (FORMAT csv, HEADER true)
ROLLBACK;
```

After **each** cleanup, verify the write succeeded, hash the protected artifact,
decrypt/read it in the restricted restore environment, validate exactly the
three allowed columns and two event values, deduplicate by actor/event, and keep
the manifest and immutable versioned file outside the database's failure domain.
Never overwrite the only previous valid export. A database health PASS cannot
replace this check. Reconcile cleanup completion to exported receipts privately;
retain aggregate export counts and hash/time evidence without UUIDs in the PR.

## Auth rate limits for Vercel server calls

All participant sign-ins currently reach Auth from Vercel server egress IPs; the
source does **not** forward `Sb-Forwarded-For`. Native IP buckets therefore pool
users sharing that egress IP. Ordinary forwarded browser headers do not change
this. Current Supabase defaults are token requests 150/5 minutes (password and
refresh share it), signup/recovery/OTP-related requests 30/5 minutes and native
verification 30/5 minutes. IP buckets normally burst up to 30; increasing refill
rate does not remove that burst ceiling. MFA is a fixed 15/minute/IP. Supabase
email-sending limits are project-wide; they differ from app Resend API caps.
[Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits).

Measure the busiest single-egress-IP minute/5-minute password+refresh load,
direct native request load and staff overlap. Record peak, owner-approved
headroom, selected values and passing load/429 evidence. Set shared-server
limits, not a separate per-participant quota. The following are concrete starting
**test candidates awaiting owner approval**, not proven capacity:

| Auth setting | Candidate for owner approval | Units in pinned Auth 2.197.0 |
| --- | --- | --- |
| `rate_limit_token_refresh` | 300 | Requests per 5 minutes; 3600/hour equivalent |
| `rate_limit_otp` | 100 | Requests per 5 minutes; 1200/hour equivalent |
| `rate_limit_verify` | 100 | Requests per 5 minutes; 1200/hour equivalent |
| `rate_limit_email_sent` | Owner-approved native-send forecast fitting the shared provider budget | Emails per hour; separate from app S/P caps |

The pinned source divides the first three settings by 300 seconds, while its
default email interval is one hour. Confirm the actual deployed Auth version,
current dashboard/API units and available controls before saving; do not enter
an hourly equivalent into a per-5-minute field. Keep native per-user resend at
60 seconds. [Pinned Auth limiter](https://github.com/supabase/auth/blob/v2.197.0/internal/api/apilimiter/apilimiter.go),
[email interval units](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/rate.go).

Test bursts as well as sustained load from the server path, including staff
authenticator requests; the fixed MFA cap requires handling rather than a claimed
setting increase. If the approved load cannot fit the shared-IP burst limits,
stop launch and review a trusted forwarding implementation separately. Supabase
supports explicitly enabled IP forwarding with a modern secret key and the
`Sb-Forwarded-For` header; this PR adds no such implementation or setting.
The application/database per-account/IP controls remain mandatory and independent.

## The seven Production configuration values

These are the exact seven configuration values read by
`src/features/participant-accounts/config.server.ts`, excluding the independent
enablement flag. No Preview/Development real credentials or test mode.

| Name | Value/classification |
| --- | --- |
| `PARTICIPANT_AUTH_SECURITY_SECRET` | Custodied stable 64-hex secret; Sensitive/Secret |
| `PARTICIPANT_SUPABASE_URL` | `https://ecemjggwlzqpjcwmchrl.supabase.co`; Config |
| `PARTICIPANT_SUPABASE_PUBLISHABLE_KEY` | Selected project's `sb_publishable_...`; Config |
| `PARTICIPANT_SUPABASE_SECRET_KEY` | Selected project's private `sb_secret_...`; Sensitive/Secret |
| `RESEND_API_KEY` | Verified-domain Sending-only `re_...`; Sensitive/Secret; shared sending quota |
| `PARTICIPANT_EDITION_KEY` | Existing approved edition identifier; Config; readable-secret warning is a false positive |
| `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` | Owner-approved P matching database exactly; Config |

`PARTICIPANT_ACCOUNTS_ENABLED` remains absent/false until the authorized UAT or
launch window, then must be exactly `true`. `PARTICIPANT_ACCOUNTS_TEST_MODE`
must never be set on Vercel. Keep all secret keys server-only and out of
`NEXT_PUBLIC_*`, documents, source control, logs and client bundles. Do not
disable current config validation to stage a different target or preview.

## After any restore: replay the independent ledger before access

Keep the restored database isolated, cron execution off and participant gates
closed. Obtain the **latest external ledger independently of the backup**;
verify decryption, immutable file hashes, event schema and deduplication. Import
receipts only into a restricted restore workspace, not public tables/logs.
Reconcile `ever_verified` receipts first so a restored earlier unconfirmed state
cannot make a previously verified actor eligible for cleanup. Re-apply every
`account_erased` receipt for actors deleted after the backup, including native
personal account/credential/session rows and application personal rows covered
by the reviewed age/retention procedure; preserve minimal immutable receipts.

This PR supplies export receipts, **not a restore replay tool**. Rehearse and
approve the exact replay procedure on the isolated clone before the retention
switch is enabled. Use the guarded cleanup worker only where restored eligibility
still passes; never disable immutable/native guards or force a direct delete to
work around a refusal. The existing monotone verification guard may reject a
backfilled verification fact when an older backup lacks current native evidence;
that requires a separately reviewed restoration procedure, not fabricated
verification. A conflicting retention fact, missing external export or failed
replay is a STOP requiring owner/privacy reconciliation.

Check all externally erased UUIDs are absent from restored personal/native rows,
the verification protection/receipt set is preserved, sessions cannot resurrect,
staff auth still works and a dry run cannot erase previously verified subjects.
Record counts/hashes privately, export the reconciled ledger again and only then
consider authorized service reopening. **Never reopen a backup by relying solely
on its own older tombstones; never use restoring deleted accounts as rollback.**

## Advisor baseline and evidence status

The task's documented pre-age-migration baseline is **33 INFO 0008**, **16 WARN
0029**, and **1 WARN for leaked-password protection** until the Supabase Pro
upgrade. INFO 0008 reflects private forced-RLS tables with deliberately no client
policies. The six age tables and two scheduler tables may add six and two INFO
findings respectively; these are expectations, not observed hosted results.
WARN 0029 for `msrc_staff_password_change_begin` is expected because authenticated
owners invoke a guarded SECURITY DEFINER entry point requiring current native
session, owner/role checks and fresh password/authenticator evidence.
Do not relax grants/RLS or remove checks to silence these expected findings.

The staff-hardening review on 16 October records these known baseline exceptions
explicitly. Counts above remain historical; this task has made no hosted advisor
query or configuration change. Recheck each actual object, owner, definition and
ACL on the reviewed migration chain before inviting staff. A new finding or an
unexpected grant is not covered merely because its lint code appears below.

| Finding | Treatment and one-line reason |
| --- | --- |
| INFO `0008` — RLS enabled, no policy | Intentional for private forced-RLS tables: clients have no table grants and direct API access must deny; guarded functions mediate necessary access. |
| WARN `0029` — authenticated SECURITY DEFINER execution | Intentional only for individually reviewed RPCs: an empty search path, explicit execute grants, current native session/assurance, role/ownership checks and bounded projections permit access without opening private tables. |
| WARN — leaked-password protection disabled | Known temporary release gap pending the separately authorized provider upgrade/configuration; no setting is changed here and activation must satisfy the existing password-protection gate. |

In particular, `msrc_staff_password_change_begin` retains its current owner,
fresh-password/TOTP and exact-session requirements. The exception never covers
anonymous SECURITY DEFINER execution, mutable search paths, user-metadata
authorization, a new client grant or a missing server/database permission check.
Do not suppress warnings globally. Preserve the object-specific advisor receipt
and review rationale with each hosted change. Official checks:
[0008](https://github.com/supabase/splinter/blob/main/docs/0008_rls_enabled_no_policy.md)
and [0029](https://github.com/supabase/splinter/blob/main/docs/0029_authenticated_security_definer_function_executable.md).

Hosted probes, either hosted migration application, external export/encryption,
restore replay, provider upgrades/settings, real inbox delivery, Production env
changes, human UAT and public activation are **NOT TESTED/NOT PERFORMED by this
PR**. Disposable SQL/Auth tests and exact-head CI are separate implementation
evidence, recorded in the progress note and PR body. Preserve actual new advisor
counts there; historical advisor totals do not prove current hosted posture.
