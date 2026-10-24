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
  // Resolve fixture ID/verified claims before adopting the production service
  // boundary. The RPC rechecks the staff session after taking allocation locks.
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    select set_config('synthetic.request_id',(select id::text from msrc_registration.requests where edition_key='${edition}' and actor_id='${actor(participant)}'),true);
    set local role service_role;
    select public.msrc_staff_registration_approve_tickets('${edition}',current_setting('request.jwt.claims')::jsonb,
      array[current_setting('synthetic.request_id')::uuid],repeat('a',64))::text;`;
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
        or (select count(*) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id where r.edition_key='${edition}')<>1
        or (select count(*) from msrc_outbox.messages where template_key='registration_approved'
          and recipient_email in('registration-201@example.invalid','registration-202@example.invalid'))<>1
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

  it("concurrent retries for one request commit one ticket and one seat email", async () => {
    const first = held(approval(301, 202, "synthetic-ticket-first") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(approval(302, 202, "synthetic-ticket-retry") + "commit;");
        await waiting("synthetic-ticket-retry");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.decided.approved)).toEqual([1, 0]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
          where r.edition_key='${edition}' and r.actor_id='${actor(202)}')<>1
        or (select count(*) from msrc_outbox.messages where template_key='registration_approved'
          and recipient_email='registration-202@example.invalid')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${edition}'
          and target_actor='${actor(202)}' and event='request.approved')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${edition}'
          and target_actor='${actor(202)}' and event='ticket.issued' and performer_id is null)<>1
        then raise exception 'Concurrent ticket retry invariant failed';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });
});

describe.skipIf(!isolatedCi)("Complete staff registration history (disposable GitHub CI only)", () => {
  it.each(["repeatable read", "serializable"] as const)("detail refuses %s before authorization or a null-request early return", async (isolation) => {
    await expect(query(`begin isolation level ${isolation};
      select set_config('request.jwt.claims','{}',true);
      select public.msrc_staff_registration_detail('synthetic-history-isolation',null);
      rollback;`)).rejects.toThrow("SQLSTATE 25001");
  });

  it("backfills retained ticket facts once, without issuing tickets or queuing mail", async () => {
    const migration = readFileSync("supabase/migrations/20261022120000_staff_registration_complete_history.sql", "utf8");
    const start = migration.indexOf("\ninsert into msrc_registration.audit", migration.indexOf("-- Reconstruct only facts"));
    const end = migration.indexOf("\ncreate or replace function public.msrc_staff_registration_detail", start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    // Execute the migration's actual backfill statements against preexisting
    // issued/revoked records, twice. The entire rehearsal rolls back, including
    // trigger suspension used only to recreate the old pre-audit ticket state.
    const backfill = migration.slice(start, end);
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      select pg_temp.registration_settings('synthetic-history-backfill');
      select pg_temp.registration_fixture(91001,'synthetic-history-backfill');
      select pg_temp.registration_fixture(91002,'synthetic-history-backfill');
      select pg_temp.registration_submit('synthetic-history-backfill',91001,md5('91001')||md5('91001'));
      select pg_temp.registration_submit('synthetic-history-backfill',91002,md5('91002')||md5('91002'));
      alter table msrc_registration.tickets disable trigger registration_ticket_audit;
      update msrc_registration.requests set status='approved' where edition_key='synthetic-history-backfill';
      update msrc_registration.requests set status='cancelled' where edition_key='synthetic-history-backfill' and actor_id='${actor(91002)}';
      alter table msrc_registration.tickets enable trigger registration_ticket_audit;
      create temporary table history_backfill_tickets as select to_jsonb(t) as value from msrc_registration.tickets t;
      create temporary table history_backfill_requests as select to_jsonb(r) as value from msrc_registration.requests r;
      create temporary table history_backfill_mail as select count(*) as total from msrc_outbox.messages;
      do $$begin
        if (select count(*) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
          where r.edition_key='synthetic-history-backfill')<>2
        or exists(select 1 from msrc_registration.audit where edition_key='synthetic-history-backfill' and event like 'ticket.%')
        then raise exception 'Synthetic pre-audit ticket fixture failed';end if;end$$;
      ${backfill}
      ${backfill}
      do $$begin
        if (select count(*) from msrc_registration.audit where edition_key='synthetic-history-backfill' and event in('ticket.issued','ticket.revoked'))<>3
        or exists(select 1 from msrc_registration.audit a join msrc_registration.tickets t on t.request_id=a.request_id
          where a.edition_key='synthetic-history-backfill' and a.event in('ticket.issued','ticket.revoked')
          and (a.occurred_at is distinct from case a.event when 'ticket.issued' then t.issued_at else t.revoked_at end
            or a.performer_id is not null or a.previous_status is not null or a.new_status is not null))
        or (select count(*) from msrc_outbox.messages)<>(select total from history_backfill_mail)
        or exists((select to_jsonb(t) from msrc_registration.tickets t except select value from history_backfill_tickets)
          union all (select value from history_backfill_tickets except select to_jsonb(t) from msrc_registration.tickets t))
        or exists((select to_jsonb(r) from msrc_registration.requests r except select value from history_backfill_requests)
          union all (select value from history_backfill_requests except select to_jsonb(r) from msrc_registration.requests r))
        then raise exception 'Ticket history backfill changed evidence or business state';end if;end$$;
      rollback;`);
  });
});

// ENG-055 uses the same isolated CI entrypoint, native sessions and observed
// database lock barriers. These cases cannot execute against hosted projects.
const selfEdition = "synthetic-participant-registration-races";
function participantAction(action: "accept_offer" | "cancel", participant: number, operation: number, applicationName: string) {
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${participant})::text,true);
    select set_config('synthetic.request_id',(select id::text from msrc_registration.requests
      where edition_key='${selfEdition}' and actor_id='${actor(participant)}'),true);
    set local role service_role;
    select public.msrc_registration_${action}('${selfEdition}',current_setting('request.jwt.claims')::jsonb,
      current_setting('synthetic.request_id')::uuid,'e7400000-0000-4000-8000-${String(operation).padStart(12, "0")}'
      ${action === "accept_offer" ? ",repeat('a',64)" : ""})::text;`;
}
function participantExpiry(applicationName: string) {
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(2701)::text,true);
    set local role authenticated;
    select public.msrc_staff_registration_expire_offers('${selfEdition}')::text;`;
}

describe.skipIf(!isolatedCi)("Participant registration lifecycle (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${selfEdition}');
      do $$declare n integer;begin
        for n in 2601..2608 loop perform pg_temp.registration_fixture(n,'${selfEdition}');end loop;
      end$$;
      select pg_temp.registration_staff_fixture(2701,'${selfEdition}');
      do $$declare n integer;begin
        for n in 2601..2608 loop perform pg_temp.registration_submit('${selfEdition}',n,md5(n::text)||md5(n::text));end loop;
      end$$;
      update msrc_registration.requests set status='offered',offer_expires_at=clock_timestamp()+interval '1 hour'
        where edition_key='${selfEdition}' and actor_id in('${actor(2601)}','${actor(2602)}');
      update msrc_registration.requests set status='approved'
        where edition_key='${selfEdition}' and actor_id in('${actor(2603)}','${actor(2604)}');
      update msrc_registration.requests set status='waitlisted'
        where edition_key='${selfEdition}' and actor_id in('${actor(2605)}','${actor(2606)}','${actor(2607)}');
      update msrc_registration.settings set general_capacity=4,offer_window_hours=24 where edition_key='${selfEdition}';
      commit;`);
  });

  it("acceptance winning the settings lock cannot be expired or hand the same seat to someone else", async () => {
    const accepting = held(participantAction("accept_offer", 2601, 2601, "synthetic-self-accept-winner") + `
      reset role;
      update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second'
        where edition_key='${selfEdition}' and actor_id='${actor(2601)}';
      select pg_advisory_xact_lock(${marker});`);
    let expiring: Promise<string> | undefined;
    try {
      try {
        await barrier();
        expiring = query(participantExpiry("synthetic-self-expire-contender") + "commit;");
        await waiting("synthetic-self-expire-contender");
      } finally { accepting.release(); }
      const [accepted, expired] = (await Promise.all([accepting.done, expiring!])).map(response);
      expect(accepted.state).toBe("updated");
      expect(expired).toEqual({ state: "updated", expired: 0, offered: 0 });
      await query(`do $$begin
        if (select status from msrc_registration.requests where edition_key='${selfEdition}' and actor_id='${actor(2601)}')<>'approved'
        or (select count(*) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
          where r.edition_key='${selfEdition}' and r.actor_id='${actor(2601)}' and t.status='issued')<>1
        or (select count(*) from msrc_outbox.messages where template_key='registration_approved' and recipient_email='registration-2601@example.invalid')<>1
        or exists(select 1 from msrc_registration.audit where edition_key='${selfEdition}' and target_actor='${actor(2601)}' and event='request.offer_expired')
        then raise exception 'Accept-winning race invariant failed';end if;end$$;`);
    } finally { await Promise.allSettled([accepting.done, ...(expiring ? [expiring] : [])]); }
  });

  it("expiry winning the settings lock denies acceptance and passes the seat only once", async () => {
    await query(`update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second'
      where edition_key='${selfEdition}' and actor_id='${actor(2602)}';`);
    const expiring = held(participantExpiry("synthetic-self-expire-winner") + `select pg_advisory_xact_lock(${marker});`);
    let accepting: Promise<string> | undefined;
    try {
      try {
        await barrier();
        accepting = query(participantAction("accept_offer", 2602, 2602, "synthetic-self-accept-contender") + "commit;");
        await waiting("synthetic-self-accept-contender");
      } finally { expiring.release(); }
      const [expired, accepted] = (await Promise.all([expiring.done, accepting!])).map(response);
      expect(expired).toEqual({ state: "updated", expired: 1, offered: 1 });
      expect(accepted.state).toBe("expired");
      await query(`do $$begin
        if exists(select 1 from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
          where r.edition_key='${selfEdition}' and r.actor_id='${actor(2602)}')
        or (select count(*) from msrc_registration.audit where edition_key='${selfEdition}' and target_actor='${actor(2602)}' and event='request.offer_expired')<>1
        or (select count(*) from msrc_registration.audit where edition_key='${selfEdition}' and event='request.offered')<>1
        or (select count(*) from msrc_outbox.messages where template_key='registration_expired' and recipient_email='registration-2602@example.invalid')<>1
        then raise exception 'Expiry-winning race invariant failed';end if;end$$;`);
    } finally { await Promise.allSettled([expiring.done, ...(accepting ? [accepting] : [])]); }
  });

  it.each([{ participant: 2603, sameOperation: true }, { participant: 2604, sameOperation: false }])(
    "two concurrent cancellations for $participant (same operation: $sameOperation) revoke and pass one seat",
    async ({ participant, sameOperation }) => {
      const first = held(participantAction("cancel", participant, participant, `synthetic-self-cancel-first-${participant}`) +
        `select pg_advisory_xact_lock(${marker});`);
      let second: Promise<string> | undefined;
      try {
        try {
          await barrier();
          second = query(participantAction("cancel", participant, sameOperation ? participant : participant + 100,
            `synthetic-self-cancel-second-${participant}`) + "commit;");
          await waiting(`synthetic-self-cancel-second-${participant}`);
        } finally { first.release(); }
        expect((await Promise.all([first.done, second!])).map(response).map((row) => row.state))
          .toEqual(["updated", sameOperation ? "updated" : "conflict"]);
        await query(`do $$begin
          if (select count(*) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
            where r.edition_key='${selfEdition}' and r.actor_id='${actor(participant)}' and t.status='revoked')<>1
          or (select count(*) from msrc_registration.audit where edition_key='${selfEdition}'
            and target_actor='${actor(participant)}' and event='request.cancelled')<>1
          or (select count(*) from msrc_registration.audit where edition_key='${selfEdition}'
            and target_actor='${actor(participant)}' and event='ticket.revoked' and performer_id is null)<>1
          or (select count(*) from msrc_outbox.messages where template_key='registration_cancelled'
            and recipient_email='registration-${participant}@example.invalid')<>1
          or (select count(*) from msrc_registration.requests where edition_key='${selfEdition}'
            and status in('approved','approved_awaiting_payment','offered','confirmed'))<>4
          then raise exception 'Concurrent cancellation invariant failed';end if;end$$;`);
      } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
    });

  it("rechecks a participant session deadline after waiting for the settings lock", async () => {
    const locking = held(`begin;
      select 1 from msrc_registration.settings where edition_key='${selfEdition}' for update;
      select pg_advisory_xact_lock(${marker});`);
    let cancelling: Promise<string> | undefined;
    try {
      try {
        await barrier();
        cancelling = query(participantAction("cancel", 2608, 2608, "synthetic-self-session-expired") + "commit;");
        await waiting("synthetic-self-session-expired");
        // The contender has not obtained its native-session row lock yet.
        await query(`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id='e7200000-0000-4000-8000-000000002608';`);
      } finally { locking.release(); }
      const [, denied] = await Promise.all([locking.done, cancelling!]);
      expect(response(denied).state).toBe("denied");
      await query(`do $$begin
        if (select status from msrc_registration.requests where edition_key='${selfEdition}' and actor_id='${actor(2608)}')<>'pending_approval'
        or exists(select 1 from msrc_registration.participant_operations where edition_key='${selfEdition}' and actor_id='${actor(2608)}')
        then raise exception 'Expired participant session mutated registration';end if;end$$;`);
    } finally { await Promise.allSettled([locking.done, ...(cancelling ? [cancelling] : [])]); }
  });
});

// ENG-053 shares this existing CI entrypoint and its guarded disposable stack.
// Settings and allocation must observe each other's committed seat decisions.
const settingsEdition = "synthetic-settings-races";
function settingsDecision(staff: number, changes: Record<string, unknown>, operation: string, applicationName: string,
  targetEdition = settingsEdition, isolation: "read committed" | "repeatable read" | "serializable" = "read committed") {
  return `begin isolation level ${isolation};
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    set local role authenticated;
    select public.msrc_staff_registration_settings_save('${targetEdition}','${JSON.stringify(changes)}'::jsonb,'${operation}')::text;`;
}
function settingsApproval(participant: number, applicationName: string) {
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(1600)::text,true);
    select set_config('synthetic.request_id',(select id::text from msrc_registration.requests where edition_key='${settingsEdition}' and actor_id='${actor(participant)}'),true);
    set local role service_role;
    select public.msrc_staff_registration_approve_tickets('${settingsEdition}',current_setting('request.jwt.claims')::jsonb,
      array[current_setting('synthetic.request_id')::uuid],repeat('a',64))::text;`;
}

describe.skipIf(!isolatedCi)("Registration settings serialization (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${settingsEdition}');
      select pg_temp.registration_staff_fixture(1600,'${settingsEdition}');
      select pg_temp.registration_staff_fixture(1601,'${settingsEdition}');
      select pg_temp.registration_fixture(1611,'${settingsEdition}');
      select pg_temp.registration_fixture(1612,'${settingsEdition}');
      select pg_temp.registration_fixture(1613,'${settingsEdition}');
      select pg_temp.registration_submit('${settingsEdition}',1611,repeat('a',64));
      select pg_temp.registration_submit('${settingsEdition}',1612,repeat('b',64));
      select pg_temp.registration_submit('${settingsEdition}',1613,repeat('c',64));
      update msrc_registration.requests set status='approved' where edition_key='${settingsEdition}' and actor_id='${actor(1611)}';
      update msrc_registration.settings set general_capacity=3,enabled=false where edition_key='${settingsEdition}';
      commit;`);
  });

  it("a capacity reduction queued behind approval sees the newly committed seat holder", async () => {
    const allocator = held(settingsApproval(1612, "synthetic-settings-allocator") + `select pg_advisory_xact_lock(${marker});`);
    let saving: Promise<string> | undefined;
    try {
      try {
        await barrier();
        saving = query(settingsDecision(1601, { general_capacity: 1 }, "e7300000-0000-4000-8000-000000001601", "synthetic-settings-capacity-loser") + "commit;");
        await waiting("synthetic-settings-capacity-loser");
      } finally { allocator.release(); }
      const [allocated, saved] = (await Promise.all([allocator.done, saving!])).map(response);
      expect(allocated.decided.approved).toBe(1);
      expect(saved.state).toBe("capacity_below_held");
      await query(`do $$begin
        if (select general_capacity from msrc_registration.settings where edition_key='${settingsEdition}')<>3
        or (select count(*) from msrc_registration.requests where edition_key='${settingsEdition}' and status='approved')<>2
        or exists(select 1 from msrc_registration.settings_audit where edition_key='${settingsEdition}')
        then raise exception 'Settings lost committed allocation evidence';end if;end$$;`);
    } finally { await Promise.allSettled([allocator.done, ...(saving ? [saving] : [])]); }
  });

  it("an approval queued behind a capacity reduction sees the reduced limit", async () => {
    const saving = held(settingsDecision(1601, { general_capacity: 2 }, "e7300000-0000-4000-8000-000000001602", "synthetic-settings-capacity-winner") + `select pg_advisory_xact_lock(${marker});`);
    let allocating: Promise<string> | undefined;
    try {
      try {
        await barrier();
        allocating = query(settingsApproval(1613, "synthetic-settings-allocation-loser") + "commit;");
        await waiting("synthetic-settings-allocation-loser");
      } finally { saving.release(); }
      const [saved, allocated] = (await Promise.all([saving.done, allocating!])).map(response);
      expect(saved.state).toBe("updated");
      expect(allocated.decided).toEqual({ approved: 0, waitlisted: 0, skipped: 1 });
      await query(`do $$begin
        if (select general_capacity from msrc_registration.settings where edition_key='${settingsEdition}')<>2
        or (select status from msrc_registration.requests where edition_key='${settingsEdition}' and actor_id='${actor(1613)}')<>'pending_approval'
        or (select count(*) from msrc_registration.settings_audit where edition_key='${settingsEdition}')<>1
        then raise exception 'Allocation ignored saved capacity';end if;end$$;`);
    } finally { await Promise.allSettled([saving.done, ...(allocating ? [allocating] : [])]); }
  });

  it("concurrent identical save operations commit exactly one immutable audit", async () => {
    const operation = "e7300000-0000-4000-8000-000000001603";
    const changes = { terms_version: "synthetic-idempotent-settings" };
    const first = held(settingsDecision(1601, changes, operation, "synthetic-settings-first-save") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(settingsDecision(1601, changes, operation, "synthetic-settings-repeat-save") + "commit;");
        await waiting("synthetic-settings-repeat-save");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.state)).toEqual(["updated", "updated"]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.settings_audit where edition_key='${settingsEdition}' and operation_id='${operation}')<>1
        or (select terms_version from msrc_registration.settings where edition_key='${settingsEdition}')<>'synthetic-idempotent-settings'
        then raise exception 'Concurrent duplicate save was not idempotent';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });

  it("save rechecks exact-session expiry after the allocation lock wait", async () => {
    // Expiry durably revokes the session; restoring policy does not revive it.
    // Keep this actor separate from the other save/allocation fixtures.
    await query(`select pg_temp.registration_staff_fixture(1602,'${settingsEdition}');`);
    const locking = held(`begin; select 1 from msrc_registration.settings where edition_key='${settingsEdition}' for update;
      select pg_advisory_xact_lock(${marker});`);
    let saving: Promise<string> | undefined;
    try {
      try {
        await barrier();
        saving = query(settingsDecision(1602, { general_capacity: 9 }, "e7300000-0000-4000-8000-000000001604", "synthetic-settings-expired-save") + "commit;");
        await waiting("synthetic-settings-expired-save");
        await query("update msrc_sessions.policy set privileged_absolute_seconds=1 where singleton;");
      } finally { locking.release(); }
      const [, saved] = await Promise.all([locking.done, saving!]);
      expect(response(saved).state).toBe("denied");
      await query(`do $$begin
        if (select general_capacity from msrc_registration.settings where edition_key='${settingsEdition}')<>2
        or exists(select 1 from msrc_registration.settings_audit where operation_id='e7300000-0000-4000-8000-000000001604')
        or not exists(select 1 from msrc_sessions.session_state where session_id=pg_temp.registration_session(1602)
          and revoked_at is not null and revocation_cause='policy_expired')
        then raise exception 'Expired waiting session changed settings';end if;end$$;`);
    } finally {
      await Promise.allSettled([locking.done, ...(saving ? [saving] : [])]);
      await query("update msrc_sessions.policy set privileged_absolute_seconds=28800 where singleton;");
    }
    expect(response(await query(settingsDecision(1602, { general_capacity: 9 }, "e7300000-0000-4000-8000-000000001604",
      "synthetic-settings-still-revoked") + "commit;")).state).toBe("denied");
  });

  it.each(["repeatable read", "serializable"] as const)(
    "save refuses %s before early returns or waiting for the settings lock", async (isolation) => {
      const staff = isolation === "repeatable read" ? 1630 : 1631;
      const targetEdition = `synthetic-settings-isolation-${staff}`;
      const operation = `e7300000-0000-4000-8000-${String(staff).padStart(12, "0")}`;
      const newOperation = `e7300000-0000-4000-8000-${String(staff + 10).padStart(12, "0")}`;
      const changes = { terms_version: "synthetic-isolation-replay" };
      // Each isolation case has fresh native sessions and its own edition/receipt,
      // independent of the preceding expiry case and other settings mutations.
      await query(`begin;
        select pg_temp.registration_settings('${targetEdition}');
        select pg_temp.registration_staff_fixture(${staff},'${targetEdition}');
        select pg_temp.registration_staff_fixture(${staff + 10},'${targetEdition}','registrationWorkshopAdministrator');
        commit;`);
      expect(response(await query(settingsDecision(staff, changes, operation, "synthetic-isolation-receipt", targetEdition) + "commit;")).state)
        .toBe("updated");
      expect(response(await query(settingsDecision(staff + 10, changes, newOperation, "synthetic-isolation-denied", targetEdition) + "commit;")).state)
        .toBe("denied");
      const read = `begin;
        select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
        set local role authenticated;
        select public.msrc_staff_registration_settings('${targetEdition}')::text;
        commit;`;
      const before = response(await query(read));
      expect(before.state).toBe("ready");
      const locking = held(`begin;
        select 1 from msrc_registration.settings where edition_key='${targetEdition}' for update;
        select pg_advisory_xact_lock(${marker});`);
      try {
        await barrier();
        const attempts = [
          { staff, changes: { general_capacity: 5 }, operation: newOperation },
          { staff: staff + 10, changes, operation: newOperation },
          { staff, changes: {}, operation: newOperation },
          { staff, changes: { enabled: true }, operation: newOperation },
          { staff, changes: { minimum_age: 17 }, operation: newOperation },
          { staff, changes, operation },
          { staff, changes: { terms_version: "synthetic-conflicting-replay" }, operation },
        ];
        for (const attempt of attempts) {
          // A misplaced guard must fail with a lock timeout, not hang until the
          // holder is released. Every call must raise 25001 while it still holds.
          await expect(query("set lock_timeout='1s';\n" + settingsDecision(attempt.staff, attempt.changes, attempt.operation,
            `synthetic-settings-isolation-${staff}`, targetEdition, isolation) + "commit;")).rejects.toThrow("SQLSTATE 25001");
        }
      } finally {
        locking.release();
        await locking.done;
      }
      expect(response(await query(read))).toEqual(before);
    },
  );

  it("two first saves serialize on the edition before the settings row exists", async () => {
    const targetEdition = "synthetic-settings-initial-race";
    await query(`insert into msrc_authorization.edition_config(edition_key) values('${targetEdition}');
      select pg_temp.registration_staff_fixture(1620,'${targetEdition}');
      select pg_temp.registration_staff_fixture(1621,'${targetEdition}');`);
    const initial = { terms_version: "synthetic-initial-settings", payment_required: false, general_capacity: 7,
      priority_start_at: "2040-02-01T20:00:00+03:00", priority_end_at: "2040-02-02T20:00:00+03:00",
      general_opening_at: "2040-02-02T20:00:00+03:00", closing_at: "2040-02-03T20:00:00+03:00",
      waitlist_offer_hours: 11, confirm_seat_lead_days: 0, confirm_seat_response_hours: 7,
      places_remaining_threshold: 0, minimum_age: 18 };
    const first = held(settingsDecision(1620, initial, "e7300000-0000-4000-8000-000000001620", "synthetic-settings-initial-winner", targetEdition) + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(settingsDecision(1621, { ...initial, general_capacity: 9 }, "e7300000-0000-4000-8000-000000001621", "synthetic-settings-initial-contender", targetEdition) + "commit;");
        await waiting("synthetic-settings-initial-contender");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.state)).toEqual(["updated", "updated"]);
      await query(`do $$begin
        if (select general_capacity from msrc_registration.settings where edition_key='${targetEdition}')<>9
        or (select enabled from msrc_registration.settings where edition_key='${targetEdition}')
        or (select count(*) from msrc_registration.settings_audit where edition_key='${targetEdition}')<>2
        or (select changes->'general_capacity' from msrc_registration.settings_audit where operation_id='e7300000-0000-4000-8000-000000001621')<>'{"before":7,"after":9}'::jsonb
        then raise exception 'Initial settings race did not preserve serial history';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
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
      '1234567890','synthetic-terms')::text;
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
      select pg_temp.registration_staff_fixture(1302,'${earlyEdition}');
      update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '1 hour',
        priority_end_at=clock_timestamp()+interval '1 hour',general_opening_at=clock_timestamp()+interval '2 hours'
        where edition_key='${earlyEdition}';
      select set_config('request.jwt.claims',pg_temp.registration_claims(1301)::text,true);
      select public.msrc_staff_early_access_add('${earlyEdition}',array['registration-1201@example.invalid','concurrent-remove@example.invalid']);
      commit;`);
  });

  it("concurrent normalized duplicate additions create one entry and one audit", async () => {
    const add = (staff: number, email: string, applicationName: string) => `begin;
      set local application_name='${applicationName}';
      select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
      set local role authenticated;
      select public.msrc_staff_early_access_add('${earlyEdition}',array['${email}'])::text;`;
    const first = held(add(1301, "  CONCURRENT@EXAMPLE.INVALID  ", "synthetic-early-add-first") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(add(1302, "concurrent@example.invalid", "synthetic-early-add-second") + "commit;");
        await waiting("synthetic-early-add-second");
      } finally { first.release(); }
      expect((await Promise.all([first.done, second!])).map(response)).toEqual([
        { state: "updated", added: 1, invalid: [] }, { state: "updated", added: 0, invalid: [] },
      ]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.early_access_entries where edition_key='${earlyEdition}' and email='concurrent@example.invalid' and active)<>1
        or (select count(*) from msrc_registration.audit a join msrc_registration.early_access_entries e on e.id=a.early_access_entry_id
          where e.edition_key='${earlyEdition}' and e.email='concurrent@example.invalid' and a.event='early_access.added')<>1
        then raise exception 'Concurrent early-access addition invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });

  it("concurrent removal of one entry records one transition and one audit", async () => {
    const remove = (staff: number, applicationName: string) => `begin;
      set local application_name='${applicationName}';
      select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
      select set_config('synthetic.entry_id',(select id::text from msrc_registration.early_access_entries
        where edition_key='${earlyEdition}' and email='concurrent-remove@example.invalid'),true);
      set local role authenticated;
      select public.msrc_staff_early_access_remove('${earlyEdition}',array[current_setting('synthetic.entry_id')::uuid])::text;`;
    const first = held(remove(1301, "synthetic-early-remove-first") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(remove(1302, "synthetic-early-remove-second") + "commit;");
        await waiting("synthetic-early-remove-second");
      } finally { first.release(); }
      expect((await Promise.all([first.done, second!])).map(response)).toEqual([
        { state: "updated", removed: 1 }, { state: "updated", removed: 0 },
      ]);
      await query(`do $$begin
        if exists(select 1 from msrc_registration.early_access_entries where edition_key='${earlyEdition}' and email='concurrent-remove@example.invalid' and active)
        or (select count(*) from msrc_registration.audit a join msrc_registration.early_access_entries e on e.id=a.early_access_entry_id
          where e.edition_key='${earlyEdition}' and e.email='concurrent-remove@example.invalid' and a.event='early_access.removed')<>1
        then raise exception 'Concurrent early-access removal invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
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
        or (select count(*) from msrc_registration.audit a join msrc_registration.early_access_entries e on e.id=a.early_access_entry_id
          where e.edition_key='${earlyEdition}' and e.email='registration-1201@example.invalid' and a.event='early_access.removed')<>1
        then raise exception 'Removal/submit serialization invariant failed';end if;
        end$$;`);
    } finally { await Promise.allSettled([removing.done, ...(submitting ? [submitting] : [])]); }
  });

  it("submit refuses repeatable-read snapshots that could reuse removed eligibility", async () => {
    await expect(query(earlySubmit("repeatable read"))).rejects.toThrow("SQLSTATE 25001");
  });
});

// ENG-058 / CHK-03/04: separate cold identities; no case reuses an expired
// scanner session or a previously revoked participant entitlement.
const checkinEdition = "synthetic-checkin-races";
function scan(staff: number, participant: number, applicationName: string) {
  return `begin;
    set local application_name='${applicationName}';
    select set_config('request.jwt.claims',pg_temp.registration_claims(${staff})::text,true);
    select set_config('synthetic.checkin_reference',(select upper(substr(replace(t.id::text,'-',''),1,12))
      from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
      where r.edition_key='${checkinEdition}' and r.actor_id='${actor(participant)}'),true);
    set local role authenticated;
    select public.msrc_staff_checkin('${checkinEdition}',current_setting('synthetic.checkin_reference'),'2040-01-01','Synthetic entry')::text;`;
}

describe.skipIf(!isolatedCi)("Conference attendance (disposable GitHub CI only)", () => {
  beforeAll(async () => {
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      select pg_temp.registration_settings('${checkinEdition}');
      select pg_temp.registration_fixture(79001,'${checkinEdition}');
      select pg_temp.registration_fixture(79002,'${checkinEdition}');
      select pg_temp.registration_fixture(79003,'${checkinEdition}');
      select pg_temp.registration_fixture(79004,'${checkinEdition}');
      select pg_temp.registration_staff_fixture(79011,'${checkinEdition}','checkInStaff');
      select pg_temp.registration_staff_fixture(79012,'${checkinEdition}','checkInStaff');
      select pg_temp.registration_staff_fixture(79013,'${checkinEdition}','checkInStaff');
      select pg_temp.registration_staff_fixture(79014,'${checkinEdition}','checkInStaff');
      select pg_temp.registration_submit('${checkinEdition}',79001,md5('79001')||md5('79001'));
      select pg_temp.registration_submit('${checkinEdition}',79002,md5('79002')||md5('79002'));
      select pg_temp.registration_submit('${checkinEdition}',79003,md5('79003')||md5('79003'));
      select pg_temp.registration_submit('${checkinEdition}',79004,md5('79004')||md5('79004'));
      update msrc_registration.requests set status='approved' where edition_key='${checkinEdition}';
      update msrc_registration.settings set enabled=false,conference_days=array[date '2040-01-01',date '2040-01-02']
        where edition_key='${checkinEdition}';
      commit;`);
  });

  it("two scanners contending for one ticket commit one check-in and return the original receipt on the duplicate", async () => {
    const first = held(scan(79011, 79001, "synthetic-checkin-first") + `select pg_advisory_xact_lock(${marker});`);
    let second: Promise<string> | undefined;
    try {
      try {
        await barrier();
        second = query(scan(79012, 79001, "synthetic-checkin-second") + "commit;");
        await waiting("synthetic-checkin-second");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, second!])).map(response);
      expect(results.map((row) => row.state)).toEqual(["checked_in", "already_checked_in"]);
      expect(results[1].attendance).toEqual(results[0].attendance);
      expect(results[0].attendance.performerId).toBe(actor(79011));
      await query(`do $$begin
        if (select count(*) from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
          join msrc_registration.requests r on r.id=t.request_id where r.edition_key='${checkinEdition}' and r.actor_id='${actor(79001)}')<>1
        or (select count(*) from msrc_registration.attendance_audit where edition_key='${checkinEdition}' and result='checked_in')<>1
        or (select count(*) from msrc_registration.attendance_audit where edition_key='${checkinEdition}' and result='already_checked_in')<>1
        then raise exception 'Concurrent check-in invariant failed';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(second ? [second] : [])]); }
  });

  it("a scanner waiting behind revocation observes the committed revoked entitlement", async () => {
    const revoking = held(`begin;
      update msrc_registration.requests set status='cancelled'
      where edition_key='${checkinEdition}' and actor_id='${actor(79002)}';
      select pg_advisory_xact_lock(${marker});`);
    let scanning: Promise<string> | undefined;
    try {
      try {
        await barrier();
        scanning = query(scan(79011, 79002, "synthetic-checkin-revoked") + "commit;");
        await waiting("synthetic-checkin-revoked");
      } finally { revoking.release(); }
      const [, scanned] = await Promise.all([revoking.done, scanning!]);
      expect(response(scanned).state).toBe("revoked");
      await query(`do $$begin
        if exists(select 1 from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
          join msrc_registration.requests r on r.id=t.request_id where r.actor_id='${actor(79002)}')
        then raise exception 'Revoked ticket gained attendance';end if;end$$;`);
    } finally { await Promise.allSettled([revoking.done, ...(scanning ? [scanning] : [])]); }
  });

  it("rechecks scanner session expiry after waiting behind a ticket-row transaction", async () => {
    const locking = held(`begin;
      select 1 from msrc_registration.requests where edition_key='${checkinEdition}' and actor_id='${actor(79003)}' for update;
      select pg_advisory_xact_lock(${marker});`);
    let scanning: Promise<string> | undefined;
    try {
      try {
        await barrier();
        scanning = query(scan(79013, 79003, "synthetic-checkin-expired") + "commit;");
        await waiting("synthetic-checkin-expired");
        await query("update msrc_sessions.policy set privileged_absolute_seconds=1 where singleton;");
      } finally { locking.release(); }
      const [, scanned] = await Promise.all([locking.done, scanning!]);
      expect(response(scanned).state).toBe("denied");
      await query(`do $$begin
        if exists(select 1 from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
          join msrc_registration.requests r on r.id=t.request_id where r.actor_id='${actor(79003)}')
        then raise exception 'Expired scanner granted attendance';end if;end$$;`);
    } finally {
      await Promise.allSettled([locking.done, ...(scanning ? [scanning] : [])]);
      await query("update msrc_sessions.policy set privileged_absolute_seconds=28800 where singleton;");
    }
  });

  it.each(["repeatable read", "serializable"] as const)("refuses %s at RPC entry, even before invalid-input/authorization early returns", async (isolation) => {
    for (const call of [
      `public.msrc_staff_checkin('${checkinEdition}',null,null,null)`,
      `public.msrc_staff_checkin_undo('${checkinEdition}',null,null)`,
      `public.msrc_staff_attendance_summary('${checkinEdition}',null)`,
      `public.msrc_registration_attendance('${checkinEdition}','{}'::jsonb)`,
    ]) {
      await expect(query(`begin isolation level ${isolation};select set_config('request.jwt.claims','{}',true);select ${call};rollback;`))
        .rejects.toThrow("SQLSTATE 25001");
    }
  });

  it("a contended attendee authority row returns retryable unavailability without attendance, then a fresh retry succeeds", async () => {
    const locking = held(`begin;
      select 1 from msrc_authorization.account_access where actor_id='${actor(79004)}' for update;
      select pg_advisory_xact_lock(${marker});`);
    try {
      try {
        await barrier();
        // The target lock remains held until this call returns: NOWAIT, not a
        // timeout/retry loop, proves no cross-account lock cycle is possible.
        expect(response(await query(scan(79014, 79004, "synthetic-checkin-authority-busy") + "commit;")).state).toBe("unavailable");
        await query(`do $$begin
          if exists(select 1 from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
            join msrc_registration.requests r on r.id=t.request_id where r.actor_id='${actor(79004)}')
          or not exists(select 1 from msrc_registration.attendance_audit where edition_key='${checkinEdition}'
            and performer_id='${actor(79014)}' and result='unavailable')
          then raise exception 'Contended authority must not grant attendance';end if;end$$;`);
      } finally { locking.release(); }
      await locking.done;
      expect(response(await query(scan(79014, 79004, "synthetic-checkin-authority-retry") + "commit;")).state).toBe("checked_in");
    } finally { await Promise.allSettled([locking.done]); }
  });
});

// ENG-064: each case has fresh users/sessions and its own edition. These proofs
// run in the existing disposable staff DB job, never the ordinary unit suite.
describe.skipIf(!isolatedCi)("Confirm-your-seat serialization (disposable GitHub CI only)", () => {
  const confirmationEdition = (n: number) => `synthetic-confirmation-race-${n}`;
  const requestIdSql = (n: number) => `(select id from msrc_registration.requests where actor_id='${actor(n)}')`;
  async function fixture(n: number, start = true) {
    const event = confirmationEdition(n);
    await query(`begin;
      update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
      update msrc_participant.retention_policy set enabled=true;
      update msrc_staff.policy set enabled=true,email_daily_limit=1000;
      update msrc_outbox.settings set sweeps_enabled=true;
      select pg_temp.registration_settings('${event}');
      update msrc_registration.settings set conference_days=array[(clock_timestamp() at time zone 'Asia/Riyadh')::date+1,(clock_timestamp() at time zone 'Asia/Riyadh')::date+2],general_capacity=1,offer_window_hours=24 where edition_key='${event}';
      select pg_temp.registration_fixture(${n},'${event}');
      select pg_temp.registration_fixture(${n + 1},'${event}');
      select pg_temp.registration_staff_fixture(${n + 2},'${event}');
      commit;`);
    // Auth sessions above must exist in a prior statement/transaction.
    await query(`begin;
      select pg_temp.registration_submit('${event}',${n},md5('${n}')||md5('${n}'));
      select pg_temp.registration_submit('${event}',${n + 1},md5('${n + 1}')||md5('${n + 1}'));
      update msrc_registration.requests set status='approved' where id=${requestIdSql(n)};
      update msrc_registration.requests set status='waitlisted' where id=${requestIdSql(n + 1)};
      select set_config('request.jwt.claims',pg_temp.registration_claims(${n + 2})::text,true);
      ${start ? `select public.msrc_staff_registration_confirmation_start('${event}',gen_random_uuid(),'release_unconfirmed',
        public.msrc_staff_registration_confirmation_preview('${event}')#>>'{confirmation,previewToken}');` : ""}
      commit;`);
  }
  function confirm(n: number, name: string, operation = "e7900000-0000-4000-8000-000000000101") {
    return `begin;set local application_name='${name}';
      select set_config('request.jwt.claims',pg_temp.registration_claims(${n})::text,true);
      select set_config('synthetic.confirm_request',${requestIdSql(n)}::text,true);
      set local role service_role;
      select public.msrc_registration_confirm_seat('${confirmationEdition(n)}',current_setting('request.jwt.claims')::jsonb,
        current_setting('synthetic.confirm_request')::uuid,'${operation}')::text;`;
  }
  function maintenance(n: number, name: string) {
    return `begin;set local application_name='${name}';set local role service_role;
      select public.msrc_registration_confirmation_maintenance('${confirmationEdition(n)}')::text;commit;`;
  }

  it("a confirmation holding the settings lock wins over a queued deadline sweep and preserves its ticket", async () => {
    const n = 88001;
    await fixture(n);
    const original = (await query(`select id::text||':'||encode(secret_hash,'hex') from msrc_registration.tickets where request_id=${requestIdSql(n)};`)).trim();
    const first = held(confirm(n, "synthetic-confirm-before-expiry") + `reset role;
      update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour'
        where request_id=${requestIdSql(n)};
      select pg_advisory_xact_lock(${marker});`);
    let sweep: Promise<string> | undefined;
    try {
      try {
        await barrier();
        sweep = query(maintenance(n, "synthetic-confirm-expiry-contender"));
        await waiting("synthetic-confirm-expiry-contender");
      } finally { first.release(); }
      const [confirmed, expired] = await Promise.all([first.done, sweep!]);
      expect(response(confirmed).state).toBe("updated");
      expect(response(expired)).toMatchObject({ state: "updated", released: 0, offered: 0 });
      expect((await query(`select id::text||':'||encode(secret_hash,'hex') from msrc_registration.tickets where request_id=${requestIdSql(n)};`)).trim()).toBe(original);
      await query(`do $$begin
        if (select status from msrc_registration.requests where id=${requestIdSql(n)})<>'confirmed'
        or (select status from msrc_registration.tickets where request_id=${requestIdSql(n)})<>'issued'
        or (select status from msrc_registration.requests where id=${requestIdSql(n + 1)})<>'waitlisted'
        then raise exception 'Confirmation winner lost entitlement';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(sweep ? [sweep] : [])]); }
  });

  it("a confirm request begun before the settings wait cannot use a stale pre-deadline snapshot", async () => {
    const n = 88011;
    await fixture(n);
    const locking = held(`begin;
      select 1 from msrc_registration.settings where edition_key='${confirmationEdition(n)}' for update;
      update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour'
        where request_id=${requestIdSql(n)};
      select pg_advisory_xact_lock(${marker});`);
    let deciding: Promise<string> | undefined;
    try {
      try {
        await barrier();
        deciding = query(confirm(n, "synthetic-confirm-late-contender") + "commit;");
        await waiting("synthetic-confirm-late-contender");
      } finally { locking.release(); }
      const [, result] = await Promise.all([locking.done, deciding!]);
      expect(response(result).state).toBe("expired");
      await query(`do $$begin
        if (select status from msrc_registration.requests where id=${requestIdSql(n)})<>'cancelled'
        or (select status from msrc_registration.tickets where request_id=${requestIdSql(n)})<>'revoked'
        or (select status from msrc_registration.requests where id=${requestIdSql(n + 1)})<>'offered'
        or (select count(*) from msrc_registration.audit where request_id=${requestIdSql(n)} and event='request.seat_released')<>1
        or exists(select 1 from msrc_registration.audit where request_id=${requestIdSql(n)} and event='request.seat_confirmed')
        or (select count(*) from msrc_outbox.messages where recipient_email='registration-${n}@example.invalid' and template_key='registration_seat_released')<>1
        then raise exception 'Deadline must win and release exactly once';end if;end$$;`);
    } finally { await Promise.allSettled([locking.done, ...(deciding ? [deciding] : [])]); }
  });

  it("concurrent retries for the same participant confirmation commit one operation and audit", async () => {
    const n = 88021;
    await fixture(n);
    const first = held(confirm(n, "synthetic-confirm-retry-first") + `select pg_advisory_xact_lock(${marker});`);
    let retry: Promise<string> | undefined;
    try {
      try {
        await barrier();
        retry = query(confirm(n, "synthetic-confirm-retry-second") + "commit;");
        await waiting("synthetic-confirm-retry-second");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, retry!])).map(response);
      expect(results.map((result) => result.state)).toEqual(["updated", "updated"]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.participant_operations where request_id=${requestIdSql(n)} and action='confirm')<>1
        or (select count(*) from msrc_registration.audit where request_id=${requestIdSql(n)} and event='request.seat_confirmed')<>1
        or (select count(*) from msrc_registration.tickets where request_id=${requestIdSql(n)})<>1
        then raise exception 'Confirmation replay duplicated durable effects';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(retry ? [retry] : [])]); }
  });

  it("concurrent start retries bind one preview and one policy without duplicate emails", async () => {
    const n = 88031;
    await fixture(n, false);
    const token = response(await query(`begin;select set_config('request.jwt.claims',pg_temp.registration_claims(${n + 2})::text,true);
      select public.msrc_staff_registration_confirmation_preview('${confirmationEdition(n)}')::text;commit;`)).confirmation.previewToken as string;
    function start(name: string) {
      return `begin;set local application_name='${name}';select set_config('request.jwt.claims',pg_temp.registration_claims(${n + 2})::text,true);
        set local role authenticated;
        select public.msrc_staff_registration_confirmation_start('${confirmationEdition(n)}','e7900000-0000-4000-8000-000000000102','release_unconfirmed','${token}')::text;`;
    }
    const first = held(start("synthetic-round-first") + `select pg_advisory_xact_lock(${marker});`);
    let retry: Promise<string> | undefined;
    try {
      try {
        await barrier();
        retry = query(start("synthetic-round-second") + "commit;");
        await waiting("synthetic-round-second");
      } finally { first.release(); }
      const results = (await Promise.all([first.done, retry!])).map(response);
      expect(results).toEqual([{ state: "updated", opened: 1 }, { state: "updated", opened: 1 }]);
      await query(`do $$begin
        if (select count(*) from msrc_registration.confirmation_rounds where edition_key='${confirmationEdition(n)}')<>1
        or (select count(*) from msrc_registration.confirmation_windows where request_id=${requestIdSql(n)})<>1
        or (select count(*) from msrc_outbox.messages where recipient_email='registration-${n}@example.invalid' and template_key='registration_confirm_seat')<>1
        then raise exception 'Round replay duplicated recipients';end if;end$$;`);
    } finally { await Promise.allSettled([first.done, ...(retry ? [retry] : [])]); }
  });

  it.each(["repeatable read", "serializable"])("confirmation entrypoints reject %s before invalid claims or early returns", async (isolation) => {
    for (const call of [
      "public.msrc_staff_registration_confirmation_preview('synthetic-missing')",
      "public.msrc_staff_registration_confirmation_start('synthetic-missing',null,null,null)",
      "public.msrc_registration_confirmation_maintenance('synthetic-missing')",
      "public.msrc_registration_confirm_seat('synthetic-missing','{}'::jsonb,null,null)",
      "public.msrc_registration_release_seat('synthetic-missing','{}'::jsonb,null,null)",
      "public.msrc_registration_me('synthetic-missing','{}'::jsonb)",
      "public.msrc_registration_ticket('synthetic-missing','{}'::jsonb,null)",
      "public.msrc_registration_cancel('synthetic-missing','{}'::jsonb,null,null)",
    ]) {
      await expect(query(`begin isolation level ${isolation};select set_config('request.jwt.claims','{}',true);select ${call};rollback;`))
        .rejects.toThrow("SQLSTATE 25001");
    }
  });
});
