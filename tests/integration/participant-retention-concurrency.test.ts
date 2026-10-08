import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-participant-retention-concurrency-2027";
const actor = (suffix: number) => `c8100000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const admission = (suffix: number) => `c8200000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const email = (suffix: number) => `retention-concurrency-${suffix}@example.invalid`;
const marker = 202710083;

function query(sql: string): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || (target && target !== "local") || !resolveLocalSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Participant retention fixtures require disposable loopback GitHub CI.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic retention concurrency query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic retention SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic retention SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`)); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}
async function waitForBarrier(): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await query(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`)).trim() === "1") return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Synthetic retention barrier did not become visible.");
}
function fixture(suffix: number): string {
  return `do $$begin
    if public.msrc_participant_signup_reserve('${actor(suffix)}','${admission(suffix)}','${email(suffix)}','Synthetic adult','synthetic-retention-notice',true)->>'state'<>'reserved' then
      raise exception 'Synthetic attested admission failed';end if;
    end$$;
    insert into auth.users(id,email,encrypted_password,created_at,updated_at,is_anonymous,raw_app_meta_data)
      values('${actor(suffix)}','${email(suffix)}','synthetic-native-hash',clock_timestamp()-interval '31 days',clock_timestamp(),false,'{"provider":"email","providers":["email"]}');`;
}
const worker = "select msrc_participant.cleanup_unverified(100,false)::text;";

describe.skipIf(!isolatedCi)("Participant retention concurrency (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-retention-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      do $$begin if msrc_participant.unknown_erasure_reference() then raise exception 'Reviewed native FK inventory changed';end if;end$$;
      commit;`);
  });

  it("skips a native verification lock and refuses verification after the original deadline", async () => {
    await query(fixture(1));
    const native = query(`begin; select 1 from auth.users where id='${actor(1)}' for update;
      select pg_advisory_xact_lock(${marker}); select pg_sleep(1);
      do $$begin
        begin update auth.users set email_confirmed_at=clock_timestamp() where id='${actor(1)}';
          raise exception 'Late synthetic verification must be denied';
        exception when insufficient_privilege then null;end;
      end$$;commit;`);
    await waitForBarrier();
    const skipped = await query(worker);
    expect(JSON.parse(skipped.trim()).deleted).toBe(0);
    await native;
    await query(`do $$begin if not exists(select 1 from auth.users where id='${actor(1)}' and email_confirmed_at is null)
      or exists(select 1 from msrc_participant.subject_refs where actor_id='${actor(1)}' and ever_verified) then
      raise exception 'Late verification must not become verified';end if;end$$;`);
    expect(JSON.parse((await query(worker)).trim()).deleted).toBe(1);
  });

  it("two concurrent cleanup workers erase once and preserve one immutable completion event", async () => {
    await query(fixture(2));
    const first = query(`begin; ${worker} select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await waitForBarrier();
    const outcomes = await Promise.all([first, query(worker)]);
    const result = outcomes.map((output) => JSON.parse(output.split("\n").find((line) => line.startsWith("{"))!));
    expect(result.map((row) => row.deleted).sort()).toEqual([0, 1]);
    await query(`do $$begin if exists(select 1 from auth.users where id='${actor(2)}')
      or (select count(*) from msrc_participant.retention_audit where actor_id='${actor(2)}' and event='account.erased')<>1
      or (select count(*) from msrc_participant.cleanup_jobs where actor_id='${actor(2)}' and state='completed')<>1 then
      raise exception 'Concurrent erasure must have one durable result';end if;end$$;`);
  });

  it("a committed role grant wins the authority lock and prevents cleanup", async () => {
    await query(fixture(3));
    const grant = query(`begin;
      insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
        values('${actor(3)}','${edition}','participant','edition','Synthetic retained registration authority');
      select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await waitForBarrier();
    const cleaning = query(worker);
    await grant;
    expect(JSON.parse((await cleaning).trim()).deleted).toBe(0);
    await query(`do $$begin if not exists(select 1 from auth.users where id='${actor(3)}')
      or msrc_participant.retained_reason('${actor(3)}')<>'authority_history' then
      raise exception 'Committed authority must retain its subject';end if;end$$;`);
  });

  it("committed erasure denies a waiting grant rather than resurrecting authority", async () => {
    await query(fixture(4));
    const cleaning = query(`begin; ${worker} select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await waitForBarrier();
    const grant = query(`begin;
      do $$begin begin
        insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
          values('${actor(4)}','${edition}','participant','edition','Synthetic prohibited resurrection');
        raise exception 'Erased subject must not receive a grant';
      exception when insufficient_privilege then null;end;end$$;commit;`);
    await Promise.all([cleaning, grant]);
    await query(`do $$begin if exists(select 1 from auth.users where id='${actor(4)}')
      or exists(select 1 from msrc_authorization.role_grants where actor_id='${actor(4)}')
      or not exists(select 1 from msrc_participant.subject_refs where actor_id='${actor(4)}' and erased_at is not null) then
      raise exception 'Erasure must remain final after waiting grant';end if;end$$;`);
  });

  it("an invitation committed before the worker preserves the invited identity", async () => {
    await query(`${fixture(5)}
      insert into auth.users(id,email,encrypted_password,email_confirmed_at,created_at,updated_at,is_anonymous)
        values('${actor(6)}','retention-inviter@example.invalid','synthetic-native-hash',now(),now(),now(),false);
      insert into msrc_staff.profiles(actor_id,name) values('${actor(6)}','Synthetic inviter');`);
    const invite = query(`begin;
      insert into msrc_staff.invitations(id,edition_key,email,roles,token_hash,invited_by,created_at,expires_at)
        values('c8300000-0000-4000-8000-000000000005','${edition}','${email(5)}',array['finance'],repeat('a',64),'${actor(6)}',now(),now()+interval '72 hours');
      select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await waitForBarrier();
    const cleaning = query(worker);
    await invite;
    expect(JSON.parse((await cleaning).trim()).deleted).toBe(0);
    await query(`do $$begin if not exists(select 1 from auth.users where id='${actor(5)}')
      or msrc_participant.retained_reason('${actor(5)}')<>'staff_history' then
      raise exception 'Invitation must retain the exact existing identity';end if;end$$;`);
  });
});
