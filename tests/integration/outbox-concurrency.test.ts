import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestOutboxSender, type EmailRequest, type OutboxMessage } from "@/lib/email/outbox.server";
import { drainOutbox, type OutboxStore } from "@/lib/jobs/outbox.server";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

const isolatedCi = process.env.GITHUB_ACTIONS === "true";
const marker = 202716140;

function boundary() {
  const config = resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  if (!isolatedCi || process.platform !== "linux" || process.env.RUNNER_ENVIRONMENT !== "github-hosted"
    || process.env.GITHUB_REPOSITORY !== "xpexellent-dotcom/msrc-2027" || process.env.SUPABASE_PROJECT_REF
    || process.env.SUPABASE_PROJECT_ID || existsSync("supabase/.temp/project-ref")
    || (process.env.NEXT_PUBLIC_SUPABASE_TARGET && process.env.NEXT_PUBLIC_SUPABASE_TARGET !== "local")
    || !config || config.url !== "http://127.0.0.1:54321"
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Outbox fixtures require the disposable loopback GitHub runner.");
  }
  return config;
}

function query(sql: string): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic outbox SQL timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const found = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (found) state = found;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic outbox SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Synthetic outbox SQL failed (SQLSTATE ${state}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

// Values below are owned synthetic fixtures, escaped as SQL data rather than shell text.
const literal = (value: unknown) => "'" + String(value).replaceAll("'", "''") + "'";
function enqueue(index: number, key = `synthetic-concurrency/${index}`) {
  return query(`set role service_role; select public.msrc_outbox_enqueue(${literal(key)},'synthetic_notice',1,'en',
    'concurrency-${index}@example.invalid',jsonb_build_object('reference','synthetic_${index}'));`).then((row) => JSON.parse(row));
}
function claim(worker: string, batch = 1, cap = 1000) {
  return query(`set role service_role; select public.msrc_outbox_claim(${literal(worker)},${batch},${cap});`)
    .then((row) => JSON.parse(row) as OutboxMessage[]);
}
function sqlStore(): OutboxStore {
  return {
    claim,
    async prepare(message, worker, request) {
      return JSON.parse(await query(`set role service_role; select public.msrc_outbox_prepare(${literal(message.id)},
        ${literal(worker)},${literal(message.lease_token)},${literal(JSON.stringify(request))}::jsonb);`)) as EmailRequest;
    },
    async finish(message, worker, outcome) {
      const result = JSON.parse(await query(`set role service_role; select public.msrc_outbox_finish(${literal(message.id)},
        ${literal(worker)},${literal(message.lease_token)},${literal(outcome.state)},
        ${outcome.providerMessageId ? literal(outcome.providerMessageId) : "null"},${outcome.errorClass ? literal(outcome.errorClass) : "null"});`)) as {
          acknowledged: boolean; status: "sent" | "failed_retryable" | "failed_permanent" | null };
      return result.acknowledged && result.status ? result.status : false;
    },
  };
}
async function barrier() {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await query(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`) === "1") return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Synthetic outbox lock barrier was not observed.");
}

describe.skipIf(!isolatedCi)("Durable outbox concurrency (disposable GitHub CI only)", () => {
  beforeEach(async () => {
    await query(`truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
      update msrc_outbox.settings set delivery_enabled=true,sweeps_enabled=false,daily_cap=1000,max_attempts=5;`);
  });
  afterAll(async () => {
    await query(`truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
      update msrc_outbox.settings set delivery_enabled=false,sweeps_enabled=false,daily_cap=0,max_attempts=5;`);
  });

  it("concurrent duplicate enqueue requests create one logical message and one identity", async () => {
    const result = await Promise.all(Array.from({ length: 12 }, () => enqueue(1)));
    expect(result.filter((row) => row.created)).toHaveLength(1);
    expect(new Set(result.map((row) => row.id)).size).toBe(1);
    expect(await query("select count(*) from msrc_outbox.messages;")).toBe("1");
    expect(await query("select count(*) from msrc_outbox.identities;")).toBe("1");
  });

  it("two overlapping transactions never receive the same claimed row", async () => {
    await Promise.all(Array.from({ length: 10 }, (_, index) => enqueue(index)));
    const first = query(`begin; set local role service_role;
      select public.msrc_outbox_claim(${literal(randomUUID())},5,1000); reset role;
      select pg_advisory_xact_lock(${marker}); select pg_sleep(1); commit;`);
    await barrier();
    const second = claim(randomUUID(), 5);
    const [firstRaw, secondRows] = await Promise.all([first, second]);
    const firstRows = JSON.parse(firstRaw.split("\n").find((row) => row.startsWith("["))!) as OutboxMessage[];
    expect(firstRows).toHaveLength(5);
    expect(secondRows).toHaveLength(5);
    expect(new Set([...firstRows, ...secondRows].map((row) => row.id)).size).toBe(10);
    expect(await query("select attempt_count from msrc_outbox.daily_attempts;")).toBe("10");
  });

  it("SKIP LOCKED passes a separately locked message instead of blocking or double-claiming", async () => {
    const first = await enqueue(1);
    const second = await enqueue(2);
    const locker = query(`begin; select id from msrc_outbox.messages where id=${literal(first.id)} for update;
      select pg_advisory_xact_lock(${marker}); select pg_sleep(1); commit;`);
    await barrier();
    const rows = await claim(randomUUID(), 10);
    expect(rows.map((row) => row.id)).toEqual([second.id]);
    await locker;
    const next = await claim(randomUUID());
    expect(next.map((row) => row.id)).toEqual([first.id]);
  });

  it("concurrent unrelated claimers cannot exceed one UTC-day cap", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, index) => enqueue(index)));
    await query("update msrc_outbox.settings set daily_cap=3;");
    const results = await Promise.all(Array.from({ length: 12 }, () => claim(randomUUID())));
    expect(results.flat()).toHaveLength(3);
    expect(new Set(results.flat().map((row) => row.id)).size).toBe(3);
    expect(await query("select attempt_count from msrc_outbox.daily_attempts;")).toBe("3");
    expect(await query("select count(*) from msrc_outbox.messages where status='queued';")).toBe("9");
  });

  it("a crash after provider acceptance reuses its exact request and key on lease recovery", async () => {
    await enqueue(1);
    const sender = createTestOutboxSender();
    const store = sqlStore();
    let interrupt = true;
    const crashing: OutboxStore = { ...store, async finish(message, worker, outcome) {
      if (interrupt) { interrupt = false; throw new Error("Synthetic crash before acknowledgment."); }
      return store.finish(message, worker, outcome);
    } };
    await expect(drainOutbox({ store: crashing, sender, dailyCap: 1000 })).rejects.toThrow("Synthetic crash");
    expect(sender.captured.size).toBe(1);
    expect(await query("select count(*) from msrc_outbox.messages where status='sending' and provider_request is not null;")).toBe("1");
    await query("update msrc_outbox.messages set lease_expires_at=clock_timestamp()-interval '1 second';");
    const recovered = await drainOutbox({ store, sender, dailyCap: 1000 });
    expect(recovered.sent).toBe(1);
    expect(sender.captured.size).toBe(1);
    expect(await query("select attempt_count from msrc_outbox.messages where status='sent';")).toBe("2");
  });

  it("parallel drain runs using a test provider finish each database message once", async () => {
    await Promise.all(Array.from({ length: 6 }, (_, index) => enqueue(index)));
    const sender = createTestOutboxSender();
    const store = sqlStore();
    const fixedNow = Date.now();
    const results = await Promise.all([drainOutbox({ store, sender, dailyCap: 1000, now: () => fixedNow }),
      drainOutbox({ store, sender, dailyCap: 1000, now: () => fixedNow })]);
    expect(results.reduce((sum, result) => sum + result.sent, 0)).toBe(6);
    expect(sender.captured.size).toBe(6);
    expect(await query("select count(*) from msrc_outbox.messages where status='sent' and attempt_count=1;")).toBe("6");
  });

  it("anonymous Data API and forged authenticated metadata cannot reach outbox RPCs", async () => {
    const config = boundary();
    const client = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.rpc("msrc_outbox_claim", { p_worker_id: randomUUID(), p_batch_size: 1, p_daily_cap: 1 });
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("42501");
    const hidden = await client.schema("msrc_outbox").from("messages").select("*");
    expect(hidden.data).toBeNull();
    expect(hidden.error?.code).toBe("PGRST106");
    await expect(query(`set role authenticated; set request.jwt.claims='{"role":"service_role","user_metadata":{"role":"super_admin"}}';
      select public.msrc_outbox_claim(${literal(randomUUID())},1,1);`)).rejects.toThrow("SQLSTATE 42501");
    expect(await query("select count(*) from msrc_outbox.messages;")).toBe("0");
  });
});
