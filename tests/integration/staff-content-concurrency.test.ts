import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-063. Own cold disposable reset: STAFF_CONTENT_DB_TESTS=true pnpm exec
// vitest run --config vitest.integration.config.ts tests/integration/staff-content-concurrency.test.ts
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.STAFF_CONTENT_DB_TESTS === "true";
const edition = "synthetic-content-races";
const marker = 202710233;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const id = (n: number) => `e7700000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Content fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic content query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic content SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic content SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      // Release only after a second connection observes the intended lock wait.
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
  throw new Error(`Synthetic content ${description} was not observed.`);
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
  return `begin; set local application_name='${name}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    set local role authenticated; ${sql}`;
}
async function race(firstSql: string, secondSql: string, secondName: string) {
  const first = held(firstSql + `select pg_advisory_xact_lock(${marker});`);
  let second: Promise<string> | undefined;
  try {
    try {
      await barrier();
      second = query(secondSql + "commit;");
      await waiting(secondName);
    } finally { first.release(); }
    return (await Promise.all([first.done, second!])).map(response);
  } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
}

function content(n: number, staff: number, collection = "speakers", extra = "'{}'::jsonb") {
  // One transaction: set_config(..., true) claims would vanish between autocommit statements.
  return `begin;select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    insert into msrc_content.content_items(id,edition_key,collection,version,draft)
    values('${id(n)}','${edition}','${collection}',1,msrc_content.content_defaults()||
    '{"nameEn":"Synthetic person","nameAr":"شخص تجريبي","titleEn":"Synthetic title","titleAr":"صفة تجريبية"}'::jsonb||${extra});
    select msrc_content.content_record(i,'create',null) from msrc_content.content_items i where i.id='${id(n)}';commit;`;
}
const save = (staff: number, name: string, item: number, version: number, title: string) => authenticated(staff, name,
  `select public.msrc_staff_content_save('${edition}','speakers','${id(item)}',${version},
  '{"nameEn":"${title}","nameAr":"شخص تجريبي","titleEn":"Synthetic title","titleAr":"صفة تجريبية"}'::jsonb)::text;`);
const transition = (staff: number, name: string, item: number, version: number, action: string) => authenticated(staff, name,
  `select public.msrc_staff_content_transition('${edition}','${id(item)}',${version},'${action}')::text;`);

describe.skipIf(!isolatedCi)("Content publication ordering (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');commit;`);
  });

  it("two saves cannot overwrite the same expected draft version", async () => {
    await query(`select pg_temp.registration_staff_fixture(9900,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9901,'${edition}','contentMediaEditor');${content(9900, 9900)}`);
    expect((await race(save(9900, "synthetic-content-save-first", 9900, 1, "Committed first"),
      save(9901, "synthetic-content-save-second", 9900, 1, "Must not overwrite"), "synthetic-content-save-second")).map((value) => value?.state))
      .toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select (draft->>'nameEn')||':'||version::text from msrc_content.content_items where id='${id(9900)}';`))).toBe("Committed first:2");
    expect(scalar(await query(`select count(*) from msrc_content.content_audit where item_id='${id(9900)}' and event='save';`))).toBe("1");
  });

  it("publishing a version prevents a queued stale draft from changing its snapshot", async () => {
    await query(`select pg_temp.registration_staff_fixture(9910,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9911,'${edition}','contentMediaEditor');${content(9910, 9910)}`);
    expect((await race(transition(9910, "synthetic-content-publish-first", 9910, 1, "publish"),
      save(9911, "synthetic-content-publish-second", 9910, 1, "Stale overwrite"), "synthetic-content-publish-second")).map((value) => value?.state))
      .toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select p.fields->>'nameEn' from msrc_content.content_publications p
      join msrc_content.content_items i on i.id=p.item_id and i.published_version=p.version where i.id='${id(9910)}';`))).toBe("Synthetic person");
    expect(scalar(await query(`select count(*) from msrc_content.content_publications where item_id='${id(9910)}';`))).toBe("1");
  });

  it("a complete collection reorder makes a queued draft edit conflict without partial changes", async () => {
    await query(`select pg_temp.registration_staff_fixture(9920,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9921,'${edition}','contentMediaEditor');${content(9920, 9920)}${content(9921, 9920)}`);
    const items = scalar(await query(`select jsonb_agg(jsonb_build_object('id',id,'version',version) order by id desc)::text
      from msrc_content.content_items where edition_key='${edition}' and collection='speakers';`));
    const first = authenticated(9920, "synthetic-content-order-first", `select public.msrc_staff_content_reorder('${edition}','speakers','${items}'::jsonb)::text;`);
    expect((await race(first, save(9921, "synthetic-content-order-second", 9921, 1, "Stale after reorder"), "synthetic-content-order-second"))
      .map((value) => value?.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select (draft->>'sortOrder')||':'||version::text from msrc_content.content_items where id='${id(9921)}';`))).toBe("0:2");
    expect(scalar(await query(`select count(*) from msrc_content.content_audit where item_id='${id(9921)}' and event='reorder';`))).toBe("1");
  });

  it("queued work rechecks exact-session assurance after the edition lock", async () => {
    await query(`select pg_temp.registration_staff_fixture(9930,'${edition}','contentMediaEditor');${content(9930, 9930)}`);
    const first = `begin;select pg_advisory_xact_lock(hashtextextended('content-edition:${edition}',0));
      delete from msrc_staff_email.receipts where session_id=pg_temp.registration_session(9930);`;
    const results = await race(first, save(9930, "synthetic-content-revoked-waiter", 9930, 1, "Denied after wait"), "synthetic-content-revoked-waiter");
    expect(results[1]?.state).toBe("denied");
    expect(scalar(await query(`select version from msrc_content.content_items where id='${id(9930)}';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_content.content_audit where item_id='${id(9930)}' and event='save';`))).toBe("0");
  });

  it("a committed session prevents simultaneous withdrawal of its speaker", async () => {
    await query(`select pg_temp.registration_staff_fixture(9940,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9941,'${edition}','contentMediaEditor');${content(9940, 9940)}`);
    await query(transition(9940, "synthetic-content-reference-setup", 9940, 1, "publish") + "commit;");
    await query(content(9941, 9940, "sessions", `jsonb_build_object('day','2027-01-27','startTime','09:00','endTime','10:00','type','talk','speakerIds',jsonb_build_array('${id(9940)}'))`));
    expect((await race(transition(9940, "synthetic-content-session-first", 9941, 1, "publish"),
      transition(9941, "synthetic-content-speaker-second", 9940, 2, "unpublish"), "synthetic-content-speaker-second")).map((value) => value?.state))
      .toEqual(["updated", "referenced"]);
    expect(scalar(await query(`select published_version from msrc_content.content_items where id='${id(9940)}';`))).toBe("2");
  });

  it("a media withdrawal reservation wins over queued content publication", async () => {
    await query(`select pg_temp.registration_staff_fixture(9950,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9951,'${edition}','contentMediaEditor');
      insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,public_path,mime,size,width,height,
      alt_en,alt_ar,rights_confirmed,rights_evidence,state,published_at,uploaded_by,sha256)
      values('${id(9955)}','${edition}','Synthetic.png','${edition}/${id(9955)}/image.webp','${edition}/synthetic-public/image.webp','image/webp',40,10,10,
      'Synthetic image','صورة تجريبية',true,'Synthetic evidence','published',clock_timestamp(),'${actor(9950)}',lpad(to_hex(9955),64,'0'));
      ${content(9950, 9950, "speakers", `jsonb_build_object('assetId','${id(9955)}')`)}`);
    const first = authenticated(9950, "synthetic-content-media-first",
      `select public.msrc_staff_media_transition_begin('${edition}','${id(9955)}',1,'unpublish','${id(9956)}')::text;`);
    expect((await race(first, transition(9951, "synthetic-content-media-second", 9950, 1, "publish"), "synthetic-content-media-second"))
      .map((value) => value?.state)).toEqual(["reserved", "media_required"]);
    expect(scalar(await query(`select count(*) from msrc_content.content_publications where item_id='${id(9950)}';`))).toBe("0");
  });

  it.each(["repeatable read", "serializable"] as const)("staff RPCs reject %s before authorization or waiting", async (isolation) => {
    const calls = [
      `msrc_staff_content_list('${edition}','speakers')`,
      `msrc_staff_content_save('${edition}','speakers',null,0,'{}'::jsonb)`,
      `msrc_staff_content_transition('${edition}','${id(1)}',1,'publish')`,
      `msrc_staff_content_history('${edition}','${id(1)}')`,
      `msrc_staff_content_reorder('${edition}','speakers','[]'::jsonb)`,
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

