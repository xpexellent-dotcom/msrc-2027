import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-060 / O9. The ordinary db:integration CI step includes this file after a
// cold reset. No hosted connection, provider delivery, or activation is allowed.
const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-launch-readiness-races";
const marker = 202710226;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Launch readiness fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic readiness query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic readiness SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic readiness SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      // Release only after another connection observes the expected lock wait.
      void release.then(() => child.stdin.end("commit;\n"));
    } else child.stdin.end(helpers + "\n" + sql);
  });
}

function held(sql: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  return { done: query(sql, gate), release };
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic readiness ${description} was not observed.`);
}
const barrier = () => observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "authority barrier");
const waiting = (name: string) => observed(`select count(*) from pg_stat_activity
 where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending authority-lock wait");
function response(output: string): Record<string, unknown> | undefined {
  return output.split("\n").filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>).find((row) => typeof row.state === "string");
}
function read(staff: number | null, applicationName: string, isolation: "read committed" | "repeatable read" | "serializable" = "read committed") {
  return `begin isolation level ${isolation};
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',${staff === null ? "'{}'" : `pg_temp.registration_claims(${staff})::text`},true);
    set local role authenticated;
    select public.msrc_staff_launch_readiness('${edition}')::text; commit;`;
}

describe.skipIf(!isolatedCi)("Launch readiness authority ordering (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      select pg_temp.registration_staff_fixture(9300,'${edition}');
      select pg_temp.registration_staff_fixture(9301,'${edition}');
      select pg_temp.registration_staff_fixture(9302,'${edition}');
      commit;`);
  });

  it("a read queued behind committed Super Admin revocation denies without returning the older aggregate", async () => {
    // The initial native session and its claims exist in committed statements.
    expect(response(await query(read(9300, "synthetic-readiness-before-revoke")))?.state).toBe("ready");
    const revoking = held(`begin;
      select set_config('request.jwt.claims',pg_temp.registration_claims(9301)::text,true);
      set local role authenticated;
      select public.msrc_staff_admin_change('${edition}','${actor(9300)}','set_roles',array['finance'])::text;
      select pg_advisory_xact_lock(${marker});`);
    let reading: Promise<string> | undefined;
    try {
      try {
        await barrier();
        reading = query(read(9300, "synthetic-readiness-waiting-revoke"));
        await waiting("synthetic-readiness-waiting-revoke");
      } finally { revoking.release(); }
      const [revoked, denied] = await Promise.all([revoking.done, reading!]);
      expect(response(revoked)?.state).toBe("completed");
      expect(response(denied)).toEqual({ state: "denied" });
      expect(response(await query(read(9300, "synthetic-readiness-after-revoke")))).toEqual({ state: "denied" });
      await query(`do $$begin
        if exists(select 1 from msrc_authorization.role_grants g where g.actor_id='${actor(9300)}'
          and g.edition_key='${edition}' and g.role_name='superAdmin' and g.state='active')
        or msrc_staff.active_super_admin_count('${edition}')<>2
        or (select count(*) from msrc_staff.audit where edition_key='${edition}' and action='set_roles' and result='completed')<>1
        then raise exception 'Readiness revocation ordering lost authority or audit evidence';end if;
      end$$;`);
    } finally {
      await Promise.allSettled([revoking.done, ...(reading ? [reading] : [])]);
    }
  });

  it.each(["repeatable read", "serializable"] as const)("rejects %s at entry, before an authority-lock wait or no-session denial", async (isolation) => {
    // Fresh fixtures per isolation case; no session from the revocation test is reused.
    const staff = isolation === "repeatable read" ? 9400 : 9410;
    await query(`select pg_temp.registration_staff_fixture(${staff},'${edition}');`);
    expect(response(await query(read(staff, `synthetic-readiness-before-isolation-${staff}`)))?.state).toBe("ready");
    const locking = held(`begin;
      select pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
      select pg_advisory_xact_lock(${marker});`);
    try {
      await barrier();
      for (const caller of [staff, null]) {
        // A guard placed after the lock yields 55P03; one after authorization
        // can return denied for null claims. Both must instead raise 25001 now.
        await expect(query("set lock_timeout='1s';\n" + read(caller,
          `synthetic-readiness-isolation-${staff}`, isolation))).rejects.toThrow("SQLSTATE 25001");
      }
    } finally {
      locking.release();
      await locking.done;
    }
    expect(response(await query(read(staff, `synthetic-readiness-after-isolation-${staff}`)))?.state).toBe("ready");
  });
});
