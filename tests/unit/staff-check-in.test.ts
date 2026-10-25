import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { validateStaffPayload } from "@/features/staff-portal/validation.server";
import { checkInDay, checkInResultProjection, checkInSummaryProjection } from "@/features/staff-portal/check-in-contract.server";

const origin = "http://127.0.0.1:3219", now = Date.parse("2027-01-27T06:00:00Z"), day = "2027-01-27";
const actorId = "37000000-0000-4000-8000-000000000001", sessionId = "37000000-0000-4000-8000-000000000002";
const attendanceId = "37000000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const attendance = { id: attendanceId, conferenceDay: day, checkedInAt: new Date(now).toISOString(), performerId: actorId,
  performerName: "Synthetic Scanner", entryPoint: null, method: "manual_code" };
const summary = { state: "ready", conferenceDays: [day, "2027-01-28"], day, counts: { checkedIn: 2, scan: 1, manualCode: 1, offline: 0 } };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: policySatisfied,
    reason: policySatisfied ? null : superAdmin ? "mfa_required" : "staff_email_check_required",
    mfaValid: superAdmin && policySatisfied, passwordValid: true, staffEmailValid: !superAdmin && policySatisfied, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function request(method: "GET" | "POST", query = "", body?: Record<string, unknown>, signedIn = true) {
  return new Request(origin + "/api/staff-portal" + query, { method, headers: { host: "127.0.0.1:3219",
    ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000,
      challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}),
    ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const scan = () => request("POST", "", { action: "check-in", ticketTokenOrReference: "SYNTHETIC-REFERENCE", conferenceDay: day, entryPoint: "Synthetic door" });
const undo = () => request("POST", "", { action: "check-in-undo", attendanceId, reason: "Synthetic correction" });
const handle = (input: Request) => createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
beforeEach(() => {
  roles = ["checkInStaff"]; policySatisfied = true;
  replies = { msrc_staff_checkin: { state: "checked_in", attendance }, msrc_staff_checkin_undo: { state: "undone" }, msrc_staff_attendance_summary: summary };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Scanner", roles, session: persisted() };
    return replies[name] ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("BL-CHK / BL-ATT staff boundary", () => {
  it.each(ROLES)("independently authorizes scan and counts for %s", async (role) => {
    roles = [role];
    const allowed = ["checkInStaff", "superAdmin"].includes(role);
    const scanned = await handle(scan()), counted = await handle(request("GET", "?area=check-in&day=" + day));
    expect(scanned.status).toBe(allowed ? 200 : 403); expect(counted.status).toBe(allowed ? 200 : 403);
    if (!allowed) expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => /msrc_staff_(checkin|attendance)/.test(name))).toBe(false);
  });
  it("passes a verified user bearer, bound edition/day and no ticket master secret", async () => {
    expect((await handle(scan())).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_checkin", { edition_key: config.editionKey, ticket_token_or_reference: "SYNTHETIC-REFERENCE", conference_day: day, entry_point: "Synthetic door" }, accessToken);
    expect(JSON.stringify(vi.mocked(backend.rpc).mock.calls)).not.toContain("ticket_secret");
  });
  it.each(["checked_in", "already_checked_in", "revoked", "not_found", "wrong_day", "not_approved"])("projects outcome %s with minimal provenance", async (state) => {
    replies.msrc_staff_checkin = { state, ...(["checked_in", "already_checked_in"].includes(state) ? { attendance } : {}) };
    const response = await handle(scan()), body = await response.json();
    expect(response.status).toBe(200); expect(body.checkInResult.status).toBe(state);
    expect(body.checkInResult).not.toHaveProperty("performerId"); expect(body.checkInResult).not.toHaveProperty("entryPoint");
    if (state.includes("checked_in")) expect(body.checkInResult).toMatchObject({ attendanceId, checkedInAt: attendance.checkedInAt, performedBy: attendance.performerName });
  });
  it.each(["denied", "rate_limited", "invalid"])("does not convert %s to successful attendance", async (state) => {
    replies.msrc_staff_checkin = { state };
    const response = await handle(scan()); expect(response.status).toBe(state === "denied" ? 403 : state === "rate_limited" ? 429 : 400);
    expect(await response.json()).not.toHaveProperty("checkInResult");
  });
  it("reports account-lock contention as retryable unavailability without a ticket outcome", async () => {
    replies.msrc_staff_checkin = { state: "unavailable" };
    const response = await handle(scan()); expect(response.status).toBe(503);
    const body = await response.json(); expect(body.state).toBe("unavailable"); expect(body).not.toHaveProperty("checkInResult");
    expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each(["checkInStaff", "superAdmin"] as Role[])("requires current session assurance for %s", async (role) => {
    roles = [role]; policySatisfied = false;
    expect((await handle(scan())).status).toBe(403); expect((await handle(undo())).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => /msrc_staff_(checkin|attendance)/.test(name))).toBe(false);
  });
  it("rejects anonymous and invalid native identities", async () => {
    expect((await handle(request("POST", "", { action: "check-in", ticketTokenOrReference: "SYNTHETIC", conferenceDay: day }, false))).status).toBe(403);
    backend.identity = vi.fn(async () => null); expect((await handle(scan())).status).toBe(403);
  });
  it("reserves undo for Super Admin and accepts repeated undo", async () => {
    expect((await handle(undo())).status).toBe(403);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_checkin_undo", expect.anything(), expect.anything());
    roles = ["superAdmin"];
    for (const state of ["undone", "already_undone"]) {
      replies.msrc_staff_checkin_undo = { state };
      expect(await (await handle(undo())).json()).toMatchObject({ state: "updated" });
    }
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_checkin_undo", { edition_key: config.editionKey, attendance_id: attendanceId, reason: "Synthetic correction" }, accessToken);
  });
  it.each(["msrc_staff_checkin", "msrc_staff_checkin_undo", "msrc_staff_attendance_summary"])("keeps signed-in state when %s is missing or unreachable", async (name) => {
    roles = ["superAdmin"];
    const original = backend.rpc;
    for (const error of [new StaffRpcMissingError(), new Error("Synthetic outage")]) {
      backend.rpc = vi.fn(async (rpc, ...args) => { if (rpc === name) throw error; return original(rpc, ...args); });
      const response = await handle(name.endsWith("summary") ? request("GET", "?area=check-in&day=" + day) : name.endsWith("undo") ? undo() : scan());
      expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" });
      expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
    }
  });
  it("treats actual PostgREST missing RPC as area-not-ready", async () => {
    const adapter = createStaffBackend(config), original = backend.rpc;
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "PGRST202" }, { status: 404 }));
    backend.rpc = (name, ...args) => name === "msrc_staff_checkin" ? adapter.rpc(name, ...args) : original(name, ...args);
    try { expect(await (await handle(scan())).json()).toMatchObject({ state: "area-not-ready" }); }
    finally { fetcher.mockRestore(); }
  });
  it.each(["?area=check-in&day=2027-02-30", "?area=check-in&day=2027-01-27&day=2027-01-28", "?area=registration&day=2027-01-27", "?area=check-in&q=name"])("rejects malformed or irrelevant summary parameters %s", async (query) => {
    expect((await handle(request("GET", query))).status).toBe(400);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_attendance_summary", expect.anything(), expect.anything());
  });
});

describe("check-in payload and response validation", () => {
  const valid = { action: "check-in", formToken: "synthetic", ticketTokenOrReference: "SYNTHETIC", conferenceDay: day };
  it.each(["2027-02-29", "2027-02-30", "2027-13-01", "2027-1-27", "0000-01-01", "today"])("rejects invalid calendar date %s", (value) => {
    expect(checkInDay(value)).toBe(false); expect(validateStaffPayload({ ...valid, conferenceDay: value })).toBeNull();
  });
  it("accepts valid leap days and rejects uncontrolled input fields", () => {
    expect(checkInDay("2028-02-29")).toBe(true);
    for (const changes of [{ ticketTokenOrReference: "" }, { ticketTokenOrReference: "x".repeat(257) }, { ticketTokenOrReference: "secret\u0000" }, { entryPoint: "x".repeat(121) }, { method: "scan" }, { targetId: actorId }, { reason: "wrong" }])
      expect(validateStaffPayload({ ...valid, ...changes })).toBeNull();
    expect(validateStaffPayload({ ...valid, entryPoint: " Synthetic " })?.entryPoint).toBe("Synthetic");
    expect(validateStaffPayload({ action: "activity", formToken: "synthetic", conferenceDay: day })).toBeNull();
  });
  it("requires a bounded undo reason and ID", () => {
    const base = { action: "check-in-undo", formToken: "synthetic", attendanceId, reason: "Synthetic error" };
    expect(validateStaffPayload(base)).toMatchObject(base);
    for (const changes of [{ reason: " " }, { reason: "x".repeat(301) }, { reason: "line\nbreak" }, { attendanceId: "unknown" }, { ticketTokenOrReference: "other" }]) expect(validateStaffPayload({ ...base, ...changes })).toBeNull();
  });
  it("rejects credential leakage, wrong-day provenance and inconsistent counts", () => {
    expect(checkInResultProjection({ state: "checked_in", attendance: { ...attendance, token: "secret" } }, day)).toBeNull();
    expect(checkInResultProjection({ state: "checked_in", attendance: { ...attendance, conferenceDay: "2027-01-28" } }, day)).toBeNull();
    expect(checkInResultProjection({ state: "not_found", email: "person@example.invalid" }, day)).toBeNull();
    expect(checkInSummaryProjection({ ...summary, counts: { checkedIn: 5, scan: 1, manualCode: 1, offline: 0 } }, day)).toBeNull();
    expect(checkInSummaryProjection({ ...summary, conferenceDays: [day, day] }, day)).toBeNull();
    expect(checkInSummaryProjection(summary, "2027-01-28")).toBeNull();
    expect(checkInSummaryProjection({ state: "ready", conferenceDays: null, day: null, counts: { checkedIn: 0, scan: 0, manualCode: 0, offline: 0 } }, null)).toMatchObject({ conferenceDays: null });
  });
});
