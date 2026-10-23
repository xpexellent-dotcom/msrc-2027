import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// No provider transport is imported. All records are disposable synthetic CI data.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.ADVISORY_DB_TESTS === "true";
const marker = 202710236;
const baseEdition = "synthetic-advisory-races";
const helpers = ["registration", "abstract", "advisory"]
  .map(name => readFileSync(`supabase/tests/support/${name}-fixtures.psql`, "utf8")).join("\n");
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const id = (n: number) => `e8000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const edition = (n: number) => `synthetic-advisory-race-${n}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const config = resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  if (!isolatedCi || process.platform !== "linux" || process.env.RUNNER_ENVIRONMENT !== "github-hosted"
    || process.env.GITHUB_REPOSITORY !== "xpexellent-dotcom/msrc-2027" || process.env.SUPABASE_PROJECT_REF
    || process.env.SUPABASE_PROJECT_ID || existsSync("supabase/.temp/project-ref")
    || (process.env.NEXT_PUBLIC_SUPABASE_TARGET && process.env.NEXT_PUBLIC_SUPABASE_TARGET !== "local")
    || !config || config.url !== "http://127.0.0.1:54321"
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Advisory fixtures require the unlinked disposable loopback GitHub runner.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic advisory query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      sqlState = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? sqlState;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic advisory SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic advisory SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      void release.then(() => child.stdin.end("commit;\n"));
    } else child.stdin.end(helpers + "\n" + sql);
  });
}
const scalar = (output: string) => output.trim().split("\n").at(-1);
function response<T = Record<string, unknown>>(output: string): T {
  return JSON.parse(output.split("\n").filter(line => line.startsWith("{") || line.startsWith("[")).at(-1) ?? "null") as T;
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (scalar(await query(sql)) === "1") return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic advisory ${description} was not observed.`);
}
async function race(firstSql: string, secondSql: string, name: string, waits = true) {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = query(firstSql + `select pg_advisory_xact_lock(${marker});`, gate);
  let second: Promise<string> | undefined;
  try {
    try {
      await observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
      second = query(`set application_name='${name}';` + secondSql + "commit;");
      if (waits) {
        await observed(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
      } else await second;
    } finally { release(); }
    return await Promise.all([first, second!]);
  } finally { await Promise.allSettled([first, ...(second ? [second] : [])]); }
}
const staff = (n: number, sql: string) => `begin;select pg_temp.abstract_claims(${n});set local role authenticated;${sql}`;
const worker = (sql: string) => `begin;set local role service_role;${sql}`;
// Each race edition has its own scientific administrator. A regular-staff email
// check is bound to the identity revision, so adding a grant after it (as one
// shared administrator would need) correctly invalidates that session.
const scientificAdministrator = (n: number) => 9810 + n;
const start = (n: number, operation: number, submissions: number[]) => staff(scientificAdministrator(n),
  `select public.msrc_staff_advisory_start('${edition(n)}','${id(operation)}',array[${submissions.map(s => `'${id(s)}'::uuid`).join(",")}])::text;`);
interface Claim { id: string; leaseToken: string; attempt: number }
const claim = (workerId: number, batch = 1) => worker(`select public.msrc_advisory_worker_claim('${id(workerId)}',${batch})::text;`);
const finish = (workerId: number, job: Claim) => worker(
  `select public.msrc_advisory_worker_finish('${id(workerId)}','${job.id}','${job.leaseToken}',pg_temp.advisory_output(),null)::text;`);
async function fixture(n: number, configuration = "pg_temp.advisory_configuration()") {
  await query(`insert into msrc_authorization.edition_config(edition_key) values('${edition(n)}');
    insert into msrc_abstracts.settings(edition_key,version,configuration) values('${edition(n)}',1,pg_temp.abstract_settings());
    insert into msrc_abstracts.settings_versions values('${edition(n)}',1,pg_temp.abstract_settings());
    insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
      values('${actor(9800)}','${edition(n)}','superAdmin','edition','Synthetic advisory race');
    select pg_temp.registration_staff_fixture(${scientificAdministrator(n)},'${edition(n)}','scientificAdministrator');
    select pg_temp.advisory_submission(${n * 10 + 1},'${edition(n)}',9802);
    select pg_temp.advisory_submission(${n * 10 + 2},'${edition(n)}',9802);`);
  expect(response(await query(staff(9800,
    `select public.msrc_staff_advisory_save_settings('${edition(n)}',0,${configuration})::text;`) + "commit;")).state).toBe("updated");
}

describe.skipIf(!isolatedCi)("Advisory queue and budgets (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${baseEdition}');
      select pg_temp.registration_fixture(9802,'${baseEdition}');
      select pg_temp.registration_staff_fixture(9800,'${baseEdition}');
      select pg_temp.registration_staff_fixture(9801,'${baseEdition}','scientificAdministrator');`);
  });
  afterEach(async () => {
    await query(`update msrc_abstracts.advisory_settings set configuration=jsonb_set(configuration,'{enabled}','false'::jsonb)
      where edition_key like 'synthetic-advisory-race-%';`);
  });
  it("competing batches cannot exceed the final daily cost reservation", async () => {
    await fixture(1, "pg_temp.advisory_configuration()||'{\"dailyCostCap\":1}'::jsonb");
    const rows = (await race(start(1, 101, [11]), start(1, 102, [12]), "advisory-budget-race")).map(output => response(output));
    expect(rows.map(row => row.state)).toEqual(["queued", "budget_exceeded"]);
    expect(scalar(await query(`select reserved_abstracts=1 and reserved_cost=1 from msrc_abstracts.advisory_daily_usage where edition_key='${edition(1)}';`))).toBe("t");
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_jobs where edition_key='${edition(1)}';`))).toBe("1");
  });
  it("concurrent operation retries return one run without charging twice", async () => {
    await fixture(2);
    const call = start(2, 201, [21]);
    const rows = (await race(call, call, "advisory-operation-race")).map(output => response(output));
    expect(rows.map(row => row.state)).toEqual(["queued", "queued"]);
    expect(rows[0].runId).toBe(rows[1].runId);
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_runs where edition_key='${edition(2)}';`))).toBe("1");
    expect(scalar(await query(`select reserved_abstracts from msrc_abstracts.advisory_daily_usage where edition_key='${edition(2)}';`))).toBe("1");
  });
  it("different operations cannot create duplicate abstract/rubric jobs", async () => {
    await fixture(3);
    const rows = (await race(start(3, 301, [31]), start(3, 302, [31]), "advisory-deduplication-race")).map(output => response(output));
    expect(rows.map(row => row.state)).toEqual(["queued", "conflict"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_jobs where edition_key='${edition(3)}';`))).toBe("1");
  });
  it("a concurrent worker skips a locked edition and cannot duplicate a lease", async () => {
    await fixture(4);
    await query(start(4, 401, [41]) + "commit;");
    const rows = (await race(claim(941), claim(942), "advisory-claim-race", false)).map(output => response<Claim[]>(output));
    expect(rows.map(row => row.length)).toEqual([1, 0]);
    expect(scalar(await query(`select attempts from msrc_abstracts.advisory_jobs where edition_key='${edition(4)}';`))).toBe("1");
  });
  it("concurrent completion persists one immutable advisory and never an outcome", async () => {
    await fixture(5);
    await query(start(5, 501, [51]) + "commit;");
    const job = response<Claim[]>(await query(claim(951) + "commit;"))[0];
    const call = finish(951, job);
    const rows = (await race(call, call, "advisory-finish-race")).map(output => response(output));
    expect(rows.map(row => row.state)).toEqual(["completed", "stale"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_records where job_id='${job.id}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_abstracts.decisions d join msrc_abstracts.submissions s on s.id=d.submission_id where s.edition_key='${edition(5)}';`))).toBe("0");
  });
  it("disabling while a completion waits discards the provider response", async () => {
    await fixture(6);
    await query(start(6, 601, [61]) + "commit;");
    const job = response<Claim[]>(await query(claim(961) + "commit;"))[0];
    const disable = staff(9800, `select public.msrc_staff_advisory_save_settings('${edition(6)}',1,pg_temp.advisory_configuration()||'{"enabled":false}'::jsonb)::text;`);
    const rows = (await race(disable, finish(961, job), "advisory-disable-race")).map(output => response(output));
    expect(rows.map(row => row.state)).toEqual(["updated", "failed"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_records where job_id='${job.id}';`))).toBe("0");
    expect(scalar(await query(`select error_code from msrc_abstracts.advisory_jobs where id='${job.id}';`))).toBe("configuration_changed");
  });
  it("a submission withdrawn while completion waits cannot acquire an advisory", async () => {
    await fixture(7);
    await query(start(7, 701, [71]) + "commit;");
    const job = response<Claim[]>(await query(claim(971) + "commit;"))[0];
    const rows = await race(`begin;update msrc_abstracts.submissions set status='withdrawn' where id='${id(71)}';`, finish(971, job), "advisory-withdrawal-race");
    expect(response(rows[1]).state).toBe("failed");
    expect(scalar(await query(`select count(*) from msrc_abstracts.advisory_records where job_id='${job.id}';`))).toBe("0");
    expect(scalar(await query(`select error_code from msrc_abstracts.advisory_jobs where id='${job.id}';`))).toBe("stale_snapshot");
  });
  it.each([
    "msrc_staff_advisory_workspace('missing-edition')",
    "msrc_staff_advisory_save_settings('missing-edition',null,null)",
    "msrc_staff_advisory_start('missing-edition',null,null)",
    "msrc_staff_advisory_reviewer('missing-edition',null)",
    "msrc_staff_advisory_calibration('missing-edition')",
    "msrc_advisory_worker_claim(null,null)",
    "msrc_advisory_worker_finish(null,null,null,null,null)",
  ])("rejects non-READ-COMMITTED isolation before early return: %s", async rpc => {
    await expect(query(`begin isolation level repeatable read;select public.${rpc};rollback;`)).rejects.toThrow("SQLSTATE 25001");
  });
});
