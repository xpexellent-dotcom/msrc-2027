import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// Genuine multi-connection PostgreSQL cases; isolated disposable CI only.
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.ABSTRACT_DB_TESTS === "true";
const edition = "synthetic-abstract-races";
const marker = 202710235;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8")
  + readFileSync("supabase/tests/support/abstract-fixtures.psql", "utf8")
  + readFileSync("supabase/tests/support/profile-complete-fixtures.psql", "utf8");
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const operation = (n: number) => `e7900000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Abstract fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic abstract query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      sqlState = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? sqlState;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic abstract SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic abstract SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      void release.then(() => child.stdin.end("commit;\n"));
    } else child.stdin.end(helpers + "\n" + sql);
  });
}
async function observed(sql: string, description: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic abstract ${description} was not observed.`);
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
const staff = (n: number, sql: string) => `begin;select pg_temp.abstract_claims(${n});set local role authenticated;${sql}`;
const save = (n: number, op: number, id: string | null = null, title = "Synthetic study") =>
  `select public.msrc_abstracts_save_draft('${edition}',pg_temp.registration_claims(${n}),${id ? `'${id}'` : "null"},${id ? 1 : 0},
   pg_temp.abstract_document('pi-${n}@example.invalid')||jsonb_build_object('title','${title}'),'${operation(op)}')::text;`;
const finalize = (n: number, id: string, op: number) =>
  `select public.msrc_abstracts_finalize('${edition}',pg_temp.registration_claims(${n}),'${id}',1,'${operation(op)}')::text;`;
async function draft(n: number, op: number, pi?: string): Promise<string> {
  const result = response(await query(save(n, op)));
  const id = (result.submission as { id: string }).id;
  if (pi) await query(`update msrc_abstracts.submissions set document=pg_temp.abstract_document('${pi}') where id='${id}';`);
  return id;
}

describe.skipIf(!isolatedCi)("Abstract/review lock ordering (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      insert into msrc_abstracts.settings(edition_key,version,configuration,enabled,evidence_ready) values('${edition}',1,pg_temp.abstract_settings(),true,true);
      insert into msrc_abstracts.settings_versions values('${edition}',1,pg_temp.abstract_settings());
      ${Array.from({ length: 15 }, (_, i) => `select pg_temp.registration_fixture(${9200 + i},'${edition}');select pg_temp.complete_profile(${9200 + i},'${edition}');`).join("\n")}
      select pg_temp.registration_staff_fixture(9300,'${edition}','scientificAdministrator');
      select pg_temp.registration_staff_fixture(9301,'${edition}','abstractReviewer');
      select pg_temp.registration_staff_fixture(9302,'${edition}','abstractReviewer');
      insert into msrc_abstracts.reviewer_profiles values('${edition}','${actor(9301)}',array['Independent institute one']),('${edition}','${actor(9302)}',array['Independent institute two']);`);
  });
  it("two submitters racing for the second PI application finalize only one", async () => {
    const pi = "shared-pi@example.invalid";
    const first = await draft(9200, 1, pi), second = await draft(9201, 2, pi), third = await draft(9202, 3, pi);
    expect(response(await query(finalize(9200, first, 4))).state).toBe("finalized");
    const results = await race("begin;" + finalize(9201, second, 5), "begin;" + finalize(9202, third, 6), "abstract-pi-race");
    expect(results.map((row) => row.state)).toEqual(["finalized", "pi_limit"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.submissions where edition_key='${edition}' and pi_key='${pi}' and finalized_at is not null;`))).toBe("2");
    expect(scalar(await query(`select count(*) from msrc_abstracts.snapshots where submission_id='${third}';`))).toBe("0");
  });
  it("concurrent draft retries create one application and one operation receipt", async () => {
    const results = await race("begin;" + save(9203, 10), "begin;" + save(9203, 10), "abstract-operation-race");
    expect(results.map((row) => row.state)).toEqual(["saved", "saved"]);
    expect(results[0].submission).toEqual(results[1].submission);
    expect(scalar(await query(`select count(*) from msrc_abstracts.submissions where actor_id='${actor(9203)}';`))).toBe("1");
  });
  it("concurrent stale draft edits cannot overwrite the winning version", async () => {
    const id = await draft(9204, 20);
    const results = await race("begin;" + save(9204, 21, id, "Winning revision"), "begin;" + save(9204, 22, id, "Stale revision"), "abstract-cas-race");
    expect(results.map((row) => row.state)).toEqual(["saved", "conflict"]);
    expect(scalar(await query(`select document->>'title' from msrc_abstracts.submissions where id='${id}';`))).toBe("Winning revision");
  });
  it("closing a window while finalization waits is rechecked after its lock", async () => {
    const id = await draft(9205, 30);
    const results = await race(`begin;update msrc_abstracts.settings set configuration=jsonb_set(configuration,'{closesAt}',to_jsonb(clock_timestamp())) where edition_key='${edition}';`,
      "begin;" + finalize(9205, id, 31), "abstract-close-race");
    expect(results[1].state).toBe("closed");
    await query(`update msrc_abstracts.settings set configuration=pg_temp.abstract_settings() where edition_key='${edition}';`);
  });
  it("a session removed while finalization waits is refused after its lock", async () => {
    const id = await draft(9206, 40);
    const results = await race(`begin;select 1 from msrc_abstracts.settings where edition_key='${edition}' for update;
      delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(9206);delete from auth.sessions where id=pg_temp.registration_session(9206);`,
      "begin;" + finalize(9206, id, 41), "abstract-session-race");
    expect(results[1].state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_abstracts.snapshots where submission_id='${id}';`))).toBe("0");
  });
  it("competing assignments cannot exceed the frozen required-review count", async () => {
    const id = await draft(9207, 50);
    await query(finalize(9207, id, 51));
    await query(staff(9300, `select public.msrc_staff_research_prepare_packet('${edition}','${id}',1,pg_temp.abstract_packet(),true);`) + "commit;");
    const assign = (reviewer: number) => staff(9300, `select public.msrc_staff_research_assign('${edition}','${id}','${actor(reviewer)}')::text;`);
    const results = await race(assign(9301), assign(9302), "abstract-assignment-race");
    expect(results.map((row) => row.state)).toEqual(["assigned", "full"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.assignments where submission_id='${id}';`))).toBe("1");
  });
  it("competing scorecards retain one version and immutable component history", async () => {
    const id = await draft(9208, 60);
    await query(finalize(9208, id, 61));
    const assigned = response(await query(staff(9300, `select public.msrc_staff_research_prepare_packet('${edition}','${id}',1,pg_temp.abstract_packet(),true);
      select public.msrc_staff_research_assign('${edition}','${id}','${actor(9301)}')::text;`) + "commit;"));
    const assignmentId = assigned.assignmentId ?? scalar(await query(`select id from msrc_abstracts.assignments where submission_id='${id}';`));
    const score = (value: number) => staff(9301, `select public.msrc_staff_research_scorecard('${edition}','${assignmentId}',1,
      '{"scores":[{"criterionId":"synthetic-criterion","value":${value}}],"comments":"Synthetic independent assessment","recommendation":"accept"}'::jsonb,true)::text;`);
    const results = await race(score(3), score(7), "abstract-score-race");
    expect(results.map((row) => row.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.scorecard_versions where assignment_id='${assignmentId}';`))).toBe("1");
  });
  it("concurrent explicit publication creates exactly one held outbox message", async () => {
    const id = await draft(9209, 70);
    await query(finalize(9209, id, 71));
    const decision = response(await query(staff(9300, `select public.msrc_staff_research_decision('${edition}','${id}',1,'revise','Synthetic rationale','Revise scientific fields',clock_timestamp()+interval '2 days')::text;`) + "commit;"));
    const decisionId = decision.decisionId;
    await query(staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decisionId}'::uuid],'${operation(72)}','prepare');`) + "commit;");
    const publish = staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decisionId}'::uuid],'${operation(72)}','publish')::text;`);
    const results = await race(publish, publish, "abstract-publish-race");
    expect(results.map((row) => row.state)).toEqual(["published", "published"]);
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='abstract_decision' and recipient_email='registration-9209@example.invalid' and delivery_hold;`))).toBe("1");
  });
  it("publication rechecks quorum after a concurrent completed-review decline", async () => {
    const id = await draft(9210, 80);
    await query(finalize(9210, id, 81));
    await query(staff(9300, `select public.msrc_staff_research_prepare_packet('${edition}','${id}',1,pg_temp.abstract_packet(),true);
      select public.msrc_staff_research_assign('${edition}','${id}','${actor(9302)}');`) + "commit;");
    const assignmentId = scalar(await query(`select id from msrc_abstracts.assignments where submission_id='${id}';`));
    await query(staff(9302, `select public.msrc_staff_research_scorecard('${edition}','${assignmentId}',1,
      '{"scores":[{"criterionId":"synthetic-criterion","value":7}],"comments":"Synthetic completed review","recommendation":"accept"}'::jsonb,true);`) + "commit;");
    const decision = response(await query(staff(9300, `select public.msrc_staff_research_decision('${edition}','${id}',1,'accept','Synthetic committee rationale','Synthetic acceptance',null)::text;`) + "commit;"));
    await query(staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decision.decisionId}'::uuid],'${operation(82)}','prepare');`) + "commit;");
    const declining = staff(9302, `select public.msrc_staff_research_review_response('${edition}','${assignmentId}','decline','Synthetic reviewer withdrawal')::text;`);
    const publishing = staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decision.decisionId}'::uuid],'${operation(82)}','publish')::text;`);
    const results = await race(declining, publishing, "abstract-quorum-race");
    expect(results.map((row) => row.state)).toEqual(["updated", "reviews_incomplete"]);
    expect(scalar(await query(`select count(*) from msrc_abstracts.publications where decision_id='${decision.decisionId}';`))).toBe("0");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='abstract_decision' and recipient_email='registration-9210@example.invalid';`))).toBe("0");
    expect(scalar(await query(`select status from msrc_abstracts.submissions where id='${id}';`))).toBe("scientific_review");
  });
  it("publication rejects a concurrent score edit despite a still-complete quorum", async () => {
    const id = await draft(9211, 90);
    await query(finalize(9211, id, 91));
    await query(staff(9300, `select public.msrc_staff_research_prepare_packet('${edition}','${id}',1,pg_temp.abstract_packet(),true);
      select public.msrc_staff_research_assign('${edition}','${id}','${actor(9302)}');`) + "commit;");
    const assignmentId = scalar(await query(`select id from msrc_abstracts.assignments where submission_id='${id}';`));
    const score = (version: number, value: number) => staff(9302, `select public.msrc_staff_research_scorecard('${edition}','${assignmentId}',${version},
      '{"scores":[{"criterionId":"synthetic-criterion","value":${value}}],"comments":"Synthetic versioned assessment","recommendation":"accept"}'::jsonb,true)::text;`);
    await query(score(1, 7) + "commit;");
    const decision = response(await query(staff(9300, `select public.msrc_staff_research_decision('${edition}','${id}',1,'accept','Committee considered version two','Synthetic acceptance',null)::text;`) + "commit;"));
    await query(staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decision.decisionId}'::uuid],'${operation(92)}','prepare');`) + "commit;");
    const publishing = staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${decision.decisionId}'::uuid],'${operation(92)}','publish')::text;`);
    const results = await race(score(2, 3), publishing, "abstract-decision-basis-race");
    expect(results.map((row) => row.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select msrc_abstracts.reviews_complete('${id}',1);`))).toBe("t");
    expect(scalar(await query(`select review_basis->'completed'->0->>'scorecardVersion' from msrc_abstracts.decisions where id='${decision.decisionId}';`))).toBe("2");
    expect(scalar(await query(`select version from msrc_abstracts.assignments where id='${assignmentId}';`))).toBe("3");
    expect(scalar(await query(`select count(*) from msrc_abstracts.publications where decision_id='${decision.decisionId}';`))).toBe("0");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='abstract_decision' and recipient_email='registration-9211@example.invalid';`))).toBe("0");
    // The administrator must make a new immutable decision against the changed basis.
    const refreshed = response(await query(staff(9300, `select public.msrc_staff_research_decision('${edition}','${id}',1,'accept','Committee reconsidered version three','Synthetic acceptance',null)::text;`) + "commit;"));
    await query(staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${refreshed.decisionId}'::uuid],'${operation(93)}','prepare');`) + "commit;");
    const published = response(await query(staff(9300, `select public.msrc_staff_research_batch('${edition}',array['${refreshed.decisionId}'::uuid],'${operation(93)}','publish')::text;`) + "commit;"));
    expect(published.state).toBe("published");
    expect(scalar(await query(`select count(*) from msrc_outbox.messages where template_key='abstract_decision' and recipient_email='registration-9211@example.invalid' and delivery_hold;`))).toBe("1");
  });
});
