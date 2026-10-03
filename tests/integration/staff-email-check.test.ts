import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createClient, type Session } from "@supabase/supabase-js";
import { beforeAll, describe, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";
import { readVerifiedSessionContext } from "@/lib/supabase/session.server";

// Closed ORG-015 email check: genuine password sessions plus service-only SQL,
// with synthetic recipients and in-memory code hashes. No managed email or SMS.
const ci = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-staff-email-2027";
const actor = "b1000000-0000-4000-8000-000000000001";
const other = "b1000000-0000-4000-8000-000000000002";
const actors = Array.from({ length: 12 }, (_, index) => `b1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const password = randomBytes(32).toString("hex");
const emailFor = (id: string) => `email-check-${actors.indexOf(id) + 1}@example.invalid`;
const hashingKey = randomBytes(32);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digest = (value: string) => createHmac("sha256", hashingKey).update(value).digest("hex");
const ipHash = digest("synthetic-ci-client-ip");

function check(condition: unknown, description: string): asserts condition {
  if (!condition) throw new Error(`Staff email assertion failed: ${description}. Sensitive diagnostics withheld.`);
}

function boundary() {
  check(ci && process.platform === "linux" && process.env.RUNNER_ENVIRONMENT === "github-hosted"
    && process.env.GITHUB_REPOSITORY === "xpexellent-dotcom/msrc-2027"
    && !process.env.SUPABASE_PROJECT_REF && !process.env.SUPABASE_PROJECT_ID
    && !existsSync("supabase/.temp/project-ref")
    && (!process.env.NEXT_PUBLIC_SUPABASE_TARGET || process.env.NEXT_PUBLIC_SUPABASE_TARGET === "local")
    && process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321"
    && /^project_id = "msrc2027-local"$/m.test(readFileSync("supabase/config.toml", "utf8")), "disposable loopback runner");
  const config = resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  check(config, "local public client settings");
  return config;
}

function query(sql: string): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
      "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Disposable email SQL timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", () => {});
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Disposable email SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output.trim()); else reject(new Error("Disposable email SQL failed; sensitive diagnostics withheld.")); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

function client() {
  const config = boundary();
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }) },
  });
}

async function login(id = actor) {
  check(actors.includes(id), "fixed synthetic password identity");
  const sdk = client();
  const response = await sdk.auth.signInWithPassword({ email: emailFor(id), password });
  check(!response.error && response.data.session && response.data.user?.id === id, "genuine password identity");
  return { sdk, session: response.data.session };
}

function claims(session: Session): { sub: string; session_id: string; aal: string; amr: { method: string; timestamp: number }[] } {
  const payload = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"));
  check(uuid.test(payload.session_id) && actors.includes(payload.sub) && Array.isArray(payload.amr), "managed signed session shape");
  return payload;
}

async function context(session: Session) {
  const response = await readVerifiedSessionContext(session.access_token, edition);
  check(response.state === "verified", "current own session context");
  return response.context;
}

type Result = { state: string; code?: string; challengeId?: string; recipient?: string; expiresAt?: string; verifiedAt?: string };
async function service(functionName: "msrc_staff_email_begin" | "msrc_staff_email_delivery" | "msrc_staff_email_consume", argumentsSql: string): Promise<Result> {
  const response = await query(`begin; set local role service_role; select public.${functionName}(${argumentsSql}); commit;`);
  const result: unknown = JSON.parse(response);
  check(typeof result === "object" && result !== null && "state" in result && typeof result.state === "string", "sanitized service result shape");
  return result as Result;
}

function challenge(session: Session) {
  const id = randomUUID();
  const payload = claims(session);
  const sid = payload.session_id;
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  return { actor: payload.sub, id, sid, codeHash: digest(`${payload.sub}:${sid}:${id}:${code}`) };
}

async function begin(session: Session, value = challenge(session)) {
  const result = await service("msrc_staff_email_begin", `'${value.actor}','${value.sid}','${value.id}','${value.codeHash}','${ipHash}'`);
  return { ...value, result };
}

async function delivered(value: ReturnType<typeof challenge>, successful = true) {
  return service("msrc_staff_email_delivery", `'${value.actor}','${value.sid}','${value.id}',${successful}`);
}

async function consume(value: ReturnType<typeof challenge>, hash = value.codeHash, id = value.actor, sid = value.sid) {
  check(uuid.test(id) && uuid.test(sid) && /^[a-f0-9]{64}$/.test(hash), "fixed typed consume inputs");
  return service("msrc_staff_email_consume", `'${id}','${sid}','${value.id}','${hash}'`);
}

let active: Awaited<ReturnType<typeof login>>;

describe.skipIf(!ci)("ORG-015 staff email check on genuine password sessions in disposable CI", () => {
  beforeAll(async () => {
    boundary();
    await query(`begin;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      insert into msrc_authorization.edition_config(edition_key) values('${edition}-other');
      ${actors.map((id) => `
        insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
          created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_anonymous,
          confirmation_token,recovery_token,email_change_token_new,email_change)
        values('${id}','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
          '${emailFor(id)}',extensions.crypt('${password}',extensions.gen_salt('bf')),
          now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
        insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
        values(gen_random_uuid(),'${id}','${id}',jsonb_build_object('sub','${id}',
          'email','${emailFor(id)}','email_verified',true),'email',now(),now());
        insert into msrc_authorization.account_access(actor_id,state,individually_identified)
        values('${id}','active',true);
        insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
        values('${id}','${edition}','contentMediaEditor','edition','Disposable staff email fixture');`).join("\n")}
      commit;`);
  });

  it("requires a delivered single-use email check after password while preserving managed AAL1", async () => {
    active = await login(actor);
    const before = await context(active.session);
    check(before.authenticationTier === "staff" && !before.sessionPolicySatisfied
      && before.reason === "staff_email_check_required" && !before.mfaValid && !before.staffEmailValid,
    "missing regular staff email receipt denied");
    const value = await begin(active.session);
    check(value.result.state === "issued" && value.result.challengeId === value.id
      && value.result.recipient === emailFor(actor), "recipient comes from current verified managed email");
    check((await delivered(value)).state === "ok", "isolated email delivery marked without messages");
    check((await consume(value)).state === "verified", "correct delivered custom email check");
    const after = await context(active.session);
    const token = claims(active.session);
    check(after.authenticationTier === "staff" && after.sessionPolicySatisfied && after.staffEmailValid
      && after.passwordValid && !after.mfaValid && token.aal === "aal1"
      && !token.amr.some((proof) => proof.method === "mfa/phone"), "email check grants no managed AAL2");
    check(!after.operationalAccessReady && !after.privilegedAccessReady, "verified regular staff workflows stay closed");
    const second = await active.sdk.rpc("msrc_second_step_satisfied");
    check(!second.error && second.data === true, "own narrow second-step context");
    check((await consume(value)).state === "denied", "custom email challenge cannot be replayed");
  });

  it("binds a challenge to the exact managed actor and session without consuming it for a foreign caller", async () => {
    const original = await login(other);
    const newer = await login(other);
    const stranger = await login(actors[2]);
    const value = await begin(original.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok", "bound email challenge issued");
    check((await consume(value, value.codeHash, actors[2], claims(stranger.session).session_id)).state === "denied",
      "cross-identity challenge cannot verify");
    check((await consume(value, value.codeHash, other, claims(newer.session).session_id)).state === "denied",
      "new session cannot consume old session challenge");
    check((await consume(value)).state === "verified", "foreign attempts do not consume owner's code");
    const accepted = await context(original.session);
    const rejected = await context(newer.session);
    check(accepted.staffEmailValid && !rejected.staffEmailValid && !rejected.sessionPolicySatisfied,
      "receipt belongs to one exact managed session");
  });

  it("preserves the email receipt and fixed staff clocks through refresh but requires a new check after login", async () => {
    const before = await context(active.session);
    const refresh = await active.sdk.auth.refreshSession();
    check(!refresh.error && refresh.data.session, "genuine regular staff token refresh");
    active.session = refresh.data.session;
    const after = await context(active.session);
    check(after.staffEmailValid && after.sessionPolicySatisfied && claims(active.session).aal === "aal1"
      && after.principal.sessionId === before.principal.sessionId
      && after.timing.startedAtMs === before.timing.startedAtMs
      && after.timing.lastActivityAtMs === before.timing.lastActivityAtMs
      && after.timing.absoluteExpiresAtMs === before.timing.absoluteExpiresAtMs
      && after.timing.idleExpiresAtMs === before.timing.idleExpiresAtMs,
    "email receipt and clocks follow immutable managed session");
    const fresh = await login(actor);
    const denied = await context(fresh.session);
    check(denied.principal.sessionId !== after.principal.sessionId && !denied.staffEmailValid
      && !denied.sessionPolicySatisfied && denied.reason === "staff_email_check_required", "new password login needs fresh email check");
  });

  it("never creates a receipt from a pending or failed email delivery", async () => {
    const pending = await login(actors[3]);
    const value = await begin(pending.session);
    check(value.result.state === "issued", "pending email challenge");
    check((await consume(value)).state === "denied", "undelivered code denied");
    check((await delivered(value, false)).state === "ok", "delivery failure recorded without provider payload");
    check((await consume(value)).state === "denied", "failed delivery code denied");
    const denied = await context(pending.session);
    check(!denied.staffEmailValid && !denied.sessionPolicySatisfied, "delivery failure never supplies assurance");
  });

  it("enforces five failures and preserves cooldown across a new managed login", async () => {
    const pending = await login(actors[4]);
    const value = await begin(pending.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok", "failure-bound challenge");
    const wrong = digest(`wrong:${randomUUID()}`);
    for (let attempt = 0; attempt < 5; attempt++) check((await consume(value, wrong)).state === "denied", "wrong email code denied");
    const locked = await consume(value);
    check(locked.state === "denied" && locked.code === "retry_limited", "correct code cannot bypass failure cooldown");
    const fresh = await login(actors[4]);
    const retry = await begin(fresh.session);
    check(retry.result.state === "denied" && retry.result.code === "retry_limited", "login cannot reset account abuse counter");
  });

  it("enforces resend spacing, three-per-account issuance and newest-challenge-only consumption", async () => {
    const pending = await login(actors[5]);
    const first = await begin(pending.session);
    check(first.result.state === "issued" && (await delivered(first)).state === "ok", "first bounded challenge");
    const tooSoon = await begin(pending.session);
    check(tooSoon.result.state === "denied" && tooSoon.result.code === "retry_limited", "60-second resend cooldown");
    // Synthetic fixture clock ONLY: move issuance into the preceding minute.
    // No policy duration, production function or live timestamp is changed.
    await query(`update msrc_staff_email.challenges set created_at=now()-interval '2 minutes' where id='${first.id}';`);
    const second = await begin(pending.session);
    check(second.result.state === "issued" && (await delivered(second)).state === "ok", "replacement issued after simulated spacing");
    await query(`update msrc_staff_email.challenges set created_at=now()-interval '61 seconds' where id='${second.id}';`);
    const third = await begin(pending.session);
    check(third.result.state === "issued" && (await delivered(third)).state === "ok", "third challenge in rolling window");
    await query(`update msrc_staff_email.challenges set created_at=now()-interval '61 seconds' where id='${third.id}';`);
    check((await consume(first)).state === "denied" && (await consume(second)).state === "denied",
      "superseded custom email codes denied before their original expiry");
    check((await consume(third)).state === "verified", "only newest custom email challenge may verify");
    const newerLogin = await login(actors[5]);
    const fourth = await begin(newerLogin.session);
    check(fourth.result.state === "denied" && fourth.result.code === "retry_limited", "three-per-account window survives login");
  });

  it("rejects an expired custom email challenge without a receipt or managed AAL2", async () => {
    const pending = await login(actors[6]);
    const value = await begin(pending.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok", "bounded-expiry email challenge");
    // Accelerated expiry fixture ONLY, retaining expires_at > created_at.
    await query(`update msrc_staff_email.challenges set created_at=now()-interval '20 minutes',
      expires_at=now()-interval '10 minutes' where id='${value.id}';`);
    const expired = await consume(value);
    check(expired.state === "denied" && expired.code === "challenge_expired", "expired custom email code denied");
    const denied = await context(pending.session);
    check(!denied.staffEmailValid && !denied.sessionPolicySatisfied && claims(pending.session).aal === "aal1",
      "expired email check creates no application receipt or managed MFA");
  });

  it("invalidates the regular staff receipt when an active Super Admin grant exists in another edition", async () => {
    const pending = await login(actors[7]);
    const value = await begin(pending.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok"
      && (await consume(value)).state === "verified", "ordinary staff receipt before role upgrade");
    await query(`insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
      values('${actors[7]}','${edition}-other','superAdmin','edition','Disposable role upgrade fixture');`);
    const upgraded = await context(pending.session);
    check(upgraded.authenticationTier === "super_admin" && !upgraded.sessionPolicySatisfied
      && upgraded.reason === "mfa_required" && !upgraded.staffEmailValid && !upgraded.mfaValid,
    "any active Super Admin grant requires phone MFA");
    check((await begin(pending.session)).result.state === "denied", "email check cannot be issued to Super Admin tier");
  });

  it("revokes email-check assurance after the current verified destination changes", async () => {
    const pending = await login(actors[8]);
    const value = await begin(pending.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok"
      && (await consume(value)).state === "verified", "email-bound receipt before change");
    await query(`update auth.users set email='changed-email-check@example.invalid',email_confirmed_at=null,updated_at=now()
      where id='${actors[8]}';`);
    const unverified = await context(pending.session);
    check(!unverified.sessionPolicySatisfied && !unverified.staffEmailValid, "unverified changed destination denied");
    await query(`update auth.users set email_confirmed_at=now(),updated_at=now() where id='${actors[8]}';`);
    const reverified = await context(pending.session);
    check(!reverified.sessionPolicySatisfied && !reverified.staffEmailValid, "confirmation of new destination cannot reuse old receipt");
  });

  it("invalidates a receipt after an ordinary scoped grant change", async () => {
    const pending = await login(actors[9]);
    const value = await begin(pending.session);
    check(value.result.state === "issued" && (await delivered(value)).state === "ok"
      && (await consume(value)).state === "verified", "grant-bound staff receipt");
    await query(`insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
      values('${actors[9]}','${edition}','finance','edition','Disposable changed grant fixture');`);
    const changed = await context(pending.session);
    check(changed.authenticationTier === "staff" && !changed.staffEmailValid && !changed.sessionPolicySatisfied,
      "current ordinary grant fingerprint changes invalidate receipt");
  });

  it("denies authenticated direct calls to service-only RPCs and hides private email challenge tables", async () => {
    const pending = await login(actors[10]);
    const config = boundary();
    const value = challenge(pending.session);
    const rpc = await fetch(`${config.url}/rest/v1/rpc/msrc_staff_email_begin`, {
      method: "POST", headers: { apikey: config.publishableKey, Authorization: `Bearer ${pending.session.access_token}`,
        "Content-Type": "application/json" }, body: JSON.stringify({ actor_id: value.actor, session_id: value.sid,
        challenge_id: value.id, code_hash: value.codeHash, ip_hash: ipHash }), signal: AbortSignal.timeout(5_000),
    });
    const failure = await rpc.json();
    check(rpc.status === 403 && failure.code === "42501", "authenticated service-only RPC permission denial");
    for (const table of ["challenges", "receipts"]) {
      const response = await fetch(`${config.url}/rest/v1/${table}?select=*`, {
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${pending.session.access_token}`,
          "Accept-Profile": "msrc_staff_email" }, signal: AbortSignal.timeout(5_000),
      });
      const hidden = await response.json();
      check(response.status === 406 && hidden.code === "PGRST106", "private email schema is not exposed by Data API");
    }
    check(/\[storage\]\r?\nenabled = false/.test(readFileSync("supabase/config.toml", "utf8")), "storage remains disabled in this slice");
    const storage = await fetch(`${config.url}/storage/v1/object/authenticated/synthetic-closed/no-object`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${pending.session.access_token}` },
      signal: AbortSignal.timeout(5_000),
    });
    check([404, 503].includes(storage.status), "disabled Storage route unavailable; no real object authorization claimed");
  });

  it("rejects primary managed phone OTP as either password proof or the custom staff email check", async () => {
    const id = actors[11];
    const phone = "+966500000911";
    await query(`update auth.users set phone='${phone}',phone_confirmed_at=now() where id='${id}';
      insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
      values(gen_random_uuid(),'${id}','${id}',jsonb_build_object('sub','${id}','phone','${phone}','phone_verified',true),
        'phone',now(),now());`);
    const sdk = client();
    const request = await sdk.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    check(!request.error, "fixed primary phone test OTP request without delivery");
    const verified = await sdk.auth.verifyOtp({ phone, token: "123456", type: "sms" });
    check(!verified.error && verified.data.session, "genuine primary phone OTP exchange");
    const denied = await context(verified.data.session);
    check(claims(verified.data.session).aal === "aal1" && !denied.passwordValid && !denied.staffEmailValid
      && !denied.mfaValid && !denied.sessionPolicySatisfied && denied.reason === "password_auth_required",
    "primary phone OTP cannot replace password plus application email check");
    check((await begin(verified.data.session)).result.state === "denied", "OTP-only session cannot begin staff email check");
  });
});
