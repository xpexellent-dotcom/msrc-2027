-- AUTH-01/08, PRV-05/08, SEC-01/06. READ-ONLY operator probe only.
-- Run immediately before the FIRST hosted application of 20261008160137.
-- A FAIL means STOP; do not adapt the expected ledger to make it pass.
-- No function invocation, DDL, DML, seed, scheduler, provider or Auth action.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';

WITH expected AS (
  SELECT ARRAY[
    '20261002173712', '20261002193800', '20261002233353',
    '20261003110812', '20261003180734', '20261004114603',
    '20261004164034', '20261006224926', '20261007195540'
  ]::text[] AS versions
), actual AS (
  SELECT coalesce(array_agg(version::text ORDER BY version::text), ARRAY[]::text[]) AS versions
  FROM supabase_migrations.schema_migrations
), definitions AS (
  SELECT name, coalesce(pg_get_functiondef(to_regprocedure(signature)), '') AS definition,
    header, edition_label
  FROM (VALUES
    ('own_context', 'msrc_sessions.own_context(text,boolean)',
      'FUNCTION msrc_sessions.own_context(', 'own_context.edition_key'),
    ('observe_context', 'msrc_sessions.observe_context(text)',
      'FUNCTION msrc_sessions.observe_context(', 'observe_context.edition_key')
  ) AS targets(name, signature, header, edition_label)
), occurrence_counts AS (
  SELECT name,
    (length(definition) - length(replace(definition, header, ''))) / length(header) AS headers,
    (length(definition) - length(replace(definition, edition_label, ''))) / length(edition_label) AS labels
  FROM definitions
), checks AS (
  SELECT 1 AS ordinal, 'read_only_transaction' AS check_name,
    current_setting('transaction_read_only') = 'on' AS passed,
    'transaction_read_only=' || current_setting('transaction_read_only') AS detail
  UNION ALL
  SELECT 2, 'native_postgres_operator', current_user = 'postgres' AND session_user = 'postgres',
    'current_user/session_user must both be postgres'
  UNION ALL
  SELECT 3, 'exact_nine_migration_versions', actual.versions = expected.versions,
    'observed_count=' || cardinality(actual.versions)::text
      || '; latest=' || coalesce(actual.versions[cardinality(actual.versions)], '<none>')
  FROM actual CROSS JOIN expected
  UNION ALL
  SELECT 4, 'retention_policy_absent', to_regclass('msrc_participant.retention_policy') IS NULL,
    'must be absent before the first age/retention apply'
  UNION ALL
  SELECT 5, 'own_context_header_once', headers = 1, 'exact header occurrences=' || headers::text
  FROM occurrence_counts WHERE name = 'own_context'
  UNION ALL
  SELECT 6, 'own_context_edition_label_once', labels = 1, 'exact edition label occurrences=' || labels::text
  FROM occurrence_counts WHERE name = 'own_context'
  UNION ALL
  SELECT 7, 'observe_context_header_once', headers = 1, 'exact header occurrences=' || headers::text
  FROM occurrence_counts WHERE name = 'observe_context'
  UNION ALL
  SELECT 8, 'observe_context_edition_label_once', labels = 1, 'exact edition label occurrences=' || labels::text
  FROM occurrence_counts WHERE name = 'observe_context'
  UNION ALL
  SELECT 9, 'postgres_auth_users_trigger', has_table_privilege('postgres', 'auth.users', 'TRIGGER'),
    'required native trigger privilege'
  UNION ALL
  SELECT 10, 'postgres_auth_users_delete', has_table_privilege('postgres', 'auth.users', 'DELETE'),
    'required native cleanup privilege'
  UNION ALL
  SELECT 11, 'postgres_auth_audit_trigger', has_table_privilege('postgres', 'auth.audit_log_entries', 'TRIGGER'),
    'required native audit trigger privilege'
  UNION ALL
  SELECT 12, 'postgres_auth_audit_delete', has_table_privilege('postgres', 'auth.audit_log_entries', 'DELETE'),
    'required native operator privilege'
)
SELECT check_name, CASE WHEN passed IS TRUE THEN 'PASS' ELSE 'FAIL' END AS result, detail
FROM checks ORDER BY ordinal;

ROLLBACK;
