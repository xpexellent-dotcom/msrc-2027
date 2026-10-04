import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const hash = (label: string) => createHash("sha256").update(`synthetic-contact-${label}`).digest("hex");

function boundary() {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  const config = resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  if (!isolatedCi || process.platform !== "linux" || process.env.RUNNER_ENVIRONMENT !== "github-hosted"
    || process.env.GITHUB_REPOSITORY !== "xpexellent-dotcom/msrc-2027"
    || process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_ID
    || existsSync("supabase/.temp/project-ref") || (target && target !== "local")
    || !config || config.url !== "http://127.0.0.1:54321"
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Contact counter fixtures require the disposable loopback GitHub runner.");
  }
  return config;
}

function query(sql: string): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let sqlState = "unknown";
    const timer = setTimeout(() => { child.kill(); reject(new Error("Isolated Contact counter query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const code = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (code) sqlState = code;
    });
    child.on("error", () => { clearTimeout(timer); reject(new Error("Isolated Contact counter query could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Isolated Contact counter SQL failed (SQLSTATE ${sqlState}); sensitive diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

type Reservation = { allowed: boolean; retry_after_seconds: number; reason: "allowed" | "limited" | "replayed" };
async function reserve(ip: string, email: string, nonce: string, limits = [3, 10, 3, 10]): Promise<Reservation> {
  const result = await query(`set role service_role;
    select public.msrc_contact_reserve_attempt('${hash(ip)}','${hash(email)}','${hash(nonce)}',
      clock_timestamp()+interval '20 minutes',${limits.join(",")});`);
  return JSON.parse(result) as Reservation;
}

describe.skipIf(!isolatedCi)("Contact atomic abuse reservations (disposable GitHub CI only)", () => {
  beforeEach(async () => { await query("truncate msrc_contact.attempt_buckets;"); });

  it("concurrent requests sharing an IP cannot exceed its hour limit or partially charge denied email buckets", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => reserve("shared-ip", `email-${i}`, `nonce-${i}`)));
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => result.reason === "limited")).toHaveLength(9);
    expect(await query("select attempt_count from msrc_contact.attempt_buckets where bucket='global_day';")).toBe("3");
    expect(await query("select count(*) from msrc_contact.attempt_buckets where bucket='nonce';")).toBe("3");
    expect(await query("select count(*) from msrc_contact.attempt_buckets where bucket='email_day';")).toBe("3");
  });

  it("concurrent requests sharing an email cannot evade its limit by changing IP", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(`ip-${i}`, "shared-email", `nonce-${i}`)));
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => result.reason === "limited")).toHaveLength(7);
    expect(await query("select attempt_count from msrc_contact.attempt_buckets where bucket='email_hour';")).toBe("3");
  });

  it("racing the same form token permits exactly one provider reservation", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => reserve("ip", "email", "same-nonce")));
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => result.reason === "replayed")).toHaveLength(7);
    expect(await query("select sum(attempt_count) from msrc_contact.attempt_buckets;")).toBe("6");
  });

  it("concurrent unrelated visitors share one projectwide sixty-attempt UTC-day cap", async () => {
    await query(`insert into msrc_contact.attempt_buckets values('global_day',repeat('0',64),
      date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC',
      (date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+interval '24 hours',57);`);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => reserve(`ip-${i}`, `email-${i}`, `nonce-${i}`, [60, 60, 60, 60])));
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => result.reason === "limited")).toHaveLength(9);
    expect(await query("select attempt_count from msrc_contact.attempt_buckets where bucket='global_day';")).toBe("60");
    expect(await query("select count(*) from msrc_contact.attempt_buckets where bucket='nonce';")).toBe("3");
  });

  it("committed reservations remain charged after provider failure or uncertain acceptance", async () => {
    // Provider outcomes intentionally have no database path; every admission costs
    // one attempt even when a caller cannot confirm the subsequent provider result.
    const outcomes = ["failed", "uncertain", "accepted"];
    for (const outcome of outcomes) expect((await reserve("ip", "email", outcome)).allowed).toBe(true);
    expect((await reserve("ip", "email", "fourth")).reason).toBe("limited");
    expect(await query("select attempt_count from msrc_contact.attempt_buckets where bucket='global_day';")).toBe("3");
  });

  it("expired historical rate buckets are ignored and an expired token cannot reserve", async () => {
    await query(`insert into msrc_contact.attempt_buckets values('ip_hour','${hash("ip")}',
      date_trunc('hour',clock_timestamp())-interval '2 hours',date_trunc('hour',clock_timestamp())-interval '1 hour',60);`);
    expect((await reserve("ip", "email", "fresh")).allowed).toBe(true);
    await expect(query(`set role service_role; select public.msrc_contact_reserve_attempt('${hash("ip")}','${hash("email")}','${hash("expired")}',clock_timestamp()-interval '1 second');`))
      .rejects.toThrow("SQLSTATE 22023");
    expect(await query("select attempt_count from msrc_contact.attempt_buckets where bucket='global_day';")).toBe("1");
  });

  it("anonymous Data API clients cannot read the private schema or execute the public reservation RPC", async () => {
    const config = boundary();
    const client = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc("msrc_contact_reserve_attempt", {
      p_ip_hash: hash("ip"), p_email_hash: hash("email"), p_nonce_hash: hash("nonce"),
      p_nonce_expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
    const privateRead = await client.schema("msrc_contact").from("attempt_buckets").select("*");
    expect(privateRead.data).toBeNull();
    expect(privateRead.error?.code).toBe("PGRST106");
    expect(await query("select count(*) from msrc_contact.attempt_buckets;")).toBe("0");
  });

  it("authenticated SQL callers cannot spoof service authority through claims or modify counters", async () => {
    await expect(query(`begin; set local role authenticated;
      set local request.jwt.claims='{"role":"service_role","user_metadata":{"role":"super_admin"}}';
      select public.msrc_contact_reserve_attempt('${hash("ip")}','${hash("email")}','${hash("nonce")}',clock_timestamp()+interval '20 minutes'); commit;`))
      .rejects.toThrow("SQLSTATE 42501");
    await expect(query("set role authenticated; select * from msrc_contact.attempt_buckets;"))
      .rejects.toThrow("SQLSTATE 42501");
  });

  it("database lock failure never authorizes a reservation or adds partial counts", async () => {
    const locker = query("begin; select pg_advisory_xact_lock(20272706,60); select pg_sleep(3); commit;");
    let locked = false;
    for (let i = 0; i < 10; i++) {
      if (await query("select count(*) from pg_locks where locktype='advisory' and classid=20272706 and objid=60 and granted;") === "1") { locked = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(locked).toBe(true);
    await expect(reserve("ip", "email", "nonce")).rejects.toThrow("SQLSTATE 55P03");
    await locker;
    expect(await query("select count(*) from msrc_contact.attempt_buckets;")).toBe("0");
  });

  it("pg_cron physically removes expired hashes without a new visitor request", async () => {
    await query(`insert into msrc_contact.attempt_buckets values('nonce','${hash("expired-cleanup")}',
      '1970-01-01 00:00:00+00',clock_timestamp()-interval '1 second',1);
      select cron.schedule('msrc-contact-expiry','1 second','select msrc_contact.cleanup_expired();');`);
    try {
      let deleted = false;
      for (let i = 0; i < 8; i++) {
        if (await query(`select count(*) from msrc_contact.attempt_buckets where subject_hash='${hash("expired-cleanup")}';`) === "0") { deleted = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      expect(deleted).toBe(true);
      expect(await query("select count(*) from cron.job_run_details where jobid=(select jobid from cron.job where jobname='msrc-contact-expiry') and status='succeeded';"))
        .not.toBe("0");
    } finally {
      await query("select cron.schedule('msrc-contact-expiry','*/5 * * * *','select msrc_contact.cleanup_expired();');");
    }
  });
});
