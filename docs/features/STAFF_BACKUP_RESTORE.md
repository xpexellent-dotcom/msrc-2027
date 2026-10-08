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
