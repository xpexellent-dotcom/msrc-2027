/** Disposable CI only: exact migration-1 packet rehearsal. No identities or providers. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

const container = "supabase_db_msrc2027-local";
const socket = "unix:///var/run/docker.sock";
const files = [
  { version: "20261002173712", name: "persisted_authorization", hash: "f1569bd4a58f17488094092d02bd78abcf03bf0b500576b84d5b84e0a9eb39d5" },
  { version: "20261004114603", name: "contact_abuse_counters", hash: "3070bb10290c77f799e15b9d6636ca9af6a1926372764bc50f127171f52a7473" },
  { version: "20261002193800", name: "staff_mfa_session_foundations", hash: "ca8571443fe0390f25772f3fbd6014ac17e959eb79f70c2067b143ddcabd8108" },
] as const;
type Row = Record<string, unknown>;
type Result = { code: number; stdout: string; sqlstate: string | null };
let assertions = 0;
let phase = "guard";
let packetExecutions = 0;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function requireCheck(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
  assertions++;
}
function argument(name: string): string {
  const position = process.argv.indexOf(name);
  requireCheck(position >= 2 && position + 1 < process.argv.length, "Required rehearsal argument missing.");
  const value = process.argv[position + 1];
  requireCheck(isAbsolute(value), "Rehearsal paths must be absolute.");
  return resolve(value);
}
function within(root: string, target: string): boolean {
  const value = relative(root, target);
  return Boolean(value) && !value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value);
}
function command(args: string[], input = ""): Promise<Result> {
  return new Promise((resolveResult, reject) => {
    // Fixed local Docker socket; no URL, linked target, Auth SDK or inherited provider config.
    const child = spawn("docker", ["--host", socket, ...args], {
      env: { PATH: process.env.PATH, LANG: "C.UTF-8", LC_ALL: "C.UTF-8", NODE_ENV: "test" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (value: string) => { stdout += value; });
    child.stderr.on("data", (value: string) => { stderr += value; });
    child.on("error", () => reject(new Error("Local Docker command could not start.")));
    child.stdin.on("error", () => {});
    child.on("close", (code) => resolveResult({ code: code ?? -1, stdout,
      sqlstate: /(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/.exec(stderr)?.[1] ?? null }));
    child.stdin.end(input);
  });
}
async function sql(statement: string, allowFailure = false): Promise<Result> {
  const result = await command(["exec", "-i", container, "psql", "-X", "-q", "-At",
    "--host=/var/run/postgresql", "--username=postgres", "--dbname=postgres",
    "--set=ON_ERROR_STOP=1", "--set=VERBOSITY=sqlstate"], statement);
  if (!allowFailure && result.code !== 0) throw new Error(`Local SQL failed; SQLSTATE=${result.sqlstate ?? "unavailable"}.`);
  return result;
}
async function query(statement: string): Promise<Row[]> {
  // Execute the packet SELECT unchanged as a subquery, in a read-only transaction.
  const result = await sql(`begin read only; select coalesce(jsonb_agg(to_jsonb(packet_row)),'[]'::jsonb)::text from (${statement}) packet_row; commit;`);
  const value: unknown = JSON.parse(result.stdout.trim());
  requireCheck(Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row)), "Invalid local catalog result.");
  return value as Row[];
}
function statements(block: string): string[] {
  // Packet blocks contain SELECT/WITH only; honor quoted strings when splitting.
  const output: string[] = [];
  let text = ""; let quoted = false; let comment = false;
  for (let index = 0; index < block.length; index++) {
    const character = block[index];
    if (comment) { if (character === "\n") { comment = false; text += "\n"; } continue; }
    if (!quoted && character === "-" && block[index + 1] === "-") { comment = true; index++; continue; }
    if (character === "'") {
      text += character;
      if (quoted && block[index + 1] === "'") { text += "'"; index++; continue; }
      quoted = !quoted; continue;
    }
    if (character === ";" && !quoted) { if (text.trim()) output.push(text.trim()); text = ""; } else text += character;
  }
  if (text.trim()) output.push(text.trim());
  requireCheck(!quoted && output.every((statement) => /^(select|with)\b/i.test(statement)), "Packet contains a non-catalog statement.");
  return output;
}
async function runPacket(queries: string[], evidence: string, name: string): Promise<Row[][]> {
  const output: Row[][] = [];
  for (let index = 0; index < queries.length; index++) {
    phase = `${name}:query-${index + 1}`;
    output.push(await query(queries[index])); packetExecutions++;
  }
  phase = name;
  writeFileSync(join(evidence, `${name}.json`), JSON.stringify(output, null, 2) + "\n");
  return output;
}
const authorityCounts = "select 'edition_config' as object,count(*) as rows from msrc_authorization.edition_config union all select 'account_access',count(*) from msrc_authorization.account_access union all select 'role_grants',count(*) from msrc_authorization.role_grants union all select 'grant_audit',count(*) from msrc_authorization.grant_audit";
const authCounts = "select 'users' as object,count(*) as rows from auth.users union all select 'identities',count(*) from auth.identities union all select 'sessions',count(*) from auth.sessions union all select 'mfa_factors',count(*) from auth.mfa_factors union all select 'mfa_challenges',count(*) from auth.mfa_challenges union all select 'mfa_amr_claims',count(*) from auth.mfa_amr_claims union all select 'one_time_tokens',count(*) from auth.one_time_tokens union all select 'refresh_tokens',count(*) from auth.refresh_tokens";
async function noIdentities(evidence: string, name: string): Promise<void> {
  const counts = await query(authCounts);
  requireCheck(counts.length === 8 && counts.every((row) => row.rows === 0), "Native identity/session/token rows must remain empty.");
  writeFileSync(join(evidence, `${name}-identity-counts.json`), JSON.stringify(counts, null, 2) + "\n");
}
async function ledger(): Promise<Row[]> { return query("select version,name from supabase_migrations.schema_migrations order by version"); }
function expectedLedger(includeMigration: boolean): Row[] {
  return files.filter((_, index) => includeMigration || index < 2).map(({ version, name }) => ({ version, name })).sort((a, b) => a.version.localeCompare(b.version));
}
function compare(actual: unknown, expected: unknown, label: string): void {
  requireCheck(isDeepStrictEqual(actual, expected), label);
}
const backendReceipt = "select jsonb_build_object('backendPid',pg_backend_pid(),'backendStart',backend_start,'transactionStart',xact_start,'attemptUtc',clock_timestamp())::text from pg_stat_activity where pid=pg_backend_pid();";
async function transaction(source: string, expectedState: string | null = null): Promise<Row> {
  const result = await sql(`begin; ${backendReceipt}\n${source}\ncommit;`, expectedState !== null);
  const first = result.stdout.split(/\r?\n/).find((line) => line.startsWith("{"));
  requireCheck(first, "Actual DDL backend receipt missing.");
  const receipt = JSON.parse(first) as Row;
  requireCheck(Number.isInteger(receipt.backendPid) && typeof receipt.backendStart === "string", "Actual DDL backend identity invalid.");
  if (expectedState) requireCheck(result.code !== 0 && result.sqlstate === expectedState, "Expected deterministic transaction failure was not observed.");
  else requireCheck(result.code === 0, "Local DDL did not commit.");
  // The original client has exited. Verify that exact backend ended before catalog inference.
  const ended = await query(`select count(*) as rows from pg_stat_activity where pid=${receipt.backendPid} and backend_start='${receipt.backendStart}'::timestamptz`);
  requireCheck(ended[0]?.rows === 0, "Original DDL backend has not terminated; stop reconciliation.");
  return { ...receipt, outcome: expectedState ? "rolled_back" : "committed", sqlstate: expectedState };
}
function assertPreflight(rows: Row[][]): void {
  requireCheck(rows.length === 11, "Packet preflight count changed; review extraction.");
  requireCheck(rows[0][0]?.current_user === "postgres" && rows[0][0]?.session_user === "postgres", "Native postgres identity required.");
  requireCheck(rows[1][0]?.rolsuper === true || rows[1][0]?.rolbypassrls === true, "Postgres must bypass forced RLS.");
  requireCheck(rows[2].length === 3 && rows[2].every((row) => row.may_select === true && row.may_row_lock === true) && rows[3][0]?.may_reference_users === true, "Native Auth access/reference compatibility failed.");
  compare(rows[4], expectedLedger(false), "Baseline history differs from the packet.");
  const objects = rows[5][0];
  requireCheck(objects?.prerequisite_schema && objects.prerequisite_rpc && ["candidate_schema", "later_staff_schema", "later_participant_schema", "new_context_rpc", "new_activity_rpc", "new_logout_rpc"].every((key) => objects[key] === null), "Baseline catalog must contain no pending/later schema or RPC.");
  requireCheck(rows[6].length === 4 && rows[6].every((row) => row.resolved !== null), "Native/prerequisite helper missing.");
  requireCheck(rows[7].length === 21 && rows[7].every((row) => row.data_type && row.udt_name), "Native Auth columns incompatible.");
  for (const row of rows[7]) {
    const column = String(row.column_name);
    const expectedType = ["id", "user_id", "factor_id"].includes(column) ? "uuid"
      : ["created_at", "updated_at", "deleted_at", "email_confirmed_at", "phone_confirmed_at", "banned_until", "not_after"].includes(column) ? "timestamptz"
        : column === "is_anonymous" ? "bool" : null;
    requireCheck(expectedType ? row.udt_schema === "pg_catalog" && row.udt_name === expectedType
      : ["text", "varchar"].includes(String(row.udt_name)) || (row.udt_schema === "auth" && ["aal_level", "factor_type", "factor_status"].includes(String(row.udt_name))), "Native Auth column type is not compatible with migration one.");
  }
  requireCheck(rows[8].length === 4 && rows[8].every((row) => row.owner === "postgres" && row.relrowsecurity === true && row.relforcerowsecurity === true), "Prerequisite table ownership/RLS invalid.");
  requireCheck(rows[9].length === 2 && rows[9].every((row) => row.owner === "postgres" && typeof row.definition === "string"), "Prerequisite definitions missing.");
  requireCheck(rows[10].length === 4 && rows[10].every((row) => row.rows === 0), "No authority fixtures are permitted.");
}
function assertPost(rows: Row[][]): void {
  requireCheck(rows.length === 14, "Packet postcheck count changed; review extraction.");
  compare(rows[0].map((row) => row.relname), ["actor_revocations", "policy", "security_audit", "session_state"], "Exact session table inventory differs.");
  requireCheck(rows[0].every((row) => row.owner === "postgres" && row.relrowsecurity === true && row.relforcerowsecurity === true), "Session table owners/forced RLS invalid.");
  requireCheck(rows[1][0]?.client_policies === 0, "Unexpected session client policies.");
  compare(rows[2], [{ singleton: true, participant_absolute_seconds: 259200, privileged_idle_seconds: 1800, privileged_absolute_seconds: 28800, recent_auth_max_age_seconds: null, warning_lead_seconds: null, operational_access_ready: false, privileged_access_ready: false }], "Closed session policy differs.");
  requireCheck(rows[3].length === 3 && rows[3].every((row) => row.rows === 0), "Session/revocation/audit rows must remain empty.");
  requireCheck(rows[4].length === 20 && rows[4].filter((row) => String(row.definition).includes("ON DELETE RESTRICT")).length === 2 && rows[4].filter((row) => /CHECK \(\(NOT (operational_access_ready|privileged_access_ready)\)\)/.test(String(row.definition))).length === 2, "Session constraints/FKs/false-only readiness differ.");
  compare(rows[5].map((row) => row.indexname).sort(), ["actor_revocations_pkey", "policy_pkey", "security_audit_actor", "security_audit_pkey", "session_state_actor", "session_state_pkey"].sort(), "Exact index inventory differs.");
  compare(rows[6].map((row) => row.tgname).sort(), ["session_state_guard", "session_state_audit", "actor_revocation_guard", "actor_revocation_audit", "security_audit_append_only", "security_audit_no_truncate", "session_state_no_truncate", "actor_revocations_no_truncate", "account_access_suspend_sessions"].sort(), "Exact trigger inventory differs.");
  requireCheck(rows[6].every((row) => row.tgenabled === "O"), "A required trigger is disabled.");
  const expected = ["msrc_sessions.guard_session_state()", "msrc_sessions.audit_session_state()", "msrc_sessions.guard_actor_revocation()", "msrc_sessions.audit_actor_revocation()", "msrc_sessions.guard_audit()", "msrc_sessions.account_suspension()", "msrc_sessions.revoke_actor_sessions(uuid,uuid,uuid,text)", "msrc_sessions.own_context(text,boolean)", "msrc_session_context(text)", "msrc_session_activity(text)", "msrc_session_logout(text)", "msrc_access_context(text)"];
  compare(rows[7].map((row) => String(row.signature).replace(/^public\./, "")).sort(), expected.sort(), "Exact function signatures differ.");
  requireCheck(rows[7].every((row) => row.owner === "postgres" && row.provolatile === "v" && Array.isArray(row.proconfig) && row.proconfig.length === 1 && /^search_path=(?:""|)$/.test(String(row.proconfig[0])) && row.prosecdef === (!String(row.signature).startsWith("msrc_sessions.") || String(row.signature).startsWith("msrc_sessions.own_context("))), "Function owner/search-path/volatility/definer contract differs.");
  requireCheck(rows[8].length === 12 && rows[8].every((row) => row.schema_usage === false && row.any_table_right === false), "API private table/schema rights leaked.");
  requireCheck(rows[9].length === 36 && rows[9].every((row) => row.may_execute === (row.api_role === "authenticated" && !String(row.signature).startsWith("msrc_sessions."))), "API function execution matrix differs.");
  requireCheck(rows[10].length === 1 && rows[11].length === 10 && rows[12].length === 12, "Complete schema/relation/function ACL catalog differs.");
  // Default ACLs vary with the native platform: retain global+local evidence without
  // mistaking absent local defaults for removal of implicit PUBLIC EXECUTE.
  requireCheck(rows[13].every((row) => row.owner === "postgres" && typeof row.default_scope === "string"), "Default-ACL evidence is malformed.");
}
async function inspect(name: string): Promise<Row> {
  const result = await command(["inspect", "--format", '{"name":{{json .Name}},"image":{{json .Config.Image}},"running":{{json .State.Running}}}', name]);
  requireCheck(result.code === 0, "Disposable container inspection failed.");
  const value = JSON.parse(result.stdout) as { name?: string; image?: string; running?: boolean };
  requireCheck(value.name === `/${name}` && value.running === true && typeof value.image === "string", "Unexpected disposable container.");
  return { container: name, image: value.image };
}
const contactCatalog = "select jsonb_build_object('rows',(select count(*) from msrc_contact.attempt_buckets),'schemaAcl',(select nspacl::text from pg_namespace where nspname='msrc_contact'),'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='msrc_contact' or (n.nspname='public' and p.proname='msrc_contact_reserve_attempt')),'job',(select jsonb_agg(jsonb_build_object('jobname',jobname,'schedule',schedule,'active',active,'username',username,'command',command) order by jobid) from cron.job where jobname='msrc-contact-expiry')) as metadata";

async function main(): Promise<void> {
  requireCheck(process.platform === "linux" && process.env.CI === "true" && process.env.GITHUB_ACTIONS === "true"
    && process.env.RUNNER_ENVIRONMENT === "github-hosted" && process.env.GITHUB_REPOSITORY === "xpexellent-dotcom/msrc-2027", "Rehearsal is restricted to this repository on disposable GitHub-hosted Linux CI.");
  const root = resolve(process.cwd());
  const workdir = argument("--workdir"); const evidence = argument("--evidence");
  const runner = process.env.RUNNER_TEMP;
  requireCheck(runner && isAbsolute(runner) && within(resolve(runner), workdir) && within(resolve(runner), evidence) && !within(workdir, evidence) && !within(evidence, workdir) && workdir !== evidence, "Staging/evidence must be separate RUNNER_TEMP directories.");
  requireCheck(process.argv.length === 6, "Unexpected rehearsal arguments.");
  const staged = join(workdir, "supabase");
  requireCheck(readdirSync(join(staged, "migrations")).length === 0 && readFileSync(join(staged, "seed.sql")).length === 0, "Disposable migrations/seed must be empty.");
  const config = readFileSync(join(root, "supabase/config.toml"));
  requireCheck(config.equals(readFileSync(join(staged, "config.toml"))), "Disposable configuration must be byte-identical; no flag/settings changes.");
  requireCheck([join(workdir, ".env"), join(workdir, ".env.local"), join(staged, ".env"), join(staged, ".temp/project-ref"), join(staged, "roles.sql")].every((file) => !existsSync(file)), "Disposable stage contains configuration/link/role inputs.");
  mkdirSync(evidence, { recursive: true });
  const sources = files.map((file) => {
    const bytes = readFileSync(join(root, `supabase/migrations/${file.version}_${file.name}.sql`));
    requireCheck(sha(bytes) === file.hash, "Reviewed migration source hash differs.");
    return bytes.toString("utf8");
  });
  const packet = readFileSync(join(root, "docs/features/STAFF_MIGRATION_01_PACKET.md"), "utf8");
  requireCheck(packet.includes(files[2].hash), "Packet/source identity differs.");
  const blocks = [...packet.matchAll(/^```sql\r?\n([\s\S]*?)^```/gm)].map((match) => statements(match[1]));
  requireCheck(blocks.length === 2 && blocks[0].length === 11 && blocks[1].length === 14, "Packet query inventory changed.");
  const images = [await inspect(container), await inspect("supabase_auth_msrc2027-local")];
  phase = "empty-native-baseline";
  await noIdentities(evidence, phase);
  const empty = await query("select count(*) as rows from pg_namespace where nspname like 'msrc_%'");
  requireCheck(empty[0]?.rows === 0, "Disposable database already contains application schemas.");
  // Native CLI ledger metadata only. No actor/domain fixtures or later migrations.
  await sql("begin; create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text); commit;");
  requireCheck((await ledger()).length === 0, "Disposable database already has application history.");
  phase = "reproduce-applied-baseline";
  for (let index = 0; index < 2; index++) {
    await transaction(sources[index]);
    await sql(`begin; insert into supabase_migrations.schema_migrations(version,name) values('${files[index].version}','${files[index].name}'); commit;`);
  }
  await noIdentities(evidence, phase);
  compare(await query(authorityCounts), [{ object: "edition_config", rows: 0 }, { object: "account_access", rows: 0 }, { object: "role_grants", rows: 0 }, { object: "grant_audit", rows: 0 }], "Baseline must contain no authority records.");
  phase = "packet-preflight";
  const preflight = await runPacket(blocks[0], evidence, phase); assertPreflight(preflight);
  const helperTypes = await query("select required.signature,p.prorettype::regtype::text as result from (values('auth.uid()'),('auth.jwt()'),('msrc_authorization.prevent_history_truncate()'),('pg_catalog.gen_random_uuid()')) required(signature) left join pg_proc p on p.oid=to_regprocedure(required.signature)");
  compare(helperTypes, [{ signature: "auth.uid()", result: "uuid" }, { signature: "auth.jwt()", result: "jsonb" }, { signature: "msrc_authorization.prevent_history_truncate()", result: "trigger" }, { signature: "pg_catalog.gen_random_uuid()", result: "uuid" }], "Native/prerequisite helper return types differ.");
  writeFileSync(join(evidence, "helper-return-types.json"), JSON.stringify(helperTypes, null, 2) + "\n");
  const contactBaseline = await query(contactCatalog);
  writeFileSync(join(evidence, "contact-baseline-catalog.json"), JSON.stringify(contactBaseline, null, 2) + "\n");
  phase = "rollback-injection";
  const rollback = await transaction(sources[2] + "\nselect 1/0;", "22012");
  const afterRollback = await runPacket(blocks[0], evidence, "packet-after-rollback");
  compare(afterRollback, preflight, "Failed complete DDL did not restore the original baseline."); assertPreflight(afterRollback);
  compare(await query(contactCatalog), contactBaseline, "Rollback injection changed independent Contact metadata.");
  await noIdentities(evidence, phase);
  phase = "exact-migration-one";
  const committed = await transaction(sources[2]);
  phase = "packet-postchecks";
  const post = await runPacket(blocks[1], evidence, phase); assertPost(post);
  compare(await ledger(), expectedLedger(false), "DDL must not implicitly record unverified history.");
  await noIdentities(evidence, phase);
  // Local-only, single-version history marker after SQL/catalog proof; no linked CLI.
  await sql(`begin; insert into supabase_migrations.schema_migrations(version,name) values('${files[2].version}','${files[2].name}'); commit;`);
  compare(await ledger(), expectedLedger(true), "Only migration one may be added to baseline history.");
  phase = "replay-rejection";
  const replay = await transaction(sources[2], "42P06");
  const afterReplay = await runPacket(blocks[1], evidence, "packet-after-replay");
  compare(afterReplay, post, "Replay failure changed the committed catalog."); assertPost(afterReplay);
  compare(await ledger(), expectedLedger(true), "Replay failure changed local history.");
  compare(await query(contactCatalog), contactBaseline, "Migration/replay changed independent Contact metadata.");
  compare(await query(authorityCounts), preflight[10], "Authority records changed during rehearsal.");
  await noIdentities(evidence, "final");
  requireCheck((await query("select count(*) as rows from pg_namespace where nspname in ('msrc_staff','msrc_staff_email','msrc_participant')"))[0]?.rows === 0, "Later migration schemas must remain absent.");
  const finalLedger = await ledger();
  const summary = { status: "PASS", sourceRevision: process.env.GITHUB_SHA ?? "unavailable", configSha256: sha(config), packetSha256: sha(packet), migrations: files, nativeImages: images,
    postgres: preflight[0][0], packetDistinctQueries: 25, packetExecutions, assertions,
    actualDdlBackends: { rollback, committed, replay }, finalLedger, policy: post[2], contactPreservation: "PASS",
    identityRows: "zero throughout", productionExecution: "NOT PERFORMED", userDependentTests: "NOT RUN", completedAtUtc: new Date().toISOString() };
  writeFileSync(join(evidence, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  process.stdout.write(`PASS migration-one rehearsal: 25 distinct packet queries, ${packetExecutions} read-only executions, ${assertions} assertions; no identities or hosted actions.\n`);
}
main().catch((error: unknown) => {
  const message = error instanceof Error && /^[A-Za-z0-9 ;:,.=/_()'"\-]+$/.test(error.message) ? error.message : "Private diagnostics withheld.";
  process.stderr.write(`FAIL migration-one rehearsal at ${phase}: ${message}\n`);
  process.exitCode = 1;
});
