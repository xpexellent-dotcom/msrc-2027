import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, it } from "vitest";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";
import { readVerifiedSessionContext } from "@/lib/supabase/session.server";
import { createSupabaseSmsContract } from "@/features/auth/mfa-provider.server";

// Genuine GoTrue/SDK exchanges on the disposable CI stack, not hosted delivery/UAT.
// Generated credentials, OTPs and SDK responses never enter assertion snapshots.
const ci = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-managed-auth-2027";
const participant = "a1000000-0000-4000-8000-000000000001";
const staff = "a1000000-0000-4000-8000-000000000002";
const other = "a1000000-0000-4000-8000-000000000003";
const password = randomBytes(32).toString("hex");
const emails = { [participant]: "managed-participant@example.invalid", [staff]: "managed-staff@example.invalid",
  [other]: "managed-other@example.invalid" };
// Syntactic Saudi numbers are fixture inputs ONLY. The hook makes no network call.
const phones = { [participant]: "+966500000901", [staff]: "+966500000902", [other]: "+966500000903" };

function check(condition: unknown, description: string): asserts condition {
  if (!condition) throw new Error(`Managed Auth assertion failed: ${description}. Sensitive diagnostics withheld.`);
}

function boundary(): { url: string; publishableKey: string } {
  const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
  const config = readFileSync("supabase/config.toml", "utf8");
  check(ci && process.platform === "linux" && process.env.RUNNER_ENVIRONMENT === "github-hosted"
    && process.env.GITHUB_REPOSITORY === "xpexellent-dotcom/msrc-2027"
    && !process.env.SUPABASE_PROJECT_REF && !process.env.SUPABASE_PROJECT_ID
    && !existsSync("supabase/.temp/project-ref") && (!target || target === "local")
    && process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321"
    && /^project_id = "msrc2027-local"$/m.test(config)
    && config.includes('uri = "pg-functions://postgres/msrc_ci_auth/capture_sms"')
    && config.includes('uri = "pg-functions://postgres/msrc_ci_auth/reject_email"'), "disposable runner boundary");
  const resolved = resolveLocalSupabaseConfig({ url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  check(resolved, "validated loopback client");
  return resolved;
}

function query(sql: string): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
      "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Isolated managed Auth SQL timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    // psql diagnostics can include input credentials. Never forward them.
    child.stderr.on("data", () => {});
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Isolated managed Auth SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output.trim()); else reject(new Error("Isolated managed Auth SQL failed; diagnostics withheld.")); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

function client(): SupabaseClient {
  const config = boundary();
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }) },
  });
}

async function login(actor: keyof typeof emails): Promise<{ sdk: SupabaseClient; session: Session }> {
  const sdk = client();
  const response = await sdk.auth.signInWithPassword({ email: emails[actor], password });
  check(!response.error && response.data.session && response.data.user?.id === actor, "password identity exchange");
  return { sdk, session: response.data.session };
}

function claims(session: Session): { session_id: string; aal: string; amr: { method: string; timestamp: number }[] } {
  const payload = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"));
  check(typeof payload.session_id === "string" && /^[0-9a-f-]{36}$/i.test(payload.session_id)
    && Array.isArray(payload.amr), "managed signed token shape");
  return payload;
}

async function inbox(actor: string): Promise<string> {
  check([participant, staff, other].includes(actor), "fixed fixture inbox identity");
  // Consume immediately: no plaintext code retention after the SDK exchange.
  const otp = await query(`delete from msrc_ci_auth.inbox where user_id='${actor}' returning otp;`);
  check(/^\d{6}$/.test(otp), "one ephemeral managed-generated code");
  return otp;
}

async function context(session: Session) {
  const result = await readVerifiedSessionContext(session.access_token, edition);
  check(result.state === "verified", "fresh own session RPC");
  return result.context;
}

async function current(sdk: SupabaseClient): Promise<Session> {
  const response = await sdk.auth.getSession();
  check(!response.error && response.data.session, "SDK session in isolated memory");
  return response.data.session;
}

let participantLogin: Awaited<ReturnType<typeof login>>;
let staffLogin: Awaited<ReturnType<typeof login>>;
let otherLogin: Awaited<ReturnType<typeof login>>;
let factor = "";

describe.skipIf(!ci)("AUTH-04/05 genuine managed APIs on disposable no-delivery GitHub CI", () => {
  beforeAll(async () => {
    const config = boundary();
    const health = await fetch(`${config.url}/auth/v1/health`, { signal: AbortSignal.timeout(5_000) });
    const reported: unknown = await health.json();
    check(health.ok && typeof reported === "object" && reported !== null && "version" in reported
      && typeof reported.version === "string" && /^v?[0-9][0-9A-Za-z.+-]{0,63}$/.test(reported.version), "actual managed Auth version");
    process.stdout.write(`Isolated GoTrue version: ${reported.version}\n`);
    await query(`begin;
      create schema msrc_ci_auth;
      revoke all on schema msrc_ci_auth from public,anon,authenticated,service_role;
      create table msrc_ci_auth.inbox(user_id uuid primary key,otp text not null check(otp ~ '^[0-9]{6}$'));
      create table msrc_ci_auth.controls(singleton boolean primary key check(singleton),reject_send boolean not null);
      insert into msrc_ci_auth.controls values(true,false);
      alter table msrc_ci_auth.inbox enable row level security;
      alter table msrc_ci_auth.inbox force row level security;
      alter table msrc_ci_auth.controls enable row level security;
      alter table msrc_ci_auth.controls force row level security;
      revoke all on all tables in schema msrc_ci_auth from public,anon,authenticated,service_role;
      grant usage on schema msrc_ci_auth to supabase_auth_admin;
      grant select,insert,update on msrc_ci_auth.inbox to supabase_auth_admin;
      grant select on msrc_ci_auth.controls to supabase_auth_admin;
      create policy fixture_hook on msrc_ci_auth.inbox to supabase_auth_admin using(true) with check(true);
      create policy fixture_controls on msrc_ci_auth.controls for select to supabase_auth_admin using(true);
      create function msrc_ci_auth.capture_sms(event jsonb) returns jsonb
      language plpgsql security invoker set search_path='' as $$
      declare actor uuid := (event->'user'->>'id')::uuid;
      begin
        if current_user <> 'supabase_auth_admin' or actor not in ('${participant}','${staff}','${other}')
          or coalesce(event->'sms'->>'otp','') !~ '^[0-9]{6}$'
          or coalesce(event->'sms'->>'phone','') <> case actor
            when '${participant}'::uuid then '${phones[participant]}'
            when '${staff}'::uuid then '${phones[staff]}' else '${phones[other]}' end
          or coalesce(event->'sms'->>'sms_type','') not in ('mfa','phone_change') then
          raise exception 'Disposable fixture SMS rejected.';
        end if;
        if (select reject_send from msrc_ci_auth.controls where singleton) then
          return '{"error":{"http_code":503,"message":"Disposable delivery failure."}}'::jsonb;
        end if;
        insert into msrc_ci_auth.inbox(user_id,otp) values(actor,event->'sms'->>'otp')
        on conflict(user_id) do update set otp=excluded.otp;
        return '{}'::jsonb;
      end; $$;
      create function msrc_ci_auth.reject_email(event jsonb) returns jsonb
      language sql security invoker set search_path='' as $$
        select '{"error":{"http_code":403,"message":"Disposable tests disallow email delivery."}}'::jsonb;
      $$;
      revoke all on all functions in schema msrc_ci_auth from public,anon,authenticated,service_role;
      grant execute on all functions in schema msrc_ci_auth to supabase_auth_admin;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      ${([participant, staff, other] as const).map((actor) => `
        insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
          created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_anonymous,
          confirmation_token,recovery_token,email_change_token_new,email_change)
        values('${actor}','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
          '${emails[actor]}',extensions.crypt('${password}',extensions.gen_salt('bf')),now(),now(),now(),
          '{"provider":"email","providers":["email"]}','{}',false,'','','','');
        insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
        values(gen_random_uuid(),'${actor}','${actor}',
          jsonb_build_object('sub','${actor}','email','${emails[actor]}','email_verified',true),'email',now(),now());
        insert into msrc_authorization.account_access(actor_id,state,individually_identified)
        values('${actor}','active',true);`).join("\n")}
      insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
      values('${staff}','${edition}','superAdmin','edition','Disposable managed Auth fixture'),
        ('${other}','${edition}','superAdmin','edition','Disposable managed Auth fixture');
      commit;`);
  });

  afterAll(async () => {
    if (ci) await query("drop schema if exists msrc_ci_auth cascade;");
    // Immutable safe session/grant audit remains in the disposable database until
    // the workflow's always-stop step. No code table/file/artifact remains.
  });

  it("keeps account signup closed and confirms current participant phone at AAL1 without MFA", async () => {
    participantLogin = await login(participant);
    const before = await context(participantLogin.session);
    check(!before.sessionPolicySatisfied && before.reason === "account_verification_required"
      && before.emailVerified && !before.phoneVerified, "unverified participant phone denial");
    const blockedSignup = await client().auth.signUp({ email: "no-signup@example.invalid", password });
    check(Boolean(blockedSignup.error), "global signup remains disabled");
    const update = await participantLogin.sdk.auth.updateUser({ phone: phones[participant] });
    check(!update.error, "managed phone verification requested without delivery");
    const verification = await participantLogin.sdk.auth.verifyOtp({ phone: phones[participant], token: await inbox(participant), type: "phone_change" });
    check(!verification.error, "managed participant phone verification");
    const verificationSession = await current(participantLogin.sdk);
    const otpOnly = await context(verificationSession);
    check(!otpOnly.sessionPolicySatisfied && otpOnly.reason === "password_auth_required"
      && !otpOnly.passwordValid && !otpOnly.mfaValid, "verification OTP is not approved password proof");
    // Managed phone-change verification issues a new OTP session. Reauthenticate
    // with the approved primary method rather than treating it as password proof.
    participantLogin = await login(participant);
    const after = await context(participantLogin.session);
    const token = claims(participantLogin.session);
    check(after.sessionPolicySatisfied && after.emailVerified && after.phoneVerified && !after.privileged
      && !after.mfaValid && token.aal === "aal1" && !token.amr.some((proof) => proof.method === "mfa/phone"),
    "dual verified participant remains nonprivileged AAL1");
    check(!after.operationalAccessReady && !after.privilegedAccessReady, "participant workflows stay closed");
  });

  it("requires Super Admin password then genuine SMS phone MFA and rejects an incorrect code", async () => {
    staffLogin = await login(staff);
    const before = await context(staffLogin.session);
    check(before.privileged && !before.sessionPolicySatisfied && before.reason === "mfa_required", "password-only staff denial");
    const provider = createSupabaseSmsContract(staffLogin.sdk.auth);
    const enrollment = await provider.enroll(phones[staff]);
    check(enrollment.state === "ok", "typed SDK phone enrollment");
    factor = enrollment.data.factorId;
    // AMR timestamps have second precision. Ensure ordered proof is unambiguous.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const challenge = await provider.challenge(factor);
    check(challenge.state === "ok", "trusted SMS-only SDK challenge");
    const otp = await inbox(staff);
    const wrong = otp === "000000" ? "111111" : "000000";
    const invalid = await provider.verify(factor, challenge.data.challengeId, wrong);
    check(invalid.state === "denied", "wrong managed code denied");
    const verified = await provider.verify(factor, challenge.data.challengeId, otp);
    check(verified.state === "ok", "managed phone MFA verification");
    staffLogin.session = await current(staffLogin.sdk);
    const token = claims(staffLogin.session);
    const primary = token.amr.find((proof) => proof.method === "password");
    const secondary = token.amr.find((proof) => proof.method === "mfa/phone");
    const after = await context(staffLogin.session);
    check(primary && secondary && secondary.timestamp >= primary.timestamp && token.aal === "aal2"
      && after.mfaValid && after.passwordValid && after.sessionPolicySatisfied, "current password and phone MFA assurance");
    check(!after.operationalAccessReady && !after.privilegedAccessReady, "staff workflows stay closed");
    const replay = await provider.verify(factor, challenge.data.challengeId, otp);
    check(replay.state === "denied", "used challenge cannot be replayed");
  });

  it("denies another staff identity challenging, verifying or unenrolling the first identity's factor", async () => {
    otherLogin = await login(other);
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const ownedChallenge = await staffLogin.sdk.auth.mfa.challenge({ factorId: factor, channel: "sms" });
    check(!ownedChallenge.error && ownedChallenge.data, "genuine owner challenge for isolation check");
    const ownerCode = await inbox(staff);
    const challenge = await otherLogin.sdk.auth.mfa.challenge({ factorId: factor, channel: "sms" });
    const verification = await otherLogin.sdk.auth.mfa.verify({ factorId: factor, challengeId: ownedChallenge.data.id, code: ownerCode });
    const removal = await otherLogin.sdk.auth.mfa.unenroll({ factorId: factor });
    check(Boolean(challenge.error) && Boolean(verification.error) && Boolean(removal.error), "foreign challenge, verification and factor reset denied");
    const legitimate = await staffLogin.sdk.auth.mfa.verify({ factorId: factor, challengeId: ownedChallenge.data.id, code: ownerCode });
    check(!legitimate.error, "foreign request cannot consume the owner's challenge");
    staffLogin.session = await current(staffLogin.sdk);
    const denied = await context(otherLogin.session);
    check(!denied.sessionPolicySatisfied && !denied.mfaValid, "unverified staff remains denied");
    const update = await otherLogin.sdk.auth.updateUser({ phone: phones[other] });
    check(!update.error, "staff primary phone verification fixture");
    const primaryOtp = await otherLogin.sdk.auth.verifyOtp({ phone: phones[other], token: await inbox(other), type: "phone_change" });
    check(!primaryOtp.error, "primary phone code exchange without MFA");
    const primaryOnly = await context(await current(otherLogin.sdk));
    check(!primaryOnly.sessionPolicySatisfied && !primaryOnly.passwordValid && !primaryOnly.mfaValid,
      "primary phone OTP never supplies password or phone MFA assurance");
  });

  it("fails closed on no-delivery provider failure and recovers by a new managed challenge", async () => {
    const pending = await login(staff);
    const provider = createSupabaseSmsContract(pending.sdk.auth);
    await query("update msrc_ci_auth.controls set reject_send=true where singleton;");
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const failed = await provider.challenge(factor);
    check(failed.state === "unavailable", "sanitized delivery failure");
    const denied = await context(pending.session);
    check(!denied.sessionPolicySatisfied && denied.reason === "mfa_required"
      && (await query(`select count(*) from msrc_ci_auth.inbox where user_id='${staff}';`)) === "0",
    "failed delivery does not establish MFA or leave an inbox code");
    await query("update msrc_ci_auth.controls set reject_send=false where singleton;");
    const retry = await provider.challenge(factor);
    check(retry.state === "ok", "delivery recovery creates a new managed challenge");
    const verified = await provider.verify(factor, retry.data.challengeId, await inbox(staff));
    check(verified.state === "ok", "recovery verifies only a delivered managed code");
    pending.session = await current(pending.sdk);
    const recovered = await context(pending.session);
    check(recovered.sessionPolicySatisfied && recovered.mfaValid
      && !recovered.operationalAccessReady && !recovered.privilegedAccessReady, "recovery preserves closed operational gates");
    staffLogin = pending;
  });

  it("keeps the managed origin, idle timestamp and absolute deadline unchanged through real refresh", async () => {
    const before = await context(staffLogin.session);
    const original = claims(staffLogin.session).session_id;
    const refresh = await staffLogin.sdk.auth.refreshSession();
    check(!refresh.error && refresh.data.session, "real managed refresh exchange");
    staffLogin.session = refresh.data.session;
    const after = await context(staffLogin.session);
    check(claims(staffLogin.session).session_id === original
      && after.timing.startedAtMs === before.timing.startedAtMs
      && after.timing.lastActivityAtMs === before.timing.lastActivityAtMs
      && after.timing.absoluteExpiresAtMs === before.timing.absoluteExpiresAtMs
      && after.timing.idleExpiresAtMs === before.timing.idleExpiresAtMs
      && after.timing.absoluteExpiresAtMs - after.timing.startedAtMs === 8 * 60 * 60 * 1_000,
    "refresh never restarts staff clocks");
  });

  it("proves a real participant refresh cannot extend the 72-hour absolute boundary", async () => {
    const nearExpiry = await login(participant);
    const sid = claims(nearExpiry.session).session_id;
    // Accelerated clock fixture ONLY before first application observation. This
    // moves the original managed origin; refresh still exchanges genuine tokens.
    await query(`update auth.sessions set created_at=now()-interval '72 hours'+interval '4 seconds' where id='${sid}';`);
    const before = await context(nearExpiry.session);
    check(before.sessionPolicySatisfied && before.timing.absoluteExpiresAtMs - before.timing.startedAtMs === 72 * 60 * 60 * 1_000,
      "participant maximum remains 72 hours");
    const refresh = await nearExpiry.sdk.auth.refreshSession();
    check(!refresh.error && refresh.data.session, "near-boundary real token refresh");
    nearExpiry.session = refresh.data.session;
    const after = await context(nearExpiry.session);
    check(after.timing.startedAtMs === before.timing.startedAtMs && after.timing.absoluteExpiresAtMs === before.timing.absoluteExpiresAtMs,
      "refresh cannot extend participant deadline");
    const remaining = before.timing.absoluteExpiresAtMs - Date.now();
    check(remaining >= -500 && remaining < 5_000, "bounded accelerated expiry fixture");
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, remaining) + 150));
    const expired = await context(nearExpiry.session);
    check(!expired.sessionPolicySatisfied && expired.reason === "absolute_expired", "72-hour boundary denies refreshed token");
  });

  it("rejects an expired managed challenge without guessing codes or sending messages", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const response = await staffLogin.sdk.auth.mfa.challenge({ factorId: factor, channel: "sms" });
    check(!response.error && response.data, "no-delivery expiry challenge");
    const otp = await inbox(staff);
    check(/^[0-9a-f-]{36}$/i.test(response.data.id), "fixed UUID challenge shape");
    await query(`update auth.mfa_challenges set created_at=now()-interval '10 minutes' where id='${response.data.id}';`);
    const verification = await staffLogin.sdk.auth.mfa.verify({ factorId: factor, challengeId: response.data.id, code: otp });
    check(Boolean(verification.error), "expired managed challenge denied");
  });

  it("records native older unexpired challenge acceptance as a newest-only release blocker", async () => {
    // Supabase preserves older challenges until expiry. This passes only when
    // documenting provider behavior, not approving it for application access.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const first = await staffLogin.sdk.auth.mfa.challenge({ factorId: factor, channel: "sms" });
    check(!first.error && first.data, "first managed challenge");
    const earlierCode = await inbox(staff);
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const later = await staffLogin.sdk.auth.mfa.challenge({ factorId: factor, channel: "sms" });
    check(!later.error && later.data, "replacement managed challenge");
    await inbox(staff);
    const prior = await staffLogin.sdk.auth.mfa.verify({ factorId: factor, challengeId: first.data.id, code: earlierCode });
    check(!prior.error, "native earlier challenge remains valid until expiry");
    staffLogin.session = await current(staffLogin.sdk);
    const closed = await context(staffLogin.session);
    check(!closed.operationalAccessReady && !closed.privilegedAccessReady, "provider success cannot activate workflows");
  });

  it("denies stale AAL2 after factor unenrollment in this disposable synthetic identity", async () => {
    const stale = staffLogin.session;
    const unenrollment = await staffLogin.sdk.auth.mfa.unenroll({ factorId: factor });
    check(!unenrollment.error, "synthetic owned factor lifecycle exchange");
    const staleContext = await readVerifiedSessionContext(stale.access_token, edition);
    check(staleContext.state === "denied" || (staleContext.state === "verified"
      && !staleContext.context.sessionPolicySatisfied && !staleContext.context.mfaValid), "old AAL2 loses current factor assurance");
  });

  it("suspension denies a genuine bearer and reactivation cannot revive its old session", async () => {
    const stale = participantLogin.session;
    await query(`update msrc_authorization.account_access set state='suspended' where actor_id='${participant}';`);
    const suspended = await context(stale);
    check(!suspended.sessionPolicySatisfied, "managed bearer denied after account suspension");
    await query(`update msrc_authorization.account_access set state='active' where actor_id='${participant}';`);
    const restored = await context(stale);
    check(!restored.sessionPolicySatisfied && restored.reason === "session_revoked", "reactivation cannot restore old session");
  });

  it("genuine provider logout invalidates the managed session and refresh token", async () => {
    const active = await login(participant);
    const stale = active.session;
    const signedOut = await active.sdk.auth.signOut({ scope: "local" });
    check(!signedOut.error, "real managed logout");
    const staleContext = await readVerifiedSessionContext(stale.access_token, edition);
    check(staleContext.state === "denied" || (staleContext.state === "verified" && !staleContext.context.sessionPolicySatisfied),
      "logout denies stale bearer through current session check");
    const refresh = await client().auth.refreshSession({ refresh_token: stale.refresh_token });
    check(Boolean(refresh.error) && !refresh.data.session, "logged-out refresh cannot recreate session");
  });
});
