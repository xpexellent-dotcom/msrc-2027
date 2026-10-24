import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { createWorkshopStaffHandler } from "@/features/workshops/staff-handler.server";
import { decodeWorkshopFields, decodeWorkshopStaffPayload, decodeWorkshopStaffView, emptyWorkshopFields } from "@/features/workshops/staff-contract";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-24T06:00:00Z");
const actorId = "74000000-0000-4000-8000-000000000001", sessionId = "74000000-0000-4000-8000-000000000002", workshopId = "74000000-0000-4000-8000-000000000003", bookingId = "74000000-0000-4000-8000-000000000004", operationId = "74000000-0000-4000-8000-000000000005";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000, amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const policy = { enabled: false, holdHours: null, offerHours: null, mockPaymentEnabled: false };
const workshop = { ...emptyWorkshopFields(), id: workshopId, version: 1, titleEn: "Synthetic workshop", titleAr: "ورشة تجريبية", remaining: null, ready: false, removed: false, canManage: true, canCheckin: true, canComplete: true };
const booking = { id: bookingId, workshopId, actorId, status: "held", requestedAt: new Date(now).toISOString(), expiresAt: "2026-10-25T06:00:00Z", approvedAt: null, checkedInAt: null, completedAt: null, fullDiscount: false, conflict: false };
const view = () => ({ state: "ready", policy, workshops: [workshop], bookings: [booking], reservations: [], conflicts: [] });
let roles: Role[], satisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
function persisted() { const superAdmin = roles.includes("superAdmin"); return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: satisfied, reason: satisfied ? null : "staff_email_check_required", mfaValid: superAdmin && satisfied, passwordValid: true, staffEmailValid: !superAdmin && satisfied, emailVerified: true, timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false }; }
function request(body?: Record<string, unknown>, signedIn = true, extraHeaders: Record<string, string> = {}, query = "") {
  return new Request(origin + "/api/staff-portal/workshops" + query, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219", ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}), ...(body ? { origin, "Content-Type": "application/json" } : {}), ...extraHeaders }, body: body ? JSON.stringify({ operationId, formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const handle = (input: Request) => createWorkshopStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
beforeEach(() => { roles = ["registrationWorkshopAdministrator"]; satisfied = true; replies = { msrc_staff_workshop_read: view(), msrc_staff_workshop_mutate: { state: "updated" } }; backend = { rpc: vi.fn(async (name) => { if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 }; if (name === "msrc_staff_form_claim") return { state: "claimed" }; if (name === "msrc_session_context") return persisted(); if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Workshop Admin", roles, session: persisted() }; const result = replies[name]; if (result instanceof Error) throw result; return result ?? null; }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend; });

describe("ENG-074 private workshop server boundary", () => {
  it.each(ROLES)("independently checks workshop read and manager mutation roles for %s", async (role) => {
    roles = [role]; const manager = ["superAdmin", "registrationWorkshopAdministrator"].includes(role), reader = manager || role === "checkInStaff";
    expect((await handle(request())).status).toBe(reader ? 200 : 403);
    expect((await handle(request({ action: "approve", bookingId, reason: "Synthetic review" }))).status).toBe(manager ? 200 : 403);
    if (!reader) expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_workshop_"))).toBe(false);
  });
  it("permits scanners’ minimal read and check-in while withholding settings and approvals", async () => {
    roles = ["checkInStaff"]; replies.msrc_staff_workshop_read = { ...view(), policy: null, workshops: [{ ...workshop, canManage: false, canComplete: false }] };
    const response = await handle(request()); expect(response.status).toBe(200); expect((await response.json()).policy).toBeNull();
    expect((await handle(request({ action: "checkin", bookingId }))).status).toBe(200);
    expect((await handle(request({ action: "save_policy", policy, reason: "Synthetic settings" }))).status).toBe(403);
  });
  it("leaves instructor assignment enforcement at the database after current scanner authority", async () => {
    roles = ["checkInStaff"]; replies.msrc_staff_workshop_mutate = { state: "denied" };
    expect((await handle(request({ action: "complete", bookingId }))).status).toBe(403);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_workshop_mutate", { edition_key: config.editionKey, input: { action: "complete", operationId, bookingId } }, accessToken);
  });
  it.each(["superAdmin", "registrationWorkshopAdministrator", "checkInStaff"] as const)("denies insufficient native session assurance for %s", async (role) => { roles = [role]; satisfied = false; expect((await handle(request())).status).toBe(403); });
  it("denies missing cookie and native identity mismatch", async () => { expect((await handle(request(undefined, false))).status).toBe(403); vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(request())).status).toBe(403); });
  it("keeps the independent staff gate closed before calling any backend", async () => { const response = await createWorkshopStaffHandler({ readiness: () => ({ state: "closed" }), backend: () => backend })(request()); expect(response.status).toBe(503); expect(backend.rpc).not.toHaveBeenCalled(); });
  it("requires same-origin POST, fresh form nonce and bounded action fields", async () => {
    for (const input of [request({ action: "approve", bookingId, reason: "Synthetic review" }, true, { origin: "https://evil.invalid" }), request({ action: "approve", bookingId, reason: "Synthetic review", formToken: "" }), request({ action: "approve", bookingId, reason: "Synthetic review", actorId }), request(undefined, true, {}, "?extra=1")]) expect((await handle(input)).status).toBe(400);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_workshop_mutate")).toBe(false);
  });
  it("cannot activate booking from settings, and only Super Admin can save closed policy", async () => {
    expect((await handle(request({ action: "save_policy", policy, reason: "Synthetic settings" }))).status).toBe(403); roles = ["superAdmin"];
    expect((await handle(request({ action: "save_policy", policy: { ...policy, enabled: true }, reason: "Synthetic settings" }))).status).toBe(409);
    expect((await handle(request({ action: "save_policy", policy, reason: "Synthetic settings" }))).status).toBe(200);
  });
  it("preserves the caller’s idempotency reference and forwards only validated input", async () => {
    const response = await handle(request({ action: "reserve", workshopId, seats: 1, releaseAt: "2026-10-25T06:00:00Z", reason: "Synthetic reservation" })); expect(response.ok).toBe(true);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_workshop_mutate", { edition_key: config.editionKey, input: { action: "reserve", operationId, workshopId, seats: 1, releaseAt: "2026-10-25T06:00:00Z", reason: "Synthetic reservation" } }, accessToken);
    expect(await response.text()).not.toContain("accessToken"); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("shows area-not-ready for missing pending RPC without logging out", async () => {
    replies.msrc_staff_workshop_read = new StaffRpcMissingError(); const response = await handle(request()); expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready"); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("preserves a rotated cookie when the pending migration is missing", async () => {
    replies.msrc_staff_workshop_read = new StaffRpcMissingError(); const expired = { ...native, accessToken: "header." + Buffer.from(JSON.stringify({ ...claims, exp: now / 1000 })).toString("base64url") + ".signature" };
    const cookie = staffCookie(config, { ...expired, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
    const response = await handle(request(undefined, true, { cookie })); expect((await response.json()).state).toBe("area-not-ready"); expect(response.headers.get("set-cookie")).toContain("msrc-staff-test=");
  });
  it("projects allowlisted information and rejects malformed or duplicated RPC records", async () => {
    replies.msrc_staff_workshop_read = { ...view(), privateSecret: "secret", bookings: [{ ...booking, rawIdentity: "hidden" }] }; const projected = await (await handle(request())).json(); expect(projected).not.toHaveProperty("privateSecret"); expect(projected.bookings[0]).not.toHaveProperty("rawIdentity");
    for (const raw of [{ ...view(), workshops: [workshop, workshop] }, { ...view(), bookings: [{ ...booking, status: "auto_approved" }] }, { ...view(), policy: undefined }, new Error("private diagnostic")]) { replies.msrc_staff_workshop_read = raw; const result = await handle(request()); expect(result.status).toBe(503); expect(await result.text()).not.toContain("diagnostic"); }
  });
  it.each(["full", "expired", "conflict", "capacity_below_allocations"])("preserves actionable database %s without widening mutation output", async (state) => { replies.msrc_staff_workshop_mutate = { state, privateSecret: "secret" }; const response = await handle(request({ action: "approve", bookingId, reason: "Synthetic review" })); expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ state }); });
});

describe("WKS-01..07 bounded workshop contract", () => {
  it("keeps operational values unset in a new draft", () => { const fields = emptyWorkshopFields(); expect(fields).toMatchObject({ capacity: null, priceMinor: null, startAt: null, bookingDeadline: null, transferBufferMinutes: null, published: false }); expect(decodeWorkshopFields(fields)).toEqual(fields); });
  it("validates actual field bounds, schedule order and explicit nullable settings", () => {
    for (const invalid of [{ titleEn: "a".repeat(201) }, { descriptionAr: "أ".repeat(5001) }, { eligibilityEn: "a".repeat(1001) }, { transferBufferMinutes: 1441 }, { priceMinor: -1 }, { capacity: 0 }, { capacity: 2 ** 31 }, { startAt: "2026-11-01T09:00:00Z", endAt: "2026-11-01T08:00:00Z" }, { startAt: "2026-11-01T09:00:00Z", bookingDeadline: "2026-11-01T10:00:00Z" }]) expect(decodeWorkshopFields({ ...emptyWorkshopFields(), ...invalid })).toBeNull();
    expect(decodeWorkshopFields({ ...emptyWorkshopFields(), titleEn: "  Synthetic title  " })?.titleEn).toBe("Synthetic title");
  });
  it("requires reasons and release deadlines instead of silently creating permanent reservations", () => {
    for (const input of [{ action: "reserve", workshopId, seats: 1, reason: "Synthetic" }, { action: "reserve", workshopId, seats: 1, releaseAt: "2026-10-25T00:00:00Z", reason: "" }, { action: "extend", bookingId, reason: "Synthetic", expiresAt: "invalid" }, { action: "decline", bookingId, reason: "a".repeat(301) }, { action: "validate_discount", bookingId, reason: "line\nbreak" }]) expect(decodeWorkshopStaffPayload({ ...input, operationId })).toBeNull();
  });
  it("rejects unknown nested settings, role claims and mutated identifiers", () => {
    expect(decodeWorkshopStaffPayload({ action: "save_workshop", operationId, workshop: { ...emptyWorkshopFields(), approved: true }, reason: "Synthetic" })).toBeNull();
    expect(decodeWorkshopStaffPayload({ action: "save_policy", operationId, policy: { ...policy, realPayment: true }, reason: "Synthetic" })).toBeNull();
    expect(decodeWorkshopStaffPayload({ action: "complete", operationId, bookingId, actorId })).toBeNull();
    expect(decodeWorkshopStaffView({ ...view(), workshops: [{ ...workshop, canComplete: null }] })).toBeNull();
  });
});
