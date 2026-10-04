import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it } from "vitest";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { boundary, check, client, nativeAdmin, query } from "./setup";

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
  const result = await service("signup_reserve", `${text(value.id)},${text(reservation)},${text(value.email)},${text(value.name)},${text(notice)}`);
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
function challenge(value: Actor, purpose: Purpose = "verify_email", ipHash = digest(`ip:${value.id}`)): Challenge {
  const id = randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  check(/^\d{6}$/.test(code), "six-digit generated code retained only in memory");
  return { id, actor: value, purpose, ipHash, hash: digest(`${purpose}:${value.email}:${id}:${code}`) };
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

describe.skipIf(!ci)("BL-AUTH-02/03/04/06/08 genuine participant native boundaries in disposable CI", () => {
  beforeAll(async () => {
    boundary();
    admin = await nativeAdmin();
    await query(`insert into msrc_authorization.edition_config(edition_key) values(${text(edition)});`);
  });
  afterAll(async () => {
    if (ci) await query("update msrc_participant.policy set enabled=false,privacy_version=null,email_daily_limit=null where singleton;");
    // Native identities, immutable receipts and audit vanish with the disposable stack.
  });

  it("starts closed with no approved notice and denies admission before enabling a synthetic fixture", async () => {
    const status = await service("status");
    check(status.enabled === false && status.privacyVersion === null && status.emailDailyLimit === null, "migration defaults are closed and unapproved");
    const value = actor();
    check((await service("signup_reserve", `${text(value.id)},${text(randomUUID())},${text(value.email)},${text(value.name)},${text(notice)}`)).state === "denied",
      "closed database accepts no account reservation");
    const bypass = await admin.auth.admin.createUser({ id: value.id, email: value.email, password, email_confirm: true });
    check(Boolean(bypass.error) && !bypass.data.user, "native Admin creation cannot bypass participant admission");
    await query(`update msrc_participant.policy set enabled=true,privacy_version=${text(notice)},email_daily_limit=200 where singleton;`);
  });

  it("creates only the minimum unverified identity and denies native confirmation without code proof", async () => {
    main = await create();
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

  it("closes an already admitted profile when database readiness is turned off", async () => {
    check(await profile(active.session) !== null, "original independent admitted profile remains valid");
    await query("update msrc_participant.policy set enabled=false where singleton;");
    check(await profile(active.session) === null && (await service("email_begin", `${text(main.email)},'reset_password',${text(randomUUID())},${text(digest("closed-code"))},${text(digest("closed-email"))},${text(digest("closed-ip"))},null,null`)).state === "denied",
      "database flag closes reads and mutations even with a native token");
  });
});
