import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it } from "vitest";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { ParticipantPayload, ParticipantResponse } from "@/features/participant-accounts/contracts";
import { createParticipantHandler } from "@/features/participant-accounts/handler.server";
import { participantNotice } from "@/features/participant-accounts/privacy.server";
import { participantHash } from "@/features/participant-accounts/security.server";
import { boundary, check, client, nativeAdmin, nativeCredentials, query } from "./setup";

// Genuine native Admin/password/refresh APIs + private SQL on the dedicated
// disposable runner. No SMTP, provider credential, real address or hosted data.
const ci = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-participant-accounts-2027";
const notice = "synthetic-approved-participant-ci-v1";
const key = randomBytes(32);
const password = randomBytes(32).toString("hex");
const digest = (value: string) => createHmac("sha256", key).update(value).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Actor = { id: string; email: string; name: string };
type Result = { state: string; [key: string]: unknown };
type Purpose = "verify_email" | "reset_password";
type Service = "status" | "form_claim" | "signup_reserve" | "email_begin" | "email_delivery"
  | "email_consume" | "email_complete" | "login_begin" | "login_finish";
type Challenge = { id: string; hash: string; actor: Actor; purpose: Purpose; ipHash: string };
let admin: SupabaseClient;
let main: Actor;
let other: Actor;
let active: { sdk: SupabaseClient; session: Session };

function actor(): Actor {
  const id = randomUUID();
  return { id, email: `participant-${id}@example.invalid`, name: `Synthetic ${id.slice(0,8)}` };
}
function text(value: string) {
  // Only generated UUIDs, fixed synthetic text and private hex digests enter SQL.
  check(!value.includes("'") && !value.includes("\\") && value.length <= 254, "bounded fixture SQL value");
  return `'${value}'`;
}
function authDiagnostic(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const status = "status" in error && typeof error.status === "number" && Number.isInteger(error.status)
    && error.status >= 100 && error.status <= 599 ? error.status : "withheld";
  const allowedCodes = ["unexpected_failure", "validation_failed", "user_not_found", "email_exists", "signup_disabled",
    "email_not_confirmed", "invalid_credentials", "hook_execution_error", "hook_timeout", "hook_payload_invalid"];
  const code = "code" in error && typeof error.code === "string" && allowedCodes.includes(error.code) ? error.code : "withheld";
  // Never emit provider messages, request/response bodies, addresses or credentials.
  return ` (Auth status=${status}, code=${code})`;
}
async function service(name: Service, args = ""): Promise<Result> {
  const value: unknown = JSON.parse(await query(`begin; set local role service_role;
    select public.msrc_participant_${name}(${args}); commit;`));
  check(value && typeof value === "object" && !Array.isArray(value), "private service result shape");
  return value as Result;
}
function sid(session: Session) {
  const payload: unknown = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"));
  check(payload && typeof payload === "object" && "session_id" in payload && typeof payload.session_id === "string"
    && uuid.test(payload.session_id), "genuine signed native session identifier");
  return payload.session_id;
}
async function rpc(name: string, body: Record<string, unknown>, session?: Session) {
  const config = boundary();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, { method: "POST",
    headers: { apikey: config.publishableKey, "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8_000) });
  const value: unknown = await response.json();
  return { status: response.status, value };
}
async function profile(session: Session) {
  const result = await rpc("msrc_participant_profile", { edition_key: edition }, session);
  check(result.status === 200, "owner profile RPC exists and responds without raw diagnostics");
  return result.value;
}
async function context(session: Session) {
  const result = await rpc("msrc_session_context", { edition_key: edition }, session);
  check(result.status === 200 && result.value && typeof result.value === "object" && "sessionPolicySatisfied" in result.value,
    "genuine initialized session context");
  return result.value as Record<string, unknown>;
}
async function reserve(value: Actor) {
  const reservation = randomUUID();
  const result = await service("signup_reserve", `${text(value.id)},${text(reservation)},${text(value.email)},${text(value.name)},${text(notice)},true`);
  check(result.state === "reserved" && result.actorId === value.id && result.reservationId === reservation, "private notice-matched reservation");
  return reservation;
}
async function create(value = actor()) {
  const reservation = await reserve(value);
  const response = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: false,
    app_metadata: { msrcParticipantAdmission: reservation } });
  check(!response.error && response.data.user?.id === value.id && !response.data.user.email_confirmed_at,
    `native Admin creates only an admitted unverified synthetic email/password identity${authDiagnostic(response.error)}`);
  return value;
}
async function createAged(ageMs = 31 * 86_400_000) {
  boundary();
  const value = actor(), reservation = await reserve(value);
  const originalCreatedAt = new Date(Date.now() - ageMs).toISOString();
  // Only the independently guarded, unlinked CI stack gets this exact-actor
  // BEFORE INSERT fixture. GoTrue still creates the identity; the production
  // subject clock observes its original aged timestamp once and is never edited.
  await query(`begin;
    create table msrc_ci_auth.participant_age_fixture(actor_id uuid primary key,email text not null,native_created_at timestamptz not null);
    revoke all on msrc_ci_auth.participant_age_fixture from public,anon,authenticated,service_role,supabase_auth_admin;
    insert into msrc_ci_auth.participant_age_fixture values(${text(value.id)},${text(value.email)},${text(originalCreatedAt)});
    create function msrc_ci_auth.participant_age_fixture_insert() returns trigger
      language plpgsql security definer set search_path='' as $$
      declare original timestamptz; begin
        delete from msrc_ci_auth.participant_age_fixture f where f.actor_id=new.id and f.email=new.email
          and f.email like '%@example.invalid' returning f.native_created_at into original;
        if found then new.created_at:=original; end if;
        return new;
      end$$;
    revoke all on function msrc_ci_auth.participant_age_fixture_insert() from public,anon,authenticated,service_role,supabase_auth_admin;
    create trigger ci_participant_native_origin before insert on auth.users for each row
      execute function msrc_ci_auth.participant_age_fixture_insert();
    commit;`);
  try {
    const response = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: false,
      app_metadata: { msrcParticipantAdmission: reservation } });
    check(!response.error && response.data.user?.id === value.id && !response.data.user.email_confirmed_at,
      `GoTrue creates only the exact privately admitted aged synthetic identity${authDiagnostic(response.error)}`);
    check(await query(`select (s.native_created_at=u.created_at and u.created_at=${text(originalCreatedAt)}::timestamptz
      and not exists(select 1 from msrc_ci_auth.participant_age_fixture))::text
      from auth.users u join msrc_participant.subject_refs s on s.actor_id=u.id where u.id=${text(value.id)};`) === "true",
    "one-use CI origin is observed unchanged in the immutable subject clock");
    return value;
  } finally {
    await query(`begin; drop trigger if exists ci_participant_native_origin on auth.users;
      drop function if exists msrc_ci_auth.participant_age_fixture_insert();
      drop table if exists msrc_ci_auth.participant_age_fixture; commit;`);
  }
}
function challenge(value: Actor, purpose: Purpose = "verify_email", ipHash = digest(`ip:${value.id}`)): Challenge {
  const id = randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  check(/^\d{6}$/.test(code), "six-digit generated code retained only in memory");
  return { id, actor: value, purpose, ipHash, hash: digest(`${purpose}:${value.email}:${id}:${code}`) };
}
async function historicalChallenge(value: Actor) {
  boundary();
  const proof = challenge(value);
  // An expired historical private-code fixture accompanies a real native aged
  // identity. It never issues mail, admits verification or edits its subject clock.
  await query(`insert into msrc_participant.challenges(id,actor_id,purpose,recipient,identity_revision,code_hash,email_hash,ip_hash,
      name,privacy_version,created_at,expires_at,state)
    select ${text(proof.id)},${text(value.id)},'verify_email',${text(value.email)},r.revision,${text(proof.hash)},
      ${text(digest(`email:${value.email}`))},${text(proof.ipHash)},${text(value.name)},${text(notice)},
      s.native_created_at+interval '29 days',s.native_created_at+interval '29 days 10 minutes','expired'
    from msrc_participant.subject_refs s join msrc_staff_email.identity_revision r on r.actor_id=s.actor_id
    where s.actor_id=${text(value.id)};`);
  check(await query(`select count(*) from msrc_participant.challenges where id=${text(proof.id)} and state='expired';`) === "1",
    "historical private code fixture is expired before any cleanup invocation");
  return proof;
}
async function issue(value: Challenge) {
  return service("email_begin", `${text(value.actor.email)},${text(value.purpose)},${text(value.id)},${text(value.hash)},
    ${text(digest(`email:${value.actor.email}`))},${text(value.ipHash)},
    ${value.purpose === "verify_email" ? `${text(value.actor.name)},${text(notice)}` : "null,null"}`);
}
async function delivered(value: Challenge, success = true) {
  return service("email_delivery", `${text(value.id)},${success}`);
}
async function consume(value: Challenge, hash = value.hash, owner = value.actor, operation = randomUUID()) {
  const result = await service("email_consume", `${text(owner.email)},${text(value.purpose)},${text(value.id)},${text(hash)},${text(operation)},${text(value.ipHash)}`);
  return { operation, result };
}
async function complete(operation: string, success = true) {
  return service("email_complete", `${text(operation)},${success}`);
}
async function verifyExisting(value: Actor) {
  const proof = challenge(value);
  check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "verification code is issued then delivered to memory");
  const consumed = await consume(proof);
  check(consumed.result.state === "consumed" && consumed.result.actorId === value.id, "private code exchange binds the exact actor");
  const result = await admin.auth.admin.updateUserById(value.id, { email_confirm: true, password });
  check(!result.error && result.data.user?.email_confirmed_at, "mailbox proof permits a native email/password transition");
  check((await complete(consumed.operation)).state === "completed", "native transition completes the verified profile");
  return value;
}
async function verified(value = actor()) {
  return verifyExisting(await create(value));
}
async function login(value: Actor, credential = password, initialize = true) {
  const attempt = randomUUID();
  check((await service("login_begin", `${text(attempt)},${text(digest(`email:${value.email}`))},${text(digest(`login-ip:${value.id}`))}`)).state === "allowed",
    "trusted login attempt precedes native password exchange");
  const sdk = client();
  const result = await sdk.auth.signInWithPassword({ email: value.email, password: credential });
  check(!result.error && result.data.session && result.data.user?.id === value.id, "genuine verified native password login");
  const session = result.data.session;
  check((await service("login_finish", `${text(attempt)},${text(value.id)},${text(sid(session))}`)).state === "admitted", "exact native password session receives private admission");
  if (initialize) await context(session);
  return { sdk, session };
}
async function ageIssueCounters(value: Actor) {
  await query(`update msrc_participant.limit_events set occurred_at=clock_timestamp()-interval '61 seconds'
    where kind='issue_email' and subject_hash=${text(digest(`email:${value.email}`))};`);
}
async function cleanup(batchSize = 100, dryRun = true): Promise<Result> {
  boundary();
  const result: unknown = JSON.parse(await query(`select msrc_participant.cleanup_unverified(${batchSize},${dryRun});`));
  check(result && typeof result === "object" && !Array.isArray(result), "native-only cleanup returns a bounded aggregate object");
  const value = result as Result;
  check(Object.keys(value).sort().join(",") === "deleted,eligible,failed,held,scanned,state"
    && ["closed", "preview", "completed"].includes(value.state)
    && ["scanned", "eligible", "deleted", "held", "failed"].every((key) => typeof value[key] === "number"
      && Number.isInteger(value[key]) && Number(value[key]) >= 0),
  "cleanup returns counts and fixed enums without identities, provider payloads or account data");
  return value;
}

describe.skipIf(!ci)("BL-AUTH-02/03/04/06/08 genuine participant native boundaries in disposable CI", () => {
  beforeAll(async () => {
    boundary();
    admin = await nativeAdmin();
    await query(`insert into msrc_authorization.edition_config(edition_key) values(${text(edition)});`);
  });
  afterAll(async () => {
    if (ci) await query("update msrc_participant.policy set enabled=false,privacy_version=null,email_daily_limit=null where singleton; update msrc_participant.retention_policy set enabled=false where singleton;");
    // Native identities, immutable receipts and audit vanish with the disposable stack.
  });

  it("starts closed with no approved notice and denies admission before enabling a synthetic fixture", async () => {
    const status = await service("status");
    check(status.enabled === false && status.privacyVersion === null && status.emailDailyLimit === null
      && status.ageEnforcementReady === true && status.retentionEnforcementReady === true && status.cleanupEnabled === false,
    "installed age/retention controls do not enable accounts, notices, email or cleanup");
    check((await cleanup(100, false)).state === "closed", "independent default-off cleanup gate performs no deletion");
    let serviceDenied = false;
    try { await query("begin; set local role service_role; select msrc_participant.cleanup_unverified(100,false); commit;"); }
    catch (error) {
      check(error instanceof Error && error.message.includes("SQLSTATE 42501"), "service cleanup denial has only the expected safe SQLSTATE");
      serviceDenied = true;
    }
    check(serviceDenied, "application service credentials cannot execute the native operator-only cleanup worker");
    const value = actor();
    check((await service("signup_reserve", `${text(value.id)},${text(randomUUID())},${text(value.email)},${text(value.name)},${text(notice)},true`)).state === "denied",
      "closed database accepts no account reservation");
    const bypass = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: true });
    check(Boolean(bypass.error) && !bypass.data.user, "native Admin creation cannot bypass participant admission");
    await query(`update msrc_participant.policy set enabled=true,privacy_version=${text(notice)},email_daily_limit=200 where singleton;
      update msrc_participant.retention_policy set enabled=true where singleton;`);
  });

  it("denies absent or false age declarations and native metadata claims without a private attested admission", async () => {
    const value = actor();
    for (const age of ["false", "null"]) {
      check((await service("signup_reserve", `${text(value.id)},${text(randomUUID())},${text(value.email)},${text(value.name)},${text(notice)},${age}`)).state === "denied",
        "private admission requires an explicit true declaration, without coercion");
    }
    const oldSignature = await admin.rpc("msrc_participant_signup_reserve", {
      actor_id: value.id, reservation_id: randomUUID(), email: value.email, name: value.name, privacy_version: notice,
    });
    check(Boolean(oldSignature.error) || oldSignature.data?.state === "denied", "legacy five-argument admission cannot silently attest age");
    const bypass = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: false,
      user_metadata: { ageConfirmed: true }, app_metadata: { ageConfirmed: true } });
    check(Boolean(bypass.error) && !bypass.data.user, "user-editable and native app metadata cannot authorize account creation");
    check(await query(`select (not exists(select 1 from auth.users where id=${text(value.id)})
      and not exists(select 1 from msrc_participant.admissions where actor_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.profiles where actor_id=${text(value.id)}))::text;`) === "true",
    "rejected declarations and metadata leave no identity, reservation or profile");
  });

  it("creates only the minimum unverified identity and denies native confirmation without code proof", async () => {
    main = await create();
    check(await query(`select (a.age_confirmed is true and r.kind='admission' and r.age_confirmed is true
      and r.actor_id=p.actor_id and r.id=a.id and p.age_admission_id=a.id
      and r.age_attested_at is not null and p.age_attested_at=r.age_attested_at)::text
      from msrc_participant.profiles p join msrc_participant.admissions a on a.id=p.age_admission_id
      join msrc_participant.proof_refs r on r.id=a.id where p.actor_id=${text(main.id)};`) === "true",
    "native profile creation retains the exact timestamped private declaration without inventing verified age");
    const identity = await admin.auth.admin.getUserById(main.id);
    check(!identity.error && identity.data.user && !("ageConfirmed" in identity.data.user.app_metadata)
      && !("ageConfirmed" in identity.data.user.user_metadata) && !("msrcParticipantAdmission" in identity.data.user.app_metadata),
    "native public metadata contains neither age authority nor consumed reservation marker");
    const denied = await client().auth.signInWithPassword({ email: main.email, password });
    check(Boolean(denied.error) && !denied.data.session, "unverified native password login returns no session");
    const confirmation = await admin.auth.admin.updateUserById(main.id, { email_confirm: true, password });
    check(Boolean(confirmation.error), "native Admin cannot confirm a participant without consumed mailbox proof");
    check(await query(`select (coalesce(u.phone,'')='' and u.phone_confirmed_at is null and not u.is_anonymous
      and not (u.raw_app_meta_data ? 'msrcParticipantAdmission') and p.state='pending'
      and (select count(*) from msrc_participant.notice_receipts n where n.actor_id=u.id)=1)::text
      from auth.users u join msrc_participant.profiles p on p.actor_id=u.id where u.id=${text(main.id)};`) === "true",
    "no phone, anonymous identity, reusable admission marker or missing notice receipt");
  });

  it("consumes a genuine verification proof once under concurrency and requires native completion", async () => {
    const proof = challenge(main);
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "current code is deliverable");
    other = await create();
    check((await consume(proof, proof.hash, other)).result.state === "denied", "foreign account cannot consume another mailbox proof");
    const outcomes = await Promise.all([consume(proof), consume(proof)]);
    check(outcomes.filter((value) => value.result.state === "consumed").length === 1
      && outcomes.filter((value) => value.result.state === "denied").length === 1, "one concurrent consume wins");
    const winner = outcomes.find((value) => value.result.state === "consumed")!;
    check((await consume(proof)).result.state === "denied", "consumed verification cannot replay");
    const updated = await admin.auth.admin.updateUserById(main.id, { email_confirm: true, password });
    check(!updated.error, "native transaction applies only the consumed operation");
    check((await complete(winner.operation)).state === "completed" && (await complete(winner.operation)).state === "denied", "completion is one-use");
    check(await query(`select (p.state='verified' and (select count(*) from msrc_participant.notice_receipts n where n.actor_id=p.actor_id)=2)::text
      from msrc_participant.profiles p where p.actor_id=${text(main.id)};`) === "true", "verification records the exact notice without creating a role grant");
  });

  it("suppresses native recovery generically and leaves no native OTP or confirmation credentials", async () => {
    const unknown = actor();
    for (let index = 0; index < 2; index++) {
      const existing = await client().auth.resetPasswordForEmail(main.email);
      const absent = await client().auth.resetPasswordForEmail(unknown.email);
      check(!existing.error && !absent.error && JSON.stringify(existing.data) === JSON.stringify(absent.data), "native existing/unknown recovery responses are equivalent, including repeat requests");
    }
    const otp = await client().auth.signInWithOtp({ email: main.email, options: { shouldCreateUser: false } });
    check(!otp.data.session && !otp.data.user, "native email OTP issues no authenticated session");
    const signup = await client().auth.signUp({ email: unknown.email, password });
    check(Boolean(signup.error) && !signup.data.session, "public native signup remains disabled");
    const fake = await client().auth.verifyOtp({ email: main.email, token: "000000", type: "recovery" });
    check(Boolean(fake.error) && !fake.data.session, "native recovery cannot redeem suppressed credentials");
    check(await query(`select (coalesce(recovery_token,'')='' and recovery_sent_at is null
      and coalesce(confirmation_token,'')='' and confirmation_sent_at is null
      and not exists(select 1 from auth.one_time_tokens t where t.user_id=auth.users.id))::text
      from auth.users where id=${text(main.id)};`) === "true", "suppression clears both native token stores and sent timestamps");
  });

  it("denies a direct password session until admitted and returns only the owner's closed dashboard projection", async () => {
    const direct = client();
    const signed = await direct.auth.signInWithPassword({ email: main.email, password });
    check(!signed.error && signed.data.session, "direct password sign-in is genuine native authentication");
    await context(signed.data.session);
    check(await profile(signed.data.session) === null, "native JWT and initialized context alone cannot bypass login admission");
    active = await login(main);
    const result = await profile(active.session);
    check(result && typeof result === "object" && "name" in result && result.name === main.name
      && "accountState" in result && result.accountState === "verified"
      && "operationalAccessReady" in result && result.operationalAccessReady === false, "own verified shell remains operationally closed");
    const mfa = await active.sdk.auth.mfa.enroll({ factorType: "totp", friendlyName: "Synthetic participant must be denied" });
    check(Boolean(mfa.error), "participants cannot enroll a native MFA factor");
    const phone = await active.sdk.auth.updateUser({ phone: "+12025550123" });
    check(Boolean(phone.error), "native phone change is denied before any provider could send to the fictional fixture");
    check(await query(`select (coalesce(phone,'')='' and coalesce(phone_change,'')='' and phone_confirmed_at is null)::text
      from auth.users where id=${text(main.id)};`) === "true", "native bypass retains no participant phone field");
  });

  it("denies anonymous/service RPC access, private tables and foreign profile selectors", async () => {
    await verifyExisting(other);
    const foreignLogin = await login(other);
    const ownerRows = await profile(active.session);
    const otherRows = await profile(foreignLogin.session);
    check(ownerRows && typeof ownerRows === "object" && "name" in ownerRows && ownerRows.name === main.name
      && otherRows && typeof otherRows === "object" && "name" in otherRows && otherRows.name === other.name
      && main.name !== other.name, "different native owners receive only their own profile names");
    const foreignAttempt = randomUUID();
    check((await service("login_begin", `${text(foreignAttempt)},${text(digest("cross-account-attempt"))},${text(digest("cross-account-ip"))}`)).state === "allowed",
      "foreign-session ownership fixture has a real attempt");
    check((await service("login_finish", `${text(foreignAttempt)},${text(main.id)},${text(sid(foreignLogin.session))}`)).state === "denied",
      "one actor cannot admit another actor's genuine native session");
    const forbidden = await rpc("msrc_participant_email_consume", { email: main.email, purpose: "verify_email",
      challenge_id: randomUUID(), code_hash: digest("foreign"), operation_id: randomUUID(), ip_hash: digest("foreign-ip") }, active.session);
    check(forbidden.status === 403 || forbidden.status === 401, "authenticated users cannot execute private code transition RPC");
    const anonymous = await rpc("msrc_participant_status", {});
    check(anonymous.status === 401 || anonymous.status === 403, "anonymous caller cannot inspect readiness or notice metadata");
    const config = boundary();
    const privateRows = await fetch(`${config.url}/rest/v1/profiles?select=*`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${active.session.access_token}`, "Accept-Profile": "msrc_participant" },
      signal: AbortSignal.timeout(8_000) });
    check(!privateRows.ok, "private participant schema cannot be exposed through Data API");
    const foreign = await rpc("msrc_participant_profile", { edition_key: edition, actor_id: other.id }, active.session);
    check(foreign.status === 404, "profile API has no caller-supplied foreign actor selector");
  });

  it("expires a code at its database boundary and never restores an expired credential", async () => {
    const value = await create();
    const proof = challenge(value);
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "expiring fixture is delivered");
    await query(`update msrc_participant.challenges set created_at=statement_timestamp()-interval '10 minutes',expires_at=statement_timestamp()
      where id=${text(proof.id)};`);
    check((await consume(proof)).result.state === "denied" && (await consume(proof)).result.state === "denied", "expiry and replay both deny");
    check(await query(`select state from msrc_participant.challenges where id=${text(proof.id)};`) === "expired", "database records expiration");
  });

  it("enforces resend replacement and three/email/15-minute limits for known and unknown addresses", async () => {
    const value = await create();
    const first = challenge(value);
    check((await issue(first)).state === "issued" && (await delivered(first)).state === "ok", "first verification issued");
    check((await issue(challenge(value))).state === "denied", "60-second resend throttle");
    await ageIssueCounters(value);
    const replacement = challenge(value);
    check((await issue(replacement)).state === "issued", "permitted resend replaces the first credential");
    check((await consume(first)).result.state === "denied", "superseded code cannot be consumed");
    await ageIssueCounters(value);
    check((await issue(challenge(value))).state === "issued", "third send in the window is admitted");
    await ageIssueCounters(value);
    check((await issue(challenge(value))).state === "denied", "fourth send in the same window denies");
    const unknown = actor();
    for (let index = 0; index < 4; index++) {
      await issue(challenge(unknown));
      await ageIssueCounters(unknown);
    }
    check(await query(`select count(*) from msrc_participant.limit_events where kind='issue_email'
      and subject_hash=${text(digest(`email:${unknown.email}`))};`) === "3", "unknown addresses spend the same three-request allowance");
  });

  it("locks after five incorrect codes and denies correct-code and resend cooldown bypass", async () => {
    const value = await create();
    const proof = challenge(value);
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "wrong-code fixture delivered");
    for (let index = 0; index < 5; index++) check((await consume(proof, digest(`wrong:${index}`))).result.state === "denied", "wrong code denied");
    check((await consume(proof)).result.state === "denied", "correct code cannot override five-failure lock");
    await ageIssueCounters(value);
    check((await issue(challenge(value))).state === "denied", "resend cannot clear account cooldown");
    check(await query(`select (state='locked' and failed_attempts=5 and cooldown_until>clock_timestamp())::text
      from msrc_participant.challenges where id=${text(proof.id)};`) === "true", "failure bound is persisted");
  });

  it("enforces single-use form admission and five-failure login throttling", async () => {
    const nonce = digest(randomUUID());
    const ip = digest("form-ip");
    const outcomes = await Promise.all([service("form_claim", `${text(nonce)},${text(ip)}`), service("form_claim", `${text(nonce)},${text(ip)}`)]);
    check(outcomes.filter((value) => value.state === "claimed").length === 1 && outcomes.filter((value) => value.state === "denied").length === 1,
      "one form token can be claimed only once concurrently");
    const unknown = actor();
    for (let index = 0; index < 5; index++) {
      const attempt = randomUUID();
      check((await service("login_begin", `${text(attempt)},${text(digest(`email:${unknown.email}`))},${text(digest("failed-login-ip"))}`)).state === "allowed", "bounded login attempt admitted");
      check((await service("login_finish", `${text(attempt)},null,null`)).state === "denied", "unknown/invalid login closes its attempt");
    }
    check((await service("login_begin", `${text(randomUUID())},${text(digest(`email:${unknown.email}`))},${text(digest("changed-login-ip"))}`)).state === "denied",
      "changing IP cannot bypass per-email five-failure throttle");
  });

  it("shares the issuance IP cap across unknown and real accounts under concurrency", async () => {
    const sharedIp = digest("shared-issuance-ip");
    for (let index = 0; index < 19; index++) await issue(challenge(actor(), "verify_email", sharedIp));
    const first = await create();
    const second = await create();
    const attempts = await Promise.all([issue(challenge(first, "verify_email", sharedIp)), issue(challenge(second, "verify_email", sharedIp))]);
    check(attempts.filter((value) => value.state === "issued").length === 1
      && attempts.filter((value) => value.state === "denied").length === 1, "only the twentieth IP request wins concurrently");
    check(await query(`select count(*) from msrc_participant.limit_events where kind='issue_ip' and subject_hash=${text(sharedIp)};`) === "20",
      "unknown-address traffic spends the same IP allowance");
  });

  it("admits only one concurrent send at the approved daily budget boundary", async () => {
    const first = await create();
    const second = await create();
    const used = Number(await query("select count(*) from msrc_participant.challenges where created_at>=((clock_timestamp() at time zone 'UTC')::date at time zone 'UTC');"));
    check(Number.isSafeInteger(used) && used >= 0, "private daily usage shape");
    await query(`update msrc_participant.policy set email_daily_limit=${used+1} where singleton;`);
    try {
      const attempts = await Promise.all([issue(challenge(first)), issue(challenge(second))]);
      check(attempts.filter((value) => value.state === "issued").length === 1
        && attempts.filter((value) => value.state === "denied").length === 1, "daily cap cannot be overrun by separate native identities");
    } finally {
      await query("update msrc_participant.policy set email_daily_limit=200 where singleton;");
    }
  });

  it("resets through a consumed code, revokes every old native session and denies replay", async () => {
    const value = await verified();
    const first = await login(value);
    const second = await login(value);
    await ageIssueCounters(value);
    const proof = challenge(value, "reset_password");
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "reset proof delivered");
    const consumed = await consume(proof);
    check(consumed.result.state === "consumed", "reset requires current mailbox proof");
    const nextPassword = randomBytes(32).toString("hex");
    const updated = await admin.auth.admin.updateUserById(value.id, { password: nextPassword });
    check(!updated.error, "native Auth owns the new password hash");
    check((await complete(consumed.operation)).state === "completed" && (await consume(proof)).result.state === "denied", "completed reset cannot replay");
    check(await profile(first.session) === null && await profile(second.session) === null, "old JWTs lose application access immediately");
    const refreshed = await second.sdk.auth.refreshSession({ refresh_token: second.session.refresh_token });
    check(Boolean(refreshed.error) && !refreshed.data.session, "old native refresh token is revoked");
    check(await query(`select (not exists(select 1 from auth.sessions where user_id=${text(value.id)})
      and not exists(select 1 from auth.refresh_tokens where user_id=${text(value.id)}))::text;`) === "true", "all old native session and refresh rows removed");
    const oldPassword = await client().auth.signInWithPassword({ email: value.email, password });
    check(Boolean(oldPassword.error) && !oldPassword.data.session, "old password denied");
    const fresh = await login(value, nextPassword);
    check(await profile(fresh.session) !== null, "fresh password session can be admitted normally");
  });

  it("invalidates profile receipts and outstanding codes after an authorized native owner password change", async () => {
    const value = await verified();
    const prior = await login(value);
    await ageIssueCounters(value);
    const proof = challenge(value, "reset_password");
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "outstanding reset code is bound to old identity revision");
    const change = await prior.sdk.auth.updateUser({ password: randomBytes(32).toString("hex") });
    check(!change.error, "current native owner may change their own password");
    check(await profile(prior.session) === null && (await consume(proof)).result.state === "denied", "identity revision denies old private session receipt and code");
    const emailChange = await prior.sdk.auth.updateUser({ email: actor().email });
    check(Boolean(emailChange.error), "native email change cannot bypass this closed sensitive action");
  });

  it("denies participant access and reset after a stronger grant in another edition", async () => {
    const value = await verified();
    const prior = await login(value);
    check(await profile(prior.session) !== null, "verified participant starts with an admitted owner profile");
    await ageIssueCounters(value);
    const grant = randomUUID();
    const otherEdition = "synthetic-participant-stronger-tier-2027";
    await query(`insert into msrc_authorization.edition_config(edition_key) values(${text(otherEdition)});
      insert into msrc_authorization.role_grants(id,actor_id,edition_key,role_name,scope_kind,grant_reason)
      values(${text(grant)},${text(value.id)},${text(otherEdition)},'superAdmin','edition','Disposable stronger-tier fixture');`);
    try {
      check(await profile(prior.session) === null, "strongest active tier in any edition closes the participant profile");
      check((await issue(challenge(value, "reset_password"))).state === "denied", "participant reset issuance cannot downgrade another edition's stronger tier");
      const reset = await admin.auth.admin.updateUserById(value.id, { password: randomBytes(32).toString("hex") });
      check(Boolean(reset.error), "native Admin password update cannot bypass stronger-tier recovery policy");
    } finally {
      await query(`update msrc_authorization.role_grants set state='revoked',
        revocation_reason='Disposable stronger-tier fixture complete' where id=${text(grant)};`);
    }
    check(await query(`select (state='revoked' and revoked_at is not null)::text from msrc_authorization.role_grants
      where id=${text(grant)};`) === "true", "fixture revokes the grant through immutable authority history");
  });

  it("recovers a pending profile after a native transition succeeds but app completion fails", async () => {
    const value = await create();
    const proof = challenge(value);
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "initial recoverable proof delivered");
    const consumed = await consume(proof);
    check(consumed.result.state === "consumed", "initial mailbox proof consumed");
    const updated = await admin.auth.admin.updateUserById(value.id, { email_confirm: true, password });
    check(!updated.error && (await complete(consumed.operation, false)).state === "failed", "failed app completion preserves the pending profile");
    const pending = await client().auth.signInWithPassword({ email: value.email, password });
    check(!pending.error && pending.data.session, "native email confirmation alone can authenticate but grants no profile admission");
    await context(pending.data.session);
    check(await profile(pending.data.session) === null && (await consume(proof)).result.state === "denied", "pending profile and consumed proof remain closed");
    await ageIssueCounters(value);
    await verifyExisting(value);
    const admitted = await login(value);
    check(await profile(admitted.session) !== null, "new mailbox proof completes the profile through normal native/RPC steps");
  });

  it("keeps the native origin and profile admission fixed across refresh at the 72-hour boundary", async () => {
    const value = await verified();
    const near = await login(value, password, false);
    const id = sid(near.session);
    // Accelerate only this genuine disposable origin before its first shared
    // context observation, matching the existing native session-policy fixture.
    await query(`update auth.sessions set created_at=clock_timestamp()-interval '72 hours'+interval '6 seconds' where id=${text(id)};
      update msrc_participant.session_receipts set native_started_at=(select created_at from auth.sessions where id=${text(id)}) where session_id=${text(id)};`);
    const before = await context(near.session);
    check(before.sessionPolicySatisfied === true && await profile(near.session) !== null, "near-expiry admitted participant remains usable");
    const timing = before.timing as { startedAt: string; absoluteExpiresAt: string };
    check(timing && Date.parse(timing.absoluteExpiresAt)-Date.parse(timing.startedAt) === 72*60*60*1000, "absolute participant policy is exactly 72 hours");
    const refreshed = await near.sdk.auth.refreshSession({ refresh_token: near.session.refresh_token });
    check(!refreshed.error && refreshed.data.session, "genuine native refresh succeeds before the deadline");
    const after = await context(refreshed.data.session);
    check(JSON.stringify(after.timing) === JSON.stringify(before.timing), "refresh preserves the immutable native origin and expiry");
    const remaining = Date.parse(timing.absoluteExpiresAt)-Date.now();
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining+25));
    const expired = await context(refreshed.data.session);
    check(expired.sessionPolicySatisfied === false && expired.reason === "absolute_expired"
      && await profile(refreshed.data.session) === null, "refreshed native token cannot extend dashboard admission");
  });

  it("runs the application signup, verification, login and reset handler through genuine Auth and RPCs", async () => {
    const shortPassword = randomBytes(3).toString("hex") + "🙂أب";
    const minimumPassword = randomBytes(3).toString("hex") + "🙂أبج";
    check(Array.from(shortPassword).length === 9 && Array.from(minimumPassword).length === 10,
      "password fixtures measure Unicode codepoints rather than UTF-16 units");
    const legacy = await verified();
    const legacyOwner = await login(legacy);
    const legacyChange = await legacyOwner.sdk.auth.updateUser({ password: shortPassword });
    check(!legacyChange.error, "isolated existing native password fixture uses the unchanged provider policy");
    const credentials = await nativeCredentials();
    const origin = "http://127.0.0.1:3216";
    // Injected readiness exists only inside the independently guarded lab. The
    // production resolver cannot accept this local native Auth configuration.
    const config: ParticipantConfig = { testMode: true, securitySecret: randomBytes(32).toString("hex"),
      supabaseUrl: credentials.url, publishableKey: credentials.publishableKey, secretKey: credentials.secretKey,
      resendKey: "re_participant_memory_only", resendUrl: "http://127.0.0.1:3218/emails",
      editionKey: edition, emailDailyLimit: 200, origins: [origin] };
    const syntheticNotice = participantNotice("en", true);
    check(syntheticNotice, "handler synthetic notice exists only in guarded tests");
    await query(`update msrc_participant.policy set privacy_version=${text(syntheticNotice.version)} where singleton;`);
    const mail = new Map<string, { recipient: string; code: string; purpose: string }>();
    const backend = createParticipantBackend(config);
    backend.deliver = async (recipient, code, purpose, challengeId) => {
      check(recipient.endsWith("@example.invalid") && /^\d{6}$/.test(code), "only synthetic six-digit mail may enter memory capture");
      mail.set(challengeId, { recipient, code, purpose });
      return true;
    };
    let clock = Date.now();
    const deferred: (() => Promise<void>)[] = [];
    const handle = createParticipantHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend,
      now: () => clock, defer: (task) => { deferred.push(task); } });
    const get = async (cookie?: string): Promise<{ response: Response; body: ParticipantResponse }> => {
      clock = Math.max(clock, Date.now());
      const response = await handle(new Request(`${origin}/api/participant-accounts?locale=ar`, {
        headers: { ...(cookie ? { Cookie: cookie } : {}), "Sec-Fetch-Site": "same-origin" } }));
      const body = await response.json() as ParticipantResponse;
      check(response.status === 200 && body.formToken && body.notice?.version === syntheticNotice.version,
        "real handler GET issues a notice-matched HMAC form token");
      return { response, body };
    };
    const post = async (payload: ParticipantPayload, cookie?: string) => {
      const admission = await get(cookie);
      clock += 2001; // Satisfy the real token's minimum age without sleeping or bypassing its HMAC.
      const response = await handle(new Request(`${origin}/api/participant-accounts`, { method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin",
          ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ ...payload, website: "", formToken: admission.body.formToken }) }));
      const body = await response.json() as ParticipantResponse;
      // Resolve the public response before native account/code work. Only this
      // disposable harness explicitly drains the production handler's after queue.
      while (deferred.length) await deferred.shift()!();
      return { response, body };
    };
    const value = actor();
    try {
      for (const ageConfirmed of [undefined, false]) {
        const rejectedAge = await post({ action: "signup", name: value.name, email: value.email, password: minimumPassword, ageConfirmed });
        check(rejectedAge.response.status === 400 && rejectedAge.body.state === "invalid_input"
          && rejectedAge.body.fieldErrors?.ageConfirmed === "required" && mail.size === 0,
        "missing or false age declaration cannot create identity or send verification mail");
        check(await query(`select (not exists(select 1 from auth.users where email=${text(value.email)})
          and not exists(select 1 from msrc_participant.admissions where email=${text(value.email)})
          and not exists(select 1 from msrc_participant.challenges where recipient=${text(value.email)}))::text;`) === "true",
        "rejected age proof leaves native identity, admission and code tables unchanged");
      }
      const shortSignup = await post({ action: "signup", name: value.name, email: value.email, password: shortPassword, ageConfirmed: true });
      check(shortSignup.response.status === 400 && shortSignup.body.state === "invalid_input"
        && shortSignup.body.fieldErrors?.password === "invalid" && mail.size === 0,
        "nine-codepoint signup is rejected before native work or email delivery");
      check(await query(`select (not exists(select 1 from auth.users where email=${text(value.email)})
        and not exists(select 1 from msrc_participant.admissions where email=${text(value.email)})
        and not exists(select 1 from msrc_participant.challenges where recipient=${text(value.email)}))::text;`) === "true",
        "short signup creates no native identity, private reservation or code");
      const signup = await post({ action: "signup", name: value.name, email: value.email, password: minimumPassword, ageConfirmed: true });
      check(signup.response.status === 202 && signup.body.state === "accepted" && signup.body.requestId,
        "application signup accepts exactly ten codepoints without disclosing account state");
      const verification = mail.get(signup.body.requestId);
      check(verification?.recipient === value.email && verification.purpose === "verify_email", "application verification email is captured only in memory");
      const unverified = await post({ action: "signin", email: value.email, password: minimumPassword });
      check(unverified.response.status === 401 && unverified.body.state === "invalid_credentials", "application denies native unverified password access");
      const duplicate = await post({ action: "signup", name: value.name, email: value.email, password: minimumPassword, ageConfirmed: true });
      check(duplicate.response.status === signup.response.status && duplicate.body.state === signup.body.state
        && Object.keys(duplicate.body).sort().join(",") === Object.keys(signup.body).sort().join(","), "duplicate signup has the same opaque public envelope");
      check(await query(`select count(*) from msrc_participant.limit_events where kind='issue_email'
        and subject_hash=${text(participantHash(config, "email", value.email))};`) === "1",
        "duplicate signup inside cooldown does not spend another send allowance");
      const shortVerification = await post({ action: "verify", name: value.name, email: value.email, password: shortPassword,
        requestId: signup.body.requestId, code: verification.code });
      check(shortVerification.response.status === 400 && shortVerification.body.state === "invalid_input"
        && shortVerification.body.fieldErrors?.password === "invalid", "nine-codepoint verification password is rejected");
      check(await query(`select (c.state='sent' and c.failed_attempts=0
        and not exists(select 1 from msrc_participant.operations o where o.challenge_id=c.id))::text
        from msrc_participant.challenges c where c.id=${text(signup.body.requestId)};`) === "true",
        "short verification does not consume or penalize a valid code");
      const verificationResult = await post({ action: "verify", name: value.name, email: value.email, password: minimumPassword,
        requestId: signup.body.requestId, code: verification.code });
      check(verificationResult.response.status === 200 && verificationResult.body.state === "verified", "same verification code succeeds with exactly ten codepoints");
      const signed = await post({ action: "signin", email: value.email, password: minimumPassword });
      const cookie = signed.response.headers.get("set-cookie")?.split(";")[0];
      check(signed.response.status === 200 && signed.body.state === "authenticated" && cookie
        && signed.body.profile?.name === value.name, "actual password/RPC admission produces an encrypted owner cookie");
      const dashboard = await get(cookie);
      check(dashboard.body.state === "authenticated" && dashboard.body.profile?.name === value.name,
        "genuine native identity plus RPCs restore the own dashboard through Arabic GET");
      await query(`update msrc_participant.limit_events set occurred_at=clock_timestamp()-interval '61 seconds'
        where kind='issue_email' and subject_hash=${text(participantHash(config, "email", value.email))};`);
      const forgot = await post({ action: "forgot", name: value.name, email: value.email }, cookie);
      check(forgot.response.status === 202 && forgot.body.state === "accepted" && forgot.body.requestId,
        "retained signup name does not corrupt reset issuance");
      const resetMail = mail.get(forgot.body.requestId);
      check(resetMail?.recipient === value.email && resetMail.purpose === "reset_password", "actual forgot handler delivers a reset proof despite retained name");
      const missing = await post({ action: "forgot", name: value.name, email: actor().email });
      check(missing.response.status === forgot.response.status && missing.body.state === forgot.body.state
        && Object.keys(missing.body).sort().join(",") === Object.keys(forgot.body).sort().join(",")
        && missing.body.requestId && !mail.has(missing.body.requestId), "existing/unknown recovery exposes identical envelopes without unknown delivery");
      const shortReset = await post({ action: "reset", name: value.name, email: value.email, password: shortPassword,
        requestId: forgot.body.requestId, code: resetMail.code }, cookie);
      check(shortReset.response.status === 400 && shortReset.body.state === "invalid_input"
        && shortReset.body.fieldErrors?.password === "invalid", "nine-codepoint reset password is rejected");
      check(await query(`select (c.state='sent' and c.failed_attempts=0
        and not exists(select 1 from msrc_participant.operations o where o.challenge_id=c.id))::text
        from msrc_participant.challenges c where c.id=${text(forgot.body.requestId)};`) === "true",
        "short reset does not consume or penalize a valid code");
      const nextPassword = randomBytes(3).toString("hex") + "🙂دذر";
      check(Array.from(nextPassword).length === 10, "reset fixture is exactly ten Unicode codepoints");
      const reset = await post({ action: "reset", name: value.name, email: value.email, password: nextPassword,
        requestId: forgot.body.requestId, code: resetMail.code }, cookie);
      check(reset.response.status === 200 && reset.body.state === "password_reset", "same reset code succeeds with exactly ten codepoints");
      const old = await get(cookie);
      check(old.body.state === "ready" && old.body.profile === null, "previous encrypted cookie loses own profile access after reset");
      const oldPassword = await post({ action: "signin", email: value.email, password: minimumPassword });
      check(oldPassword.response.status === 401 && oldPassword.body.state === "invalid_credentials", "old password is denied through the actual application handler");
      const fresh = await post({ action: "signin", email: value.email, password: nextPassword });
      check(fresh.response.status === 200 && fresh.body.state === "authenticated" && fresh.body.profile?.name === value.name,
        "new password completes genuine application admission");
      await query(`update msrc_participant.limit_events set occurred_at=clock_timestamp()-interval '61 seconds'
        where kind='issue_email' and subject_hash=${text(participantHash(config, "email", value.email))};`);
      const boundaryForgot = await post({ action: "forgot", email: value.email });
      check(boundaryForgot.response.status === 202 && boundaryForgot.body.requestId, "final provider-boundary reset proof is admitted normally");
      const boundaryMail = mail.get(boundaryForgot.body.requestId);
      check(boundaryMail?.purpose === "reset_password", "provider-boundary reset code is held only in memory");
      const boundaryPassword = randomBytes(36).toString("hex");
      check(Buffer.byteLength(boundaryPassword, "utf8") === 72, "genuine handler reset retains the exact provider password byte limit");
      const boundaryReset = await post({ action: "reset", email: value.email, password: boundaryPassword,
        requestId: boundaryForgot.body.requestId, code: boundaryMail.code });
      check(boundaryReset.response.status === 200 && boundaryReset.body.state === "password_reset", "72-byte reset remains compatible with genuine native Auth");
      const boundaryLogin = await post({ action: "signin", email: value.email, password: boundaryPassword });
      check(boundaryLogin.response.status === 200 && boundaryLogin.body.state === "authenticated", "provider-boundary password authenticates through the handler");
      const legacyLogin = await post({ action: "signin", email: legacy.email, password: shortPassword });
      check(legacyLogin.response.status === 200 && legacyLogin.body.state === "authenticated"
        && legacyLogin.body.profile?.name === legacy.name, "existing shorter native password remains admissible at sign-in");
    } finally {
      mail.clear();
      await query(`update msrc_participant.policy set privacy_version=${text(notice)} where singleton;`);
    }
  });

  it("previews and atomically erases an aged never-verified native account without changing immutable consent", async () => {
    const value = await createAged();
    check((await issue(challenge(value))).state === "denied", "an already-expired account cannot issue another verification code");
    const proof = await historicalChallenge(value);
    const consentBefore = await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`);
    const preview = await cleanup();
    check(preview.state === "preview" && preview.eligible === 1 && preview.deleted === 0 && preview.failed === 0,
      "default dry-run counts an eligible aged account and performs no deletion");
    check(await query(`select exists(select 1 from auth.users where id=${text(value.id)})::text;`) === "true", "dry-run retains the genuine native identity");
    const erased = await cleanup(100, false);
    check(erased.state === "completed" && erased.deleted === 1 && erased.failed === 0, "explicit native-only cleanup commits eligible identity erasure");
    check(await query(`select (not exists(select 1 from auth.users where id=${text(value.id)})
      and not exists(select 1 from auth.identities where user_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.profiles where actor_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.admissions where actor_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.challenges where actor_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.operations where actor_id=${text(value.id)})
      and not exists(select 1 from msrc_participant.session_receipts where actor_id=${text(value.id)}))::text;`) === "true",
    "native and private name/email/code/profile records are erased together");
    check(await query(`select not exists(select 1 from auth.audit_log_entries a
      where msrc_participant.native_audit_mentions(a.payload::jsonb,${text(value.id)},${text(value.email)})
        and (strpos(a.payload::text,${text(value.email)})>0 or strpos(a.payload::text,${text(value.name)})>0
          or coalesce(a.ip_address,'')<>''))::text;`) === "true",
    "native database audit retains only opaque action references without the erased name, email or IP");
    check(await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`) === consentBefore,
      "immutable consent evidence is byte-identical after account erasure");
    const lookup = await admin.auth.admin.getUserById(value.id);
    check(Boolean(lookup.error) && !lookup.data.user, "real native Admin can no longer retrieve the erased account");
    check((await consume(proof)).result.state === "denied", "erased mailbox proof cannot recreate or verify the account");
    const replay = await cleanup(100, false);
    check(replay.state === "completed" && replay.deleted === 0 && replay.failed === 0, "a new explicit cleanup invocation does not delete the same identity twice");
  });

  it("retains recent native identities and preserves completed or interrupted verification", async () => {
    const recent = await createAged(29 * 86_400_000);
    const verifiedOld = await verifyExisting(await createAged(29 * 86_400_000));
    const interrupted = await createAged(29 * 86_400_000);
    const proof = challenge(interrupted);
    check((await issue(proof)).state === "issued" && (await delivered(proof)).state === "ok", "interrupted verification starts with a genuine mailbox proof");
    const consumed = await consume(proof);
    check(consumed.result.state === "consumed", "interrupted verification consumes only its current code");
    const confirmed = await admin.auth.admin.updateUserById(interrupted.id, { email_confirm: true, password });
    check(!confirmed.error && confirmed.data.user?.email_confirmed_at, "native verification commits before application completion is interrupted");
    check(await query(`select bool_and(s.ever_verified and u.email_confirmed_at is not null)::text
      from msrc_participant.subject_refs s join auth.users u on u.id=s.actor_id
      where s.actor_id in(${text(verifiedOld.id)},${text(interrupted.id)});`) === "true",
    "real native confirmation records ever-verified status before private application completion");
    const result = await cleanup(100, false);
    check(result.state === "completed" && result.deleted === 0 && result.failed === 0,
      "cleanup does not delete recent, completed or native-confirmed pending identities");
    for (const retained of [recent, verifiedOld, interrupted]) {
      const lookup = await admin.auth.admin.getUserById(retained.id);
      check(!lookup.error && lookup.data.user?.id === retained.id, "genuine native retained identity is still present");
    }
    check((await complete(consumed.operation)).state === "completed", "cleanup cannot corrupt the interrupted verification completion");
  });

  it("rolls back every account-erasure step on a native delete failure and reports the failed item", async () => {
    const value = await createAged();
    const proof = await historicalChallenge(value);
    const consent = await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`);
    // A scoped disposable constraint failure occurs after the worker starts
    // real native erasure. It cannot affect another identity or a hosted target.
    boundary();
    await query(`begin;
      create function msrc_ci_auth.participant_cleanup_failure() returns trigger
        language plpgsql security definer set search_path='' as $$ begin
          if old.id=${text(value.id)}::uuid and old.email=${text(value.email)} then
            raise exception using errcode='42501',message='Synthetic cleanup rollback fixture';
          end if; return old;
        end$$;
      revoke all on function msrc_ci_auth.participant_cleanup_failure() from public,anon,authenticated,service_role,supabase_auth_admin;
      create trigger ci_participant_cleanup_failure before delete on auth.users for each row
        execute function msrc_ci_auth.participant_cleanup_failure(); commit;`);
    try {
      const result = await cleanup(100, false);
      check(result.state === "completed" && result.deleted === 0 && result.failed === 1, "failed native erasure is counted without claiming deletion");
      check(await query(`select (exists(select 1 from auth.users where id=${text(value.id)} and email=${text(value.email)})
        and exists(select 1 from msrc_participant.profiles where actor_id=${text(value.id)} and name=${text(value.name)})
        and exists(select 1 from msrc_participant.admissions where actor_id=${text(value.id)} and email=${text(value.email)})
        and exists(select 1 from msrc_participant.challenges where id=${text(proof.id)} and recipient=${text(value.email)}))::text;`) === "true",
      "native identity and all private name/email/code records survive the rolled-back item");
      check(await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`) === consent,
        "constraint failure cannot modify immutable consent evidence");
    } finally {
      await query(`begin; drop trigger if exists ci_participant_cleanup_failure on auth.users;
        drop function if exists msrc_ci_auth.participant_cleanup_failure(); commit;`);
    }
    const explicitRetry = await cleanup(100, false);
    check(explicitRetry.state === "completed" && explicitRetry.deleted === 1 && explicitRetry.failed === 0,
      "a separate explicit invocation can erase the eligible account after the constraint failure is resolved");
  });

  it("serializes concurrent native cleanup workers and records one committed erasure without identity resurrection", async () => {
    const value = await createAged();
    const consent = await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`);
    const results = await Promise.all([cleanup(100, false), cleanup(100, false)]);
    check(results.every((result) => result.state === "completed" && result.failed === 0)
      && results.reduce((sum, result) => sum + Number(result.deleted), 0) === 1,
    "simultaneous operator workers commit exactly one deletion and no failed item");
    check(await query(`select (not exists(select 1 from auth.users where id=${text(value.id)})
      and (select count(*) from msrc_participant.cleanup_jobs where actor_id=${text(value.id)} and state='completed')=1
      and (select count(*) from msrc_participant.retention_audit where actor_id=${text(value.id)} and event='account.erased')=1)::text;`) === "true",
    "one durable job and immutable erasure event attest the single native deletion");
    check(await query(`select to_jsonb(r)::text from msrc_participant.notice_receipts r where r.actor_id=${text(value.id)};`) === consent,
      "concurrent erasure leaves the original immutable consent snapshot intact");
    check((await service("signup_reserve", `${text(value.id)},${text(randomUUID())},${text(value.email)},${text(value.name)},${text(notice)},true`)).state === "denied",
      "erasure tombstone denies re-admission of the original actor identifier");
    const restored = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: false,
      app_metadata: { ageConfirmed: true } });
    check(Boolean(restored.error) && !restored.data.user, "native metadata cannot resurrect the erased subject");
  });

  it("holds a genuine aged identity when an unreviewed cascading operational reference exists", async () => {
    const value = await createAged();
    boundary();
    await query(`begin;
      create table msrc_ci_auth.participant_retained_extension(actor_id uuid primary key references auth.users(id) on delete cascade,
        retained_marker text not null);
      revoke all on msrc_ci_auth.participant_retained_extension from public,anon,authenticated,service_role,supabase_auth_admin;
      insert into msrc_ci_auth.participant_retained_extension values(${text(value.id)},'synthetic-retained-reference'); commit;`);
    try {
      const result = await cleanup(100, false);
      check(result.state === "completed" && result.deleted === 0 && result.held === 1 && result.failed === 0,
        "an unreviewed cascade is an explicit hold rather than silent operational-record erasure");
      check(await query(`select (exists(select 1 from auth.users where id=${text(value.id)})
        and exists(select 1 from msrc_ci_auth.participant_retained_extension where actor_id=${text(value.id)}
          and retained_marker='synthetic-retained-reference'))::text;`) === "true",
      "both native identity and its retained reference remain intact");
    } finally {
      await query("drop table if exists msrc_ci_auth.participant_retained_extension;");
    }
    const cleared = await cleanup(100, false);
    check(cleared.state === "completed" && cleared.deleted === 1 && cleared.failed === 0,
      "a separately authorized invocation can proceed after the synthetic retained reference is removed");
  });

  it("closes an already admitted profile when database readiness is turned off", async () => {
    check(await profile(active.session) !== null, "original independent admitted profile remains valid");
    await query("update msrc_participant.policy set enabled=false where singleton;");
    check(await profile(active.session) === null && (await service("email_begin", `${text(main.email)},'reset_password',${text(randomUUID())},${text(digest("closed-code"))},${text(digest("closed-email"))},${text(digest("closed-ip"))},null,null`)).state === "denied",
      "database flag closes reads and mutations even with a native token");
  });
});
