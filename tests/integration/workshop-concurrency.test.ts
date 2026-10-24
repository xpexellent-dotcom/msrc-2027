import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-074 / WKS-03..06: cold disposable Linux CI only; never hosted data.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.WORKSHOP_DB_TESTS === "true";
const edition = "synthetic-workshop-races", marker = 202710241;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const id = (n: number) => `eb100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local" || existsSync("supabase/.temp/project-ref")
    || !resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY })
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Workshop fixtures require an unlinked disposable loopback Linux GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic workshop query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { const value = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1]; if (value) state = value; });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic workshop SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic workshop SQL failed (SQLSTATE ${state}); diagnostics withheld.`)); });
    child.stdin.on("error", () => {});
    if (release) { child.stdin.write(helpers + "\n" + sql + "\n"); void release.then(() => child.stdin.end("commit;\n")); }
    else child.stdin.end(helpers + "\n" + sql);
  });
}
function held(sql: string) { let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; }); return { done: query(sql, gate), release }; }
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic workshop ${description} was not observed.`);
}
const barrier = () => observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
const waiting = (name: string) => observed(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
const scalar = (value: string) => value.trim().split("\n").at(-1);
function response(output: string): Record<string, unknown> | undefined { return output.split("\n").filter((line) => line.startsWith("{"))
  .map((line) => JSON.parse(line) as Record<string, unknown>).find((value) => typeof value.state === "string"); }
function participant(n: number, name: string, input: Record<string, unknown>) { return `begin;set local application_name='${name}';
  select public.msrc_workshop_participant_mutate('${edition}',pg_temp.registration_claims(${n}),'${JSON.stringify(input)}'::jsonb)::text;`; }
function staff(n: number, name: string, input: Record<string, unknown>) { return `begin;set local application_name='${name}';
  select set_config('request.jwt.claims',pg_temp.registration_claims(${n})::text,true);set local role authenticated;
  select public.msrc_staff_workshop_mutate('${edition}','${JSON.stringify(input)}'::jsonb)::text;`; }
async function race(firstSql: string, secondSql: string, secondName: string) {
  const first = held(firstSql + `select pg_advisory_xact_lock(${marker});`); let second: Promise<string> | undefined;
  try {
    try { await barrier(); second = query(secondSql + "commit;"); await waiting(secondName); }
    finally { first.release(); }
    return (await Promise.all([first.done, second!])).map(response);
  } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
}
async function workshop(n: number, capacity = 1, offsetHours = 0) {
  await query(`insert into msrc_workshops.workshops(id,edition_key,published,title_en,title_ar,description_en,description_ar,instructor,room,start_at,end_at,capacity,
    eligibility_en,eligibility_ar,eligibility_rule,price_minor,currency,booking_deadline,transfer_buffer_minutes)
    values('${id(n)}','${edition}',true,'Synthetic workshop','ورشة تجريبية','Synthetic description','وصف تجريبي','Synthetic instructor','Synthetic room',
    clock_timestamp()+interval '10 days'+make_interval(hours=>${offsetHours}),clock_timestamp()+interval '10 days'+make_interval(hours=>${offsetHours + 1}),${capacity},
    'Confirmed conference registration','تسجيل مؤكد في المؤتمر','confirmed_registration',0,'SAR',clock_timestamp()+interval '5 days',0);`);
}
describe.skipIf(!isolatedCi)("Workshop allocation contention (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;select pg_temp.registration_settings('${edition}');
      insert into msrc_workshops.settings(edition_key,enabled,hold_hours,offer_hours,mock_payment_enabled) values('${edition}',true,2,1,true);
      select pg_temp.registration_staff_fixture(9800,'${edition}');select pg_temp.registration_staff_fixture(9801,'${edition}');
      select pg_temp.registration_staff_fixture(9802,'${edition}');
      ${Array.from({ length: 10 }, (_, i) => `select pg_temp.registration_fixture(${9810 + i},'${edition}');`).join("\n")}
      commit;`);
    // Native sessions commit before any RPC validates statement_timestamp().
    await query(`begin;${Array.from({ length: 10 }, (_, i) => `select pg_temp.registration_submit('${edition}',${9810 + i},md5('${9810 + i}')||md5('${9810 + i}'));`).join("\n")}
      update msrc_registration.requests set status='confirmed' where edition_key='${edition}';commit;`);
  });
  it("the last seat has exactly one winner and one durable allocation", async () => {
    await workshop(1);
    const name = "synthetic-workshop-last-second";
    const results = await race(participant(9810, "synthetic-workshop-last-first", { action: "request", workshopId: id(1), operationId: id(101) }), participant(9811, name, { action: "request", workshopId: id(1), operationId: id(102) }), name);
    expect(results.map((value) => value?.state)).toEqual(["updated", "full"]);
    expect(scalar(await query(`select count(*) from msrc_workshops.bookings where workshop_id='${id(1)}' and status='held';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_workshops.audit where workshop_id='${id(1)}' and event='booking.requested';`))).toBe("1");
  });
  it("concurrent retries preserve one request, audit and held notice", async () => {
    await workshop(2);
    const input = { action: "request", workshopId: id(2), operationId: id(103) }, name = "synthetic-workshop-retry-second";
    const results = await race(participant(9812, "synthetic-workshop-retry-first", input), participant(9812, name, input), name);
    expect(results[0]).toEqual(results[1]);
    expect(scalar(await query(`select count(*) from msrc_workshops.bookings where workshop_id='${id(2)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='workshop_notice' and payload->>'booking_id'=(select id::text from msrc_workshops.bookings where workshop_id='${id(2)}') and delivery_hold;`))).toBe("1");
  });
  it("two simultaneous overlapping requests by one participant cannot both hold seats", async () => {
    await workshop(3); await workshop(4);
    const name = "synthetic-workshop-overlap-second";
    expect((await race(participant(9813, "synthetic-workshop-overlap-first", { action: "request", workshopId: id(3), operationId: id(104) }), participant(9813, name, { action: "request", workshopId: id(4), operationId: id(105) }), name)).map((value) => value?.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select count(*) from msrc_workshops.bookings where actor_id='${actor(9813)}' and status='held';`))).toBe("1");
  });
  it("a request queued behind conference cancellation rechecks confirmed registration", async () => {
    await workshop(5);
    const name = "synthetic-workshop-cancel-second";
    const first = `begin;select 1 from msrc_registration.settings where edition_key='${edition}' for update;
      update msrc_registration.requests set status='cancelled' where edition_key='${edition}' and actor_id='${actor(9814)}';`;
    const results = await race(first, participant(9814, name, { action: "request", workshopId: id(5), operationId: id(106) }), name);
    expect(results[1]?.state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_workshops.bookings where workshop_id='${id(5)}';`))).toBe("0");
  });
  it("an awaiting staff action cannot reuse revoked native assurance", async () => {
    await workshop(6);
    const created = response(await query(participant(9815, "synthetic-workshop-native-request", { action: "request", workshopId: id(6), operationId: id(107) }) + "commit;"));
    const bookingId = (created?.booking as { id: string }).id, name = "synthetic-workshop-native-second";
    const first = `begin;select 1 from msrc_registration.settings where edition_key='${edition}' for update;
      delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(9802) and authentication_method='totp';`;
    const results = await race(first, staff(9802, name, { action: "approve", bookingId, operationId: id(108), reason: "Synthetic approval" }), name);
    expect(results[1]?.state).toBe("denied");
    expect(scalar(await query(`select status from msrc_workshops.bookings where id='${bookingId}';`))).toBe("held");
  });
  it("capacity edits queued behind allocation cannot lower capacity below committed holds", async () => {
    await workshop(7, 2);
    const created = response(await query(participant(9816, "synthetic-workshop-capacity-first-request", { action: "request", workshopId: id(7), operationId: id(109) }) + "commit;"));
    expect(created?.state).toBe("updated");
    const raw = scalar(await query(`select (msrc_workshops.workshop_projection(w)||jsonb_build_object('instructorActorId',null))::text from msrc_workshops.workshops w where w.id='${id(7)}';`));
    const fields = JSON.parse(raw!) as Record<string, unknown>;
    for (const key of ["removed", "remaining", "ready"]) delete fields[key]; fields.capacity = 1;
    const name = "synthetic-workshop-capacity-second";
    const results = await race(participant(9817, "synthetic-workshop-capacity-last", { action: "request", workshopId: id(7), operationId: id(110) }), staff(9800, name, { action: "save_workshop", workshop: fields, operationId: id(111), reason: "Synthetic capacity edit" }), name);
    expect(results.map((value) => value?.state)).toEqual(["updated", "capacity_below_allocations"]);
    expect(scalar(await query(`select capacity from msrc_workshops.workshops where id='${id(7)}';`))).toBe("2");
  });
});
