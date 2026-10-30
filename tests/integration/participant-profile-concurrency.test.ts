import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// Two real PostgreSQL connections. Never run against hosted/user data.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.PARTICIPANT_PROFILE_DB_TESTS === "true";
const edition = "synthetic-participant-profile-races";
const marker = 202710271;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8")
  + readFileSync("supabase/tests/support/abstract-fixtures.psql", "utf8")
  + readFileSync("supabase/tests/support/profile-complete-fixtures.psql", "utf8");
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void | string>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Participant profile fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic participant profile query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic participant profile SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic participant profile SQL failed (SQLSTATE ${state}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      void release.then((remaining) => child.stdin.end((remaining ?? "") + "commit;\n"));
    } else child.stdin.end(helpers + "\n" + sql);
  });
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic participant profile ${description} was not observed.`);
}
function response(output: string): Record<string, unknown> {
  return output.split("\n").filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>).find((row) => typeof row.state === "string") ?? {};
}
const scalar = (output: string) => output.trim().split("\n").at(-1);
async function race(firstSql: string, secondSql: string, name: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const first = query(firstSql + `select pg_advisory_xact_lock(${marker});`, gate);
  let second: Promise<string> | undefined;
  try {
    try {
      await observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
      second = query(`set application_name='${name}';` + secondSql + "commit;");
      await observed(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending lock wait");
    } finally { release(); }
    return (await Promise.all([first, second!])).map(response);
  } finally { await Promise.allSettled([first, ...(second ? [second] : [])]); }
}
const save = (n: number, institution: string, version: number) =>
  `select public.msrc_participant_profile_save('${edition}',pg_temp.registration_claims(${n}),jsonb_build_object('institutionOther','${institution}','status','internship','interests','[]'::jsonb),${version})::text;`;

describe.skipIf(!isolatedCi)("Participant profile concurrent edits (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${edition}');
      select pg_temp.registration_fixture(88601,'${edition}');
      select pg_temp.registration_fixture(88602,'${edition}');
      select pg_temp.registration_fixture(88603,'${edition}');
      select pg_temp.registration_fixture(88604,'${edition}');
      select pg_temp.registration_fixture(88605,'${edition}');
      select pg_temp.registration_fixture(88606,'${edition}');
      select pg_temp.registration_fixture(88607,'${edition}');
      select pg_temp.registration_fixture(88608,'${edition}');
      select pg_temp.registration_fixture(88609,'${edition}');
      insert into msrc_abstracts.settings(edition_key,version,configuration,enabled,evidence_ready)
        values('${edition}',1,pg_temp.abstract_settings(),true,true);
-- ENG-092: explicit synthetic similarity readiness, never a production default.
insert into msrc_abstracts.screening_settings(edition_key,version,similarity_threshold,actor_id,session_id) values('${edition}',1,30,gen_random_uuid(),gen_random_uuid());
      select pg_temp.complete_profile(88606,'${edition}');
      select pg_temp.complete_profile(88609,'${edition}');
      update msrc_participant.profile_details set student_status='year_6' where actor_id in('${actor(88606)}','${actor(88609)}');
      insert into msrc_competitions.settings(edition_key,kind,version,configuration,enabled,evidence_ready)
        values('${edition}','three_minute_thesis',1,pg_temp.profile_competition_settings('three_minute_thesis'),true,true);
      commit;`);
  });
  it("two simultaneous saves with the same expected version preserve exactly one winner", async () => {
    const results = await race("begin;" + save(88601, "Winning synthetic institution", 0),
      "begin;" + save(88601, "Losing synthetic institution", 0), "participant-profile-edit-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "conflict"]);
    expect(scalar(await query(`select institution_other from msrc_participant.profile_details where actor_id='${actor(88601)}';`))).toBe("Winning synthetic institution");
    expect(scalar(await query(`select version from msrc_participant.profile_details where actor_id='${actor(88601)}';`))).toBe("1");
    const other = response(await query(`select public.msrc_participant_profile_read('${edition}',pg_temp.registration_claims(88602))::text;`));
    expect(other.state).toBe("ready");
    expect(other.profile).toMatchObject({ institution: null, avatarObject: null, version: 0 });
  });
  it("abandonment waiting for a successful commit cannot delete its active avatar", async () => {
    const path = "f8860000-0000-4000-8000-000000000003.webp";
    expect(response(await query(`select public.msrc_participant_profile_avatar_reserve('${edition}',pg_temp.registration_claims(88603),'${path}')::text;`)).state).toBe("reserved");
    const results = await race(`begin;select public.msrc_participant_profile_avatar_register('${edition}',pg_temp.registration_claims(88603),'${path}',0)::text;`,
      `begin;select public.msrc_participant_profile_avatar_abandon('${edition}',pg_temp.registration_claims(88603),'${path}')::text;`, "participant-profile-abandon-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "active"]);
    expect(scalar(await query(`select state from msrc_participant.avatar_objects where object_name='${path}';`))).toBe("active");
    expect(scalar(await query(`select avatar_object from msrc_participant.profile_details where actor_id='${actor(88603)}';`))).toBe(path);
  });
  it("a native session removed while save waits is denied after its lock", async () => {
    const results = await race(`begin;delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(88604);
      delete from auth.sessions where id=pg_temp.registration_session(88604);`,
    "begin;" + save(88604, "Denied synthetic institution", 0), "participant-profile-session-race");
    expect(results[1].state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_participant.profile_details where actor_id='${actor(88604)}';`))).toBe("0");
  });
  it.each(["repeatable read", "serializable"])("profile writes refuse %s isolation", async (isolation) => {
    await expect(query(`begin isolation level ${isolation};${save(88602, "Synthetic isolation guard", 0)}commit;`)).rejects.toThrow("SQLSTATE 25001");
  });
  it("a conference-date extension committed while retention waits preserves the optional profile", async () => {
    expect(response(await query(save(88605, "Synthetic retained institution", 0))).state).toBe("ready");
    await query(`update msrc_registration.settings set conference_days=array[(current_date-interval '2 years')::date] where edition_key='${edition}';`);
    const results = await race(`begin;update msrc_registration.settings set conference_days=array[current_date] where edition_key='${edition}';`,
      "begin;select public.msrc_participant_profile_cleanup(10)::text;", "participant-profile-retention-race");
    expect(results[1]).toMatchObject({ state: "ready", erased: 0 });
    expect(scalar(await query(`select institution_other from msrc_participant.profile_details where actor_id='${actor(88605)}';`))).toBe("Synthetic retained institution");
  });
  it("identity removal committed while finalization waits prevents the submission snapshot", async () => {
    const saved = response(await query(`select public.msrc_abstracts_save_draft('${edition}',pg_temp.registration_claims(88606),null,0,
      pg_temp.abstract_document(),gen_random_uuid())::text;`));
    expect(saved.state).toBe("saved");
    const submissionId = (saved.submission as { id: string }).id;
    const results = await race(`begin;select public.msrc_participant_profile_save('${edition}',pg_temp.registration_claims(88606),
      msrc_participant.profile_save_input(msrc_participant.profile_projection('${actor(88606)}'))||'{"removeIdentity":true}'::jsonb,1)::text;`,
    `begin;select public.msrc_abstracts_finalize('${edition}',pg_temp.registration_claims(88606),'${submissionId}',1,gen_random_uuid())::text;`,
    "participant-profile-finalization-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "profile_incomplete"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.snapshots where submission_id='${submissionId}';`))).toBe("0");
  });
  it("two participants racing with the same identity HMAC preserve one encrypted record", async () => {
    const identitySave = (n: number) => `begin;select public.msrc_participant_profile_save('${edition}',pg_temp.registration_claims(${n}),
      jsonb_build_object('interests','[]'::jsonb,'identity',jsonb_build_object('type','passport',
        'envelope','v1:synthetic:YWJjZGVmZ2hpamts:YWJjZGVmZ2hpamtsbW5vcA==:U1lOVEhFVElDX0VOVkVMT1BF',
        'lookup',repeat('f',64),'last4','0000')),0)::text;`;
    const results = await race(identitySave(88607), identitySave(88608), "participant-profile-identity-race");
    expect(results.map((row) => row.state)).toEqual(["ready", "conflict"]);
    expect(scalar(await query(`select count(*) from msrc_participant.profile_details where edition_key='${edition}' and identity_lookup=repeat('f',64);`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_participant.profile_details where actor_id='${actor(88608)}';`))).toBe("0");
  });
  it("simultaneous abstract and 3MT submissions for one actor follow a common lock order", async () => {
    const abstract = response(await query(`select public.msrc_abstracts_save_draft('${edition}',pg_temp.registration_claims(88609),null,0,
      pg_temp.abstract_document(),gen_random_uuid())::text;`));
    expect(abstract.state).toBe("saved");
    const thesis = response(await query(`select public.msrc_competitions_save_draft('${edition}',pg_temp.registration_claims(88609),'three_minute_thesis',null,0,
      '{"title":"Synthetic postgraduate project","narrative":"Synthetic study narrative","presenter":"Synthetic Presenter","affiliation":"Synthetic Institute","declarations":{"postgraduate":true,"authorityConfirmed":true}}'::jsonb,gen_random_uuid())::text;`));
    expect(thesis.state).toBe("saved");
    const submissionId = (abstract.submission as { id: string }).id, entryId = (thesis.entry as { id: string }).id;
    let continueFirst!: (sql: string) => void;
    const barrier = new Promise<string>((resolve) => { continueFirst = resolve; });
    const first = query(`begin;select 1 from msrc_abstracts.settings where edition_key='${edition}' for update;
      select pg_advisory_xact_lock(${marker});`, barrier);
    let second: Promise<string> | undefined;
    try {
      await observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "cross-submission settings lock");
      second = query(`set application_name='participant-profile-cross-submit-race';begin;
        select public.msrc_competitions_submit('${edition}',pg_temp.registration_claims(88609),'three_minute_thesis','${entryId}',1,gen_random_uuid())::text;commit;`);
      await observed("select count(*) from pg_stat_activity where application_name='participant-profile-cross-submit-race' and wait_event_type='Lock' and state='active';", "cross-submission contender");
      // An inverted profile-before-settings lock in the competition path would
      // deadlock here against the abstract's settings-before-profile order.
      continueFirst(`select public.msrc_abstracts_finalize('${edition}',pg_temp.registration_claims(88609),'${submissionId}',1,gen_random_uuid())::text;`);
      const results = (await Promise.all([first, second])).map(response);
      expect(results.map((row) => row.state)).toEqual(["finalized", "submitted"]);
    } finally {
      continueFirst("");
      await Promise.allSettled([first, ...(second ? [second] : [])]);
    }
  });
});
