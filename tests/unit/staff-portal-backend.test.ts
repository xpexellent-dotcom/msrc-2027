import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { resolveStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import type { StaffBackend, NativeStaffSession } from "@/features/staff-portal/backend.server";
import { staffInvitationEmail } from "@/features/staff-portal/email.server";
import { readStaffSession, sealStaffSession, staffCookie, staffFormToken, type StaffSessionCookie } from "@/features/staff-portal/security.server";
import { validateStaffPayload } from "@/features/staff-portal/validation.server";

const origin = "http://127.0.0.1:3219";
const actorId = "30000000-0000-4000-8000-000000000001", sessionId = "30000000-0000-4000-8000-000000000002";
const invitationId = "30000000-0000-4000-8000-000000000003", factorId = "30000000-0000-4000-8000-000000000004", challengeId = "30000000-0000-4000-8000-000000000005";
const now = Date.parse("2026-10-07T00:00:00Z");
const env = { STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only",
  STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only",
  STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" };
const config = (resolveStaffConfig(env) as { state: "ready"; config: StaffConfig }).config;
function token(exp = now + 3_600_000) { return "header." + Buffer.from(JSON.stringify({ session_id: sessionId, exp: exp / 1000 })).toString("base64url") + ".signature"; }
const native: NativeStaffSession = { actorId, sessionId, accessToken: token(), refreshToken: "synthetic-refresh" };
function cookie(override: Partial<StaffSessionCookie> = {}) { return staffCookie(config, { ...native, origin, deadline: now + 8 * 3_600_000,
  challengeId: null, factorId: null, challengeExpiresAt: null, ...override }, now).split(";")[0]; }
function request(method: string, body?: Record<string, unknown>, cookieHeader?: string, query = "") {
  return new Request(origin + "/api/staff-portal" + query, { method, headers: { host: "127.0.0.1:3219", ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
function persisted(tier: "staff" | "super_admin" = "super_admin", reason: string | null = null) {
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: tier, sessionPolicySatisfied: reason === null, reason, mfaValid: tier === "super_admin" && reason === null,
    passwordValid: true, staffEmailValid: tier === "staff" && reason === null, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 8 * 3_600_000).toISOString(), idleExpiresAt: new Date(now + 30 * 60_000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
let current: ReturnType<typeof persisted>, readiness: StaffReadiness, backend: StaffBackend;
function handler() { return createStaffHandler({ readiness: () => readiness, backend: () => backend, now: () => now }); }
beforeEach(() => {
  readiness = { state: "ready", config }; current = persisted();
  backend = {
    rpc: vi.fn(async (name) => {
      if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
      if (name === "msrc_staff_form_claim") return { state: "claimed" };
      if (name === "msrc_session_context") return current;
      if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles: ["superAdmin"], session: current };
      if (name === "msrc_staff_login_begin") return { state: "reserved" };
      if (name === "msrc_staff_login_finish") return { state: "admitted", editionKey: config.editionKey, tier: current.authenticationTier };
      if (name === "msrc_session_logout") return true;
      return { state: "completed" };
    }),
    createUser: vi.fn(async () => true), updateUser: vi.fn(async () => true), login: vi.fn(async () => native), identity: vi.fn(async () => actorId),
    refresh: vi.fn(async () => native), logout: vi.fn(async () => true), emailIssue: vi.fn(async () => ({ state: "issued" as const, challengeId, expiresAt: new Date(now + 300_000).toISOString() })),
    emailVerify: vi.fn(async () => ({ state: "verified" as const })), factors: vi.fn(async () => [factorId]),
    enroll: vi.fn(async () => ({ factorId, secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/MSRC?secret=JBSWY3DPEHPK3PXP" })),
    challenge: vi.fn(async () => challengeId), verify: vi.fn(async () => native), resetFactors: vi.fn(async () => true), invite: vi.fn(async () => true),
  };
});

describe("closed staff portal configuration", () => {
  it("closes before reading a request or constructing a provider", async () => {
    const build = vi.fn(); const closed = createStaffHandler({ readiness: () => ({ state: "closed" }), backend: build });
    const malicious = Object.create(null) as Request;
    const response = await closed(malicious); expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "closed" }); expect(build).not.toHaveBeenCalled();
  });
  it.each([undefined, "false", "TRUE", "1"])("requires exact private opt-in %s", (flag) => { expect(resolveStaffConfig({ ...env, STAFF_PORTAL_ENABLED: flag }).state).toBe("closed"); });
  it.each(["VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_TARGET_ENV"])("never allows mock credentials in Vercel %s", (name) => {
    expect(resolveStaffConfig({ ...env, [name]: "anything" }).state).toBe("unavailable");
  });
  it.each(["STAFF_SUPABASE_URL", "STAFF_SUPABASE_SECRET_KEY", "STAFF_SUPABASE_PUBLISHABLE_KEY", "STAFF_AUTH_SECURITY_SECRET", "RESEND_API_KEY", "STAFF_EDITION_KEY", "STAFF_AUTH_EMAIL_DAILY_LIMIT"])("fixes every synthetic boundary %s", (name) => {
    expect(resolveStaffConfig({ ...env, [name]: "unapproved" }).state).toBe("unavailable");
  });
  it("requires exact mutable database readiness and email allowance", async () => {
    vi.mocked(backend.rpc).mockResolvedValue({ enabled: true, emailDailyLimit: 41 });
    const response = await handler()(request("GET")); expect(response.status).toBe(503); expect(backend.identity).not.toHaveBeenCalled();
  });
});

describe("staff request and session security", () => {
  it("rejects cross-origin credential collection", async () => {
    const response = await handler()(new Request(origin + "/api/staff-portal", { method: "POST", headers: { host: "127.0.0.1:3219", origin: "https://attacker.invalid" }, body: "password=secret" }));
    expect(response.status).toBe(400); expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("rejects spoofed role/JWT input and public staff signup", async () => {
    for (const body of [{ action: "signup" }, { action: "signin", email: "staff@example.invalid", password: "password", roles: ["superAdmin"] },
      { action: "signin", email: "staff@example.invalid", password: "password", jwt: "role=superAdmin" }]) {
      expect((await handler()(request("POST", body))).status).toBe(400);
    } expect(backend.login).not.toHaveBeenCalled();
  });
  it("has one generic invalid credential response", async () => {
    vi.mocked(backend.login).mockResolvedValue(null);
    const a = await handler()(request("POST", { action: "signin", email: "missing@example.invalid", password: "unknown" }));
    const b = await handler()(request("POST", { action: "signin", email: "suspended@example.invalid", password: "unknown" }));
    expect(a.status).toBe(401); expect(b.status).toBe(401); expect((await a.json()).state).toBe((await b.json()).state);
  });
  it("requires database admitted password session before issuing the second step", async () => {
    vi.mocked(backend.rpc).mockImplementation(async (name) => name === "msrc_staff_status" ? { enabled: true, emailDailyLimit: 40 }
      : name === "msrc_staff_form_claim" ? { state: "claimed" } : name === "msrc_staff_login_begin" ? { state: "reserved" } : { state: "denied" });
    const response = await handler()(request("POST", { action: "signin", email: "staff@example.invalid", password: "password" }));
    expect(response.status).toBe(401); expect(backend.logout).toHaveBeenCalledWith(native.accessToken); expect(backend.factors).not.toHaveBeenCalled();
  });
  it("returns only an encrypted HttpOnly separate staff cookie", async () => {
    current = persisted("staff", "staff_email_check_required");
    const response = await handler()(request("POST", { action: "signin", email: "staff@example.invalid", password: "password" }));
    expect((await response.json()).state).toBe("pending-email");
    const header = response.headers.get("set-cookie")!; expect(header).toContain("HttpOnly; SameSite=Strict"); expect(header).toContain("msrc-staff-test=");
    expect(header).not.toContain(native.accessToken); expect(header).not.toContain(native.refreshToken); expect(header).not.toContain("participant");
  });
  it.each(["idle_expired", "absolute_expired", "session_revoked", "account_suspended", "individual_identity_required", "password_auth_required"])("denies current database failure %s", async (reason) => {
    current = persisted("super_admin", reason);
    const response = await handler()(request("POST", { action: "suspend", targetId: invitationId }, cookie()));
    expect(response.status).toBe(403); expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_admin_change")).toBe(false);
  });
  it("checks native identity before reading persisted authority", async () => {
    vi.mocked(backend.identity).mockResolvedValue(invitationId);
    expect((await handler()(request("GET", undefined, cookie(), "?area=people"))).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_session_context")).toBe(false);
  });
  it("does not accept cookie deadline extension", async () => {
    const response = await handler()(request("GET", undefined, cookie({ deadline: now + 8 * 3_600_000 - 1000 }), "?area=people"));
    expect(response.status).toBe(403);
  });
  it("does not accept refresh changing native session identity", async () => {
    vi.mocked(backend.refresh).mockResolvedValue({ ...native, sessionId: invitationId });
    expect((await handler()(request("GET", undefined, cookie({ accessToken: token(now) }), "?area=people"))).status).toBe(403);
  });
  it("fails closed when the flag changes during the form transaction", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => { const result = await original(args[0], args[1], args[2]); if (args[0] === "msrc_staff_form_claim") readiness = { state: "closed" }; return result; });
    expect((await handler()(request("POST", { action: "signin", email: "staff@example.invalid", password: "password" }))).status).toBe(503);
    expect(backend.login).not.toHaveBeenCalled();
  });
  it.each(["staff", "super_admin"] as const)("requires strongest current assurance for %s", async (tier) => {
    current = persisted(tier, tier === "staff" ? "staff_email_check_required" : "mfa_required");
    expect((await handler()(request("POST", { action: "invite", email: "other@example.invalid", roles: ["finance"] }, cookie()))).status).toBe(403);
    expect(backend.invite).not.toHaveBeenCalled();
  });
});

describe("second steps and safe privileged projections", () => {
  it("requires current database receipt after email provider success", async () => {
    current = persisted("staff", "staff_email_check_required");
    const response = await handler()(request("POST", { action: "verify-email", code: "123456" }, cookie({ challengeId })));
    expect(response.status).toBe(403); expect(backend.emailVerify).toHaveBeenCalledWith(native.accessToken, challengeId, "123456");
  });
  it("binds TOTP factor/challenge to encrypted pending session", async () => {
    current = persisted("super_admin", "mfa_required");
    const response = await handler()(request("POST", { action: "verify-totp", code: "123456", factorId: invitationId, challengeId }, cookie({ factorId, challengeId })));
    expect(response.status).toBe(400); expect(backend.verify).not.toHaveBeenCalled();
  });
  it("requires genuine persisted TOTP after provider success and audits result", async () => {
    current = persisted("super_admin", "mfa_required");
    const response = await handler()(request("POST", { action: "verify-totp", code: "123456", factorId, challengeId }, cookie({ factorId, challengeId })));
    expect(response.status).toBe(403); expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_auth_event", expect.objectContaining({ event: "totp_verify", result: "completed" }));
  });
  it("generates QR pixels from URI, never native SVG markup", async () => {
    current = persisted("super_admin", "mfa_required"); vi.mocked(backend.factors).mockResolvedValue([]);
    const response = await handler()(request("POST", { action: "enroll-totp" }, cookie())); const data = await response.json();
    expect(data.state).toBe("pending-totp"); expect(data.enrollment.qrCode).toMatch(/^data:image\/png;base64,/); expect(JSON.stringify(data)).not.toContain("<svg");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_auth_event", expect.objectContaining({ event: "totp_enroll", result: "completed" }));
  });
  it.each(ROLES.filter((role) => role !== "participant"))("never trusts a menu role for server access: %s", async (role) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_profile"
      ? { schemaVersion: 1, actorId, name: "Synthetic Staff", roles: [role], session: current }
      : args[0] === "msrc_staff_people" ? { state: "denied" } : original(args[0], args[1], args[2]));
    expect((await handler()(request("GET", undefined, cookie(), "?area=people"))).status).toBe(403);
  });
  it("rejects secret-bearing rows rather than passing a raw RPC projection", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_audit"
      ? { rows: [{ id: invitationId, action: "invite", result: "ok", token: "secret" }] } : original(args[0], args[1], args[2]));
    const response = await handler()(request("GET", undefined, cookie(), "?area=audit")); expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
  });
  it.each(["none", "pending", "failed", "awaiting_invitation"])("allows People recovery display state %s without making it authority", async (recoveryState) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_people"
      ? { staff: [{ actorId: invitationId, name: "Synthetic Held Staff", email: "held@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null, recoveryState }], invitations: [] }
      : original(args[0], args[1], args[2]));
    const response = await handler()(request("GET", undefined, cookie(), "?area=people")); expect(response.status).toBe(200);
    const result = await response.json(); expect(result.people[0].recoveryState).toBe(recoveryState); expect(result.profile.actorId).toBe(actorId);
  });
  it.each(["completed", "", null, "unknown"])("rejects unrecognized People recovery state %s", async (recoveryState) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_people"
      ? { staff: [{ actorId: invitationId, name: "Synthetic", email: "held@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null, recoveryState }], invitations: [] }
      : original(args[0], args[1], args[2]));
    expect((await handler()(request("GET", undefined, cookie(), "?area=people"))).status).toBe(503);
  });
  it("rejects a secret alongside the accepted People recovery display state", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_people"
      ? { staff: [{ actorId: invitationId, name: "Synthetic", email: "held@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null, recoveryState: "failed", password: "private-proof" }], invitations: [] }
      : original(args[0], args[1], args[2]));
    const response = await handler()(request("GET", undefined, cookie(), "?area=people")); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-proof");
  });
  it.each(["1234567890", "••••••1234extra", "1234", "•••••1234"])("rejects an unmasked identifier projection %s", async (identityMasked) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_participants"
      ? { rows: [{ actorId: invitationId, name: "Synthetic", email: "participant@example.invalid", status: "verified", createdAt: new Date(now).toISOString(), identityMasked }] }
      : original(args[0], args[1], args[2]));
    expect((await handler()(request("GET", undefined, cookie(), "?area=participants"))).status).toBe(503);
  });
  it.each(["••••••1234", "••••••١٢٣٤", "••••••"])("allows only safe masked identifier shape %s", async (identityMasked) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_participants"
      ? { rows: [{ actorId: invitationId, name: "Synthetic", email: "participant@example.invalid", status: "verified", createdAt: new Date(now).toISOString(), identityMasked }] }
      : original(args[0], args[1], args[2]));
    const response = await handler()(request("GET", undefined, cookie(), "?area=participants")); expect(response.status).toBe(200);
    expect((await response.json()).participants[0].identityMasked).toBe(identityMasked);
  });
  it("routes explicit identity reveal through the audited native RPC without projecting absent identity", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_identity_reveal" ? { state: "unavailable" } : original(args[0], args[1], args[2]));
    const response = await handler()(request("POST", { action: "reveal-identity", targetId: invitationId }, cookie()));
    expect((await response.json()).state).toBe("identity-unavailable"); expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_identity_reveal", { edition_key: config.editionKey, target_actor: invitationId }, native.accessToken);
  });
});

describe("invitation protocol and account recovery", () => {
  it.each(["expired", "revoked", "accepted"])("does not create a user for %s invitation", async () => {
    const response = await handler()(request("POST", { action: "invite-accept", invitationId, token: "a".repeat(43), name: "Synthetic Invitee", password: "StrongPassword!" }));
    expect(response.status).toBe(400); expect(backend.createUser).not.toHaveBeenCalled(); expect(backend.updateUser).not.toHaveBeenCalled();
  });
  it("requires consumed proof bound to the exact operation before native creation", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_invite_consume"
      ? { state: "consumed", operationId: invitationId, actorId, email: "staff@example.invalid", existing: false } : original(args[0], args[1], args[2]));
    expect((await handler()(request("POST", { action: "invite-accept", invitationId, token: "a".repeat(43), name: "Synthetic Invitee", password: "StrongPassword!" }))).status).toBe(400);
    expect(backend.createUser).not.toHaveBeenCalled();
  });
  it("keeps low-entropy and replayable URLs out of invitation email", () => {
    const message = staffInvitationEmail("staff@example.invalid", origin + "/en/staff/accept-invitation#invitation=" + invitationId + "&token=" + "a".repeat(43));
    expect(message.from).toBe("MSRC 2027 <no-reply@msrc2027.com>"); expect(message.text).toContain("72 hours"); expect(message.text).toContain("single-use");
    expect(() => staffInvitationEmail("staff@example.invalid", "https://attacker.invalid/invite")).toThrow();
    expect(() => staffInvitationEmail("staff@example.invalid", origin + "/en/staff/accept-invitation?token=secret")).toThrow();
  });
  it("denies self-authenticator reset even if a malformed DB reservation succeeds", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (...args) => args[0] === "msrc_staff_admin_change"
      ? { state: "reserved", operationId: args[1]?.operation_id } : original(args[0], args[1], args[2]));
    expect((await handler()(request("POST", { action: "reset-authenticator", targetId: actorId }, cookie()))).status).toBe(403);
    expect(backend.resetFactors).not.toHaveBeenCalled();
  });
  it("denies password rotation without a DB-admitted recovery operation", async () => {
    expect((await handler()(request("POST", { action: "reset-account", targetId: invitationId }, cookie()))).status).toBe(403);
    expect(backend.updateUser).not.toHaveBeenCalled();
  });
  it("does not acknowledge or invite recovery after factor deletion succeeds but password rotation fails", async () => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, args, accessToken) => name === "msrc_staff_admin_change"
      ? { state: "reserved", operationId: args?.operation_id }
      : name === "msrc_staff_admin_operation" ? { state: "reserved", actorId: invitationId, email: "held@example.invalid", roles: ["superAdmin"], factorIds: [factorId] }
      : name === "msrc_staff_admin_complete" ? { state: "denied" } : original(name, args, accessToken));
    vi.mocked(backend.updateUser).mockResolvedValue(false);
    const response = await handler()(request("POST", { action: "reset-account", targetId: invitationId }, cookie()));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("unavailable");
    expect(backend.resetFactors).toHaveBeenCalledTimes(1); expect(backend.updateUser).toHaveBeenCalledTimes(1);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_admin_complete", expect.objectContaining({ succeeded: false }));
    expect(backend.invite).not.toHaveBeenCalled();
  });
  it("rechecks current database denial when a recovery hold races an admitted password exchange", async () => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, args, accessToken) => name === "msrc_session_context" ? null : original(name, args, accessToken));
    const response = await handler()(request("POST", { action: "signin", email: "held@example.invalid", password: "unchanged" }));
    expect(response.status).toBe(401); expect((await response.json()).state).toBe("invalid-credentials");
    expect(backend.factors).not.toHaveBeenCalled(); expect(backend.logout).toHaveBeenCalledWith(native.accessToken);
    const enrollment = await handler()(request("POST", { action: "enroll-totp" }, cookie()));
    expect(enrollment.status).toBe(403); expect(backend.enroll).not.toHaveBeenCalled();
  });
  it("accepts ten Unicode codepoints and preserves legacy sign-in minimum", () => {
    const base = { action: "invite-accept", formToken: "token", name: "Synthetic", invitationId, token: "a".repeat(43) };
    expect(validateStaffPayload({ ...base, password: "😀".repeat(9) })).toBeNull();
    expect(validateStaffPayload({ ...base, password: "😀".repeat(10) })).not.toBeNull();
    expect(validateStaffPayload({ action: "signin", formToken: "token", email: "staff@example.invalid", password: "legacy" })).not.toBeNull();
    expect(validateStaffPayload({ ...base, password: "a".repeat(73) })).toBeNull();
  });
  it("rejects modified or duplicate staff cookies and participant cookie reuse", () => {
    const value: StaffSessionCookie = { ...native, origin, deadline: now + 8 * 3_600_000, factorId: null, challengeId: null, challengeExpiresAt: null };
    const sealed = sealStaffSession(config, value);
    expect(readStaffSession(config, request("GET", undefined, "msrc-staff-test=" + sealed.slice(0, -1) + "!"), now)).toBeNull();
    expect(readStaffSession(config, request("GET", undefined, cookie() + "; " + cookie()), now)).toBeNull();
    expect(readStaffSession(config, request("GET", undefined, "msrc-participant-test=" + sealed), now)).toBeNull();
    expect(readStaffSession(config, request("GET", undefined, cookie()), now + 8 * 3_600_000)).toBeNull();
  });
});
