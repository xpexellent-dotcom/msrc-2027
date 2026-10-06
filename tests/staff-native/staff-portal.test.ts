import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStaffEmailCheck } from "@/features/auth/staff-email.server";
import { totpAt } from "@/features/auth/totp.server";
import { createStaffBackend, type StaffBackend } from "@/features/staff-portal/backend.server";
import type { StaffConfig } from "@/features/staff-portal/config.server";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { readStaffSession, staffFormToken } from "@/features/staff-portal/security.server";
import { boundary, check, client, nativeAdmin, nativeCredentials, query } from "../participant-native/setup";
import { handlerDiagnostic, nativeAuthDiagnostic } from "./diagnostic";

const ci = process.env.GITHUB_ACTIONS === "true", origin = "http://127.0.0.1:3219", edition = "synthetic-staff-native-2027";
const password = randomBytes(24).toString("hex");
type Person = { id: string; email: string; name: string; cookie: string; secret?: string };
type Result = { state: string; [key: string]: unknown };
const person = (): Person => { const id = randomUUID(); return { id, email: "staff-" + id + "@example.invalid", name: "Synthetic Staff " + id.slice(0, 8), cookie: "" }; };
const first = person(), second = person(), ordinary = person();
let admin: SupabaseClient, config: StaffConfig, backend: StaffBackend, handle: (request: Request) => Promise<Response>;
let emailCode: string | null = null;
const delivered = new Map<string, { invitationId: string; token: string }>();
function text(value: string) { check(!value.includes("'") && !value.includes("\\") && value.length <= 254, "safe bounded synthetic SQL value"); return "'" + value + "'"; }
function request(method: string, actor?: Person, body?: Record<string, unknown>, queryString = "") {
  return new Request(origin + "/api/staff-portal" + queryString, { method, headers: { host: "127.0.0.1:3219", ...(actor?.cookie ? { cookie: actor.cookie } : {}),
    ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify({ formToken: staffFormToken(config, origin), ...body }) : undefined });
}
async function post(actor: Person | undefined, body: Record<string, unknown>) {
  const response = await handle(request("POST", actor, body));
  const changed = response.headers.get("set-cookie"); if (actor && changed) actor.cookie = changed.split(";")[0];
  return { status: response.status, result: await response.json() as Result };
}
async function get(actor: Person | undefined, area?: string) {
  const response = await handle(request("GET", actor, undefined, area ? "?area=" + area : ""));
  return { status: response.status, result: await response.json() as Result };
}
async function signIn(actor: Person) {
  const result = await post(actor, { action: "signin", email: actor.email, password });
  check(result.status === 200, "native handler password sign-in accepted only after private admission" + handlerDiagnostic(result));
  check(Buffer.byteLength(actor.cookie, "utf8") < 3900, "encrypted native staff cookie fits common browser capacity"); return result.result;
}
async function enroll(actor: Person) {
  const setup = await post(actor, { action: "enroll-totp" });
  const enrollment = setup.result.enrollment as { secret: string; qrCode: string } | undefined;
  check(setup.status === 200 && setup.result.state === "pending-totp" && enrollment && enrollment.qrCode.startsWith("data:image/png;base64,"), "native TOTP enrollment has local QR pixels" + handlerDiagnostic(setup));
  actor.secret = enrollment.secret;
  const verified = await post(actor, { action: "verify-totp", factorId: setup.result.factorId, challengeId: setup.result.challengeId,
    code: totpAt(enrollment.secret, Date.now()) });
  check(verified.status === 200 && verified.result.state === "authenticated", "genuine native TOTP upgrades persisted strongest assurance" + handlerDiagnostic(verified));
}
async function invite(actor: Person, target: Person, roles: string[]) {
  const result = await post(actor, { action: "invite", email: target.email, roles });
  check(result.status === 200 && result.result.state === "invited" && delivered.has(target.email), "native invitation reserves audit and captures one delivery in memory" + handlerDiagnostic(result));
  return delivered.get(target.email)!;
}
async function accept(target: Person) {
  const invitation = delivered.get(target.email); check(invitation, "captured synthetic invitation exists");
  const result = await post(target, { action: "invite-accept", ...invitation, name: target.name, password });
  check(result.status === 200, "native guarded invitation creates/updates the exact identity and starts its password session" + handlerDiagnostic(result));
  const native = readStaffSession(config, request("GET", target)); check(native, "encrypted HttpOnly native session survives without client tokens"); target.id = native.actorId;
  return result.result;
}

describe.skipIf(!ci)("BL-AUTH-01/05/06 staff genuine handler to native Auth to SQL", () => {
  beforeAll(async () => {
    boundary(); admin = await nativeAdmin();
    config = { ...await nativeCredentials(), testMode: true, supabaseUrl: boundary().url, securitySecret: randomBytes(32).toString("hex"),
      resendKey: "re_staff_mock_only", resendUrl: "http://127.0.0.1:3220/emails", origins: [origin], editionKey: edition, emailDailyLimit: 200 };
    const real = createStaffBackend(config);
    const checkEmail = createStaffEmailCheck({ auth: client().auth, secret: config.securitySecret,
      store: { begin: (input) => real.rpc("msrc_staff_email_begin", { actor_id: input.actorId, session_id: input.sessionId, challenge_id: input.challengeId, code_hash: input.codeHash, ip_hash: input.ipHash }),
        delivery: (input) => real.rpc("msrc_staff_email_delivery", { actor_id: input.actorId, session_id: input.sessionId, challenge_id: input.challengeId, delivered: input.delivered }),
        consume: (input) => real.rpc("msrc_staff_email_consume", { actor_id: input.actorId, session_id: input.sessionId, challenge_id: input.challengeId, code_hash: input.codeHash }) },
      deliver: async (message) => { check(message.recipient.endsWith("@example.invalid"), "synthetic-only staff message");
        emailCode = /code is (\d{6})/.exec(message.text)?.[1] ?? null; return emailCode !== null; } });
    backend = { ...real, emailIssue: (token, ip) => checkEmail.issue(token, ip), emailVerify: (token, id, code) => checkEmail.verify(token, id, code),
      invite: async (email, invitationId, token) => { check(email.endsWith("@example.invalid"), "synthetic-only invitation envelope"); delivered.set(email, { invitationId, token }); return true; } };
    handle = createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend });
  });
  afterAll(async () => { if (ci) await query("update msrc_staff.policy set enabled=false,email_daily_limit=null where singleton;"); });
  beforeEach(async () => {
    // Distinct fixture phases represent different request windows. Keep the real
    // per-request form claim/nonce limits enforced; do not pollute later phases.
    await query("update msrc_staff.limit_events set occurred_at=clock_timestamp()-interval '61 minutes' where kind='form';");
  });

  it("begins with both independent gates closed and no direct native signup", async () => {
    const status = await backend.rpc("msrc_staff_status") as { enabled: boolean; emailDailyLimit: number | null };
    check(status.enabled === false && status.emailDailyLimit === null, "review migration is database closed with no email allowance");
    check((await get(undefined)).status === 503, "handler refuses unopened database readiness");
    const direct = await client().auth.signUp({ email: person().email, password }); check(Boolean(direct.error) && !direct.data.session, "public native signup remains closed");
    const closed = createStaffHandler({ readiness: () => ({ state: "closed" }), backend: () => { throw new Error("must not construct native provider"); } });
    check((await closed(request("GET"))).status === 503, "server flag closes before native provider access");
  });
  it("bootstraps only the first private synthetic account then requires genuine TOTP", async () => {
    await query(`select msrc_staff.bootstrap_reserve(${text(first.id)},${text(first.email)});`);
    const created = await admin.auth.admin.createUser({ id: first.id, email: first.email, password, email_confirm: true });
    check(!created.error && created.data.user?.id === first.id, "private operator reservation binds genuine Admin account creation" + nativeAuthDiagnostic(created.error));
    await query(`select msrc_staff.bootstrap_first(${text(first.id)},${text(edition)},${text(first.name)});
      update msrc_staff.policy set enabled=true,email_daily_limit=200 where singleton;`);
    check((await signIn(first)).state === "enroll-totp", "first Super Admin has no access before enrollment");
    check((await get(first, "people")).status === 403, "password alone cannot access people");
  });
  it("replaces only the owner's interrupted unverified setup and still requires genuine authenticator proof", async () => {
    const interrupted = await post(first, { action: "enroll-totp" });
    check(interrupted.result.state === "pending-totp", "first unverified setup exists with no granted portal access");
    check((await post(first, { action: "logout" })).result.state === "signed-out", "abandoned password session is revoked");
    check((await signIn(first)).state === "enroll-totp", "new password session must restart enrollment without recovering an old secret");
    await enroll(first);
    check(await query(`select count(*) from auth.mfa_factors where user_id=${text(first.id)};`) === "1", "only the new genuinely verified native factor remains");
  });
  it("permits the first Super Admin to invite only the second during bootstrap", async () => {
    check((await post(first, { action: "invite", email: ordinary.email, roles: ["finance"] })).status === 403, "bootstrap cannot invite an ordinary role before the second verified Super Admin");
    await invite(first, second, ["superAdmin"]);
    check((await accept(second)).state === "enroll-totp", "second invite acceptance forces authenticator enrollment"); await enroll(second);
    check(await query(`select msrc_staff.active_super_admin_count(${text(edition)});`) === "2", "two distinct active enrolled Super Admin identities");
  });
  it("invites regular staff once, admits its native password, requires exact-session email check", async () => {
    const invitation = await invite(first, ordinary, ["registrationWorkshopAdministrator"]);
    check((await accept(ordinary)).state === "pending-email", "ordinary invitation cannot bypass staff second step");
    check((await post(undefined, { action: "invite-accept", ...invitation, name: ordinary.name, password })).status === 400, "accepted invitation cannot replay to create/change native identity");
    check((await get(ordinary, "participants")).status === 403, "ordinary password-only bearer is denied internally");
    const issue = await post(ordinary, { action: "challenge-email" }); check(issue.result.state === "pending-email" && emailCode, "genuine native exact-session email code is captured only in memory");
    const verified = await post(ordinary, { action: "verify-email", code: emailCode }); check(verified.result.state === "authenticated", "database receipt authorizes the exact native staff session");
    check((await get(ordinary, "participants")).status === 200, "registration role can read participants after strongest assurance");
    check((await get(ordinary, "people")).status === 403 && (await get(ordinary, "audit")).status === 403, "registration role is denied Super Admin reporting");
  });
  it("enforces minimum-two, self-demotion, self-suspension and self-reset with genuine current assurance", async () => {
    for (const input of [{ action: "roles", targetId: first.id, roles: ["finance"] }, { action: "suspend", targetId: first.id },
      { action: "reset-authenticator", targetId: first.id }, { action: "reset-account", targetId: first.id }, { action: "suspend", targetId: second.id },
      { action: "roles", targetId: second.id, roles: ["finance"] }]) check((await post(first, input)).status === 403, "self action or minimum-two guard denies native operation");
    check(await query(`select msrc_staff.active_super_admin_count(${text(edition)});`) === "2", "all guards preserve both active Super Admins");
  });
  it("keeps background status and native refresh observational for the existing idle clock", async () => {
    const active = readStaffSession(config, request("GET", ordinary)); check(active, "genuine native staff session is privately available");
    const before = await query(`select extract(epoch from last_activity_at)::text from msrc_sessions.session_state where session_id=${text(active.sessionId)};`);
    check((await get(ordinary)).result.state === "authenticated", "background status observes a real fully checked staff session");
    const refreshed = await backend.refresh(active.refreshToken); check(refreshed && refreshed.sessionId === active.sessionId, "genuine native refresh preserves the original session identifier");
    check(await query(`select extract(epoch from last_activity_at)::text from msrc_sessions.session_state where session_id=${text(active.sessionId)};`) === before,
      "status and refresh cannot renew privileged idle activity");
  });
  it("makes edition role changes immediate and logs the previous and new roles", async () => {
    const changed = await post(first, { action: "roles", targetId: ordinary.id, roles: ["finance"] }); check(changed.result.state === "updated", "reviewed edition-scoped role replacement succeeds");
    check((await get(ordinary, "participants")).status === 403, "stale browser cookie cannot retain removed registration authority");
    check(await query(`select count(*) from msrc_staff.audit where action='set_roles' and target_id=${text(ordinary.id)} and result='completed'
      and details->'previousRoles' ? 'registrationWorkshopAdministrator' and details->'newRoles' ? 'finance';`) === "1", "immutable audit retains exact role transition without secrets");
  });
  it("returns restricted audit metadata and records explicit unavailable identity reveal", async () => {
    const audit = await get(first, "audit"); check(audit.status === 200 && Array.isArray(audit.result.audit), "native audit metadata projection survives strict server sanitizer");
    const reveal = await post(first, { action: "reveal-identity", targetId: ordinary.id }); check(reveal.result.state === "identity-unavailable", "no registration identifier is invented in this foundation");
    check(await query(`select count(*) from msrc_staff.audit where action='identity_reveal' and actor_id=${text(first.id)} and target_id=${text(ordinary.id)} and result='unavailable';`) === "1", "explicit reveal action is audited before any future plaintext field");
  });
  it("allows only the other Super Admin to remove a verified authenticator and denies the old session", async () => {
    const reset = await post(second, { action: "reset-authenticator", targetId: first.id }); check(reset.result.state === "updated", "other current TOTP Super Admin coordinates reserved native factor deletion");
    check(await query(`select count(*) from auth.mfa_factors where user_id=${text(first.id)} and status::text='verified';`) === "0", "native verified authenticator is removed only by admitted reset");
    check((await get(first, "people")).status === 403, "revocation rejects prior native TOTP cookie immediately");
    check((await signIn(first)).state === "enroll-totp", "recovered account password requires fresh enrollment"); await enroll(first);
  });
  it("fails recovery closed on native provider failure, then restores another Super Admin account through a fresh invitation", async () => {
    const failing = createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => ({ ...backend, resetFactors: async () => false }) });
    const failed = await failing(request("POST", second, { action: "reset-account", targetId: first.id }));
    check(failed.status === 503, "native provider failure is not acknowledged as successful recovery");
    check(await query(`select count(*) from msrc_staff.admin_operations where target_actor_id=${text(first.id)} and action='reset_account' and state='failed';`) === "1", "failed recovery is terminal and audited");
    const reset = await post(second, { action: "reset-account", targetId: first.id });
    check(reset.result.state === "updated" && delivered.has(first.email), "other verified Super Admin rotates the account password/factors and sends captured recovery invitation");
    check((await get(first, "people")).status === 403, "pre-reset native session is immediately revoked");
    const old = await client().auth.signInWithPassword({ email: first.email, password });
    check(Boolean(old.error) && !old.data.session, "old password no longer authenticates after native reset");
    check((await accept(first)).state === "enroll-totp", "single-use recovery link restores supplied password only with fresh authenticator enrollment");
    await enroll(first);
    check((await get(first, "people")).status === 200 && await query(`select msrc_staff.active_super_admin_count(${text(edition)});`) === "2", "recovered account regains access only after native TOTP and keeps two active Super Admins");
  });
  it("denies concurrent expiry/revocation invitation reuse before native credential changes", async () => {
    const target = person(); const old = await invite(first, target, ["finance"]);
    check((await post(first, { action: "invite-revoke", invitationId: old.invitationId })).result.state === "updated", "invitation revoke is persisted");
    check((await post(undefined, { action: "invite-accept", ...old, name: target.name, password })).status === 400, "revoked native admission cannot replay");
    const replacement = await invite(first, target, ["finance"]);
    await query(`update msrc_staff.invitations set created_at=created_at-interval '73 hours',expires_at=expires_at-interval '73 hours' where id=${text(replacement.invitationId)};`);
    check((await post(undefined, { action: "invite-accept", ...replacement, name: target.name, password })).status === 400, "72-hour deadline is enforced before native create");
    check(await query(`select count(*) from auth.users where email=${text(target.email)};`) === "0", "failed/replayed invitation creates no native user");
  });
  it("prevents direct Admin password and verified-factor changes outside a second-admin operation", async () => {
    const changed = await admin.auth.admin.updateUserById(first.id, { password: randomBytes(24).toString("hex") }); check(Boolean(changed.error), "unreserved native Admin cannot reset a Super Admin password");
    const factors = await admin.auth.admin.mfa.listFactors({ userId: first.id }); check(!factors.error && factors.data.factors.length, "genuine native factor exists");
    const deleted = await admin.auth.admin.mfa.deleteFactor({ userId: first.id, id: factors.data.factors[0].id }); check(Boolean(deleted.error), "unreserved native Admin cannot delete a verified Super Admin factor");
  });
  it("rejects stale native origins without altering immutable session clocks", async () => {
    const active = readStaffSession(config, request("GET", second)); check(active, "native session cookie available privately");
    await query(`update auth.sessions set created_at=created_at-interval '9 hours' where id=${text(active.sessionId)};`);
    check((await get(second, "people")).status === 403, "native origin mismatch cannot restart absolute/idle clocks");
    // Exact idle_expired/absolute_expired boundaries are covered by the immutable
    // #25 SQL policy tests; this native case proves mismatched evidence is denied.
  });
});
