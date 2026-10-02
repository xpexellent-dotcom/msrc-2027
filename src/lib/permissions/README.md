# Permission library boundary

BL-SEC-01 supplies a typed purpose/role contract, server-only current-authority evaluator
and bilingual error copy. See [the feature contract](../../../docs/features/authorization-contract.md)
for source IDs, projections, allowed/denied evidence and limits.

No production AuthorityReader, identity/grant tables, enabled endpoint or audit writer exists
yet. Inject current trusted synthetic state in tests; M4 must implement managed verification
and authoritative server/database/storage checks. Never pass client resource facts or JWT
role names as authority. Folder names and hidden controls grant nothing.

All operational workflows remain hard closed. A low-level permission result is not workflow
release, field/state validation, data serialization, audit persistence or file access.
