import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// ENG-062. Own cold disposable reset: STAFF_MEDIA_DB_TESTS=true pnpm exec
// vitest run --config vitest.integration.config.ts tests/integration/staff-media-concurrency.test.ts
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.STAFF_MEDIA_DB_TESTS === "true";
const edition = "synthetic-media-races";
const marker = 202710232;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const id = (n: number) => `e7600000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local"
    || existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Media fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic media query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic media SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic media SQL failed (SQLSTATE ${sqlState}); diagnostics withheld.`));
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
  throw new Error(`Synthetic media ${description} was not observed.`);
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
function asset(n: number, owner: number) {
  return `insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,mime,size,width,height,
    alt_en,alt_ar,rights_confirmed,rights_evidence,uploaded_by,sha256)
    values('${id(n)}','${edition}','Synthetic.png','${edition}/${id(n)}/image.webp','image/webp',40,10,10,
    'Synthetic image','صورة تجريبية',true,'Synthetic rights evidence','${actor(owner)}',lpad(to_hex(${n}),64,'0'));`;
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

describe.skipIf(!isolatedCi)("Media operation ordering (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');commit;`);
  });

  it("two metadata saves cannot overwrite the same expected version", async () => {
    await query(`select pg_temp.registration_staff_fixture(9700,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9701,'${edition}','contentMediaEditor');${asset(9700, 9700)}`);
    const save = (staff: number, name: string, text: string) => authenticated(staff, name,
      `select public.msrc_staff_media_update('${edition}','${id(9700)}',1,'{"altEn":"${text}"}'::jsonb)::text;`);
    expect((await race(save(9700, "synthetic-media-save-first", "First committed"),
      save(9701, "synthetic-media-save-second", "Must not overwrite"), "synthetic-media-save-second")).map((value) => value?.state))
      .toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select alt_en||':'||version::text from msrc_content.media_assets where id='${id(9700)}';`))).toBe("First committed:2");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where asset_id='${id(9700)}' and event='metadata.update';`))).toBe("1");
  });

  it("concurrent publish and archive grant only one durable external executor", async () => {
    await query(`select pg_temp.registration_staff_fixture(9710,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9711,'${edition}','contentMediaEditor');${asset(9710, 9710)}`);
    const begin = (staff: number, name: string, action: string, operation: number) => authenticated(staff, name,
      `select public.msrc_staff_media_transition_begin('${edition}','${id(9710)}',1,'${action}','${id(operation)}')::text;`);
    expect((await race(begin(9710, "synthetic-media-publish-first", "publish", 97100),
      begin(9711, "synthetic-media-archive-second", "archive", 97101), "synthetic-media-archive-second")).map((value) => value?.state))
      .toEqual(["reserved", "busy"]);
    await query(`update msrc_content.media_operations set created_at=clock_timestamp()-interval '2 days' where id='${id(97100)}';`);
    expect(response(await query(begin(9711, "synthetic-media-no-expiring-lock", "archive", 97102) + "commit;"))?.state).toBe("busy");
    expect(scalar(await query(`select state||':'||version::text from msrc_content.media_assets where id='${id(9710)}';`))).toBe("draft:1");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where asset_id='${id(9710)}' and event='transition.reserve';`))).toBe("1");
  });

  it("two completion requests claim one immutable raw upload only once", async () => {
    await query(`select pg_temp.registration_staff_fixture(9720,'${edition}','contentMediaEditor');
      insert into msrc_content.media_uploads(id,edition_key,file_name,claimed_size,actor_id,session_id,expires_at)
      values('${id(9720)}','${edition}','Synthetic.png',40,'${actor(9720)}',pg_temp.registration_session(9720),clock_timestamp()+interval '15 minutes');`);
    const claim = (name: string) => authenticated(9720, name,
      `select public.msrc_staff_media_upload_claim('${edition}','${id(9720)}')::text;`);
    expect((await race(claim("synthetic-media-claim-first"), claim("synthetic-media-claim-second"),
      "synthetic-media-claim-second")).map((value) => value?.state)).toEqual(["reserved", "busy"]);
    await query(`update msrc_content.media_uploads set expires_at=clock_timestamp()-interval '2 days' where id='${id(9720)}';`);
    expect(response(await query(claim("synthetic-media-processing-no-expiry") + "commit;"))?.state).toBe("busy");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where upload_id='${id(9720)}' and event='upload.claim';`))).toBe("1");
  });

  it("concurrent canonical SHA256 completion produces one asset and two truthful receipts", async () => {
    await query(`select pg_temp.registration_staff_fixture(9730,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9731,'${edition}','contentMediaEditor');
      insert into msrc_content.media_uploads(id,edition_key,file_name,claimed_size,actor_id,session_id,state,expires_at)
      values('${id(9730)}','${edition}','First.png',40,'${actor(9730)}',pg_temp.registration_session(9730),'processing',clock_timestamp()+interval '15 minutes'),
      ('${id(9731)}','${edition}','Second.png',40,'${actor(9731)}',pg_temp.registration_session(9731),'processing',clock_timestamp()+interval '15 minutes');`);
    const complete = (staff: number, name: string) => `begin;set local application_name='${name}';
      select set_config('synthetic.media_claims',pg_temp.registration_claims(${staff})::text,true);
      set local role service_role;
      select public.msrc_staff_media_upload_complete('${edition}','${id(staff)}',current_setting('synthetic.media_claims')::jsonb,
      '{"mime":"image/webp","size":40,"width":10,"height":10,"sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb)::text;`;
    const results = await race(complete(9730, "synthetic-media-dedupe-first"), complete(9731, "synthetic-media-dedupe-second"), "synthetic-media-dedupe-second");
    expect(results.map((value) => value?.state)).toEqual(["created", "duplicate"]);
    expect((results[0]?.asset as { id: string }).id).toBe((results[1]?.asset as { id: string }).id);
    expect(scalar(await query(`select count(*) from msrc_content.media_assets where edition_key='${edition}' and sha256=repeat('b',64);`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_content.media_uploads where id in('${id(9730)}','${id(9731)}') and state='complete';`))).toBe("2");
  });

  function trustedImport(staff: number, name: string, expression: string) {
    return `begin;set local application_name='${name}';
      select set_config('synthetic.site_claims',pg_temp.registration_claims(${staff})::text,true);
      set local role service_role;select public.${expression}::text;`;
  }
  const importMedia = (n: number) => `jsonb_build_object('fileName','Synthetic archive.webp','size',40,'width',10,'height',10,'sha256',lpad(to_hex(${n}),64,'0'))`;
  const importFields = `'{"altEn":"Synthetic archive","altAr":"صورة تجريبية","captionEn":"Synthetic caption","captionAr":"وصف تجريبي",` +
    `"rightsConfirmed":true,"rightsEvidence":"Synthetic rights evidence","editionYear":2026,"kind":"photograph","displayOrder":0,"videoPath":null}'::jsonb`;

  it("two site import requests grant exactly one durable Storage executor", async () => {
    await query(`select pg_temp.registration_staff_fixture(9740,'${edition}');
      select pg_temp.registration_staff_fixture(9741,'${edition}');`);
    const reserve = (staff: number, name: string) => trustedImport(staff, name,
      `msrc_staff_media_import_reserve('${edition}',current_setting('synthetic.site_claims')::jsonb,'synthetic-import-race',${importMedia(9740)})`);
    expect((await race(reserve(9740, "synthetic-site-reserve-first"), reserve(9741, "synthetic-site-reserve-second"),
      "synthetic-site-reserve-second")).map((row) => row?.state)).toEqual(["reserved", "busy"]);
    expect(scalar(await query(`select count(*) from msrc_content.site_media_imports where edition_key='${edition}' and source_key='synthetic-import-race';`))).toBe("1");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where edition_key='${edition}' and event='import.reserve';`))).toBe("1");
    await query(`update msrc_content.site_media_imports set created_at=clock_timestamp()-interval '2 days'
      where edition_key='${edition}' and source_key='synthetic-import-race';`);
    expect(response(await query(reserve(9740, "synthetic-site-reserve-no-expiry") + "commit;"))?.state).toBe("busy");
  });

  it("simultaneous trusted import completions create one published asset and one audit", async () => {
    await query(`select pg_temp.registration_staff_fixture(9750,'${edition}');`);
    const reserved = response(await query(trustedImport(9750, "synthetic-site-finish-reserve",
      `msrc_staff_media_import_reserve('${edition}',current_setting('synthetic.site_claims')::jsonb,'synthetic-finish-race',${importMedia(9750)})`) + "commit;"));
    expect(reserved?.state).toBe("reserved");
    const importId = reserved?.importId as string;
    const finish = (name: string) => trustedImport(9750, name,
      `msrc_staff_media_import_finish('${edition}',current_setting('synthetic.site_claims')::jsonb,'${importId}',${importFields})`);
    const rows = await race(finish("synthetic-site-finish-first"), finish("synthetic-site-finish-second"), "synthetic-site-finish-second");
    expect(rows.map((row) => row?.state)).toEqual(["created", "duplicate"]);
    expect(rows.map((row) => row?.assetId)).toEqual([importId, importId]);
    expect(scalar(await query(`select state||':'||version::text from msrc_content.media_assets where id='${importId}';`))).toBe("published:1");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where asset_id='${importId}' and event='import.complete';`))).toBe("1");
  });

  it("two content import batches preserve the first published roster without duplicate revisions", async () => {
    await query(`select pg_temp.registration_staff_fixture(9760,'${edition}');
      select pg_temp.registration_staff_fixture(9761,'${edition}');`);
    const reserved = response(await query(trustedImport(9760, "synthetic-site-content-reserve",
      `msrc_staff_media_import_reserve('${edition}',current_setting('synthetic.site_claims')::jsonb,'synthetic-content-photo',${importMedia(9760)})`) + "commit;"));
    expect(reserved?.state).toBe("reserved");
    const importId = reserved?.importId as string;
    expect(response(await query(trustedImport(9760, "synthetic-site-content-finish",
      `msrc_staff_media_import_finish('${edition}',current_setting('synthetic.site_claims')::jsonb,'${importId}',${importFields})`) + "commit;"))?.state).toBe("created");
    expect(scalar(await query(`select exposed_at is null from msrc_content.site_media_imports where id='${importId}';`))).toBe("t");
    const batch = (name: string) => `jsonb_build_array(jsonb_build_object('sourceKey','synthetic-roster-race','collection','team','fields',
      jsonb_build_object('nameEn','${name}','nameAr','اسم تجريبي','titleEn','Synthetic role','titleAr','دور تجريبي',
      'groupEn','Synthetic committee','groupAr','لجنة تجريبية','assetId','${importId}')))`;
    const sources = `'["synthetic-content-photo"]'::jsonb`;
    const first = authenticated(9760, "synthetic-site-content-first", `select public.msrc_staff_content_import('${edition}',${batch("First published person")},${sources})::text;`);
    const second = authenticated(9761, "synthetic-site-content-second", `select public.msrc_staff_content_import('${edition}',${batch("Must not overwrite")},${sources})::text;`);
    const rows = await race(first, second, "synthetic-site-content-second");
    expect(rows.map((row) => row?.state)).toEqual(["ready", "ready"]);
    expect(rows.map((row) => [row?.created, row?.existing])).toEqual([[1, 0], [0, 1]]);
    expect(scalar(await query(`select count(*) from msrc_content.content_items where edition_key='${edition}' and source_key='synthetic-roster-race';`))).toBe("1");
    expect(scalar(await query(`select p.fields->>'nameEn' from msrc_content.content_publications p join msrc_content.content_items i
      on i.id=p.item_id and i.published_version=p.version where i.edition_key='${edition}' and i.source_key='synthetic-roster-race';`))).toBe("First published person");
    expect(scalar(await query(`select count(*) from msrc_content.content_versions v join msrc_content.content_items i on i.id=v.item_id
      where i.edition_key='${edition}' and i.source_key='synthetic-roster-race';`))).toBe("2");
    expect(scalar(await query(`select exposed_at is not null from msrc_content.site_media_imports where id='${importId}';`))).toBe("t");
  });

  it("an import queued behind its edition lock rechecks lost Super Admin assurance", async () => {
    await query(`select pg_temp.registration_staff_fixture(9770,'${edition}');`);
    const first = `begin;select pg_advisory_xact_lock(hashtextextended('media-import:${edition}',0));
      delete from auth.mfa_amr_claims where session_id=pg_temp.registration_session(9770) and authentication_method='totp';`;
    const second = trustedImport(9770, "synthetic-site-import-revoked",
      `msrc_staff_media_import_reserve('${edition}',current_setting('synthetic.site_claims')::jsonb,'synthetic-revoked-import',${importMedia(9770)})`);
    expect((await race(first, second, "synthetic-site-import-revoked"))[1]?.state).toBe("denied");
    expect(scalar(await query(`select count(*) from msrc_content.site_media_imports where edition_key='${edition}' and source_key='synthetic-revoked-import';`))).toBe("0");
  });

  it("a committed year reorder makes a queued neighbor edit conflict", async () => {
    await query(`select pg_temp.registration_staff_fixture(9780,'${edition}','contentMediaEditor');
      select pg_temp.registration_staff_fixture(9781,'${edition}','contentMediaEditor');${asset(9780, 9780)}${asset(9781, 9781)}
      update msrc_content.media_assets set edition_year=2024,display_order=case when id='${id(9780)}' then 0 else 1 end
      where id in('${id(9780)}','${id(9781)}');`);
    const first = authenticated(9780, "synthetic-site-reorder-first",
      `select public.msrc_staff_media_reorder('${edition}','${id(9781)}',1,'earlier')::text;`);
    const second = authenticated(9781, "synthetic-site-reorder-second",
      `select public.msrc_staff_media_update('${edition}','${id(9780)}',1,'{"altEn":"Stale neighbor edit"}'::jsonb)::text;`);
    expect((await race(first, second, "synthetic-site-reorder-second")).map((row) => row?.state)).toEqual(["updated", "conflict"]);
    expect(scalar(await query(`select display_order::text||':'||version::text||':'||alt_en from msrc_content.media_assets where id='${id(9780)}';`)))
      .toBe("1:2:Synthetic image");
    expect(scalar(await query(`select count(*) from msrc_content.media_audit where asset_id in('${id(9780)}','${id(9781)}') and event='archive.reorder';`))).toBe("2");
  });

  it.each(["repeatable read", "serializable"] as const)("every media RPC rejects %s before authorization or a lock wait", async (isolation) => {
    const calls = [
      `msrc_staff_media_list('${edition}')`, `msrc_staff_media_get('${edition}','${id(1)}')`,
      `msrc_staff_media_upload_reserve('${edition}','Synthetic.png',40)`,
      `msrc_staff_media_upload_claim('${edition}','${id(1)}')`,
      `msrc_staff_media_upload_complete('${edition}','${id(1)}','{}'::jsonb,'{}'::jsonb)`,
      `msrc_staff_media_upload_reject('${edition}','${id(1)}','{}'::jsonb)`,
      `msrc_staff_media_update('${edition}','${id(1)}',1,'{}'::jsonb)`,
      `msrc_staff_media_transition_begin('${edition}','${id(1)}',1,'publish','${id(2)}')`,
      `msrc_staff_media_transition_finish('${edition}','${id(2)}','{}'::jsonb,true)`,
      `msrc_staff_media_reorder('${edition}','${id(1)}',1,'earlier')`,
      `msrc_staff_media_import_reserve('${edition}','{}'::jsonb,'synthetic-isolation','{}'::jsonb)`,
      `msrc_staff_media_import_finish('${edition}','{}'::jsonb,'${id(1)}','{}'::jsonb)`,
      `msrc_staff_content_import('${edition}','[]'::jsonb)`,
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
