import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// This additional write suite is restricted to disposable GitHub CI. The integration
// config independently rejects hosted settings before collection. No Docker on the PC.
const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const actor = "91000000-0000-4000-8000-000000000001";
const expired = "92000000-0000-4000-8000-000000000001";
const active = "92000000-0000-4000-8000-000000000002";
const edition = "synthetic-concurrency-2027";
const lockMarker = 20272742;

function query(sql: string): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || (target && target !== "local")
    || !resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY })
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8")))
    throw new Error("Concurrency fixtures require the isolated loopback GitHub CI stack.");
  return new Promise((resolve, reject) => {
    // Fixed local container, no connection URL/password or shell interpolation.
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X",
      "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic concurrency query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    // Withhold database output: no provider messages, environment values or credentials.
    child.stderr.on("data", () => {});
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic local query could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output); else reject(new Error("Synthetic local SQL assertion failed.")); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

function claims(session: string): string {
  return `select set_config('request.jwt.claims',jsonb_build_object('sub','${actor}','role','authenticated',
    'session_id','${session}','aal','aal1','exp',extract(epoch from statement_timestamp()+interval '1 hour'))::text,true);`;
}
const checkDenied = (session: string, accepted: string) => `begin; ${claims(session)}
  do $$declare context jsonb; begin
    context:=msrc_sessions.own_context('${edition}',true);
    if context is null or (context->>'sessionPolicySatisfied')::boolean
      or context->>'reason' not in (${accepted}) then raise exception 'Synthetic policy denial assertion failed.'; end if;
  end$$; commit;`;

describe.skipIf(!isolatedCi)("AUTH-05 concurrent database lifecycle (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    // Audit/session history is intentionally immutable. These clearly synthetic rows
    // remain only in this disposable database until the CI always-stop stack step.
    await query(`begin;
      insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,is_anonymous)
      values('${actor}','session-concurrency@example.invalid',now(),now(),now(),false);
      insert into msrc_authorization.account_access(actor_id,state,individually_identified) values('${actor}','active',true);
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
       ('${expired}','${actor}',now()-interval '72 hours',now(),'aal1'),
       ('${active}','${actor}',now()-interval '1 minute',now(),'aal1'); commit;`);
  });

  it("simultaneous private activity cannot resurrect an expired session or duplicate audit", async () => {
    await Promise.all([query(checkDenied(expired, "'absolute_expired','session_revoked'")),
      query(checkDenied(expired, "'absolute_expired','session_revoked'"))]);
    await query(`do $$begin
      if not exists(select 1 from msrc_sessions.session_state where session_id='${expired}'
        and revoked_at is not null and last_activity_at=started_at)
        or (select count(*) from msrc_sessions.security_audit where session_id='${expired}')<>2 then
        raise exception 'Synthetic expiry/audit concurrency assertion failed.'; end if;
      end$$;`);
  });

  it("a suspension holding the account lock wins a concurrent context/activity attempt", async () => {
    const suspension = query(`begin;
      update msrc_authorization.account_access set state='suspended' where actor_id='${actor}';
      select pg_advisory_xact_lock(${lockMarker}); select pg_sleep(2); commit;`);
    // Observe a marker acquired AFTER the suspension's account row lock. The second
    // independent connection then has to wait for that same account transaction.
    let locked = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const observed = await query(`select count(*) from pg_locks where locktype='advisory'
        and objid=${lockMarker} and granted;`);
      if (observed.trim() === "1") { locked = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(locked).toBe(true);
    await Promise.all([suspension, query(checkDenied(active, "'session_revoked'"))]);
    await query(`do $$begin
      if not exists(select 1 from msrc_sessions.session_state where session_id='${active}' and last_activity_at=started_at)
        or (select count(*) from msrc_sessions.security_audit where actor_id='${actor}' and event='actor.sessions.revoked')<>1 then
        raise exception 'Synthetic suspension concurrency assertion failed.'; end if;
      end$$;`);
  });
});
