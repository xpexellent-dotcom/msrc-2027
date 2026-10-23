import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-067. Requires its own cold disposable reset in GitHub CI:
// ANNOUNCEMENT_DB_TESTS=true pnpm exec vitest run --config
// vitest.integration.config.ts tests/integration/announcement-concurrency.test.ts
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.ANNOUNCEMENT_DB_TESTS === "true";
const edition = "synthetic-announcement-races";
const marker = 202710237;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const id = (n: number) => `e7800000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Announcement fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic announcement query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic announcement SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic announcement SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
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
  throw new Error(`Synthetic announcement ${description} was not observed.`);
}
const barrier = () => observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
const waiting = (name: string) => observed(`select count(*) from pg_stat_activity
 where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
function response(output: string): Record<string, unknown> | undefined {
  return output.split("\n").filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>).find((row) => typeof row.state === "string");
}
const scalar = (output: string) => output.trim().split("\n").at(-1);
function authenticated(staff: number, name: string, sql: string) {
  return `begin;set local application_name='${name}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    set local role authenticated;${sql}`;
}
async function race(firstSql: string, secondSql: string, secondName: string) {
  const first = held(firstSql + `select pg_advisory_xact_lock(${marker});`);
  let second: Promise<string> | undefined;
  try {
    try { await barrier();second = query(secondSql + "commit;");await waiting(secondName); }
    finally { first.release(); }
    return (await Promise.all([first.done, second!])).map(response);
  } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
}
async function fixture(item: number, staff: number, recipient: number) {
  await query(`select pg_temp.registration_staff_fixture(${staff},'${edition}');
    select pg_temp.registration_fixture(${recipient},'${edition}');
    select pg_temp.registration_submit('${edition}',${recipient},md5('${recipient}')||md5('${recipient}'));
    update msrc_registration.requests set status='approved' where actor_id='${actor(recipient)}';
    insert into msrc_announcements.announcements(id,edition_key,subject_en,subject_ar,body_en,body_ar,segments,created_by)
    values('${id(item)}','${edition}','Synthetic announcement','إعلان تجريبي','Synthetic body','نص تجريبي',array['registration_approved'],'${actor(staff)}');`);
  return scalar(await query(`select msrc_announcements.preview(a)->>'previewToken' from msrc_announcements.announcements a where a.id='${id(item)}';`))!;
}
function send(staff: number, name: string, item: number, token: string, operation: number) {
  return authenticated(staff, name, `select public.msrc_staff_announcement_send('${edition}','${id(item)}',1,'${token}','${id(operation)}')::text;`);
}

describe.skipIf(!isolatedCi)("Announcement ordering (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      select pg_temp.registration_settings('${edition}');`);
  });

  it("concurrent sends of the same operation publish one immutable snapshot and one job per account", async () => {
    const token = await fixture(9700, 9700, 9701);
    const results = await race(send(9700, "synthetic-announcement-send-first", 9700, token, 9702),
      send(9700, "synthetic-announcement-send-second", 9700, token, 9702), "synthetic-announcement-send-second");
    expect(results.map((value) => value?.state)).toEqual(["updated", "updated"]);
    expect(scalar(await query(`select count(*) from msrc_announcements.recipients where announcement_id='${id(9700)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_announcements.recipients r join msrc_outbox.messages m on m.id=r.outbox_id where r.announcement_id='${id(9700)}' and m.template_key='announcement' and m.delivery_hold;`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_announcements.audit where announcement_id='${id(9700)}' and event='enqueued';`))).toBe("1");
    await query(`update msrc_registration.requests set status='cancelled' where actor_id='${actor(9701)}';`);
  });

  it("different operations cannot double-send the same reviewed draft version", async () => {
    const token = await fixture(9710, 9710, 9711);
    const results = await race(send(9710, "synthetic-announcement-operations-first", 9710, token, 9712),
      send(9710, "synthetic-announcement-operations-second", 9710, token, 9713), "synthetic-announcement-operations-second");
    expect(results.map((value) => value?.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select count(*) from msrc_announcements.recipients where announcement_id='${id(9710)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_announcements.operations where announcement_id='${id(9710)}';`))).toBe("1");
    await query(`update msrc_registration.requests set status='cancelled' where actor_id='${actor(9711)}';`);
  });

  it("a queued stale draft edit cannot change content already published by a send", async () => {
    const token = await fixture(9720, 9720, 9721);
    const save = authenticated(9720, "synthetic-announcement-edit-second", `select public.msrc_staff_announcement_save('${edition}',
      '{"id":"${id(9720)}","expectedVersion":1,"subjectEn":"Stale overwrite","subjectAr":"تعديل قديم","bodyEn":"Must not overwrite","bodyAr":"نص قديم","segments":["registration_approved"]}'::jsonb)::text;`);
    expect((await race(send(9720, "synthetic-announcement-edit-first", 9720, token, 9722), save, "synthetic-announcement-edit-second")).map((value) => value?.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select subject_en from msrc_announcements.announcements where id='${id(9720)}';`))).toBe("Synthetic announcement");
    await query(`update msrc_registration.requests set status='cancelled' where actor_id='${actor(9721)}';`);
  });

  it("a queued send rechecks exact native session evidence after waiting", async () => {
    const token = await fixture(9730, 9730, 9731);
    const first = `begin;select pg_advisory_xact_lock(hashtextextended('announcements-edition:${edition}',0));
      delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(9730) and authentication_method='totp';`;
    const results = await race(first, send(9730, "synthetic-announcement-revoked-session", 9730, token, 9732), "synthetic-announcement-revoked-session");
    expect(results[1]?.state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_announcements.recipients where announcement_id='${id(9730)}';`))).toBe("0");
    expect(scalar(await query(`select state from msrc_announcements.announcements where id='${id(9730)}';`))).toBe("draft");
    await query(`update msrc_registration.requests set status='cancelled' where actor_id='${actor(9731)}';`);
  });

  it("recipient changes committed while send waits invalidate the reviewed token", async () => {
    const token = await fixture(9740, 9740, 9741);
    const first = `begin;select pg_advisory_xact_lock(hashtextextended('announcements-edition:${edition}',0));
      update msrc_registration.requests set status='cancelled' where actor_id='${actor(9741)}';`;
    const results = await race(first, send(9740, "synthetic-announcement-changed-audience", 9740, token, 9742), "synthetic-announcement-changed-audience");
    expect(results[1]?.state).toBe("conflict");
    expect(scalar(await query(`select count(*) from msrc_announcements.recipients where announcement_id='${id(9740)}';`))).toBe("0");
  });

  it.each(["repeatable read", "serializable"] as const)("all public entrypoints reject %s before authorization or lock wait", async (isolation) => {
    const calls = [
      `msrc_staff_announcements_list('${edition}')`,
      `msrc_staff_announcement_save('${edition}','{}'::jsonb)`,
      `msrc_staff_announcement_preview('${edition}','${id(1)}',1)`,
      `msrc_staff_announcement_send('${edition}','${id(1)}',1,'${"a".repeat(64)}','${id(2)}')`,
      `msrc_staff_announcement_cancel('${edition}','${id(1)}',1,'${id(2)}')`,
      `msrc_announcements_maintenance('${edition}')`,
      `msrc_participant_announcements('${edition}','{}'::jsonb)`,
    ];
    const locking = held(`begin;select pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));select pg_advisory_xact_lock(${marker});`);
    try {
      await barrier();
      for (const call of calls) {
        await expect(query(`begin isolation level ${isolation};set local lock_timeout='1s';
          select set_config('request.jwt.claims','{}',true);select public.${call};commit;`)).rejects.toThrow("SQLSTATE 25001");
      }
    } finally { locking.release();await locking.done; }
  });
});
