import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";
import { decryptIdentityDocument, encryptIdentityDocument, identityDocumentHash, maskIdentityNumber,
  type IdentityCryptoConfig } from "@/features/registration/identity-crypto.server";

// Requires its own cold disposable DB reset, not the parallel shared auth suite:
// REGISTRATION_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/registration-concurrency.test.ts
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.REGISTRATION_DB_TESTS === "true";
const edition = "synthetic-registration-concurrency";
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const marker = 202710161;
function query(sql: string): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || target && target !== "local" || !resolveLocalSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Registration fixtures require disposable loopback GitHub CI.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1",
      "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic registration query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const value = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (value) state = value;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic registration SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic registration SQL failed (SQLSTATE ${state}); personal diagnostics withheld.`)); });
    child.stdin.on("error", () => {});
    child.stdin.end(helpers + "\n" + sql);
  });
}
async function barrier() {
  for (let n = 0; n < 20; n++) {
    if ((await query(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Synthetic registration transaction barrier was not visible.");
}
const jsonLine = (output: string) => output.split("\n").filter((line) => line.startsWith("{"))
  .map((line) => JSON.parse(line)).find((row) => typeof row.state === "string");
describe.skipIf(!isolatedCi)("Registration concurrency and persisted encryption (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${edition}');
      select pg_temp.registration_fixture(20,'${edition}');
      select pg_temp.registration_fixture(21,'${edition}');
      select pg_temp.registration_fixture(22,'${edition}');
      select pg_temp.registration_fixture(23,'${edition}');
      select pg_temp.registration_staff_fixture(120,'${edition}');
      select pg_temp.registration_staff_fixture(121,'${edition}');
      commit;`);
  });
  it("two concurrent submissions return one request and one durable audit", async () => {
    const first = query(`begin;select pg_temp.registration_submit('${edition}',20)::text;
      select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await barrier();
    const results = await Promise.all([first, query(`select pg_temp.registration_submit('${edition}',20)::text;`)]);
    expect(results.map(jsonLine).map((row) => row.state)).toEqual(["submitted", "submitted"]);
    expect(new Set(results.map(jsonLine).map((row) => row.request.id)).size).toBe(1);
    await query(`do $$begin if (select count(*) from msrc_registration.requests where actor_id='${actor(20)}')<>1
      or (select count(*) from msrc_registration.audit where target_actor='${actor(20)}' and event='request.submitted')<>1 then
      raise exception 'Exactly one request and event required';end if;end$$;`);
  });
  it("rechecks the database deadline after waiting for the request lock", async () => {
    await query(`update msrc_registration.settings set closing_at=clock_timestamp()+interval '600 milliseconds' where edition_key='${edition}';`);
    const lock = query(`begin;select pg_advisory_xact_lock(hashtextextended('registration:${edition}:${actor(21)}',0));
      select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await barrier();
    const submitting = query(`select pg_temp.registration_submit('${edition}',21,repeat('c',64))::text;`);
    await lock;
    expect(jsonLine(await submitting).state).toBe("closed");
    await query(`update msrc_registration.settings set closing_at=clock_timestamp()+interval '1 day' where edition_key='${edition}';`);
  });
  it("a designation removed before a waiting submission cannot authorize priority access", async () => {
    await query(`update msrc_registration.settings set general_opening_at=clock_timestamp()+interval '1 hour',
      priority_start_at=clock_timestamp()-interval '1 hour',priority_end_at=clock_timestamp()+interval '30 minutes' where edition_key='${edition}';
      select public.msrc_registration_priority_set('${edition}',pg_temp.registration_claims(120),pg_temp.registration_actor(22),true,'Synthetic duty')::text;`);
    const removing = query(`begin;
      select public.msrc_registration_priority_set('${edition}',pg_temp.registration_claims(120),pg_temp.registration_actor(22),false,'Synthetic removal')::text;
      select pg_advisory_xact_lock(${marker});select pg_sleep(1);commit;`);
    await barrier();
    const submitting = query(`select pg_temp.registration_submit('${edition}',22,repeat('d',64))::text;`);
    await removing;
    expect(jsonLine(await submitting).state).toBe("closed");
    await query(`update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '3 days',
      priority_end_at=clock_timestamp()-interval '2 days',general_opening_at=clock_timestamp()-interval '1 day' where edition_key='${edition}';`);
  });
  it("a restored older-version persisted envelope decrypts after rotating the active key", async () => {
    const config: IdentityCryptoConfig = { keys: { "synthetic-v1": "a1".repeat(32), "synthetic-v2": "b2".repeat(32) }, activeKeyVersion: "synthetic-v1", hmacSecret: "c3".repeat(32) };
    const context = { editionKey: edition, actorId: actor(23), documentType: "passport" as const };
    const number = "FAKE0000", envelope = encryptIdentityDocument(config, context, number);
    const hash = identityDocumentHash(config, context, number), masked = maskIdentityNumber("passport", number);
    const submitted = jsonLine(await query(`select public.msrc_registration_submit('${edition}',pg_temp.registration_claims(23),'passport',
      '${JSON.stringify(envelope)}'::jsonb,'${hash}','${masked}','synthetic-v1','synthetic-terms')::text;`));
    expect(submitted.state).toBe("submitted");
    const read = jsonLine(await query(`begin;select set_config('request.jwt.claims',pg_temp.registration_claims(120)::text,true);
      select public.msrc_staff_identity_reveal('${edition}','${actor(23)}','Synthetic restore drill')::text;commit;`));
    // Read JSON transport like a backup restore. Neither plaintext nor key material went to SQL.
    const restored = JSON.parse(JSON.stringify(read.identityEnvelope));
    expect(decryptIdentityDocument({ ...config, activeKeyVersion: "synthetic-v2" }, context, restored)).toBe(number);
    expect(() => decryptIdentityDocument({ ...config, keys: { "synthetic-v2": config.keys["synthetic-v2"] }, activeKeyVersion: "synthetic-v2" }, context, restored)).toThrow();
  });
});
