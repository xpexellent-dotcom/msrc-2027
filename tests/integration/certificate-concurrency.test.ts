import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-075 / CRT-01..06, AT-14: isolated disposable Linux CI only, never hosted.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.CERTIFICATE_DB_TESTS === "true";
const edition = "synthetic-certificate-races", marker = 202710242;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const id = (n: number) => `ec750000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pdf = Buffer.from("%PDF-1.7 synthetic concurrency fixture").toString("base64");

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local" || existsSync("supabase/.temp/project-ref")
    || !resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY })
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Certificate fixtures require an unlinked disposable loopback Linux GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic certificate query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { const value = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1]; if (value) state = value; });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic certificate SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic certificate SQL failed (SQLSTATE ${state}); diagnostics withheld.`)); });
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
  throw new Error(`Synthetic certificate ${description} was not observed.`);
}
const barrier = () => observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
const waiting = (name: string) => observed(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
const scalar = (value: string) => value.trim().split("\n").at(-1);
function response(output: string): Record<string, unknown> | undefined {
  return output.split("\n").filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>).find((value) => typeof value.state === "string");
}
function participant(n: number, name: string) { return `begin;set local application_name='${name}';
  select public.msrc_certificates_participant_manage('${edition}',pg_temp.registration_claims(${n}),
  '{"action":"submitSurvey","surveyId":"${id(1)}","answers":{"rating":3}}'::jsonb)::text;`; }
function staff(name: string, input: Record<string, unknown>) { return `begin;set local application_name='${name}';
  select set_config('request.jwt.claims',pg_temp.registration_claims(9900)::text,true);set local role authenticated;
  select public.msrc_staff_certificates_manage('${edition}','${JSON.stringify(input)}'::jsonb)::text;`; }
async function race(firstSql: string, secondSql: string, secondName: string) {
  const first = held(firstSql + `select pg_advisory_xact_lock(${marker});`); let second: Promise<string> | undefined;
  try {
    try { await barrier(); second = query(secondSql + "commit;"); await waiting(secondName); }
    finally { first.release(); }
    return (await Promise.all([first.done, second!])).map(response);
  } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
}
function claim(worker: string, name: string) { return `begin;set local application_name='${name}';
  select jsonb_build_object('state','claimed','certificates',public.msrc_certificates_generation_claim('${worker}',10))::text;`; }
function finish(certificateId: string, worker: string, lease: string, name: string) { return `begin;set local application_name='${name}';
  select public.msrc_certificates_generation_finish('${certificateId}','${worker}','${lease}','${pdf}')::text;`; }

describe.skipIf(!isolatedCi)("Certificate and S2 contention (disposable GitHub CI only)", () => {
  let certificateId = "", lease = "";
  const worker = id(200);
  beforeAll(async () => {
    await query(`begin;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;select pg_temp.registration_settings('${edition}');
      update msrc_registration.settings set conference_days=array[date '2040-01-01',date '2040-01-02'] where edition_key='${edition}';
      select pg_temp.registration_staff_fixture(9900,'${edition}');
      select pg_temp.registration_fixture(9910,'${edition}');select pg_temp.registration_fixture(9911,'${edition}');commit;`);
    // Native sessions commit in a separate statement before current-session RPCs.
    await query(`begin;select pg_temp.registration_submit('${edition}',9910,md5('9910')||md5('9910'));
      select pg_temp.registration_submit('${edition}',9911,md5('9911')||md5('9911'));
      update msrc_registration.requests set status='confirmed' where edition_key='${edition}';
      insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,method)
      select t.id,d.day,'${actor(9900)}','scan' from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
      cross join (values(date '2040-01-01'),(date '2040-01-02')) d(day) where r.edition_key='${edition}';
      insert into msrc_certificates.settings(edition_key,enabled,surveys_enabled,unlinking_approved,feedback_retention_days,download_retention_days,verification_retention_days)
      values('${edition}',true,true,true,30,30,365);
      insert into msrc_certificates.surveys(id,edition_key,kind,title_en,title_ar,published,deadline,questions)
      values('${id(1)}','${edition}','conference','Synthetic survey','استبيان تجريبي',true,clock_timestamp()+interval '1 day',
      '[{"id":"rating","type":"rating_scale","labelEn":"Synthetic rating","labelAr":"تقييم تجريبي","required":true,"scaleMin":1,"scaleMax":5}]'::jsonb);
      insert into msrc_certificates.templates(id,edition_key,kind,title_en,title_ar,signature,approved,approved_by,approved_at)
      values('${id(2)}','${edition}','conference','Full Two-Day Conference Attendance','حضور المؤتمر لكلا اليومين','Synthetic signature',true,'${actor(9900)}',clock_timestamp());commit;`);
  });
  it("simultaneous survey retries retain one completion and one unlinked answer set", async () => {
    const name = "synthetic-certificate-survey-second";
    const results = await race(participant(9910, "synthetic-certificate-survey-first"), participant(9910, name), name);
    expect(results.map((value) => value?.state)).toEqual(["completed", "completed"]);
    expect(scalar(await query(`select count(*) from msrc_certificates.completions where survey_id='${id(1)}' and actor_id='${actor(9910)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_certificates.answers where survey_id='${id(1)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_certificates.operations where actor_id='${actor(9910)}';`))).toBe("0");
    expect(scalar(await query(`select count(*) from msrc_certificates.audit where performer_id='${actor(9910)}';`))).toBe("0");
  });
  it("simultaneous identical release operations create one batch and certificate", async () => {
    const input = { action: "release", templateId: id(2), expectedVersion: 1, workshopId: null, operationId: id(100) }, name = "synthetic-certificate-release-second";
    const results = await race(staff("synthetic-certificate-release-first", input), staff(name, input), name);
    expect(results[0]?.state).toBe("released");expect(results[0]?.count).toBe(1);expect(results[0]).toEqual(results[1]);
    expect(scalar(await query(`select count(*) from msrc_certificates.batches where edition_key='${edition}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_certificates.certificates where edition_key='${edition}';`))).toBe("1");
  });
  it("simultaneous generation workers cannot share a certificate lease", async () => {
    const first = held(claim(worker, "synthetic-certificate-claim-first") + `select pg_advisory_xact_lock(${marker});`);
    try {
      await barrier();
      const second = response(await query(claim(id(201), "synthetic-certificate-claim-second") + "commit;"));
      expect(second?.certificates).toEqual([]);
    } finally { first.release(); }
    const result = response(await first.done), rows = result?.certificates as { id: string; leaseToken: string }[];
    expect(rows).toHaveLength(1);certificateId = rows[0].id;lease = rows[0].leaseToken;
    expect(scalar(await query(`select count(*) from msrc_certificates.certificates where edition_key='${edition}' and worker_id='${worker}' and status='pending';`))).toBe("1");
  });
  it("revocation committed before an awaiting generator prevents issuance and email", async () => {
    const name = "synthetic-certificate-finish-after-revoke";
    const results = await race(staff("synthetic-certificate-revoke-first", { action: "revoke", certificateId, operationId: id(101), reason: "Synthetic revoked evidence" }), finish(certificateId, worker, lease, name), name);
    expect(results.map((value) => value?.state)).toEqual(["revoked", "denied"]);
    expect(scalar(await query(`select status from msrc_certificates.certificates where id='${certificateId}';`))).toBe("revoked");
    expect(scalar(await query(`select count(*) from msrc_certificates.certificates where id='${certificateId}' and pdf is not null;`))).toBe("0");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='certificate_notice' and payload->>'certificate_id'='${certificateId}';`))).toBe("0");
  });
  it("revocation queued after generation leaves the issued snapshot revoked and notice held", async () => {
    await query(`update msrc_registration.requests set status='cancelled' where edition_key='${edition}' and actor_id='${actor(9910)}';`);
    expect(response(await query(participant(9911, "synthetic-certificate-next-survey") + "commit;"))?.state).toBe("completed");
    expect(response(await query(staff("synthetic-certificate-next-release", { action: "release", templateId: id(2), expectedVersion: 1, workshopId: null, operationId: id(102) }) + "commit;"))?.count).toBe(1);
    const claimed = response(await query(claim(id(202), "synthetic-certificate-next-claim") + "commit;"))?.certificates as { id: string; leaseToken: string }[];
    expect(claimed).toHaveLength(1);
    const next = claimed[0], name = "synthetic-certificate-revoke-after-finish";
    const results = await race(finish(next.id, id(202), next.leaseToken, "synthetic-certificate-finish-first"), staff(name, { action: "revoke", certificateId: next.id, operationId: id(103), reason: "Synthetic subsequent revocation" }), name);
    expect(results.map((value) => value?.state)).toEqual(["issued", "revoked"]);
    expect(scalar(await query(`select status from msrc_certificates.certificates where id='${next.id}';`))).toBe("revoked");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='certificate_notice' and payload->>'certificate_id'='${next.id}' and delivery_hold and status='queued';`))).toBe("1");
    expect(response(await query(`select public.msrc_certificates_verify((select code from msrc_certificates.certificates where id='${next.id}'),repeat('a',64))||'{"state":"verified"}'::jsonb;`))?.validity).toBe("revoked");
  });
  it("an approval waiting behind a template edit cannot approve an unseen signature", async () => {
    const name = "synthetic-certificate-stale-approval";
    const results = await race(staff("synthetic-certificate-signature-edit", { action: "saveTemplate", operationId: id(104), template: { id: id(2), kind: "conference", version: 1, titleEn: "Full Two-Day Conference Attendance", titleAr: "حضور المؤتمر لكلا اليومين", signature: "Synthetic revised signature" } }), staff(name, { action: "approveTemplate", operationId: id(105), templateId: id(2), expectedVersion: 1 }), name);
    expect(results.map((value) => value?.state)).toEqual(["saved", "conflict"]);
    expect(scalar(await query(`select version::text||':'||approved::text from msrc_certificates.templates where id='${id(2)}';`))).toBe("2:false");
    expect(response(await query(staff("synthetic-certificate-stale-release", { action: "release", operationId: id(106), templateId: id(2), expectedVersion: 1, workshopId: null }) + "commit;"))?.state).toBe("conflict");
  });
});
