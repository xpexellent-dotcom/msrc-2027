import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// Two real PostgreSQL connections. Never run against hosted/user data.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.PARTICIPANT_PROFILE_DB_TESTS === "true";
const edition = "synthetic-participant-profile-races";
const marker = 202710271;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Participant profile fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic participant profile query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic participant profile SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic participant profile SQL failed (SQLSTATE ${state}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      void release.then(() => child.stdin.end("commit;\n"));
    } else child.stdin.end(helpers + "\n" + sql);
  });
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic participant profile ${description} was not observed.`);
}
function response(output: string): Record<string, unknown> {
  return output.split("\n").filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>).find((row) => typeof row.state === "string") ?? {};
}
const scalar = (output: string) => output.trim().split("\n").at(-1);
async function race(firstSql: string, secondSql: string, name: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const first = query(firstSql + `select pg_advisory_xact_lock(${marker});`, gate);
  let second: Promise<string> | undefined;
  try {
    try {
      await observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
      second = query(`set application_name='${name}';` + secondSql + "commit;");
      await observed(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
    } finally { release(); }
    return (await Promise.all([first, second!])).map(response);
  } finally { await Promise.allSettled([first, ...(second ? [second] : [])]); }
}
const save = (n: number, institution: string, version: number) =>
  `select public.msrc_participant_profile_save('${edition}',pg_temp.registration_claims(${n}),'${institution}','intern',null,'{}'::text[],${version})::text;`;

describe.skipIf(!isolatedCi)("Participant profile concurrent edits (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${edition}');
      select pg_temp.registration_fixture(88601,'${edition}');
      select pg_temp.registration_fixture(88602,'${edition}');
      select pg_temp.registration_fixture(88603,'${edition}');
      select pg_temp.registration_fixture(88604,'${edition}');
      select pg_temp.registration_fixture(88605,'${edition}');
      commit;`);
  });
  it("two simultaneous saves with the same expected version preserve exactly one winner", async () => {
    const results = await race("begin;" + save(88601, "Winning synthetic institution", 0),
      "begin;" + save(88601, "Losing synthetic institution", 0), "participant-profile-edit-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "conflict"]);
    expect(scalar(await query(`select institution from msrc_participant.profile_details where actor_id='${actor(88601)}';`))).toBe("Winning synthetic institution");
    expect(scalar(await query(`select version from msrc_participant.profile_details where actor_id='${actor(88601)}';`))).toBe("1");
    const other = response(await query(`select public.msrc_participant_profile_read('${edition}',pg_temp.registration_claims(88602))::text;`));
    expect(other.state).toBe("ready");
    expect(other.profile).toMatchObject({ institution: null, avatarObject: null, version: 0 });
  });
  it("abandonment waiting for a successful commit cannot delete its active avatar", async () => {
    const path = "f8860000-0000-4000-8000-000000000003.webp";
    expect(response(await query(`select public.msrc_participant_profile_avatar_reserve('${edition}',pg_temp.registration_claims(88603),'${path}')::text;`)).state).toBe("reserved");
    const results = await race(`begin;select public.msrc_participant_profile_avatar_register('${edition}',pg_temp.registration_claims(88603),'${path}',0)::text;`,
      `begin;select public.msrc_participant_profile_avatar_abandon('${edition}',pg_temp.registration_claims(88603),'${path}')::text;`, "participant-profile-abandon-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "active"]);
    expect(scalar(await query(`select state from msrc_participant.avatar_objects where object_name='${path}';`))).toBe("active");
    expect(scalar(await query(`select avatar_object from msrc_participant.profile_details where actor_id='${actor(88603)}';`))).toBe(path);
  });
  it("a native session removed while save waits is denied after its lock", async () => {
    const results = await race(`begin;delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(88604);
      delete from auth.sessions where id=pg_temp.registration_session(88604);`,
    "begin;" + save(88604, "Denied synthetic institution", 0), "participant-profile-session-race");
    expect(results[1].state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_participant.profile_details where actor_id='${actor(88604)}';`))).toBe("0");
  });
  it.each(["repeatable read", "serializable"])("profile writes refuse %s isolation", async (isolation) => {
    await expect(query(`begin isolation level ${isolation};${save(88602, "Synthetic isolation guard", 0)}commit;`)).rejects.toThrow("SQLSTATE 25001");
  });
  it("a conference-date extension committed while retention waits preserves the optional profile", async () => {
    expect(response(await query(save(88605, "Synthetic retained institution", 0))).state).toBe("ready");
    await query(`update msrc_registration.settings set conference_days=array[(current_date-interval '2 years')::date] where edition_key='${edition}';`);
    const results = await race(`begin;update msrc_registration.settings set conference_days=array[current_date] where edition_key='${edition}';`,
      "begin;select public.msrc_participant_profile_cleanup(10)::text;", "participant-profile-retention-race");
    expect(results[1]).toMatchObject({ state: "ready", erased: 0 });
    expect(scalar(await query(`select institution from msrc_participant.profile_details where actor_id='${actor(88605)}';`))).toBe("Synthetic retained institution");
  });
});
