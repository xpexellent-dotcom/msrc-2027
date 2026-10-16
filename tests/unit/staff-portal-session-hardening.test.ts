import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import type { NativeStaffSession, StaffBackend } from "@/features/staff-portal/backend.server";
import { readStaffSession, staffCookie, staffFormToken, type StaffSessionCookie } from "@/features/staff-portal/security.server";

const origin = "http://127.0.0.1:3219", started = Date.parse("2026-10-16T00:00:00Z");
const actorId = "c3100000-0000-4000-8000-000000000001", sessionId = "c3100000-0000-4000-8000-000000000002";
const targetId = "c3100000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
function token(exp: number) { return "header." + Buffer.from(JSON.stringify({ session_id: sessionId, exp: exp / 1000 })).toString("base64url") + ".signature"; }
let now: number, lastActivity: number, backend: StaffBackend, native: NativeStaffSession, tier: "staff" | "super_admin";
const deadline = started + 8 * 3_600_000;
function persisted() {
  const reason = now >= deadline ? "absolute_expired" : now >= lastActivity + 30 * 60_000 ? "idle_expired" : null;
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: tier,
    sessionPolicySatisfied: reason === null, reason, mfaValid: tier === "super_admin", passwordValid: true, staffEmailValid: tier === "staff", emailVerified: true,
    timing: { startedAt: new Date(started).toISOString(), lastActivityAt: new Date(lastActivity).toISOString(), absoluteExpiresAt: new Date(deadline).toISOString(),
      idleExpiresAt: new Date(lastActivity + 30 * 60_000).toISOString(), authenticatedAt: new Date(started).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function cookie(overrides: Partial<StaffSessionCookie> = {}) { return staffCookie(config, { ...native, origin, deadline,
  challengeId: null, factorId: null, challengeExpiresAt: null, ...overrides }, now).split(";")[0]; }
function request(method: string, sessionCookie = cookie(), body?: Record<string, unknown>, query = "") {
  return new Request(origin + "/api/staff-portal" + query, { method, headers: { host: "127.0.0.1:3219", cookie: sessionCookie,
    ...(method === "POST" ? { origin, "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
function handle() { return createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now }); }
function decoded(response: Response) { return readStaffSession(config, request("GET", response.headers.get("set-cookie")!.split(";")[0]), now); }
beforeEach(() => {
  now = started; lastActivity = started; tier = "super_admin";
  native = { actorId, sessionId, accessToken: token(started + 3_600_000), refreshToken: "synthetic-refresh-0" };
  backend = {
    rpc: vi.fn(async (name) => {
      if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
      if (name === "msrc_staff_form_claim") return { state: "claimed" };
      if (name === "msrc_session_context") return persisted();
      if (name === "msrc_session_activity") { if (persisted().sessionPolicySatisfied) lastActivity = now; return persisted(); }
      if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles: [tier === "super_admin" ? "superAdmin" : "finance"], session: persisted() };
      if (name === "msrc_staff_people") return { staff: [], invitations: [] };
      return { state: "completed" };
    }),
    identity: vi.fn(async () => actorId), refresh: vi.fn(async () => ({ ...native, accessToken: token(now + 3_600_000), refreshToken: "synthetic-refresh-" + now })),
  } as unknown as StaffBackend;
});

describe("deliberate staff read activity", () => {
  it.each(["staff", "super_admin"] as const)("keeps %s navigation/reads signed in for two hours with immutable absolute origin", async (value) => {
    tier = value; let sessionCookie = cookie(); const handler = handle();
    for (let minute = 0; minute <= 120; minute += 10) {
      now = started + minute * 60_000;
      const read = await handler(request("GET", sessionCookie));
      expect((await read.json()).state).toBe("authenticated");
      if (read.headers.has("set-cookie")) sessionCookie = read.headers.get("set-cookie")!.split(";")[0];
      const active = await handler(request("POST", sessionCookie, { action: "activity" }));
      expect((await active.json()).state).toBe("authenticated");
      if (active.headers.has("set-cookie")) sessionCookie = active.headers.get("set-cookie")!.split(";")[0];
      expect(readStaffSession(config, request("GET", sessionCookie), now)?.deadline).toBe(deadline);
    }
    expect(lastActivity).toBe(started + 120 * 60_000);
    expect(backend.refresh).toHaveBeenCalledTimes(2);
  });
  it("keeps periodic observation and token refresh from renewing an unattended session", async () => {
    const handler = handle(); let sessionCookie = cookie({ accessToken: token(started) });
    for (const minute of [0, 10, 20, 30]) {
      now = started + minute * 60_000;
      const result = await handler(request("GET", sessionCookie));
      expect((await result.json()).state).toBe(minute < 30 ? "authenticated" : "ready");
      if (result.headers.has("set-cookie")) sessionCookie = result.headers.get("set-cookie")!.split(";")[0];
    }
    expect(lastActivity).toBe(started);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_session_activity")).toBe(false);
  });
  it("rejects missing CSRF and forged activity fields before touching idle time", async () => {
    for (const body of [{ action: "activity", formToken: "stale" }, { action: "activity", targetId }]) {
      expect((await handle()(request("POST", cookie(), body))).status).toBe(400);
    }
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_session_activity")).toBe(false);
  });
  it("cannot resurrect idle expiry or extend the eight-hour absolute deadline", async () => {
    now = started + 30 * 60_000;
    expect((await handle()(request("POST", cookie(), { action: "activity" }))).status).toBe(403);
    now = deadline;
    expect((await handle()(request("POST", cookie(), { action: "activity" }))).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_session_activity")).toBe(false);
  });
  it("denies a database activity refusal instead of trusting a previously valid observation", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (name, args, accessToken) => name === "msrc_session_activity" ? null : original(name, args, accessToken));
    expect((await handle()(request("POST", cookie(), { action: "activity" }))).status).toBe(403);
  });
});

describe("native rotations survive privileged response paths", () => {
  it("clears a rotated cookie when current database authorization rejects the refreshed session", async () => {
    const original = backend.rpc; backend.rpc = vi.fn(async (name, args, accessToken) => name === "msrc_session_context" ? null : original(name, args, accessToken));
    const response = await handle()(request("GET", cookie({ accessToken: token(started) })));
    expect((await response.json()).state).toBe("ready");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(decoded(response)).toBeNull();
  });
  it.each(["completed", "denied", "throws"])("persists the rotated native pair on an admin action that %s", async (result) => {
    const original = backend.rpc; backend.rpc = vi.fn(async (name, args, accessToken) => {
      if (name === "msrc_staff_admin_change") { if (result === "throws") throw new Error("synthetic operation unavailable"); return { state: result }; }
      return original(name, args, accessToken);
    });
    const resultResponse = await handle()(request("POST", cookie({ accessToken: token(started) }), { action: "suspend", targetId }));
    expect(resultResponse.status).toBe(result === "completed" ? 200 : result === "denied" ? 403 : 503);
    const rotated = decoded(resultResponse);
    expect(rotated).toMatchObject({ accessToken: token(now + 3_600_000), refreshToken: "synthetic-refresh-" + now, deadline });
    const next = await handle()(request("GET", resultResponse.headers.get("set-cookie")!.split(";")[0], undefined, "?area=people"));
    expect(next.status).toBe(200); expect(backend.refresh).toHaveBeenCalledTimes(1);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_admin_change", expect.anything(), rotated!.accessToken);
  });
  it.each(["returns-null", "throws", "changes-actor", "changes-session"])("does not run privileged work after refresh %s", async (failure) => {
    if (failure === "throws") vi.mocked(backend.refresh).mockRejectedValue(new Error("synthetic provider down"));
    else vi.mocked(backend.refresh).mockResolvedValue(failure === "returns-null" ? null : { ...native, ...(failure === "changes-actor" ? { actorId: targetId } : { sessionId: targetId }) });
    const response = await handle()(request("POST", cookie({ accessToken: token(started) }), { action: "suspend", targetId }));
    expect(response.status).toBe(failure === "throws" ? 503 : 403);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_admin_change")).toBe(false);
  });
});
