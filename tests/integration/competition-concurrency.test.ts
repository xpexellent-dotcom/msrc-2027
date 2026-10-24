import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-077 / HAC-01/06/07: genuine multi-connection proofs on disposable CI only.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.COMPETITIONS_DB_TESTS === "true";
const edition = "synthetic-competition-races";
const marker = 2027102414;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const operation = (n: number) => `e7900000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8") + `
create function pg_temp.competition_claims(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;
create function pg_temp.competition_document(title text default 'Synthetic project') returns jsonb language sql immutable as $$
 select jsonb_build_object('title',title,'pitch','Synthetic English project pitch','participationMode','team','track','translating_research',
 'references','Synthetic reference list','links','[]'::jsonb,
 'declarations','{"previouslyPresented":false,"competitionEntered":false,"prizeReceived":false,"fundingReceived":false,"commercialized":false,"aiUsed":false,"originalityPermissions":true,"rulesAcknowledged":true,"ethicsApplicable":false,"mediaNoticeAcknowledged":true,"authorityConfirmed":true,"historyDetails":"","aiTools":"","teamContributions":"Synthetic shared contributions"}'::jsonb);$$;
create function pg_temp.competition_settings() returns jsonb language plpgsql stable as $$
-- ORG-065: start from the preloaded framework rubrics and fill unresolved policies synthetically.
declare c jsonb:=msrc_competitions.hackathon_defaults();k text;begin
 for k in select jsonb_object_keys(c) loop if c->k='null'::jsonb then c:=jsonb_set(c,array[k],to_jsonb('Synthetic approved policy'::text));end if;end loop;
 return c||jsonb_build_object('opensAt',clock_timestamp()-interval '1 day','closesAt',clock_timestamp()+interval '1 day','reviewDeadline',clock_timestamp()+interval '3 days',
 'finalDeckLockAt',clock_timestamp()+interval '5 days','rosterConfirmationDeadline',clock_timestamp()+interval '4 days','whatsappSupportUrl',null,
 'soloConsumesFinalistQuota',true,'finalistCapPerTrack',1,'minimumReviews',2,'thirdReviewDifference',5,'judgeCount',3,'selectionScoreMin',1,'selectionScoreMax',5,
 'requiredActivities','["orientation","mentoring","finals"]'::jsonb);end$$;
`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local" || existsSync("supabase/.temp/project-ref")
    || !resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY })
    || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Competition fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic competition query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { sqlState = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? sqlState; });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic competition SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output); else reject(new Error(`Synthetic competition SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`)); });
    child.stdin.on("error", () => {});
    if (release) { child.stdin.write(helpers + "\n" + sql + "\n"); void release.then(() => child.stdin.end("commit;\n")); }
    else child.stdin.end(helpers + "\n" + sql);
  });
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic competition ${description} was not observed.`);
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
const staff = (n: number, sql: string) => `begin;select pg_temp.competition_claims(${n});set local role authenticated;${sql}`;
const save = (n: number, op: number, id: string | null = null, title = "Synthetic project") =>
  `select public.msrc_competitions_save_draft('${edition}',pg_temp.registration_claims(${n}),'hackathon',${id ? `'${id}'` : "null"},${id ? 1 : 0},pg_temp.competition_document('${title}'),'${operation(op)}')::text;`;
const mutate = (n: number, action: string, payload: string, op: number) => staff(n,
  `select public.msrc_staff_competitions_mutate('${edition}','hackathon','${action}',${payload},'${operation(op)}')::text;`);
async function draft(n: number, op: number): Promise<string> {
  const result = response(await query(save(n, op)));
  expect(result.state).toBe("saved");
  const id = (result.entry as { id: string }).id;
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  return id;
}
async function candidate(n: number, rank: number, op: number): Promise<{ id: string; decisionId: string }> {
  const id = await draft(n, op), base = `'entryId','${id}','expectedVersion',1`;
  expect(response(await query(`select public.msrc_competitions_submit('${edition}',pg_temp.registration_claims(${n}),'hackathon','${id}',1,'${operation(op + 1)}')::text;`)).state).toBe("submitted");
  expect(response(await query(mutate(9683, "eligibility", `jsonb_build_object(${base},'eligibility','eligible','reason','Synthetic eligibility evidence reviewed')`, op + 2) + "commit;")).state).toBe("updated");
  expect(response(await query(mutate(9680, "prepare_packet", `jsonb_build_object(${base},'packet','{"title":"Sanitized project","pitch":"Sanitized English pitch","narrative":"","track":"translating_research"}'::jsonb,'attestation',true)`, op + 3) + "commit;")).state).toBe("prepared");
  for (const [offset, reviewer] of [9681, 9682].entries()) {
    expect(response(await query(mutate(9680, "assign", `jsonb_build_object(${base},'reviewerId','${actor(reviewer)}')`, op + 4 + offset) + "commit;")).state).toBe("assigned");
    const assignment = scalar(await query(`select id from msrc_competitions.assignments where entry_id='${id}' and reviewer_id='${actor(reviewer)}';`));
    expect(response(await query(mutate(reviewer, "review", `jsonb_build_object('assignmentId','${assignment}','expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_relevance","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_development","value":4},{"criterionId":"evidence_rationale","value":4}],"comments":"Independent synthetic assessment"}'::jsonb,'submit',true)`, op + 6 + offset) + "commit;")).state).toBe("updated");
  }
  const decision = response(await query(mutate(9680, "select", `jsonb_build_object(${base},'outcome','accept','reason','Synthetic committee rationale','rank',${rank},'tieResolution','Synthetic explicit ranking justification')`, op + 8) + "commit;"));
  expect(decision.state).toBe("prepared");
  expect(decision.decisionId).toMatch(/^[0-9a-f-]{36}$/);
  return { id, decisionId: String(decision.decisionId) };
}

describe.skipIf(!isolatedCi)("Competition transaction races (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      insert into msrc_competitions.settings(edition_key,kind,version,configuration,enabled,evidence_ready) values('${edition}','hackathon',1,pg_temp.competition_settings(),true,true);
      insert into msrc_competitions.settings_versions select edition_key,kind,version,configuration from msrc_competitions.settings where edition_key='${edition}' and kind='hackathon';
      ${Array.from({ length: 4 }, (_, i) => `select pg_temp.registration_fixture(${9620 + i},'${edition}');`).join("\n")}
      select pg_temp.registration_staff_fixture(9680,'${edition}','scientificAdministrator');
      select pg_temp.registration_staff_fixture(9681,'${edition}','hackathonReviewer');
      select pg_temp.registration_staff_fixture(9682,'${edition}','hackathonReviewer');
      select pg_temp.registration_staff_fixture(9683,'${edition}','registrationWorkshopAdministrator');
      insert into msrc_competitions.hackathon_profiles(edition_key,actor_id,university,field_of_study,phone,enrolled_in_saudi_university)
        select '${edition}',pg_temp.registration_actor(n),'Synthetic University','Synthetic Medicine','+966 500 000 000',true from generate_series(9620,9623) n;
      insert into msrc_competitions.reviewer_profiles values('${edition}','${actor(9681)}',array['Independent synthetic institute A']),('${edition}','${actor(9682)}',array['Independent synthetic institute B']);
      commit;`);
  });
  it("concurrent retries create one draft and changed input cannot reuse its operation", async () => {
    const results = await race("begin;" + save(9620, 100), "begin;" + save(9620, 100), "competition-operation-race");
    expect(results.map((row) => row.state)).toEqual(["saved", "saved"]);
    expect(results[0].entry).toEqual(results[1].entry);
    expect(scalar(await query(`select count(*) from msrc_competitions.entries where edition_key='${edition}' and lead_id='${actor(9620)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_competitions.operations where edition_key='${edition}' and actor_id='${actor(9620)}' and operation_id='${operation(100)}';`))).toBe("1");
    expect(response(await query(save(9620, 100, null, "Changed operation input"))).state).toBe("conflict");
    expect(scalar(await query(`select document->>'title' from msrc_competitions.entries where edition_key='${edition}' and lead_id='${actor(9620)}';`))).toBe("Synthetic project");
  });
  it("concurrent stale draft writes retain only the winning version", async () => {
    const id = await draft(9621, 110);
    const results = await race("begin;" + save(9621, 111, id, "Winning revision"), "begin;" + save(9621, 112, id, "Stale revision"), "competition-draft-cas-race");
    expect(results.map((row) => row.state)).toEqual(["saved", "conflict"]);
    expect(scalar(await query(`select document->>'title' from msrc_competitions.entries where id='${id}';`))).toBe("Winning revision");
    expect(scalar(await query(`select version from msrc_competitions.entries where id='${id}';`))).toBe("2");
    expect(scalar(await query(`select count(*) from msrc_competitions.audit where edition_key='${edition}' and target_id='${id}' and event='participant.save';`))).toBe("2");
  });
  it("concurrent authorized publications cannot exceed the last configured track finalist place", async () => {
    const first = await candidate(9622, 1, 200), second = await candidate(9623, 2, 220);
    const publish = (entry: typeof first, op: number) => mutate(9680, "publish_selection", `jsonb_build_object('entryId','${entry.id}','expectedVersion',1,'decisionId','${entry.decisionId}')`, op);
    const results = await race(publish(first, 240), publish(second, 241), "competition-finalist-cap-race");
    expect(results.map((row) => row.state)).toEqual(["selected", "full"]);
    expect(scalar(await query(`select count(*) from msrc_competitions.entries where edition_key='${edition}' and kind='hackathon' and status='accepted' and document->>'track'='translating_research';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_competitions.publications where decision_id in('${first.decisionId}','${second.decisionId}');`))).toBe("1");
    expect(scalar(await query(`select status from msrc_competitions.entries where id='${second.id}';`))).toBe("review");
    expect(scalar(await query(`select count(*) from msrc_competitions.publications where decision_id='${second.decisionId}';`))).toBe("0");
    expect(scalar(await query(`select count(*) from msrc_competitions.decisions where id='${second.decisionId}';`))).toBe("1");
  });
});
