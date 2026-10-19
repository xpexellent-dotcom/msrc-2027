import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { validateStaffPayload } from "@/features/staff-portal/validation.server";
import { verifiedPriorityClaims } from "@/features/staff-portal/registration-contract.server";
import type { StaffRegistrationCounts, StaffRegistrationRequest, StaffPriorityRow } from "@/features/staff-portal/ui-contract";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-17T00:00:00Z");
const actorId = "30000000-0000-4000-8000-000000000001", sessionId = "30000000-0000-4000-8000-000000000002";
const targetId = "30000000-0000-4000-8000-000000000003", requestId = "30000000-0000-4000-8000-000000000004";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const counts: StaffRegistrationCounts = { pending: 2, approved: 1, waitlisted: 0, offered: 0, expired: 0, capacity: 3, remaining: 2 };
const row: StaffRegistrationRequest = { id: requestId, actorId: targetId, name: "Synthetic Participant", email: "person@example.invalid",
  status: "pending_approval", priority: true, createdAt: new Date(now).toISOString(), decidedAt: null, identityMasked: "••••••1234", offerExpiresAt: null };
const priorityRow: StaffPriorityRow = { actorId: targetId, name: row.name, email: row.email, active: true, reason: "Synthetic roster verified",
  designatedAt: row.createdAt, designatedByName: "Synthetic Staff", removedAt: null };
const registration = { requests: [row], counts };
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
function handle(input: Request) { return createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input); }
beforeEach(() => {
  roles = ["superAdmin"]; policySatisfied = true;
  replies = { msrc_staff_registration: { state: "ready", registration },
    msrc_staff_registration_approve: { state: "updated", registration, decided: { approved: 1, waitlisted: 0, skipped: 0 } },
    msrc_staff_registration_waitlist: { state: "updated", registration, decided: { approved: 0, waitlisted: 1, skipped: 0 } },
    msrc_staff_priority: { state: "ready", priority: { designations: [priorityRow], candidates: [] } },
    msrc_registration_priority_set: { state: "updated" },
    msrc_staff_summary: { state: "ready", summary: { registration: counts, participants: 3, staff: 2, auditLast24h: 4, priority: 1 } } };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles, session: persisted() };
    return replies[name] ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});
afterEach(() => vi.unstubAllGlobals());

describe("staff queue payload validation", () => {
  it.each(["registration-approve", "registration-waitlist"])("validates bounded UUID batches for %s", (action) => {
    const valid = { action, formToken: "synthetic", requestIds: [requestId] };
    expect(validateStaffPayload(valid)?.requestIds).toEqual([requestId]);
    const hundred = Array.from({ length: 100 }, (_, i) => `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
    expect(validateStaffPayload({ ...valid, requestIds: hundred })?.requestIds).toHaveLength(100);
    for (const requestIds of [undefined, [], [...hundred, targetId], ["invalid"], [requestId, requestId], [null], requestId, [123]]) {
      expect(validateStaffPayload({ ...valid, requestIds })).toBeNull();
    }
  });
  it.each(["priority-set", "priority-remove"])("requires target and reason for %s", (action) => {
    const valid = { action, formToken: "synthetic", targetId, reason: "  Synthetic roster verified  " };
    expect(validateStaffPayload(valid)?.reason).toBe("Synthetic roster verified");
    for (const reason of [undefined, "", "  ", "x".repeat(301), "line\nbreak", "bad\u0000value"]) {
      expect(validateStaffPayload({ ...valid, reason })).toBeNull();
    }
    expect(validateStaffPayload({ ...valid, targetId: "invalid" })).toBeNull();
  });
  it("rejects new action fields on unrelated actions and forged authority", () => {
    for (const extra of [{ requestIds: [requestId] }, { status: "pending_approval" }, { session_claims: claims }, { active: true }]) {
      expect(validateStaffPayload({ action: "activity", formToken: "synthetic", ...extra })).toBeNull();
    }
  });
  it("validates a supplied registration status and canonical duplicate UUIDs", () => {
    const body = { action: "registration-approve", formToken: "synthetic", requestIds: [requestId] };
    for (const status of ["all", "pending_approval", "confirmed"]) expect(validateStaffPayload({ ...body, status })?.status).toBe(status);
    for (const status of ["", "draft", 1, null]) expect(validateStaffPayload({ ...body, status })).toBeNull();
    const mixed = "abcdefab-0000-4000-8000-000000000001";
    expect(validateStaffPayload({ ...body, requestIds: [mixed, mixed.toUpperCase()] })).toBeNull();
  });
});

describe("staff registration GET and mutations", () => {
  it.each(["superAdmin", "registrationWorkshopAdministrator"] as const)("allows %s with exact native authorization", async (role) => {
    roles = [role];
    const response = await handle(request("GET", "?area=registration&query=Synthetic&status=waitlisted"));
    expect(response.status).toBe(200);
    expect((await response.json()).registration).toEqual(registration);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration", { edition_key: config.editionKey, search: "Synthetic", status_filter: "waitlisted" }, accessToken);
  });
  it("defaults status to all and keeps the existing q alias", async () => {
    expect((await handle(request("GET", "?area=registration&q=Synthetic"))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration", { edition_key: config.editionKey, search: "Synthetic", status_filter: "all" }, accessToken);
  });
  it.each(["all", "pending_approval", "approved", "approved_awaiting_payment", "waitlisted", "offered", "confirmed", "cancelled", "expired"])("accepts status %s", async (status) => {
    expect((await handle(request("GET", "?area=registration&status=" + status))).status).toBe(200);
  });
  it.each(["?area=registration&status=bogus", "?area=registration&status=", "?area=registration&status=all&status=confirmed",
    "?area=registration&query=a&q=b", "?area=registration&query=%00", "?area=registration&query=" + "x".repeat(201),
    "?area=priority&status=all", "?area=summary&status=all"])("rejects malformed GET %s", async (query) => {
    expect((await handle(request("GET", query))).status).toBe(400);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => ["msrc_staff_registration", "msrc_staff_priority", "msrc_staff_summary"].includes(name))).toBe(false);
  });
  it.each(["registration-approve", "registration-waitlist"] as const)("returns decisions and totals for %s", async (action) => {
    const response = await handle(request("POST", "", { action, requestIds: [requestId] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", registration, decided: action === "registration-approve"
      ? { approved: 1, waitlisted: 0, skipped: 0 } : { approved: 0, waitlisted: 1, skipped: 0 } });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_" + action.replaceAll("-", "_"), { edition_key: config.editionKey, request_ids: [requestId] }, accessToken);
  });
  it.each(["capacity_not_set", "payment_configuration_required"])("exposes clear safe configuration state %s", async (state) => {
    replies.msrc_staff_registration_approve = { state };
    const response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(409); expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it.each(ROLES.filter((role) => !["superAdmin", "registrationWorkshopAdministrator"].includes(role)))("denies queue read and mutations to %s before domain RPC", async (role) => {
    roles = [role];
    expect((await handle(request("GET", "?area=registration"))).status).toBe(403);
    for (const action of ["registration-approve", "registration-waitlist"]) {
      expect((await handle(request("POST", "", { action, requestIds: [requestId] }))).status).toBe(403);
    }
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_registration"))).toBe(false);
  });
  it.each(["superAdmin", "registrationWorkshopAdministrator"] as const)("denies incomplete assurance for %s", async (role) => {
    roles = [role]; policySatisfied = false;
    expect((await handle(request("GET", "?area=registration"))).status).toBe(403);
    expect((await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }))).status).toBe(403);
  });
  it("denies unauthenticated and mismatched native identities", async () => {
    expect((await handle(request("GET", "?area=registration", undefined, false))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(targetId);
    expect((await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }))).status).toBe(403);
  });
  it("requires CSRF for bulk allocation", async () => {
    expect((await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId], formToken: "forged" }))).status).toBe(400);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_registration_approve")).toBe(false);
  });
  it("admits 100 UUIDs through the real JSON body boundary", async () => {
    const requestIds = Array.from({ length: 100 }, (_, i) => `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
    replies.msrc_staff_registration_approve = { state: "updated", registration, decided: { approved: 0, waitlisted: 0, skipped: 100 } };
    expect((await handle(request("POST", "", { action: "registration-approve", requestIds }))).status).toBe(200);
  });
  it("returns nullable capacity without inventing a configured value", async () => {
    const unconfigured = { requests: [], counts: { pending: 0, approved: 0, waitlisted: 0, capacity: null, remaining: null } };
    replies.msrc_staff_registration = { state: "ready", registration: unconfigured };
    const response = await handle(request("GET", "?area=registration"));
    expect(response.status).toBe(200); expect((await response.json()).registration).toEqual(unconfigured);
  });
  it("honors database denial after server role approval", async () => {
    replies.msrc_staff_registration_approve = { state: "denied" };
    const response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(403); expect((await response.json()).decided).toBeUndefined();
  });
  it.each([{ approved: 2, waitlisted: 0, skipped: 0 }, { approved: 0, waitlisted: 1, skipped: 0 },
    { approved: 1, waitlisted: 0, skipped: -1 }])("rejects impossible decision counts %#", async (decided) => {
    replies.msrc_staff_registration_approve = { state: "updated", registration, decided };
    const response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(503); expect((await response.json()).decided).toBeUndefined();
  });
  it.each([
    { requests: [{ ...row, identityEnvelope: { ciphertext: "never project" } }], counts },
    { requests: [{ ...row, identityMasked: "1234567890" }], counts },
    { requests: [{ ...row, priority: "true" }], counts },
    { requests: [{ ...row, status: "unexpected" }], counts },
    { requests: [row], counts: { ...counts, pending: -1 } },
    { requests: [row], counts: { ...counts, remaining: 0.5 } },
    { requests: Array.from({ length: 51 }, () => row), counts },
  ])("fails closed on invalid or sensitive response fields %#", async (invalid) => {
    replies.msrc_staff_registration = { state: "ready", registration: invalid };
    const response = await handle(request("GET", "?area=registration"));
    expect(response.status).toBe(503); expect((await response.json()).registration).toBeUndefined();
  });
});

describe("organizing-team priority and scoped summary", () => {
  it("lists private designations and candidate search", async () => {
    const response = await handle(request("GET", "?area=priority&query=Synthetic"));
    expect(response.status).toBe(200);
    expect((await response.json()).priority).toEqual({ designations: [priorityRow], candidates: [] });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_priority", { edition_key: config.editionKey, search: "Synthetic" }, accessToken);
  });
  it.each(["priority-set", "priority-remove"] as const)("uses server-only existing priority RPC for %s", async (action) => {
    const response = await handle(request("POST", "", { action, targetId, reason: "Synthetic roster verified" }));
    expect(response.status).toBe(200); expect((await response.json()).state).toBe("updated");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_registration_priority_set", { edition_key: config.editionKey, target_actor: targetId,
      active: action === "priority-set", reason: "Synthetic roster verified", session_claims: expect.objectContaining(claims) });
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies priority administration to %s", async (role) => {
    roles = [role]; expect((await handle(request("GET", "?area=priority"))).status).toBe(403);
    for (const action of ["priority-set", "priority-remove"]) {
      expect((await handle(request("POST", "", { action, targetId, reason: "Synthetic roster verified" }))).status).toBe(403);
    }
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => ["msrc_staff_priority", "msrc_registration_priority_set"].includes(name))).toBe(false);
  });
  it("returns complete aggregate summary for Super Admin", async () => {
    const response = await handle(request("GET", "?area=summary"));
    expect(response.status).toBe(200); expect((await response.json()).summary).toEqual({ registration: counts, participants: 3, staff: 2, auditLast24h: 4, priority: 1 });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_summary", { edition_key: config.editionKey }, accessToken);
  });
  it.each(["registrationWorkshopAdministrator", "finance", "abstractReviewer"] as const)("does not expose unauthorized summary counts to %s", async (role) => {
    roles = [role];
    const response = await handle(request("GET", "?area=summary"));
    const body = await response.json();
    // A malformed overprivileged database projection may be denied or safely filtered.
    if (response.status === 200) expect(body.summary).toEqual(role === "registrationWorkshopAdministrator" ? { registration: counts, participants: 3 } : {});
    else { expect(response.status).toBe(503); expect(body.summary).toBeUndefined(); }
  });
  it("returns an empty summary for staff without area permissions", async () => {
    roles = ["finance"]; replies.msrc_staff_summary = { state: "ready", summary: {} };
    const response = await handle(request("GET", "?area=summary")); expect(response.status).toBe(200); expect((await response.json()).summary).toEqual({});
  });
  it("rejects malformed priority candidates and summary counts", async () => {
    replies.msrc_staff_priority = { state: "ready", priority: { designations: [priorityRow], candidates: [{ actorId: targetId,
      name: row.name, email: row.email, status: "verified", createdAt: row.createdAt, identityMasked: "unmasked-id" }] } };
    expect((await handle(request("GET", "?area=priority"))).status).toBe(503);
    replies.msrc_staff_summary = { state: "ready", summary: { staff: -1 } };
    expect((await handle(request("GET", "?area=summary"))).status).toBe(503);
  });
  it("admits sanitized registration audit evidence and rejects arbitrary extra details", async () => {
    const audit = { id: requestId, actorId, targetId, action: "request.approved", result: "allowed", occurredAt: row.createdAt,
      actorName: "Synthetic Staff", targetName: row.name, details: { source: "registration", requestId,
        previousStatus: "pending_approval", newStatus: "approved", previousActive: null, newActive: null, reason: null } };
    replies.msrc_staff_audit = { rows: [audit] };
    const response = await handle(request("GET", "?area=audit"));
    expect(response.status).toBe(200); expect((await response.json()).audit).toEqual([audit]);
    replies.msrc_staff_audit = { rows: [{ ...audit, details: { ...audit.details, identityEnvelope: "sensitive" } }] };
    expect((await handle(request("GET", "?area=audit"))).status).toBe(503);
  });
});

describe("private registration transport", () => {
  it.each([{ sub: targetId }, { session_id: targetId }, { role: "service_role" }, { aal: "aal1" }, { exp: now / 1000 },
    { amr: [{ method: "password", timestamp: now / 1000 }] }, { amr: [{ method: "totp", timestamp: now / 1000 }] }])("refuses substituted or incomplete priority claims %#", (override) => {
    const token = "header." + Buffer.from(JSON.stringify({ ...claims, ...override })).toString("base64url") + ".signature";
    expect(verifiedPriorityClaims({ ...native, accessToken: token }, now)).toBeNull();
  });
  it("forwards only verified identity/session assurance claims, never mutable metadata", () => {
    const token = "header." + Buffer.from(JSON.stringify({ ...claims, user_metadata: { role: "superAdmin" }, app_metadata: { names: "omit" }, roles: ["superAdmin"] })).toString("base64url") + ".signature";
    expect(verifiedPriorityClaims({ ...native, accessToken: token }, now)).toEqual(claims);
  });
  it("reports a not-yet-installed private RPC distinctly from an outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202", message: "Could not find the function" }, { status: 404 })));
    await expect(createStaffBackend(config).rpc("msrc_staff_totp_begin", {})).rejects.toBeInstanceOf(StaffRpcMissingError);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST116" }, { status: 404 })));
    await expect(createStaffBackend(config).rpc("msrc_staff_totp_begin", {})).rejects.not.toBeInstanceOf(StaffRpcMissingError);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await expect(createStaffBackend(config).rpc("msrc_staff_totp_begin", {})).rejects.not.toBeInstanceOf(StaffRpcMissingError);
  });
  it("reuses service credentials only for the explicit priority setter", async () => {
    const fetcher = vi.fn(async () => Response.json({ state: "updated" })); vi.stubGlobal("fetch", fetcher);
    const provider = createStaffBackend(config);
    await provider.rpc("msrc_registration_priority_set", { session_claims: claims, target_actor: targetId });
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/rpc/msrc_registration_priority_set");
    expect(new Headers(options.headers).get("apikey")).toBe(config.secretKey);
    expect(new Headers(options.headers).has("authorization")).toBe(false);
    await expect(provider.rpc("msrc_registration_priority_set", {}, accessToken)).rejects.toThrow();
    await expect(provider.rpc("msrc_registration_submit", {})).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("uses the user's JWT for authenticated queue calls", async () => {
    const fetcher = vi.fn(async () => Response.json({ state: "ready", registration })); vi.stubGlobal("fetch", fetcher);
    await createStaffBackend(config).rpc("msrc_staff_registration", { edition_key: config.editionKey }, accessToken);
    const [, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options.headers).get("apikey")).toBe(config.publishableKey);
    expect(new Headers(options.headers).get("authorization")).toBe("Bearer " + accessToken);
    expect(options.cache).toBe("no-store"); expect(options.redirect).toBe("error");
  });
});
