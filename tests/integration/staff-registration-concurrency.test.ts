import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

// Own cold disposable reset: STAFF_REGISTRATION_DB_TESTS=true pnpm exec vitest run
// --config vitest.integration.config.ts tests/integration/staff-registration-concurrency.test.ts
const isolatedCi = process.env.GITHUB_ACTIONS === "true" && process.env.STAFF_REGISTRATION_DB_TESTS === "true";
const edition = "synthetic-staff-registration-races";
const actor = (n: number) => `e7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const helpers = readFileSync("supabase/tests/support/registration-fixtures.psql", "utf8");
const marker = 202710173;

function query(sql: string, release?: Promise<void>): Promise<string> {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  if (!isolatedCi || process.platform !== "linux" || target && target !== "local" ||
    existsSync("supabase/.temp/project-ref") || !resolveLocalSupabaseConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }) || !/^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
    throw new Error("Staff registration fixtures require an unlinked disposable loopback GitHub CI stack.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1",
      "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", state = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Synthetic staff registration query timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const value = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (value) state = value;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Synthetic staff registration SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`Synthetic staff registration SQL failed (SQLSTATE ${state}); personal diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    if (release) {
      child.stdin.write(helpers + "\n" + sql + "\n");
      // Hold this transaction until another connection proves the intended
      // contention. No timing-dependent sleep decides when its lock is released.
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
  for (let n = 0; n < 40; n++) {
    if ((await query(sql)).trim().endsWith("1")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Synthetic staff registration ${description} was not observed.`);
}
const barrier = () => observed(`select count(*) from pg_locks where locktype='advisory' and objid=${marker} and granted;`, "transaction barrier");
const waiting = (name: string) => observed(`select count(*) from pg_stat_activity
  where application_name='${name}' and wait_event_type='Lock' and state='active';`, "contending row-lock wait");
const response = (output: string) => output.split("\n").filter((line) => line.startsWith("{"))
  .map((line) => JSON.parse(line)).find((row) => typeof row.state === "string");
function approval(staff: number, participant: number, applicationName: string) {
  // Resolve fixture ID before adopting authenticated. The RPC itself then runs
  // with the same ACL/claims role as the production staff Data API request.
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    select set_config('synthetic.request_id',(select id::text from msrc_registration.requests where edition_key='${edition}' and actor_id='${actor(participant)}'),true);
    set local role authenticated;
    select public.msrc_staff_registration_approve('${edition}',array[current_setting('synthetic.request_id')::uuid])::text;`;
}

describe.skipIf(!isolatedCi)("Staff registration allocation (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${edition}');
      select pg_temp.registration_fixture(201,'${edition}');
      select pg_temp.registration_fixture(202,'${edition}');
      select pg_temp.registration_fixture(203,'${edition}');
      select pg_temp.registration_staff_fixture(301,'${edition}');
      select pg_temp.registration_staff_fixture(302,'${edition}');
      select pg_temp.registration_staff_fixture(303,'${edition}','registrationWorkshopAdministrator');
      select pg_temp.registration_submit('${edition}',201,repeat('a',64));
      select pg_temp.registration_submit('${edition}',202,repeat('b',64));
      select pg_temp.registration_submit('${edition}',203,repeat('c',64));
      update msrc_registration.settings set general_capacity=1,enabled=false where edition_key='${edition}';
      commit;`);
  });

  it("two concurrent approvals competing for the last seat allocate exactly one durable seat and audit", async () => {
    const first = held(approval(301, 201, "synthetic-seat-winner") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(approval(302, 202, "synthetic-seat-contender") + "commit;");
        // Proves actual database contention, not two sequential successful requests.
        await waiting("synthetic-seat-contender");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.state)).toEqual(["updated", "updated"]);
      expect(results.map((row) => row.decided)).toEqual([
        { approved: 1, waitlisted: 0, skipped: 0 }, { approved: 0, waitlisted: 0, skipped: 1 },
      ]);
      expect(results.map((row) => row.registration.counts.remaining)).toEqual([0, 0]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.requests where edition_key='${edition}' and status in('approved','approved_awaiting_payment','offered','confirmed'))<>1
        or (select count(*) from msrc_registration.audit where edition_key='${edition}' and event='request.approved')<>1
        or (select status from msrc_registration.requests where edition_key='${edition}' and actor_id='${actor(202)}')<>'pending_approval'
        then raise exception 'Last-seat concurrency invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });

  it("rechecks the current session deadline after waiting for the settings lock", async () => {
    await query(`update msrc_registration.settings set general_capacity=2 where edition_key='${edition}';`);
    const locking = held(`begin;
      select 1 from msrc_registration.settings where edition_key='${edition}' for update;
      select pg_advisory_xact_lock(${marker});`);
    let deciding: Promise<string> | undefined;
    try {
      try {
        await barrier();
        deciding = query(approval(303, 203, "synthetic-expiring-registrar") + "commit;");
        await waiting("synthetic-expiring-registrar");
        // The existing native session began two minutes ago. Tighten only this
        // disposable policy after initial authorization and real lock contention;
        // do not race or mutate the native/session rows that authorize has locked.
        await query("update msrc_sessions.policy set privileged_absolute_seconds=1 where singleton;");
      } finally { locking.release(); }
      const [, denied] = await Promise.all([locking.done, deciding!]);
      expect(response(denied).state).toBe("denied");
      await query(`do $$begin
        if (select status from msrc_registration.requests where edition_key='${edition}' and actor_id='${actor(203)}')<>'pending_approval'
        or exists(select 1 from msrc_registration.audit where edition_key='${edition}' and target_actor='${actor(203)}' and event='request.approved')
        then raise exception 'Expired waiting session allocated a seat';end if;
        end$$;`);
    } finally {
      // Settle the transaction before restoring policy so failure cleanup cannot
      // accidentally reauthorize a request that is still leaving the lock wait.
      await Promise.allSettled([locking.done, ...(deciding ? [deciding] : [])]);
      await query("update msrc_sessions.policy set privileged_absolute_seconds=28800 where singleton;");
    }
  });
});

const offerEdition = "synthetic-staff-offer-races";
function offerDecision(action: "offer" | "approve", staff: number, participant: number, applicationName: string,
  isolation: "read committed" | "repeatable read" = "read committed") {
  return `begin isolation level ${isolation};
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    select set_config('synthetic.request_id',(select id::text from msrc_registration.requests where edition_key='${offerEdition}' and actor_id='${actor(participant)}'),true);
    set local role authenticated;
    select public.msrc_staff_registration_${action}('${offerEdition}',array[current_setting('synthetic.request_id')::uuid])::text;`;
}
function expire(staff: number, isolation: "read committed" | "repeatable read" = "read committed",
  selectedEdition = offerEdition, applicationName = "synthetic-offer-expiry") {
  return `begin isolation level ${isolation};
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    set local role authenticated;
    select public.msrc_staff_registration_expire_offers('${selectedEdition}')::text;`;
}

describe.skipIf(!isolatedCi)("Staff offer allocation and release (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${offerEdition}');
      do $$declare n integer;begin
        for n in 401..405 loop perform pg_temp.registration_fixture(n,'${offerEdition}');end loop;
      end$$;
      select pg_temp.registration_staff_fixture(501,'${offerEdition}');
      select pg_temp.registration_staff_fixture(502,'${offerEdition}');
      select pg_temp.registration_staff_fixture(503,'${offerEdition}','registrationWorkshopAdministrator');
      do $$declare n integer;outcome jsonb;begin
        for n in 401..405 loop
          outcome:=pg_temp.registration_submit('${offerEdition}',n,md5(n::text)||md5(n::text));
          if outcome->>'state'<>'submitted' then raise exception 'Synthetic offer race fixture failed';end if;
        end loop;
      end$$;
      update msrc_registration.requests set status='waitlisted' where edition_key='${offerEdition}';
      update msrc_registration.settings set general_capacity=1,offer_window_hours=6,enabled=false where edition_key='${offerEdition}';
      commit;`);
  });

  it("two contending offers allocate one last seat and one transition audit", async () => {
    const first = held(offerDecision("offer", 501, 401, "synthetic-offer-winner") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(offerDecision("offer", 502, 402, "synthetic-offer-contender") + "commit;");
        await waiting("synthetic-offer-contender");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.state)).toEqual(["updated", "updated"]);
      expect(results.map((row) => row.decided)).toEqual([
        { approved: 0, waitlisted: 0, offered: 1, skipped: 0 },
        { approved: 0, waitlisted: 0, offered: 0, skipped: 1 },
      ]);
      expect(results.map((row) => row.registration.counts.remaining)).toEqual([0, 0]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.requests where edition_key='${offerEdition}' and status='offered')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${offerEdition}' and event='request.offered')<>1
        or (select status from msrc_registration.requests where edition_key='${offerEdition}' and actor_id='${actor(402)}')<>'waitlisted'
        then raise exception 'Last-seat offer concurrency invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });

  it("expiry automatically replaces the seat before a waiting staff offer and prevents duplicate allocation", async () => {
    await query(`update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second'
      where edition_key='${offerEdition}' and actor_id='${actor(401)}';`);
    const expiring = held(expire(501) + `select pg_advisory_xact_lock(${marker});`);
    let offering: Promise<string> | undefined;
    try {
      try {
        await barrier();
        offering = query(offerDecision("offer", 502, 402, "synthetic-release-contender") + "commit;");
        await waiting("synthetic-release-contender");
      } finally { expiring.release(); }
      const [expired, offered] = (await Promise.all([expiring.done, offering!])).map(response);
      expect(expired).toMatchObject({ state: "updated", expired: 1, offered: 1 });
      expect(offered.decided).toEqual({ approved: 0, waitlisted: 0, offered: 0, skipped: 1 });
      expect(offered.registration.counts).toMatchObject({ offered: 1, expired: 1, approved: 1, remaining: 0 });
      expect(response(await query(expire(501) + "commit;"))).toMatchObject({ state: "updated", expired: 0, offered: 0 });
      await query(`do $$begin
        if (select count(*) from msrc_registration.audit where edition_key='${offerEdition}' and event='request.offer_expired')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${offerEdition}' and event='request.offered')<>2
        or (select count(*) from msrc_registration.audit where edition_key='${offerEdition}' and event='request.offered' and performer_id is null)<>1
        or (select count(*) from msrc_registration.requests where edition_key='${offerEdition}' and status='offered')<>1
        or (select status from msrc_registration.requests where edition_key='${offerEdition}' and actor_id='${actor(403)}')<>'waitlisted'
        then raise exception 'Offer expiry/reallocation invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([expiring.done, ...(offering ? [offering] : [])]); }
  });

  it("an offer and approval contend on the same last-seat settings lock", async () => {
    await query(`update msrc_registration.settings set general_capacity=2 where edition_key='${offerEdition}';`);
    const offering = held(offerDecision("offer", 501, 403, "synthetic-mixed-offer-winner") + `select pg_advisory_xact_lock(${marker});`);
    let approving: Promise<string> | undefined;
    try {
      try {
        await barrier();
        approving = query(offerDecision("approve", 502, 404, "synthetic-mixed-approval-contender") + "commit;");
        await waiting("synthetic-mixed-approval-contender");
      } finally { offering.release(); }
      const results = (await Promise.all([offering.done, approving!])).map(response);
      expect(results[0].decided.offered).toBe(1);
      expect(results[1].decided).toEqual({ approved: 0, waitlisted: 0, skipped: 1 });
      expect(results.map((row) => row.registration.counts.remaining)).toEqual([0, 0]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.requests where edition_key='${offerEdition}' and status in('approved','approved_awaiting_payment','offered','confirmed'))<>2
        or exists(select 1 from msrc_registration.audit where edition_key='${offerEdition}' and event='request.approved')
        then raise exception 'Offer/approval shared-lock invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([offering.done, ...(approving ? [approving] : [])]); }
  });

  it("offer rechecks the current session after a real settings-row lock wait", async () => {
    await query(`update msrc_registration.settings set general_capacity=3 where edition_key='${offerEdition}';`);
    const locking = held(`begin;
      select 1 from msrc_registration.settings where edition_key='${offerEdition}' for update;
      select pg_advisory_xact_lock(${marker});`);
    let offering: Promise<string> | undefined;
    try {
      try {
        await barrier();
        offering = query(offerDecision("offer", 503, 405, "synthetic-expiring-offer-registrar") + "commit;");
        await waiting("synthetic-expiring-offer-registrar");
        await query("update msrc_sessions.policy set privileged_absolute_seconds=1 where singleton;");
      } finally { locking.release(); }
      const [, denied] = await Promise.all([locking.done, offering!]);
      expect(response(denied).state).toBe("denied");
      await query(`do $$begin
        if (select status from msrc_registration.requests where edition_key='${offerEdition}' and actor_id='${actor(405)}')<>'waitlisted'
        or exists(select 1 from msrc_registration.audit where edition_key='${offerEdition}' and target_actor='${actor(405)}' and event='request.offered')
        then raise exception 'Expired waiting session offered a seat';end if;
        end$$;`);
    } finally {
      await Promise.allSettled([locking.done, ...(offering ? [offering] : [])]);
      await query("update msrc_sessions.policy set privileged_absolute_seconds=28800 where singleton;");
    }
  });

  it("offer and expiry refuse repeatable-read snapshots before capacity can be miscounted", async () => {
    await expect(query(offerDecision("offer", 501, 404, "synthetic-repeatable-offer", "repeatable read") + "commit;"))
      .rejects.toThrow("SQLSTATE 25001");
    await expect(query(expire(501, "repeatable read") + "commit;")).rejects.toThrow("SQLSTATE 25001");
  });

  it.each(["queue", "detail", "summary"] as const)("%s read takes the authority lock before locking the actor account", async (area) => {
    const applicationName = `synthetic-authority-${area}-reader`;
    const locking = held(`begin;
      select pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
      select pg_advisory_xact_lock(${marker});`);
    const rpc = area === "queue" ? `public.msrc_staff_registration('${offerEdition}')`
      : area === "summary" ? `public.msrc_staff_summary('${offerEdition}')`
        : `public.msrc_staff_registration_detail('${offerEdition}',current_setting('synthetic.request_id')::uuid)`;
    let reading: Promise<string> | undefined;
    try {
      try {
        await barrier();
        reading = query(`begin;
          set local application_name='${applicationName}';
          select set_config('request.jwt.claims',pg_temp.registration_claims(501)::text,true);
          select set_config('synthetic.request_id',(select id::text from msrc_registration.requests where edition_key='${offerEdition}' and actor_id='${actor(401)}'),true);
          set local role authenticated;
          select ${rpc}::text;
          commit;`);
        await observed(`select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid
          where a.application_name='${applicationName}' and l.locktype='advisory' and not l.granted;`, "read authority advisory wait");
        // With the read genuinely waiting on authority, an independent connection
        // must still be able to acquire the account lock needed by a role change.
        // NOWAIT exposes the old account->authority inversion without a deadlock
        // timeout, sleep, retry, or deliberately hung connection.
        expect((await query(`begin;
          select 1 from msrc_authorization.account_access where actor_id='${actor(501)}' for update nowait;
          commit;`)).split("\n")).toContain("1");
      } finally { locking.release(); }
      const [, read] = await Promise.all([locking.done, reading!]);
      expect(response(read).state).toBe("ready");
    } finally { await Promise.allSettled([locking.done, ...(reading ? [reading] : [])]); }
  });
});

const autoEdition = "synthetic-automatic-offer-races";
describe.skipIf(!isolatedCi)("Automatic offer replacement (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${autoEdition}');
      select pg_temp.registration_fixture(1001,'${autoEdition}');
      select pg_temp.registration_fixture(1002,'${autoEdition}');
      select pg_temp.registration_fixture(1003,'${autoEdition}');
      select pg_temp.registration_staff_fixture(1101,'${autoEdition}');
      select pg_temp.registration_staff_fixture(1102,'${autoEdition}');
      select pg_temp.registration_submit('${autoEdition}',1001,repeat('a',64));
      select pg_temp.registration_submit('${autoEdition}',1002,repeat('b',64));
      select pg_temp.registration_submit('${autoEdition}',1003,repeat('c',64));
      update msrc_registration.requests set status='waitlisted' where edition_key='${autoEdition}';
      update msrc_registration.requests set status='offered',offer_expires_at=clock_timestamp()-interval '1 second'
        where edition_key='${autoEdition}' and actor_id='${actor(1001)}';
      update msrc_registration.settings set general_capacity=1,offer_window_hours=24,enabled=false where edition_key='${autoEdition}';
      commit;`);
  });

  it("two contending sweeps expire once and offer the next waitlisted request once", async () => {
    const first = held(expire(1101, "read committed", autoEdition, "synthetic-auto-first") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(expire(1102, "read committed", autoEdition, "synthetic-auto-second") + "commit;");
        await waiting("synthetic-auto-second");
      } finally { first.release(); }
      expect((await Promise.all([first.done, second!])).map(response)).toEqual([
        { state: "updated", expired: 1, offered: 1 },
        { state: "updated", expired: 0, offered: 0 },
      ]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.requests where edition_key='${autoEdition}' and status in('approved','approved_awaiting_payment','offered','confirmed'))<>1
        or (select status from msrc_registration.requests where edition_key='${autoEdition}' and actor_id='${actor(1002)}')<>'offered'
        or (select status from msrc_registration.requests where edition_key='${autoEdition}' and actor_id='${actor(1003)}')<>'waitlisted'
        or (select count(*) from msrc_registration.audit where edition_key='${autoEdition}' and event='request.offer_expired')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${autoEdition}' and event='request.offered' and performer_id is null)<>1
        then raise exception 'Concurrent automatic replacement invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });
});

const earlyEdition = "synthetic-early-access-races";
function earlySubmit(isolation: "read committed" | "repeatable read" = "read committed") {
  return `begin isolation level ${isolation};
    set local application_name='synthetic-early-submitter';
    select set_config('synthetic.claims',pg_temp.registration_claims(1201)::text,true);
    set local role service_role;
    select public.msrc_registration_submit('${earlyEdition}',current_setting('synthetic.claims')::jsonb,'national_id',
      jsonb_build_object('ciphertext',repeat('ab',10),'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1'),
      repeat('a',64),repeat(chr(8226),6)||'0000','synthetic-v1','synthetic-terms')::text;
    commit;`;
}

describe.skipIf(!isolatedCi)("Early-access removal and submit (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${earlyEdition}');
      select pg_temp.registration_fixture(1201,'${earlyEdition}');
      select pg_temp.registration_staff_fixture(1301,'${earlyEdition}');
      update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '1 hour',
        priority_end_at=clock_timestamp()+interval '1 hour',general_opening_at=clock_timestamp()+interval '2 hours'
        where edition_key='${earlyEdition}';
      select set_config('request.jwt.claims',pg_temp.registration_claims(1301)::text,true);
      select public.msrc_staff_early_access_add('${earlyEdition}',array['registration-1201@example.invalid']);
      commit;`);
  });

  it("submit waits for a concurrent removal then rejects its previously open context", async () => {
    expect(response(await query(`select public.msrc_registration_context('${earlyEdition}',pg_temp.registration_claims(1201));`)).state).toBe("open");
    const removing = held(`begin;
      select set_config('request.jwt.claims',pg_temp.registration_claims(1301)::text,true);
      select set_config('synthetic.entry_id',(select id::text from msrc_registration.early_access_entries
        where edition_key='${earlyEdition}' and email='registration-1201@example.invalid'),true);
      set local role authenticated;
      select public.msrc_staff_early_access_remove('${earlyEdition}',array[current_setting('synthetic.entry_id')::uuid])::text;
      select pg_advisory_xact_lock(${marker});`);
    let submitting: Promise<string> | undefined;
    try {
      try {
        await barrier();
        submitting = query(earlySubmit());
        await waiting("synthetic-early-submitter");
      } finally { removing.release(); }
      const [removed, submitted] = (await Promise.all([removing.done, submitting!])).map(response);
      expect(removed).toMatchObject({ state: "updated", removed: 1 });
      expect(submitted.state).toBe("closed");
      await query(`do $$begin
        if exists(select 1 from msrc_registration.requests where edition_key='${earlyEdition}')
        or exists(select 1 from msrc_registration.audit where edition_key='${earlyEdition}' and event='request.submitted')
        or (select count(*) from msrc_registration.audit where edition_key='${earlyEdition}' and event='early_access.removed')<>1
        then raise exception 'Removal/submit serialization invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([removing.done, ...(submitting ? [submitting] : [])]); }
  });

  it("submit refuses repeatable-read snapshots that could reuse removed eligibility", async () => {
    await expect(query(earlySubmit("repeatable read"))).rejects.toThrow("SQLSTATE 25001");
  });
});
