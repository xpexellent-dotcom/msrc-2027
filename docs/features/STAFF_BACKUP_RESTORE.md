# Staff database backup and restore receipt

BL-AUTH-01/05/06, BL-RPT-01/03; ORG-046. This records actual private pre-migration
backup/restoration on 7 October 2026. It is separate from the synthetic migration-1
CI rehearsal and from Production activation. Names remain in DECISIONS only.

## Observed result

PASS at 16:49:39 UTC. Production was read only: two existing migration versions,
zero native Auth users/sessions/factors, authority accounts/grants, storage objects
and Vault secrets. The Contact cleanup job remained active every five minutes.
No application account, email, hosted migration or settings change occurred.

Portable official PostgreSQL clients are 17.11; the source and offline restore
server are Supabase PostgreSQL 17.6.1.171. The operator connected through the
project-verified session pooler on 5432 as native postgres. Frontend certificate
and hostname verification passed. The observed backend pooler hop does not use
TLS; no direct/end-to-end encryption claim is made.

The outside-repository, current-Windows-account-only archive is a custom-format
full database logical dump with ownership/ACLs retained and subscriptions omitted
(source subscription count is zero). Password-free roles are retained separately.
Private native credentials, Auth/Vercel settings, provider keys and encryption
roots remain separate recovery inputs; this is not PITR or an off-machine backup.

| Immutable archive | Bytes | SHA-256 |
| --- | ---: | --- |
| Database custom archive | 430874 | `1f1ba5c8aae8203eee935763a7706f1042ef6987f0e498824f91ef929eb99263` |
| Password-free roles | 6051 | `fa6a204240ed684f5ac21fbf8be505be9dcc21c7cef3401216489a00aeb9fdcc` |

Private paths, input values, user rows and raw diagnostics are not repository
artifacts. Private receipts hold the actual archive/manifest and dated safe
comparisons. Preserve originals and verify hashes before any future restoration.

## Reproduced restore

1. Use a separately verified disposable target matching the source server and
   extension versions. This execution used the official image digest
   `sha256:658d1c9b09ae4f61b8e95087b6859181b4b7d6940d769cf7b605609c8aad43e9`,
   network `none`, no ports, no Auth service and a native Unix socket. Check target
   isolation before any destructive local reset. Never substitute the hosted URL.
2. Initialize with native bootstrap role `supabase_admin` at OID 10. PostgreSQL 17
   preserves role-membership grantors; an unrelated bootstrap superuser did not
   satisfy those grantor checks and its attempted role transaction rolled back.
   The derivative roles input omits only creation of the already initialized
   bootstrap role, retaining its ALTER ROLE and all 21 membership records/options.
   No passwords are restored or account credentials changed.
3. Create the empty database with source owner postgres, UTF8, ICU locale en-US
   and `en_US.UTF-8` collation/ctype. Restore exact source extension versions and
   creation owners. For this source, pg_stat_statements 1.11, pgcrypto 1.3 and
   uuid-ossp 1.1 plus their 49 function members belong to postgres. They were
   precreated under that role; temporary offline role elevation was transactional
   and reverted before restoring the archive. Other extension owners remain as
   captured. Do not copy this elevation into a hosted operator plan.
4. Restore the unchanged custom archive with `--exit-on-error --single-transaction`
   using its supplemental TOC manifest. Only the already precreated extensions
   schema CREATE entry is omitted; owners, ACLs and data stay included. Replay
   observed GraphQL schema and affected extension member ACLs, including original
   grantors and grant options, from the captured source metadata. PostgreSQL dumps
   do not by themselves preserve extension installation owners/initial ACLs;
   precreation and exact supplemental grants address that limitation without
   editing catalogs or broadening Production privileges. See the official
   [extension behavior](https://www.postgresql.org/docs/17/extend-extensions.html).
5. Run identical SELECT-only comparisons as native postgres, with consistent
   search path, UTC, DateStyle, bytea output and numeric formatting. Compare
   schema/relation/function owners and effective API grants, forced RLS, column
   defaults, constraints, indexes, policies, native/application triggers, default
   ACLs, role flags/memberships, extension versions, app policies, Contact job and
   exact migration rows. All 17 metadata sections and all 49 extension functions
   match. Database owner/encoding/locale match independently.
6. Compare all 47 dumped tables by row count and multiplicity-preserving sorted
   row hashes without displaying rows; compare four sequences. Every application
   and native application-data result matches. Live cron history advanced after
   the dump. The restored 881 cron rows exactly match the source prefix through
   archived run ID 881; later history and runtime sequence advancement are recorded
   as snapshot-time differences, not repaired or hidden. Job configuration,
   job-ID sequence and other sequence definitions/ownership/values match. Hashes
   are comparison evidence, not anonymized exports or cryptographic backups.

## Failure and rollback

For preflight/restore/comparison failure, keep staff flags off and execute no
hosted migration. Preserve originals and sanitized SQLSTATE-only diagnostics;
correct only the isolated restore plan, rerun the affected checks, and require
complete application/native metadata and data agreement. Do not pause Contact,
rewrite cron history or grant live API access to make a comparison pass.

Before migration execution, refresh the source ledger, native identity and
closure probes; abort on drift. After a committed migration, a new ROLLBACK does
not undo DDL. Disable the staff database policy and application flag/redeploy when
applicable, preserve immutable audit/authority/revocation/migration history, and
stop subsequent stages. Reconcile unknown transaction outcomes before any retry.
Use reviewed forward correction or a separately reviewed provider-compatible
restore/reconciliation plan. A full logical restore must not run blindly into
existing managed system roles/Auth schemas. Verify provider settings and private
credentials separately, keep delivery off, reconcile data written after backup,
and recheck all guards, grants, original history and Contact behavior before use.
The archived pre-migration database contains no staff identity and cannot restore
accounts created later without that reconciliation.

The disposable clone remains only for the pending six-stage compatibility
rehearsal. After evidence is retained, remove only its verified task-owned
container; retain private original archives, supplemental manifests and receipts.

## Staff audit deletion by 28 January 2028 — owner procedure, not executed

The 16 October hardening task requires staff audit deletion to be completed by
**28 January 2028**. Append-only controls protect operational history while it is
retained; they do not approve indefinite retention or an audit exception to the
published policy. This is an execution procedure for the owner to review and
authorize separately. It adds no deletion endpoint, job, migration, API grant or
live change. Database rehearsal and deletion are **NOT TESTED / NOT PERFORMED**
locally because Docker/Supabase is unavailable.

The staff audit screen combines the following sources. Purging only the first
table would leave staff evidence visible through the other three. Verify the
current schema and every additional source before preparing the actual SQL.

| Private table | Row guard to disable only during the reviewed transaction | Truncate guard to leave enabled |
| --- | --- | --- |
| `msrc_staff.audit` | `staff_audit_immutable` | `staff_audit_no_truncate` |
| `msrc_authorization.grant_audit` | `grant_audit_append_only` | `grant_audit_no_truncate` |
| `msrc_sessions.security_audit` | `security_audit_append_only` | `security_audit_no_truncate` |
| `msrc_staff_email.audit` | `staff_email_audit_append_only` | `staff_email_audit_no_truncate` |

1. Assign a named owner/operator and independent reviewer, and schedule completion
   before the deadline. Review the approved scope, exact target/revision and any
   separately approved retention exception. Inventory table ownership, all audit
   triggers, ACLs, forced RLS, foreign keys, exports and backup copies. Staff
   identities may span editions; edition-null sign-in/TOTP records and the
   session/email sources need explicit inclusion. Do not infer eligibility solely
   from today's role grants or from a later-deleted staff profile. Resolve shared
   edition records with the owner before the deadline; this procedure creates no
   new retention exception.
2. Take a fresh encrypted private backup **before deletion**, verify its hashes,
   and restore/reconcile it in an isolated disposable target using this document's
   backup/restore checks. Record safe counts and metadata only. Agree the backup's
   destruction/overwrite handling and restore-suppression expiry with the privacy
   owner; a pre-delete archive must not become an indefinite replacement audit.
3. Prepare a protected, reviewed manifest containing only source-table names and
   exact eligible row UUIDs, plus the approved timestamp boundary and per-table
   expected counts. Include all relevant edition-null records. Keep names,
   addresses, tokens, passwords, codes, raw IPs and audit contents out of the
   manifest and public receipts. Keep a separate minimal deletion/restore receipt
   outside the database backup so restoring an older database cannot silently
   resurrect deleted audit records.
4. Rehearse the exact reviewed SQL against the isolated restore first, then run it
   only through the separately authorized hosted-change routine as native
   `postgres` with verified table ownership. Use a single explicit transaction,
   `SET LOCAL search_path = ''`, bounded lock/statement timeouts, and explicit
   table locks in the table order above. Load the reviewed manifest into a
   transaction-local temporary table; assert its nonzero total, exact per-table
   counts, timestamp eligibility and that every UUID resolves to its named source.
   Missing/unexpected rows, schema drift or an unknown prior transaction outcome
   are STOP conditions. Keep staff gates closed for the maintenance window under
   the approved change plan; do not modify live settings in this implementation.
5. For each approved source use only its named row-guard operation, for example
   `ALTER TABLE msrc_staff.audit DISABLE TRIGGER staff_audit_immutable`, followed
   by `DELETE ... USING pg_temp.staff_audit_delete_manifest` matching both source
   and UUID and the approved timestamp bound. Compare each affected-row count to
   its manifest count. Immediately restore that same named trigger with
   `ALTER TABLE msrc_staff.audit ENABLE TRIGGER staff_audit_immutable`. Repeat
   with the exact row-guard names above, then assert all guards are enabled,
   every manifested row is absent, unrelated rows are unchanged, and ownership,
   forced RLS and ACLs match preflight **before COMMIT**. Never use `DISABLE
   TRIGGER ALL`, `session_replication_role`, `TRUNCATE`, a changed trigger body,
   disabled RLS or a permanent client/service-role `DELETE` grant. An assertion or
   query failure must roll back the whole transaction, including trigger changes.
6. Independently verify committed counts, enabled append-only/truncate guards,
   API denial and Super-Admin-only audit access. In the isolated rehearsal prove
   ordinary UPDATE/DELETE/TRUNCATE still fail and inject a deletion failure to
   prove row data and trigger state roll back together. Retain the reviewed SQL
   hash, target, operator/reviewer, timestamp, counts and outcome privately; no
   audit contents belong in repository receipts. A retained in-database purge
   audit must not recreate personal references just erased.
7. Remove matching controlled exports and expire the pre-delete archive according
   to the agreed backup handling; provider backups follow their verified routine
   overwrite cycle. Before any older backup is reopened, close staff gates,
   replay the external deletion manifest through the same reviewed procedure,
   verify absence and guards, then reconcile newer writes and service readiness.
   Do not restore deleted audit rows as rollback. A backup/manifest/replay failure
   keeps the restored service closed until the owner reconciles it.

PostgreSQL documents named trigger changes and their locks in
[`ALTER TABLE`](https://www.postgresql.org/docs/17/sql-altertable.html#SQL-ALTERTABLE-DESC-DISABLE-ENABLE-TRIGGER).
The exact deletion SQL, review, disposable rehearsal and hosted execution receipts
remain future owner-run work. Record completion by the deadline; this document
does not claim any audit data has been erased.
