import { describe, expect, it } from "vitest";
import { readDeadlockEdges, readDeadlockRelations } from "../integration/deadlock-diagnostics";

describe("isolated PostgreSQL deadlock diagnostics", () => {
  it("retains only lock graph identifiers from verbose errors", () => {
    const diagnostics = `ERROR: 40P01: deadlock detected
DETAIL: Process 12 waits for AccessShareLock on relation 345 of database 5; blocked by process 13.
Process 13 waits for ShareLock on transaction 678; blocked by process 12.
Process 14 waits for AccessExclusiveLock on object 0 of class 1262 of database 0; blocked by process 12.
CONTEXT: SQL statement "insert into auth.users values ('secret-password', 'person@example.invalid')"
STATEMENT: select 'secret-token';`;
    expect(readDeadlockEdges(diagnostics)).toEqual([
      { process: 12, mode: "AccessShareLock", kind: "relation", resource: 345, database: 5, blockedBy: 13 },
      { process: 13, mode: "ShareLock", kind: "transaction", resource: 678, blockedBy: 12 },
      { process: 14, mode: "AccessExclusiveLock", kind: "object", resource: 0, class: 1262, database: 0, blockedBy: 12 },
    ]);
  });

  it("rejects query fragments, unrecognized modes and appended diagnostic data", () => {
    expect(readDeadlockEdges(`STATEMENT: Process 12 waits for ShareLock on transaction 678; blocked by process 13.
Process 12 waits for SecretLock on transaction 678; blocked by process 13.
Process 12 waits for ShareLock on transaction 678; blocked by process 13. secret-token
Process password waits for ShareLock on transaction 678; blocked by process 13.
DETAIL: email@example.invalid`)).toEqual([]);
  });

  it("resolves only known application relations and PostgreSQL catalog names", () => {
    expect(readDeadlockRelations(`345|auth.users
456|pg_catalog.pg_database
789|private.person_email
012|auth.secret_password
678|auth.sessions|secret-token
999|pg_catalog.pg_class
000|person@example.invalid`)).toEqual([
      { oid: 345, relation: "auth.users" },
      { oid: 456, relation: "pg_catalog.pg_database" },
      { oid: 999, relation: "pg_catalog.pg_class" },
    ]);
  });
});
