import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-staff-portal-concurrency-2027";
const actor = (suffix: number) => `d7100000-0000-4000-8000-00000000000${suffix}`;
const session = (suffix: number) => `d7200000-0000-4000-8000-00000000000${suffix}`;
const factor = (suffix: number) => `d7300000-0000-4000-8000-00000000000${suffix}`;
const marker = 202710071;
const recoveryMarker = 202710072;

function query(sql: string, stage: "fixture" | "recovery-reservation" | "recovery-observation" | "recovery-partial-failure" | "recovery-retry" = "fixture"): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || (target && target !== "local") || !resolveLocalSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Staff concurrency fixtures require disposable loopback GitHub CI.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic staff concurrency query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic staff SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic staff SQL assertion failed at ${stage} (SQLSTATE ${sqlState}); diagnostics withheld.`)); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}
function claims(suffix = 1): string {
  return `select set_config('request.jwt.claims',jsonb_build_object('sub','${actor(suffix)}','role','authenticated',
    'session_id','${session(suffix)}','aal','aal2','exp',extract(epoch from clock_timestamp()+interval '1 hour'),
    'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz))))
      from auth.mfa_amr_claims where session_id='${session(suffix)}'))::text,true);`;
}
const downgrade = (target: number, hold = false) => `begin; ${claims()}
  ${hold ? `select pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0)); select pg_advisory_xact_lock(${marker}); select pg_sleep(1);` : ""}
  select public.msrc_staff_admin_change('${edition}','${actor(target)}','set_roles',array['finance'])->>'state'; commit;`;

describe.skipIf(!isolatedCi)("Staff portal authority concurrency (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      ${[1, 2, 3].map((suffix) => `
      insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
        values('${actor(suffix)}','staff-concurrency-${suffix}@example.invalid',now(),'synthetic-original-password',now(),now(),false);
      insert into msrc_authorization.account_access(actor_id,state,individually_identified) values('${actor(suffix)}','active',true);
      insert into msrc_staff.profiles(actor_id,name) values('${actor(suffix)}','Synthetic concurrency staff ${suffix}');
      insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
        values('${actor(suffix)}','${edition}','superAdmin','edition','Synthetic concurrency fixture');
      insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
        values('${factor(suffix)}','${actor(suffix)}','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes');
      insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id)
        values('${session(suffix)}','${actor(suffix)}',date_trunc('second',now()-interval '2 minutes'),now(),'aal2','${factor(suffix)}');
      insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
        select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id='${session(suffix)}';
      insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
        values(gen_random_uuid(),'${session(suffix)}','totp',date_trunc('second',now()-interval '30 seconds'),date_trunc('second',now()-interval '30 seconds'));`).join("\n")}
      commit;`);
  });

  it("serializes two concurrent demotions at three Super Admins and audits the denial", async () => {
    const first = query(downgrade(2, true));
    let locked = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      if ((await query(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`)).trim() === "1") {
        locked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(locked).toBe(true);
    const outcomes = await Promise.all([first, query(downgrade(3))]);
    expect(outcomes[0].split("\n")).toContain("completed");
    expect(outcomes[1].split("\n")).toContain("denied");
    await query(`do $$begin
      if msrc_staff.active_super_admin_count('${edition}')<>2
      or (select count(*) from msrc_staff.audit where edition_key='${edition}' and action='set_roles' and result='completed')<>1
      or (select count(*) from msrc_staff.audit where edition_key='${edition}' and action='set_roles' and result='denied')<>1 then
        raise exception 'Synthetic minimum or audit concurrency assertion failed.';
      end if;
      end$$;`);
  });

  it("a committed recovery hold wins a waiting privileged context and survives partial failure and expiry", async () => {
    const operation = "d7400000-0000-4000-8000-000000000003";
    const retry = "d7400000-0000-4000-8000-000000000004";
    const reservation = query(`begin; ${claims()}
      do $$begin if public.msrc_staff_admin_change('${edition}','${actor(3)}','reset_account','{}','${operation}')->>'state'<>'reserved'
        then raise exception 'Synthetic recovery reservation failed.';end if;end$$;
      select pg_advisory_xact_lock(${recoveryMarker}); select pg_sleep(1); commit;`, "recovery-reservation");
    let locked = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      if ((await query(`select count(*) from pg_locks where locktype='advisory' and objid=${recoveryMarker} and granted;`)).trim() === "1") {
        locked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(locked).toBe(true);
    const observation = query(`begin; ${claims(3)}
      select coalesce(public.msrc_session_context('${edition}')::text,'DENIED'); commit;`, "recovery-observation");
    const results = await Promise.all([reservation, observation]);
    expect(results[1].split("\n")).toContain("DENIED");
    await query(`delete from auth.mfa_factors where user_id='${actor(3)}';
      select public.msrc_staff_admin_complete('${operation}',false);
      update msrc_staff.admin_operations set expires_at=clock_timestamp()-interval '1 minute' where id='${operation}';
      do $$begin
      if not exists(select 1 from msrc_staff.profiles where actor_id='${actor(3)}' and recovery_state='failed')
        or (select encrypted_password from auth.users where id='${actor(3)}')<>'synthetic-original-password' then
        raise exception 'Synthetic partial failure must preserve recovery denial.';end if;
      begin
        insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
          values(gen_random_uuid(),'${actor(3)}','totp','unverified',now(),now());
        raise exception 'Synthetic self enrollment must remain denied.';
      exception when insufficient_privilege then null;end;
      end$$;`, "recovery-partial-failure");
    await query(`begin; ${claims()}
      do $$declare reserved_state text;late_state text;latest_hold boolean;begin
      -- Mutations and their resulting-state read need distinct SQL snapshots;
      -- an OR expression can initialize its subquery before calling mutations.
      reserved_state:=public.msrc_staff_admin_change('${edition}','${actor(3)}','reset_account','{}','${retry}')->>'state';
      late_state:=public.msrc_staff_admin_complete('${operation}',true)->>'state';
      select exists(select 1 from msrc_staff.profiles where actor_id='${actor(3)}' and recovery_state='pending' and recovery_operation='${retry}') into latest_hold;
      if reserved_state<>'reserved' or late_state<>'denied' or not latest_hold then
        raise exception 'Synthetic retry must retain the latest operation hold.';end if;
      end$$; commit;`, "recovery-retry");
  });
});
