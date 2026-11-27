import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import type { NativeStaffSession, StaffBackend } from "@/features/staff-portal/backend.server";
import { readStaffSession, staffCookie, staffFormToken, type StaffSessionCookie } from "@/features/staff-portal/security.server";
import type { Role } from "@/lib/permissions/contract";

const origin = "http://127.0.0.1:3219", started = Date.parse("2026-10-16T00:00:00Z");
const actorId = "c3100000-0000-4000-8000-000000000001", sessionId = "c3100000-0000-4000-8000-000000000002";
const targetId = "c3100000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
function token(exp: number) { return "header." + Buffer.from(JSON.stringify({ session_id: sessionId, exp: exp / 1000 })).toString("base64url") + ".signature"; }
let now: number, lastActivity: number, backend: StaffBackend, native: NativeStaffSession, tier: "staff" | "super_admin";
let sessionDenial: "mfa_required" | "session_revoked" | null;
let assignedRoles: Role[] | undefined;
const deadline = started + 8 * 3_600_000;
function persisted() {
  const reason = now >= deadline ? "absolute_expired" : now >= lastActivity + 30 * 60_000 ? "idle_expired" : sessionDenial;
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: tier,
    sessionPolicySatisfied: reason === null, reason, mfaValid: tier === "super_admin" && reason !== "mfa_required", passwordValid: true, staffEmailValid: tier === "staff", emailVerified: true,
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
  now = started; lastActivity = started; tier = "super_admin"; sessionDenial = null; assignedRoles = undefined;
  native = { actorId, sessionId, accessToken: token(started + 3_600_000), refreshToken: "synthetic-refresh-0" };
  const claimedNonces = new Set<unknown>();
  backend = {
    rpc: vi.fn(async (name, args) => {
      if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
      if (name === "msrc_staff_form_claim") {
        const nonce = args.nonce_hash;
        if (claimedNonces.has(nonce)) return { state: "limited" };
        claimedNonces.add(nonce);
        return { state: "claimed" };
      }
      if (name === "msrc_session_context") return persisted();
      if (name === "msrc_session_activity") { if (persisted().sessionPolicySatisfied) lastActivity = now; return persisted(); }
      if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles: assignedRoles ?? [tier === "super_admin" ? "superAdmin" : "finance"], session: persisted() };
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

describe("People and roles navigation activity", () => {
  const startup = { action: "activity", area: "people" };

  it("records real activity, then returns the authorized People rows with any rotated session cookie", async () => {
    now = started + 20 * 60_000;
    const staff = [{ actorId, name: "Synthetic Staff", email: "staff@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null }];
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, args, accessToken) => {
      if (name !== "msrc_staff_people") return original(name, args, accessToken);
      expect(lastActivity).toBe(now);
      return { staff, invitations: [] };
    });
    const response = await handle()(request("POST", cookie({ accessToken: token(started) }), startup));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "authenticated", people: staff, invitations: [], formToken: expect.any(String) });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(lastActivity).toBe(now);
    expect(backend.refresh).toHaveBeenCalledTimes(1);
    const rotated = decoded(response);
    expect(rotated).toMatchObject({ accessToken: token(now + 3_600_000), refreshToken: "synthetic-refresh-" + now, deadline });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_people", { edition_key: config.editionKey, search: "" }, rotated?.accessToken);
  });

  it("rejects a forged token, cross-origin request, and parameters outside the People startup contract", async () => {
    const handler = handle();
    const crossOrigin = request("POST", cookie(), startup);
    crossOrigin.headers.set("origin", "https://other.example.invalid");
    expect((await handler(crossOrigin)).status).toBe(400);
    for (const body of [{ ...startup, formToken: "stale" }, { ...startup, area: "unknown" }, { ...startup, query: "other" }, { action: "suspend", targetId, area: "people" }]) {
      expect((await handler(request("POST", cookie(), body))).status).toBe(400);
    }
    const calls = vi.mocked(backend.rpc).mock.calls.map(([rpc]) => rpc);
    expect(calls).not.toContain("msrc_staff_form_claim");
    expect(calls).not.toContain("msrc_session_activity");
    expect(calls).not.toContain("msrc_staff_people");
  });

  it("claims the form token only once even when submitted concurrently", async () => {
    const handler = handle(), formToken = staffFormToken(config, origin, now);
    const session = cookie();
    const responses = await Promise.all(Array.from({ length: 2 }, () => handler(request("POST", session, { ...startup, formToken }))));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    const limited = responses.find((response) => response.status === 429)!;
    expect(await limited.json()).not.toHaveProperty("people");
    const calls = vi.mocked(backend.rpc).mock.calls;
    expect(calls.filter(([rpc]) => rpc === "msrc_session_activity")).toHaveLength(1);
    expect(calls.filter(([rpc]) => rpc === "msrc_staff_people")).toHaveLength(1);
  });

  it.each(["expired idle time", "expired absolute time", "revoked session", "pending MFA", "no cookie"] as const)("denies %s before activity or any People data read", async (scenario) => {
    if (scenario === "expired idle time") now = started + 30 * 60_000;
    if (scenario === "expired absolute time") now = deadline;
    if (scenario === "revoked session") sessionDenial = "session_revoked";
    if (scenario === "pending MFA") sessionDenial = "mfa_required";
    const result = await handle()(request("POST", scenario === "no cookie" ? "" : cookie(), startup));
    expect(result.status).toBe(403);
    const body = await result.json();
    expect(body).toMatchObject({ state: "denied" });
    expect(body).not.toHaveProperty("people");
    expect(body).not.toHaveProperty("invitations");
    expect(vi.mocked(backend.rpc).mock.calls.some(([rpc]) => ["msrc_session_activity", "msrc_staff_people"].includes(rpc))).toBe(false);
  });

  it("denies a valid ordinary staff session before reading Super Admin data", async () => {
    tier = "staff";
    const result = await handle()(request("POST", cookie(), startup));
    expect(result.status).toBe(403);
    const body = await result.json();
    expect(body).toMatchObject({ state: "authenticated", areaFailure: "denied" });
    expect(body).not.toHaveProperty("people");
    expect(body).not.toHaveProperty("invitations");
    expect(vi.mocked(backend.rpc).mock.calls.some(([rpc]) => rpc === "msrc_staff_people")).toBe(false);
  });

  it.each(["denied", "unavailable"] as const)("keeps People data private when its database read is %s", async (failure) => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, args, accessToken) => {
      if (name !== "msrc_staff_people") return original(name, args, accessToken);
      if (failure === "unavailable") throw new Error("Synthetic RPC outage");
      return { state: "denied" };
    });
    const result = await handle()(request("POST", cookie(), startup));
    expect(result.status).toBe(failure === "denied" ? 403 : 503);
    const body = await result.json();
    expect(body).toMatchObject({ state: "authenticated", areaFailure: failure });
    expect(body).not.toHaveProperty("people");
    expect(body).not.toHaveProperty("invitations");
  });
});

describe("Scoped staff navigation activity", () => {
  const emptyRegistration = { requests: [], counts: { pending: 0, approved: 0, waitlisted: 0, offered: 0, expired: 0, capacity: null, remaining: null } };
  const checkInCounts = { checkedIn: 0, scan: 0, manualCode: 0, offline: 0 };
  const defaults = [
    { area: "audit", role: "superAdmin", rpc: "msrc_staff_audit", args: { search: "" }, data: { rows: [] }, expected: { audit: [] } },
    { area: "participants", role: "registrationWorkshopAdministrator", rpc: "msrc_staff_participants", args: { search: "" }, data: { rows: [] }, expected: { participants: [] } },
    { area: "registration", role: "registrationWorkshopAdministrator", rpc: "msrc_staff_registration", args: { search: "", status_filter: "all" },
      data: { registration: emptyRegistration }, expected: { registration: emptyRegistration } },
    { area: "priority", role: "superAdmin", rpc: "msrc_staff_priority", args: { search: "" },
      data: { priority: { designations: [] } }, expected: { priority: { designations: [] } } },
    { area: "early-access", role: "superAdmin", rpc: "msrc_staff_early_access", args: { search: "" },
      data: { earlyAccess: { entries: [] } }, expected: { earlyAccess: { entries: [] } } },
    { area: "check-in", role: "checkInStaff", rpc: "msrc_staff_attendance_summary", args: { day: null },
      data: { conferenceDays: null, day: null, counts: checkInCounts }, expected: { checkIn: { conferenceDays: null, summary: { day: null, ...checkInCounts } } } },
  ] as const;

  it.each(defaults)("uses the same authorized RPC and default view for $area as its GET", async ({ area, role, rpc, args, data, expected }) => {
    assignedRoles = [role];
    tier = role === "superAdmin" ? "super_admin" : "staff";
    now = started + 10 * 60_000;
    const original = backend.rpc;
    backend.rpc = vi.fn((name, params, accessToken) => name === rpc ? Promise.resolve({ state: "ready", ...data }) : original(name, params, accessToken));
    const handler = handle(), session = cookie();
    const get = await handler(request("GET", session, undefined, "?area=" + area));
    expect(get.status).toBe(200);
    expect(lastActivity).toBe(started);
    const post = await handler(request("POST", session, { action: "activity", area }));
    expect(post.status).toBe(200);
    expect(lastActivity).toBe(now);
    expect(post.headers.get("cache-control")).toContain("no-store");
    const projected = await post.json(), previous = await get.json();
    expect(projected).toMatchObject({ state: "authenticated", ...expected });
    expect(projected).toEqual({ ...previous, formToken: expect.any(String) });
    const calls = vi.mocked(backend.rpc).mock.calls;
    expect(calls.filter(([name]) => name === rpc)).toEqual(Array.from({ length: 2 }, () => [rpc, { edition_key: config.editionKey, ...args }, native.accessToken]));
    expect(calls.findIndex(([name]) => name === "msrc_session_activity")).toBeLessThan(calls.findLastIndex(([name]) => name === rpc));
  });

  it("returns only the approved email preview catalogue to an authorized Super Admin", async () => {
    const handler = handle();
    const get = await handler(request("GET", cookie(), undefined, "?area=email-previews"));
    const post = await handler(request("POST", cookie(), { action: "activity", area: "email-previews" }));
    expect(get.status).toBe(200);
    expect(post.status).toBe(200);
    const projected = await post.json();
    expect(projected.emailPreviews.length).toBeGreaterThan(0);
    expect(projected).toEqual({ ...await get.json(), formToken: expect.any(String) });
  });

  it("rejects navigation requests for exports, detail and mutation inputs before any form claim", async () => {
    const handler = handle();
    for (const area of ["summary", "registration-detail", "registration-export", "registration-confirmation-preview", "workshops", "registration-approve"]) {
      expect((await handler(request("POST", cookie(), { action: "activity", area }))).status).toBe(400);
    }
    for (const fields of [{ requestId: targetId }, { status: "pending_approval" }, { day: "2027-04-07" }, { requestIds: [targetId] }]) {
      expect((await handler(request("POST", cookie(), { action: "activity", area: "registration", ...fields }))).status).toBe(400);
    }
    expect(vi.mocked(backend.rpc).mock.calls.map(([name]) => name).every((name) => name === "msrc_staff_status")).toBe(true);
  });

  it.each(defaults)("denies a finance-only staff account before reading $area", async ({ area, rpc, expected }) => {
    tier = "staff";
    const response = await handle()(request("POST", cookie(), { action: "activity", area }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({ state: "authenticated", areaFailure: "denied" });
    for (const field of Object.keys(expected)) expect(body).not.toHaveProperty(field);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === rpc)).toBe(false);
  });

  it.each(["early-access", "registration-settings", "email-previews", "launch-readiness"])("retains the strongest-assurance gate for %s", async (area) => {
    tier = "staff";
    assignedRoles = ["superAdmin"];
    const response = await handle()(request("POST", cookie(), { action: "activity", area }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      state: "authenticated", areaFailure: "denied",
      profile: { actorId, name: "Synthetic Staff", roles: ["superAdmin"] },
      passwordChangeAvailable: false, formToken: expect.any(String),
    });
    const reads = ["msrc_staff_early_access", "msrc_staff_registration_settings", "msrc_staff_launch_readiness"];
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => reads.includes(name))).toBe(false);
  });

  it.each([["wrong_day", 400, "invalid-input"], ["rate_limited", 429, "limited"]] as const)("preserves the %s check-in result and omits scanner data", async (state, status, areaFailure) => {
    tier = "staff";
    assignedRoles = ["checkInStaff"];
    const original = backend.rpc;
    backend.rpc = vi.fn((name, args, accessToken) => name === "msrc_staff_attendance_summary" ? Promise.resolve({ state }) : original(name, args, accessToken));
    const response = await handle()(request("POST", cookie(), { action: "activity", area: "check-in" }));
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body).toMatchObject({ state: "authenticated", areaFailure });
    expect(body).not.toHaveProperty("checkIn");
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
