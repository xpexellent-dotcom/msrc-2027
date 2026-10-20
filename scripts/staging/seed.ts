/** ENG-056: owner-run disposable synthetic fixtures, never imported by the app. */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { bootstrapSqlEnvironment } from "../bootstrap-staff-validation.ts";
import { assertStagingTarget, PRODUCTION_PROJECT_REF } from "./guard.mjs";

type Environment = Readonly<Record<string, string | undefined>>;
export interface SeedOptions { participants: number; earlyAccess: number; approvers: number; runId: string }
export interface SeedSettings {
  termsVersion: string; privacyVersion: string; earlyOpeningAt: string; generalOpeningAt: string; closingAt: string;
  capacity: number; placesRemainingThreshold: number; confirmSeatLeadDays: number; confirmSeatResponseHours: number;
}
const required = (env: Environment, key: string) => {
  if (!env[key]) throw new Error(`Owner input ${key} is required.`);
  return env[key];
};
const bounded = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;

export function validateSeedSettings(value: unknown): SeedSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Explicit staging settings JSON is required.");
  const settings = value as Record<string, unknown>;
  const keys = ["termsVersion", "privacyVersion", "earlyOpeningAt", "generalOpeningAt", "closingAt", "capacity",
    "placesRemainingThreshold", "confirmSeatLeadDays", "confirmSeatResponseHours"];
  const instant = (input: unknown) => typeof input === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input)
    && Number.isFinite(Date.parse(input))
    && new Date(`${input.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === input.slice(0, 10);
  if (Object.keys(settings).sort().join() !== keys.sort().join()
    || settings.termsVersion !== "v1.0" || settings.privacyVersion !== "v1.0"
    || ![settings.earlyOpeningAt, settings.generalOpeningAt, settings.closingAt].every(instant)
    || !bounded(settings.capacity, 1, 100_000) || !bounded(settings.placesRemainingThreshold, 0, 100_000)
    || !bounded(settings.confirmSeatLeadDays, 0, 365) || !bounded(settings.confirmSeatResponseHours, 1, 8760)) {
    throw new Error("Supply every explicit staging setting; v1.0 notice/terms and bounded whole-number assumptions are required.");
  }
  const result = settings as unknown as SeedSettings;
  if (!(Date.parse(result.earlyOpeningAt) < Date.parse(result.generalOpeningAt)
    && Date.parse(result.generalOpeningAt) < Date.parse(result.closingAt))) throw new Error("Staging windows must be ordered early < general < close.");
  return result;
}

export function validateSeedInputs(env: Environment, options: SeedOptions) {
  // Run these before any filesystem write, subprocess, SDK or network request.
  const appOrigin = assertStagingTarget({ url: required(env, "MSRC_STAGING_APP_URL"),
    confirm: env.MSRC_STAGING_CONFIRM, allowPattern: env.MSRC_STAGING_APP_ALLOW_PATTERN });
  const supabaseUrl = assertStagingTarget({ url: required(env, "MSRC_STAGING_SUPABASE_URL"),
    confirm: env.MSRC_STAGING_CONFIRM, allowPattern: env.MSRC_STAGING_SUPABASE_ALLOW_PATTERN });
  const projectRef = required(env, "MSRC_STAGING_PROJECT_REF");
  const secretKey = required(env, "MSRC_STAGING_SECRET_KEY");
  const password = required(env, "MSRC_STAGING_PARTICIPANT_PASSWORD");
  if (!/^[a-z0-9]{20}$/.test(projectRef) || projectRef === PRODUCTION_PROJECT_REF
    || supabaseUrl !== `https://${projectRef}.supabase.co` || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey)
    || Array.from(password).length < 16 || Buffer.byteLength(password, "utf8") > 72 || /[\r\n\0]/.test(password)
    || !bounded(options.participants, 1, 5000) || !bounded(options.earlyAccess, 0, options.participants)
    || !bounded(options.approvers, 1, 10) || !/^[a-z][a-z0-9-]{0,31}$/.test(options.runId)) {
    throw new Error("Invalid staging identity, credential, count or run ID inputs.");
  }
  let target;
  try {
    const databaseUrl = required(env, "MSRC_STAGING_DATABASE_URL");
    const database = new URL(databaseUrl);
    const user = decodeURIComponent(database.username);
    const direct = database.hostname === `db.${projectRef}.supabase.co` && user === "postgres";
    const pooler = database.hostname === env.MSRC_STAGING_POOLER_HOST
      && /^aws-[0-9]+-ap-northeast-1\.pooler\.supabase\.com$/.test(database.hostname)
      && user === `postgres.${projectRef}`;
    const databasePassword = decodeURIComponent(database.password);
    if (!["postgres:", "postgresql:"].includes(database.protocol) || (!direct && !pooler)
      || database.port !== "5432" || database.pathname !== "/postgres" || /[?#]/.test(databaseUrl)
      || !databasePassword || /[\r\n\0]/.test(databasePassword)) throw new Error();
    target = { authOrigin: supabaseUrl, databaseHost: database.hostname, databasePort: "5432" as const, databaseName: "postgres" as const,
      databaseUser: user, databasePassword, transport: pooler ? "session-pooler" as const : "direct" as const };
  } catch { throw new Error("A matching staging native-postgres direct or explicitly approved Tokyo session-pooler URI is required."); }
  return { appOrigin, supabaseUrl, projectRef, secretKey, password, target };
}

export function buildSeedPlan(options: SeedOptions, settings: SeedSettings, target: { appOrigin: string; supabaseUrl: string }) {
  const participants = Array.from({ length: options.participants }, (_, index) => ({ actorId: randomUUID(), proofId: randomUUID(),
    email: `${options.runId}-participant-${index + 1}@example.invalid`, name: `Synthetic participant ${index + 1}`,
    documentType: "passport" as const, documentNumber: `SYN${String(index + 1).padStart(7, "0")}`, earlyAccess: index < options.earlyAccess }));
  const staff = Array.from({ length: options.approvers + 2 }, (_, index) => ({ actorId: randomUUID(),
    email: `${options.runId}-staff-${index + 1}@example.invalid`, name: `Synthetic staff ${index + 1}`,
    role: index < 2 ? "superAdmin" : "registrationWorkshopAdministrator" }));
  return { version: 1, state: "prepared", runId: options.runId, editionKey: `staging-${options.runId}`,
    appOrigin: target.appOrigin, supabaseUrl: target.supabaseUrl, settings, participants, staff };
}
type SeedPlan = ReturnType<typeof buildSeedPlan>;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const operatorGuard = `do $operator$ begin
 if current_user<>'postgres' or session_user<>'postgres' or current_database()<>'postgres' then
  raise exception 'Native postgres operator required'; end if;
 if exists(select 1 from msrc_participant.policy where enabled)
 or exists(select 1 from msrc_staff.policy where enabled)
 or exists(select 1 from msrc_participant.retention_policy where enabled)
 or exists(select 1 from msrc_registration.settings where enabled)
 or exists(select 1 from msrc_outbox.settings where delivery_enabled or sweeps_enabled or daily_cap<>0)
 then raise exception 'Staging seed requires all policies and delivery closed';end if;
end $operator$;`;

/** No password, API key or credential-bearing URL enters these SQL statements. */
export function seedSql(plan: SeedPlan, phase: "native" | "profiles") {
  const payload = literal(JSON.stringify(plan));
  const start = `begin; set local statement_timeout='60s'; set local lock_timeout='5s';
set local standard_conforming_strings=on;
select pg_advisory_xact_lock(hashtextextended('msrc-staging-seed',0));
${operatorGuard}
`;
  if (phase === "native") return `${start}
do $seed$ declare data jsonb:=${payload}::jsonb; person jsonb; begin
 if exists(select 1 from auth.users) or exists(select 1 from msrc_authorization.edition_config)
 or exists(select 1 from msrc_registration.requests) then raise exception 'Fresh empty staging project required';end if;
 for person in select value from jsonb_array_elements((data->'participants')||(data->'staff')) loop
 insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
 raw_app_meta_data,raw_user_meta_data,is_anonymous,confirmation_token,recovery_token,email_change_token_new,email_change)
 values((person->>'actorId')::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 person->>'email','',clock_timestamp(),clock_timestamp(),clock_timestamp(),
 jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'msrcSyntheticRun',data->>'runId'),
 '{}'::jsonb,false,'','','','');
 insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
 values(gen_random_uuid(),person->>'actorId',(person->>'actorId')::uuid,
 jsonb_build_object('sub',person->>'actorId','email',person->>'email','email_verified',true),'email',clock_timestamp(),clock_timestamp());
 end loop;
end $seed$;
commit;
select 'staging-native-complete';`;
  return `${start}
do $seed$ declare data jsonb:=${payload}::jsonb; person jsonb; config jsonb; edition text;
 synthetic_admin uuid; observed timestamptz; begin
 config:=data->'settings'; edition:=data->>'editionKey'; synthetic_admin:=(data#>>'{staff,0,actorId}')::uuid;
 if exists(select 1 from auth.sessions) or exists(select 1 from auth.users u where
 u.raw_app_meta_data->>'msrcSyntheticRun' is distinct from data->>'runId' or coalesce(u.encrypted_password,'')=''
 or u.email_confirmed_at is null)
 or (select count(*) from auth.users)<>jsonb_array_length(data->'participants')+jsonb_array_length(data->'staff')
 then raise exception 'Untouched synthetic managed-password fixtures required';end if;
 insert into msrc_authorization.edition_config(edition_key) values(edition);
 for person in select value from jsonb_array_elements(data->'staff') loop
 insert into msrc_staff.profiles(actor_id,name) values((person->>'actorId')::uuid,person->>'name');
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values((person->>'actorId')::uuid,'active',true);
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values((person->>'actorId')::uuid,edition,person->>'role','edition','Disposable synthetic staging rehearsal');
 end loop;
 for person in select value from jsonb_array_elements(data->'participants') loop
 observed:=clock_timestamp();
 insert into msrc_participant.admissions(id,actor_id,email,name,privacy_version,created_at,expires_at,consumed_at,age_confirmed)
 values((person->>'proofId')::uuid,(person->>'actorId')::uuid,person->>'email',person->>'name',config->>'privacyVersion',
 observed,observed+interval '2 minutes',observed,true);
 insert into msrc_participant.profiles(actor_id,name,privacy_version,state)
 values((person->>'actorId')::uuid,person->>'name',config->>'privacyVersion','verified');
 insert into msrc_participant.notice_receipts(actor_id,privacy_version,accepted_at,admission_id)
 values((person->>'actorId')::uuid,config->>'privacyVersion',observed,(person->>'proofId')::uuid);
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values((person->>'actorId')::uuid,'active',false);
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values((person->>'actorId')::uuid,edition,'participant','edition','Disposable synthetic staging rehearsal');
 end loop;
 insert into msrc_registration.settings(edition_key,enabled,terms_version,payment_required,general_capacity,
 early_access_start_at,early_access_end_at,priority_start_at,priority_end_at,general_opening_at,closing_at,
 waitlist_offer_hours,offer_window_hours,confirm_seat_lead_days,confirm_seat_response_hours,places_remaining_threshold,minimum_age)
 values(edition,false,config->>'termsVersion',false,(config->>'capacity')::integer,
 (config->>'earlyOpeningAt')::timestamptz,(config->>'generalOpeningAt')::timestamptz,
 (config->>'earlyOpeningAt')::timestamptz,(config->>'generalOpeningAt')::timestamptz,
 (config->>'generalOpeningAt')::timestamptz,(config->>'closingAt')::timestamptz,24,24,
 (config->>'confirmSeatLeadDays')::integer,(config->>'confirmSeatResponseHours')::integer,
 (config->>'placesRemainingThreshold')::integer,18);
 for person in select value from jsonb_array_elements(data->'participants') where (value->>'earlyAccess')::boolean loop
 insert into msrc_registration.early_access_entries(edition_key,email,added_by)
 values(edition,person->>'email',synthetic_admin);
 end loop;
 update msrc_participant.policy set privacy_version=config->>'privacyVersion' where singleton;
 if not msrc_registration.settings_complete(edition) or exists(select 1 from msrc_participant.profiles p
 where not msrc_participant.age_proven(p.actor_id)) then raise exception 'Synthetic settings/proof validation failed';end if;
end $seed$;
${operatorGuard}
commit;
select 'staging-profiles-complete';`;
}

async function runSql(statement: string, env: Record<string, string | undefined>, receipt: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"], { env: env as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "ignore"] });
    let output = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Staging SQL timed out; discard partial fixtures.")); }, 90_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { if (output.length < 4096) output += chunk; });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Staging SQL could not start.")); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0 && output.split(/\r?\n/).includes(receipt)) resolvePromise();
      else reject(new Error("Staging SQL failed; keep gates closed and discard partial fixtures."));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(statement);
  });
}

export async function runSeed(env: Environment, options: SeedOptions, settingsValue: unknown) {
  const input = validateSeedInputs(env, options);
  const settings = validateSeedSettings(settingsValue);
  const plan = buildSeedPlan(options, settings, input);
  const directory = resolve(".tools", "staging", options.runId);
  // Exclusive creation prevents blind retries from overwriting the recovery receipt.
  await mkdir(resolve(".tools", "staging"), { recursive: true });
  await mkdir(directory, { mode: 0o700 });
  const staff = plan.staff.map((person) => ({ ...person, password: randomBytes(24).toString("base64url") }));
  await writeFile(resolve(directory, "staff-credentials.json"), JSON.stringify({ runId: plan.runId, staff }, null, 2), { mode: 0o600, flag: "wx" });
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify(plan, null, 2), { mode: 0o600, flag: "wx" });
  const sqlEnv = bootstrapSqlEnvironment(input.target, env, env.PGSSLROOTCERT);
  await runSql(seedSql(plan, "native"), sqlEnv, "staging-native-complete");
  const sdk = createClient(input.supabaseUrl, input.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get("Authorization") === `Bearer ${input.secretKey}`) headers.delete("Authorization");
      headers.set("apikey", input.secretKey);
      return fetch(url, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
    } },
  });
  for (const person of [...plan.participants.map((value) => ({ ...value, password: input.password })), ...staff]) {
    // Official Admin update bypasses confirmation flows, never sends invitation/reset email.
    const result = await sdk.auth.admin.updateUserById(person.actorId, { password: person.password });
    if (result.error || result.data.user?.id !== person.actorId) throw new Error("Managed staging credentials failed; discard partial fixtures without retrying.");
  }
  await runSql(seedSql(plan, "profiles"), sqlEnv, "staging-profiles-complete");
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify({ ...plan, state: "complete" }, null, 2), { mode: 0o600 });
  return { participants: plan.participants.length, staff: plan.staff.length, manifest: resolve(directory, "manifest.json") };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--execute")) { process.stdout.write("Inert. Read docs/runbooks/STAGING_SETUP.md; explicit --execute and staging guards are required.\n"); return; }
  const value = (flag: string) => { const index = args.indexOf(flag); if (index < 0 || !args[index + 1]) throw new Error("Every seed argument is required."); return args[index + 1]; };
  const options = { participants: Number(value("--participants")), earlyAccess: Number(value("--early-access")),
    approvers: Number(value("--approvers")), runId: value("--run-id") };
  validateSeedInputs(process.env, options);
  const settings: unknown = JSON.parse(await readFile(value("--settings"), "utf8"));
  const result = await runSeed(process.env, options, settings);
  process.stdout.write(`Staging fixture complete: ${result.participants} participants, ${result.staff} staff. All gates remain closed. Private manifest: ${result.manifest}\n`);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { process.stderr.write("Staging seed refused or failed. No provider diagnostics or secrets are printed. Check inputs; discard any partial staging project before retrying.\n"); process.exitCode = 1; });
}
