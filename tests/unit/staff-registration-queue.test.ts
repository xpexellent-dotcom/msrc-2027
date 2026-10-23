import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { readStaffJson, readStaffSession, staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { validateStaffPayload } from "@/features/staff-portal/validation.server";
import { registrationDetailProjection, registrationProjection, verifiedPriorityClaims, verifiedStaffRegistrationClaims } from "@/features/staff-portal/registration-contract.server";
import { confirmationPreviewProjection } from "@/features/staff-portal/confirmation-contract.server";
import type { StaffRegistrationCounts, StaffRegistrationHistoryRow, StaffRegistrationRequest, StaffPriorityRow } from "@/features/staff-portal/ui-contract";

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
  status: "pending_approval", priority: true, createdAt: new Date(now).toISOString(), decidedAt: null, offerExpiresAt: null, identityMasked: "••••••1234", ticketStatus: null };
const priorityRow: StaffPriorityRow = { actorId: targetId, name: row.name, email: row.email, active: true, reason: "Synthetic roster verified",
  designatedAt: row.createdAt, designatedByName: "Synthetic Staff", removedAt: null };
const registration = { requests: [row], counts };
const earlyAccessEntry = { id: requestId, email: "person@example.invalid", addedAt: row.createdAt,
  addedByName: "Synthetic Staff", hasAccount: true, hasRequest: true };
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
  vi.stubEnv("REGISTRATION_TICKET_SECRET", "d".repeat(64));
  roles = ["superAdmin"]; policySatisfied = true;
  replies = { msrc_staff_registration: { state: "ready", registration },
    msrc_staff_registration_approve_tickets: { state: "updated", registration, decided: { approved: 1, waitlisted: 0, skipped: 0 } },
    msrc_staff_registration_waitlist: { state: "updated", registration, decided: { approved: 0, waitlisted: 1, skipped: 0 } },
    msrc_staff_registration_offer: { state: "updated", registration, decided: { approved: 0, waitlisted: 0, offered: 1, skipped: 0 } },
    msrc_staff_registration_detail: { state: "ready", historyVersion: 1, detail: { request: row, history: [
      { id: requestId, event: "request.waitlisted", actorKind: "staff", from: "pending_approval", to: "waitlisted", at: row.createdAt, performerName: "Synthetic Staff" }] } },
    msrc_staff_registration_export: { state: "ready", rows: [{ name: row.name, email: row.email, status: row.status,
      priority: row.priority, createdAt: row.createdAt, decidedAt: row.decidedAt, identityMasked: row.identityMasked }] },
    msrc_staff_priority: { state: "ready", priority: { designations: [priorityRow], candidates: [] } },
    msrc_staff_early_access: { state: "ready", earlyAccess: { entries: [earlyAccessEntry] } },
    msrc_staff_early_access_add: { state: "updated", added: 1, invalid: [] },
    msrc_staff_early_access_remove: { state: "updated", removed: 1 },
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

describe("ENG-064 staff confirmation boundary", () => {
  const preview = { eligibleCount: 2, opensAt: "2026-10-16T21:00:00Z", responseHours: 48, settingsReady: true, canStart: true, previewToken: "a".repeat(64) };
  const input = { action: "registration-confirmation-start", operationId: requestId, nonresponsePolicy: "release_unconfirmed", previewToken: preview.previewToken };
  it("reads an exact private preview and passes the chosen policy and digest to the authenticated RPC", async () => {
    replies.msrc_staff_registration_confirmation_preview = { state: "ready", confirmation: preview };
    replies.msrc_staff_registration_confirmation_start = { state: "updated", opened: 2 };
    const read = await handle(request("GET", "?area=registration-confirmation-preview"));
    expect(await read.json()).toMatchObject({ state: "authenticated", confirmationPreview: preview });
    expect(read.headers.get("cache-control")).toContain("no-store");
    for (const nonresponsePolicy of ["release_unconfirmed", "keep_unconfirmed"]) {
      const response = await handle(request("POST", "", { ...input, nonresponsePolicy }));
      expect(await response.json()).toMatchObject({ state: "updated", confirmationOpened: 2 });
      expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_confirmation_start", {
        edition_key: config.editionKey, operation_id: requestId, nonresponse_policy: nonresponsePolicy, preview_token: preview.previewToken,
      }, accessToken);
    }
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s before confirmation reads or mutations", async (role) => {
    roles = [role];
    for (const call of [request("GET", "?area=registration-confirmation-preview"), request("POST", "", input)]) expect((await handle(call)).status).toBe(403);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_confirmation_start", expect.anything(), expect.anything());
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_confirmation_preview", expect.anything(), expect.anything());
  });
  it("requires current exact-session assurance and does not select a policy", async () => {
    policySatisfied = false;
    expect((await handle(request("POST", "", input))).status).toBe(403);
    for (const patch of [{ nonresponsePolicy: undefined }, { nonresponsePolicy: "" }, { nonresponsePolicy: "automatic" }, { previewToken: "" }, { previewToken: "z".repeat(64) }, { operationId: "invalid" }, { targetId }])
      expect(validateStaffPayload({ formToken: "synthetic", ...input, ...patch })).toBeNull();
  });
  it.each(["preview", "start"])("keeps login on missing confirmation %s RPC", async (kind) => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, ...args) => { if (name === `msrc_staff_registration_confirmation_${kind}`) throw new StaffRpcMissingError(); return original(name, ...args); });
    const response = await handle(kind === "preview" ? request("GET", "?area=registration-confirmation-preview") : request("POST", "", input));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie") ?? "").not.toContain("Max-Age=0"); expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each([["conflict", "operation-conflict", 409], ["not_due", "confirmation-not-due", 409], ["denied", "denied", 403], ["area_not_ready", "area-not-ready", 503]])("maps %s without exposing internal details", async (state, expected, status) => {
    replies.msrc_staff_registration_confirmation_start = { state };
    const response = await handle(request("POST", "", input)); expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ state: expected }); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("rejects over-returned, inconsistent and malformed previews", () => {
    expect(confirmationPreviewProjection(preview)).toEqual(preview);
    for (const patch of [{ emails: [row.email] }, { eligibleCount: -1 }, { eligibleCount: 1.5 }, { canStart: true, settingsReady: false }, { responseHours: 0 }, { opensAt: "bad" }, { previewToken: null }])
      expect(confirmationPreviewProjection({ ...preview, ...patch })).toBeNull();
  });
  it("passes confirmation filters and refuses old-schema confirmation filters", async () => {
    for (const status of ["confirmation_awaiting", "confirmation_confirmed", "confirmation_released"]) {
      const old = await handle(request("GET", `?area=registration&status=${status}`)); expect(await old.json()).toMatchObject({ state: "area-not-ready" });
      replies.msrc_staff_registration = { state: "ready", confirmationVersion: 1, registration };
      const response = await handle(request("GET", `?area=registration&status=${status}`)); expect(response.status).toBe(200);
      expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration", { edition_key: config.editionKey, search: "", status_filter: status }, accessToken);
      replies.msrc_staff_registration = { state: "ready", registration };
    }
  });
  it("projects confirmation state and rejects hidden fields and impossible status combinations", () => {
    for (const [state, status] of [["awaiting", "approved"], ["confirmed", "confirmed"], ["released", "cancelled"], ["kept", "approved"]]) {
      const request = { ...row, status, confirmation: { state, deadline: "2026-10-19T00:00:00Z" } };
      expect(registrationProjection({ requests: [request], counts: { ...counts, confirmationAwaiting: 1, confirmationConfirmed: 0, confirmationReleased: 0 } })).not.toBeNull();
      expect(registrationProjection({ requests: [{ ...request, status: "waitlisted" }], counts })).toBeNull();
      expect(registrationProjection({ requests: [{ ...request, confirmation: { ...request.confirmation, recipient: row.email } }], counts })).toBeNull();
    }
  });
  it("retains the actor and transition rules for the new confirmation timeline", () => {
    const events = [
      { event: "request.confirmation_opened", actorKind: "staff", from: "approved", to: "approved", performerName: "Synthetic Staff" },
      { event: "request.confirmation_opened", actorKind: "automatic", from: "approved", to: "approved", performerName: null },
      { event: "request.seat_confirmed", actorKind: "participant", from: "approved", to: "confirmed", performerName: null },
      { event: "request.seat_released", actorKind: "participant", from: "confirmed", to: "cancelled", performerName: null },
      { event: "request.seat_released", actorKind: "automatic", from: "approved", to: "cancelled", performerName: null },
      { event: "request.confirmation_kept", actorKind: "automatic", from: "approved", to: "approved", performerName: null },
    ];
    for (const event of events) {
      const history = { id: requestId, at: row.createdAt, ...event };
      expect(registrationDetailProjection({ request: row, history: [history] }, requestId)).not.toBeNull();
      expect(registrationDetailProjection({ request: row, history: [{ ...history, from: "waitlisted" }] }, requestId)).toBeNull();
    }
    expect(registrationDetailProjection({ request: row, history: [{ id: requestId, at: row.createdAt, ...events[2], actorKind: "staff" }] }, requestId)).toBeNull();
  });
});

describe("ticket-bearing approval service boundary", () => {
  it("uses the service credential without a user bearer and strips editable claims", async () => {
    const adapter = createStaffBackend(config);
    const fetcher = vi.fn(async () => Response.json({ state: "area_not_ready" })); vi.stubGlobal("fetch", fetcher);
    const args = { edition_key: config.editionKey, session_claims: claims, request_ids: [requestId], ticket_secret: "d".repeat(64) };
    await adapter.rpc("msrc_staff_registration_approve_tickets", args);
    const [, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options.headers).get("apikey")).toBe(config.secretKey);
    expect(new Headers(options.headers).get("authorization")).toBeNull();
    await expect(adapter.rpc("msrc_staff_registration_approve_tickets", args, accessToken)).rejects.toThrow("Invalid private RPC transport");
    expect(fetcher).toHaveBeenCalledOnce();
    const edited = "header." + Buffer.from(JSON.stringify({ ...claims, user_metadata: { role: "superAdmin" }, app_metadata: { private: "discard" } })).toString("base64url") + ".signature";
    expect(verifiedStaffRegistrationClaims({ ...native, accessToken: edited }, now)).toEqual(claims);
  });
  it("accepts validated regular-staff AAL1 claims for database email-session authorization", () => {
    const regular = { ...claims, aal: "aal1", amr: claims.amr.slice(0, 1) };
    const session = { ...native, accessToken: "header." + Buffer.from(JSON.stringify(regular)).toString("base64url") + ".signature" };
    expect(verifiedStaffRegistrationClaims(session, now)).toEqual(regular);
    expect(verifiedPriorityClaims(session, now)).toBeNull();
  });
  it("missing key or migration closes approval without invalidating the session or using legacy RPC", async () => {
    vi.stubEnv("REGISTRATION_TICKET_SECRET", "");
    let response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.includes("registration_approve"))).toBe(false);
    vi.stubEnv("REGISTRATION_TICKET_SECRET", "d".repeat(64));
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, ...args) => { if (name === "msrc_staff_registration_approve_tickets") throw new StaffRpcMissingError(); return original(name, ...args); });
    response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_registration_approve")).toBe(false);
  });
  it("projects only safe ticket status and normalizes older rows", () => {
    for (const ticketStatus of [null, "issued", "revoked"]) expect(registrationProjection({ ...registration, requests: [{ ...row, ticketStatus }] })?.requests[0].ticketStatus).toBe(ticketStatus);
    const legacy = { ...row }; delete legacy.ticketStatus;
    expect(registrationProjection({ ...registration, requests: [legacy] })?.requests[0].ticketStatus).toBeNull();
    for (const field of [{ ticketStatus: "valid" }, { ticketToken: "private" }, { secret_hash: "private" }, { ticketId: targetId }])
      expect(registrationProjection({ ...registration, requests: [{ ...row, ...field }] })).toBeNull();
  });
});

describe("ORG-056 private early-access list", () => {
  function rpcTransport(failure?: { name: string; status: number; body: Record<string, unknown> }) {
    const original = backend.rpc;
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const name = url.pathname.split("/").at(-1)!;
      if (name === failure?.name) return Response.json(failure.body, { status: failure.status });
      const result = await original(name, JSON.parse(String(init?.body)), new Headers(init?.headers).get("authorization")?.replace(/^Bearer /, ""));
      return Response.json(result);
    });
    vi.stubGlobal("fetch", fetcher);
    backend = { ...backend, rpc: createStaffBackend(config).rpc };
    return fetcher;
  }
  it("round-trips list, partial add and removal through the HTTP RPC adapter and handler", async () => {
    const emails = ["first@example.invalid", "second@example.invalid", "invalid"];
    replies.msrc_staff_early_access_add = { state: "updated", added: 2, invalid: [emails[2]] };
    const fetcher = rpcTransport();
    const listed = await handle(request("GET", "?area=early-access&query=person"));
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({ state: "authenticated", earlyAccess: { entries: [earlyAccessEntry] } });
    const added = await handle(request("POST", "", { action: "early-access-add", emails }));
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ state: "updated", added: 2, invalid: ["invalid"] });
    const removed = await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId] }));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({ state: "updated", removed: 1 });
    const calls = fetcher.mock.calls.filter(([url]) => String(url).includes("/msrc_staff_early_access"));
    expect(calls.map(([url, options]) => [String(url).split("/").at(-1), JSON.parse(String(options?.body))])).toEqual([
      ["msrc_staff_early_access", { edition_key: config.editionKey, search: "person" }],
      ["msrc_staff_early_access_add", { edition_key: config.editionKey, emails }],
      ["msrc_staff_early_access_remove", { edition_key: config.editionKey, entry_ids: [requestId] }],
    ]);
    for (const [, options] of calls) {
      expect(new Headers(options?.headers).get("apikey")).toBe(config.publishableKey);
      expect(new Headers(options?.headers).get("authorization")).toBe("Bearer " + accessToken);
      expect(options).toMatchObject({ method: "POST", cache: "no-store", redirect: "error" });
    }
  });
  it.each(["msrc_staff_early_access", "msrc_staff_early_access_add", "msrc_staff_early_access_remove"])("keeps the session when the HTTP transport reports missing %s or an outage", async (name) => {
    for (const failure of [
      { status: 404, body: { code: "PGRST202" }, state: "area-not-ready" },
      { status: 404, body: { code: "PGRST116" }, state: "unavailable" },
      { status: 503, body: { message: "Synthetic provider outage" }, state: "unavailable" },
    ]) {
      const original = backend;
      rpcTransport({ name, ...failure });
      const input = name === "msrc_staff_early_access" ? request("GET", "?area=early-access")
        : request("POST", "", name.endsWith("_add") ? { action: "early-access-add", emails: [row.email] } : { action: "early-access-remove", entryIds: [requestId] });
      const response = await handle(input);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ state: failure.state, formToken: expect.any(String) });
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(backend.logout).not.toHaveBeenCalled();
      backend = original;
    }
    const response = await handle(request("GET"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "authenticated" });
  });
  it("lists email entries through the verified native Super Admin session", async () => {
    const response = await handle(request("GET", "?area=early-access&query=person"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "authenticated", earlyAccess: { entries: [earlyAccessEntry] } });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_early_access", { edition_key: config.editionKey, search: "person" }, accessToken);
  });
  it("reports invalid originals while accepting normalized duplicates idempotently", async () => {
    const emails = ["  PERSON@EXAMPLE.INVALID  ", "person@example.invalid", "invalid", "\tperson@example.invalid", "<person>@example.invalid", ""];
    replies.msrc_staff_early_access_add = { state: "updated", added: 1, invalid: emails.slice(2) };
    const response = await handle(request("POST", "", { action: "early-access-add", emails }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", added: 1, invalid: emails.slice(2) });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_early_access_add", { edition_key: config.editionKey, emails }, accessToken);
    replies.msrc_staff_early_access_add = { state: "updated", added: 0, invalid: [] };
    expect(await (await handle(request("POST", "", { action: "early-access-add", emails: [emails[0]] }))).json()).toMatchObject({ state: "updated", added: 0, invalid: [] });
  });
  it("reports an entirely invalid batch without bypassing the RPC readiness or authorization", async () => {
    const emails = ["", "not an email", "a".repeat(255) + "@example.invalid", "not an email"];
    replies.msrc_staff_early_access_add = { state: "updated", added: 0, invalid: emails };
    const response = await handle(request("POST", "", { action: "early-access-add", emails }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", added: 0, invalid: emails });
  });
  it("removes a bounded batch by row ID and accepts repeated removals", async () => {
    const response = await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId, requestId] }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ state: "updated", removed: 1 });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_early_access_remove", { edition_key: config.editionKey, entry_ids: [requestId, requestId] }, accessToken);
    replies.msrc_staff_early_access_remove = { state: "updated", removed: 0 };
    expect(await (await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId] }))).json()).toMatchObject({ state: "updated", removed: 0 });
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s list and mutation access before the private RPC", async (role) => {
    roles = [role];
    expect((await handle(request("GET", "?area=early-access"))).status).toBe(403);
    expect((await handle(request("POST", "", { action: "early-access-add", emails: [row.email] }))).status).toBe(403);
    expect((await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId] }))).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_early_access"))).toBe(false);
  });
  it("requires completed exact-session TOTP and matching native identity", async () => {
    policySatisfied = false;
    expect((await handle(request("GET", "?area=early-access"))).status).toBe(403);
    expect((await handle(request("POST", "", { action: "early-access-add", emails: [row.email] }))).status).toBe(403);
    policySatisfied = true; vi.mocked(backend.identity).mockResolvedValue(targetId);
    expect((await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId] }))).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_early_access"))).toBe(false);
  });
  it.each(["msrc_staff_early_access", "msrc_staff_early_access_add", "msrc_staff_early_access_remove"])("maps missing %s to area-not-ready", async (missing) => {
    const existing = vi.mocked(backend.rpc).getMockImplementation()!;
    vi.mocked(backend.rpc).mockImplementation(async (...args) => { if (args[0] === missing) throw new StaffRpcMissingError(); return existing(...args); });
    const input = missing === "msrc_staff_early_access" ? request("GET", "?area=early-access")
      : request("POST", "", missing.endsWith("_add") ? { action: "early-access-add", emails: [row.email] } : { action: "early-access-remove", entryIds: [requestId] });
    const response = await handle(input);
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
  });
  it.each(["msrc_staff_early_access", "msrc_staff_early_access_add", "msrc_staff_early_access_remove"])("honors refreshed database denial from %s", async (rpc) => {
    replies[rpc] = { state: "denied" };
    const input = rpc === "msrc_staff_early_access" ? request("GET", "?area=early-access")
      : request("POST", "", rpc.endsWith("_add") ? { action: "early-access-add", emails: [row.email] } : { action: "early-access-remove", entryIds: [requestId] });
    const response = await handle(input);
    expect(response.status).toBe(403); expect((await response.json()).state).toBe("denied");
  });
  it.each([
    { ...earlyAccessEntry, email: " person@example.invalid " }, { ...earlyAccessEntry, email: "not an email" },
    { ...earlyAccessEntry, addedAt: "invalid" }, { ...earlyAccessEntry, hasAccount: "yes" },
    { ...earlyAccessEntry, hasAccount: false, hasRequest: true }, { ...earlyAccessEntry, actorId: targetId },
    { ...earlyAccessEntry, addedByName: "line\nbreak" },
  ])("rejects malformed or excessive list disclosure %#", async (entry) => {
    replies.msrc_staff_early_access = { state: "ready", earlyAccess: { entries: [entry] } };
    const response = await handle(request("GET", "?area=early-access"));
    expect(response.status).toBe(503); expect((await response.json()).earlyAccess).toBeUndefined();
  });
  it("accepts prospective accounts, rejects duplicate IDs, unsorted rows and more than 200 entries", async () => {
    replies.msrc_staff_early_access = { state: "ready", earlyAccess: { entries: [{ ...earlyAccessEntry, addedByName: null, hasAccount: false, hasRequest: false }] } };
    expect((await handle(request("GET", "?area=early-access"))).status).toBe(200);
    for (const entries of [[earlyAccessEntry, earlyAccessEntry], [earlyAccessEntry, { ...earlyAccessEntry, id: targetId, addedAt: new Date(now + 1).toISOString() }], Array(201).fill(earlyAccessEntry)]) {
      replies.msrc_staff_early_access = { state: "ready", earlyAccess: { entries } };
      expect((await handle(request("GET", "?area=early-access"))).status).toBe(503);
    }
  });
  it.each([{ added: 2, invalid: [] }, { added: -1, invalid: [] }, { added: 1, invalid: ["unrelated@example.invalid"] },
    { added: 1, invalid: [], rawEmail: "unrelated@example.invalid" }])("fails closed on unbound add results %#", async (result) => {
    replies.msrc_staff_early_access_add = { state: "updated", ...result };
    expect((await handle(request("POST", "", { action: "early-access-add", emails: [row.email, row.email] }))).status).toBe(503);
  });
  it("rejects impossible removal counts and invalid values repeated more than input occurrences", async () => {
    replies.msrc_staff_early_access_remove = { state: "updated", removed: 2 };
    expect((await handle(request("POST", "", { action: "early-access-remove", entryIds: [requestId, requestId] }))).status).toBe(503);
    replies.msrc_staff_early_access_add = { state: "updated", added: 0, invalid: ["invalid", "invalid"] };
    expect((await handle(request("POST", "", { action: "early-access-add", emails: ["invalid"] }))).status).toBe(503);
  });
  it("keeps form-token and query restrictions for early-access operations", async () => {
    expect((await handle(request("POST", "", { action: "early-access-add", emails: [row.email], formToken: "forged" }))).status).toBe(400);
    for (const query of ["?area=early-access&status=all", "?area=early-access&requestId=" + requestId, "?area=early-access&q=%00", "?area=early-access&q=a&query=b"]) {
      expect((await handle(request("GET", query))).status).toBe(400);
    }
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_early_access"))).toBe(false);
  });
  it("validates bounded email and UUID arrays with action-specific fields", () => {
    const add = { action: "early-access-add", formToken: "synthetic", emails: [row.email] };
    const remove = { action: "early-access-remove", formToken: "synthetic", entryIds: [requestId] };
    for (const emails of [undefined, [], Array(501).fill(row.email), [null], [123], row.email, ["a".repeat(513)], ["person\u0000@example.invalid"]]) expect(validateStaffPayload({ ...add, emails })).toBeNull();
    for (const entryIds of [undefined, [], Array(501).fill(requestId), [null], [123], ["invalid"], requestId]) expect(validateStaffPayload({ ...remove, entryIds })).toBeNull();
    expect(validateStaffPayload({ ...add, entryIds: [requestId] })).toBeNull();
    expect(validateStaffPayload({ ...remove, emails: [row.email] })).toBeNull();
    expect(validateStaffPayload({ action: "activity", formToken: "synthetic", emails: [row.email] })).toBeNull();
    expect(validateStaffPayload({ ...add, session_claims: claims })).toBeNull();
  });
  it("preserves Unicode inputs and database invalid decisions without applying browser locale assumptions", async () => {
    const emails = ["مشارك@example.invalid", "\u00a0person@example.invalid", "İ@example.invalid", "\u0001person@example.invalid"];
    replies.msrc_staff_early_access_add = { state: "updated", added: 2, invalid: [emails[1], emails[3]] };
    const response = await handle(request("POST", "", { action: "early-access-add", emails }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", added: 2, invalid: [emails[1], emails[3]] });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_early_access_add", { edition_key: config.editionKey, emails }, accessToken);
  });
  it("admits 500 maximum-length addresses and 500 IDs through the JSON body boundary", async () => {
    const email = "x".repeat(238) + "@example.invalid";
    expect(email).toHaveLength(254);
    expect((await handle(request("POST", "", { action: "early-access-add", emails: Array(500).fill(email) }))).status).toBe(200);
    expect((await handle(request("POST", "", { action: "early-access-remove", entryIds: Array(500).fill(requestId) }))).status).toBe(200);
  });
  it("retains legacy body limits and enforces both declared and streamed bulk ceilings", async () => {
    const raw = (body: string, declared?: string) => new Request(origin, { method: "POST", headers: { "Content-Type": "application/json", ...(declared ? { "Content-Length": declared } : {}) }, body });
    await expect(readStaffJson(raw(JSON.stringify({ action: "activity", unused: "x".repeat(8192) })))).rejects.toThrow("Invalid input");
    await expect(readStaffJson(raw(JSON.stringify({ action: "activity" }), "8193"))).rejects.toThrow("Invalid input");
    await expect(readStaffJson(raw(JSON.stringify({ action: "early-access-add", emails: [] }), String(768 * 1024 + 1)))).rejects.toThrow("Invalid input");
    await expect(readStaffJson(raw(JSON.stringify({ action: "early-access-add", emails: ["x".repeat(768 * 1024)] })))).rejects.toThrow("Invalid input");
    await expect(readStaffJson(raw(JSON.stringify({ action: "early-access-remove", entryIds: ["x".repeat(24 * 1024)] })))).rejects.toThrow("Invalid input");
  });
});

describe("staff queue payload validation", () => {
  it.each(["registration-approve", "registration-waitlist", "registration-offer"])("validates bounded UUID batches for %s", (action) => {
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
    if (action === "registration-approve") {
      expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_approve_tickets", {
        edition_key: config.editionKey, request_ids: [requestId], session_claims: claims, ticket_secret: "d".repeat(64),
      });
    } else expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_" + action.replaceAll("-", "_"), { edition_key: config.editionKey, request_ids: [requestId] }, accessToken);
  });
  it.each(["capacity_not_set", "payment_configuration_required"])("exposes clear safe configuration state %s", async (state) => {
    replies.msrc_staff_registration_approve_tickets = { state };
    const response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(409); expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it.each(ROLES.filter((role) => !["superAdmin", "registrationWorkshopAdministrator"].includes(role)))("denies queue read and mutations to %s before domain RPC", async (role) => {
    roles = [role];
    expect((await handle(request("GET", "?area=registration"))).status).toBe(403);
    for (const action of ["registration-approve", "registration-waitlist", "registration-offer"]) {
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
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_registration_approve_tickets")).toBe(false);
  });
  it("admits 100 UUIDs through the real JSON body boundary", async () => {
    const requestIds = Array.from({ length: 100 }, (_, i) => `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
    replies.msrc_staff_registration_approve_tickets = { state: "updated", registration, decided: { approved: 0, waitlisted: 0, skipped: 100 } };
    expect((await handle(request("POST", "", { action: "registration-approve", requestIds }))).status).toBe(200);
  });
  it("returns nullable capacity without inventing a configured value", async () => {
    const unconfigured = { requests: [], counts: { pending: 0, approved: 0, waitlisted: 0, offered: 0, expired: 0, capacity: null, remaining: null } };
    replies.msrc_staff_registration = { state: "ready", registration: unconfigured };
    const response = await handle(request("GET", "?area=registration"));
    expect(response.status).toBe(200); expect((await response.json()).registration).toEqual(unconfigured);
  });
  it("honors database denial after server role approval", async () => {
    replies.msrc_staff_registration_approve_tickets = { state: "denied" };
    const response = await handle(request("POST", "", { action: "registration-approve", requestIds: [requestId] }));
    expect(response.status).toBe(403); expect((await response.json()).decided).toBeUndefined();
  });
  it.each([{ approved: 2, waitlisted: 0, skipped: 0 }, { approved: 0, waitlisted: 1, skipped: 0 },
    { approved: 1, waitlisted: 0, skipped: -1 }])("rejects impossible decision counts %#", async (decided) => {
    replies.msrc_staff_registration_approve_tickets = { state: "updated", registration, decided };
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

describe("closed staff request details, offers and masked export", () => {
  const historyRow: StaffRegistrationHistoryRow = { id: requestId, event: "request.waitlisted", actorKind: "staff", from: "pending_approval", to: "waitlisted", at: row.createdAt, performerName: "Synthetic Staff" };
  it("projects every participant, staff and automatic event without identity or ticket credentials", async () => {
    const events: Pick<StaffRegistrationHistoryRow, "event" | "actorKind" | "from" | "to">[] = [
      { event: "request.submitted", actorKind: "participant", from: null, to: null },
      { event: "request.approved", actorKind: "staff", from: "pending_approval", to: "approved" },
      { event: "request.waitlisted", actorKind: "staff", from: "pending_approval", to: "waitlisted" },
      { event: "request.offered", actorKind: "staff", from: "waitlisted", to: "offered" },
      { event: "request.offered", actorKind: "automatic", from: "waitlisted", to: "offered" },
      { event: "request.offer_expired", actorKind: "automatic", from: "offered", to: "expired" },
      { event: "request.offer_accepted", actorKind: "participant", from: "offered", to: "approved" },
      { event: "request.offer_declined", actorKind: "participant", from: "offered", to: "cancelled" },
      { event: "request.cancelled", actorKind: "participant", from: "approved", to: "cancelled" },
      { event: "ticket.issued", actorKind: "automatic", from: null, to: null },
      { event: "ticket.revoked", actorKind: "automatic", from: null, to: null },
    ];
    const history = events.map((entry, index) => ({ ...historyRow, ...entry,
      id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      at: new Date(now - index * 1000).toISOString(), performerName: entry.actorKind === "staff" ? "Synthetic Staff" : null }));
    replies.msrc_staff_registration_detail = { state: "ready", historyVersion: 1, detail: { request: row, history } };
    const response = await handle(request("GET", "?area=registration-detail&requestId=" + requestId));
    expect(response.status).toBe(200);
    expect((await response.json()).registrationDetail.history).toEqual(history);
  });
  it.each([{ history: [] }, { history: [{ id: requestId, from: "pending_approval", to: "waitlisted", at: row.createdAt, performerName: "Synthetic Staff" }] }])("keeps the session when an older RPC lacks complete history version %#", async ({ history }) => {
    replies.msrc_staff_registration_detail = { state: "ready", detail: { request: row, history } };
    const response = await handle(request("GET", "?area=registration-detail&requestId=" + requestId));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie") ?? "").not.toContain("Max-Age=0");
    expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each([0, 2, "1", null])("rejects unexpected history version %s", async (historyVersion) => {
    replies.msrc_staff_registration_detail = { state: "ready", historyVersion, detail: { request: row, history: [] } };
    expect((await handle(request("GET", "?area=registration-detail&requestId=" + requestId))).status).toBe(503);
  });
  it.each(["superAdmin", "registrationWorkshopAdministrator"] as const)("allows %s to read masked detail and offer a waitlisted seat", async (role) => {
    roles = [role];
    const detailResponse = await handle(request("GET", "?area=registration-detail&requestId=" + requestId));
    expect(detailResponse.status).toBe(200);
    expect((await detailResponse.json()).registrationDetail).toEqual((replies.msrc_staff_registration_detail as { detail: unknown }).detail);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_detail", { edition_key: config.editionKey, request_id: requestId }, accessToken);
    const offerResponse = await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId] }));
    expect(offerResponse.status).toBe(200);
    expect(await offerResponse.json()).toMatchObject({ state: "updated", registration, decided: { approved: 0, waitlisted: 0, offered: 1, skipped: 0 } });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_offer", { edition_key: config.editionKey, request_ids: [requestId] }, accessToken);
  });
  it.each(ROLES.filter((role) => !["superAdmin", "registrationWorkshopAdministrator"].includes(role)))("denies detail to %s before domain RPC", async (role) => {
    roles = [role];
    expect((await handle(request("GET", "?area=registration-detail&requestId=" + requestId))).status).toBe(403);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_detail", expect.anything(), expect.anything());
  });
  it.each(["?area=registration-detail", "?area=registration-detail&requestId=bad", "?area=registration-detail&requestId=",
    "?area=registration-detail&requestId=" + requestId + "&requestId=" + requestId,
    "?area=registration-detail&requestId=" + requestId + "&q=Synthetic", "?area=registration&requestId=" + requestId,
    "?area=registration-export&query=Synthetic", "?area=registration-export&status=all", "?area=registration-export&requestId=" + requestId,
  ])("rejects malformed detail/export query %s", async (query) => {
    expect((await handle(request("GET", query))).status).toBe(400);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_detail", expect.anything(), expect.anything());
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_export", expect.anything(), expect.anything());
  });
  it.each(["capacity_not_set", "offer_window_not_set"])("maps unavailable offer configuration %s to HTTP 409", async (state) => {
    replies.msrc_staff_registration_offer = { state };
    const response = await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId] }));
    expect(response.status).toBe(409);
    expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it("offers require complete session assurance and a genuine form token", async () => {
    policySatisfied = false;
    expect((await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId] }))).status).toBe(403);
    policySatisfied = true;
    expect((await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId], formToken: "forged" }))).status).toBe(400);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_offer", expect.anything(), expect.anything());
  });
  it.each([{ approved: 0, waitlisted: 0, skipped: 1 }, { approved: 1, waitlisted: 0, offered: 0, skipped: 0 },
    { approved: 0, waitlisted: 0, offered: -1, skipped: 2 }, { approved: 0, waitlisted: 0, offered: 2, skipped: 0 }])("rejects impossible offer decision projection %#", async (decided) => {
    replies.msrc_staff_registration_offer = { state: "updated", registration, decided };
    expect((await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId] }))).status).toBe(503);
  });
  it.each(["registration", "summary", "registration-detail", "registration-export"] as const)("reports missing %s RPC as area-not-ready without exposing a partial read", async (area) => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, ...args) => {
      if (name === "msrc_staff_" + area.replaceAll("-", "_")) throw new StaffRpcMissingError();
      return original(name, ...args);
    });
    const response = await handle(request("GET", "?area=" + area + (area === "registration-detail" ? "&requestId=" + requestId : "")));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(response.headers.get("content-disposition")).toBeNull();
  });
  it("reports missing offer RPC as area-not-ready", async () => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, ...args) => { if (name === "msrc_staff_registration_offer") throw new StaffRpcMissingError(); return original(name, ...args); });
    const response = await handle(request("POST", "", { action: "registration-offer", requestIds: [requestId] }));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
  });
  it("keeps real outages distinct from missing migrations", async () => {
    const original = backend.rpc;
    backend.rpc = vi.fn(async (name, ...args) => { if (name === "msrc_staff_registration_export") throw new Error("Unavailable"); return original(name, ...args); });
    const response = await handle(request("GET", "?area=registration-export"));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("unavailable");
  });
  it("normalizes only the additive fields from older hosted reads", async () => {
    const legacyRow: Record<string, unknown> = { ...row }, legacyCounts: Record<string, unknown> = { ...counts };
    delete legacyRow.offerExpiresAt; delete legacyCounts.offered; delete legacyCounts.expired;
    replies.msrc_staff_registration = { state: "ready", registration: { requests: [legacyRow], counts: legacyCounts } };
    const response = await handle(request("GET", "?area=registration"));
    expect(response.status).toBe(200); expect((await response.json()).registration).toEqual(registration);
  });
  it("returns expiry timestamps and offered/expired summary counts", async () => {
    const withOffers = { ...counts, offered: 1, expired: 4 };
    replies.msrc_staff_registration = { state: "ready", registration: { requests: [{ ...row, status: "offered", offerExpiresAt: row.createdAt }], counts: withOffers } };
    replies.msrc_staff_summary = { state: "ready", summary: { registration: withOffers } };
    expect((await (await handle(request("GET", "?area=registration"))).json()).registration.requests[0].offerExpiresAt).toBe(row.createdAt);
    expect((await (await handle(request("GET", "?area=summary"))).json()).summary.registration).toEqual(withOffers);
  });
  it.each([
    { request: { ...row, identityEnvelope: "forbidden" }, history: [] },
    { request: { ...row, id: targetId }, history: [] },
    { request: { ...row, identityMasked: "1234567890" }, history: [] },
    { request: { ...row, offerExpiresAt: "invalid" }, history: [] },
    { request: row, history: [{ ...historyRow, to: "all" }] },
    { request: row, history: [{ ...historyRow, secret: "forbidden" }] },
    { request: row, history: [{ ...historyRow, event: "identity.revealed" }] },
    { request: row, history: [{ ...historyRow, actorKind: "unknown" }] },
    { request: row, history: [{ ...historyRow, actorKind: "participant", performerName: null }] },
    { request: row, history: [{ ...historyRow, event: "request.cancelled" }] },
    { request: row, history: [{ ...historyRow, event: "request.offer_expired", actorKind: "staff" }] },
    { request: row, history: [{ ...historyRow, event: "ticket.issued", actorKind: "automatic", performerName: null }] },
    { request: row, history: [{ ...historyRow, event: "request.submitted", actorKind: "participant", from: null, to: null }] },
    { request: row, history: [historyRow, historyRow] },
    { request: row, history: [0, 1].map((hours) => ({ ...historyRow, id: hours ? targetId : requestId, at: new Date(now + hours * 3600000).toISOString() })) },
  ])("rejects invalid/sensitive detail or incorrectly ordered history %#", async (detail) => {
    replies.msrc_staff_registration_detail = { state: "ready", historyVersion: 1, detail };
    const response = await handle(request("GET", "?area=registration-detail&requestId=" + requestId));
    expect(response.status).toBe(503); expect((await response.json()).registrationDetail).toBeUndefined();
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies masked export to %s before invoking its audited RPC", async (role) => {
    roles = [role]; const response = await handle(request("GET", "?area=registration-export"));
    expect(response.status).toBe(403); expect((await response.json()).state).toBe("denied");
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_registration_export", expect.anything(), expect.anything());
  });
  it("denies export without complete TOTP session assurance and honors database denial", async () => {
    policySatisfied = false;
    expect((await handle(request("GET", "?area=registration-export"))).status).toBe(403);
    policySatisfied = true; replies.msrc_staff_registration_export = { state: "denied" };
    expect((await handle(request("GET", "?area=registration-export"))).status).toBe(403);
  });
  it("exports UTF-8 BOM CSV with Arabic text, exact download headers and no-store", async () => {
    replies.msrc_staff_registration_export = { state: "ready", rows: [{ name: 'اسم, "اختبار"', email: row.email, status: "waitlisted",
      priority: false, createdAt: row.createdAt, decidedAt: null, identityMasked: row.identityMasked }] };
    const response = await handle(request("GET", "?area=registration-export&locale=ar"));
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="registration-synthetic-staff-2027.csv"');
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = Buffer.from(await response.arrayBuffer()); expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
    const csv = bytes.toString("utf8");
    expect(csv).toBe('\uFEFF"name","email","status","priority","createdAt","decidedAt","identityMasked"\r\n"اسم, ""اختبار""","person@example.invalid","waitlisted","false","2026-10-17T00:00:00.000Z","","••••••1234"\r\n');
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_export", { edition_key: config.editionKey }, accessToken);
  });
  it.each(["=", "+", "-", "@", "\t", "\r"])("neutralizes CSV cells beginning with %j", async (prefix) => {
    replies.msrc_staff_registration_export = { state: "ready", rows: [{ name: prefix + 'SUM("a",1)\nnext', email: prefix + "email@example.invalid",
      status: row.status, priority: true, createdAt: row.createdAt, decidedAt: null, identityMasked: null }] };
    const response = await handle(request("GET", "?area=registration-export")); expect(response.status).toBe(200);
    const csv = Buffer.from(await response.arrayBuffer()).toString("utf8");
    expect(csv).toContain('"\'' + prefix + 'SUM(""a"",1)\nnext"'); expect(csv).toContain('"\'' + prefix + 'email@example.invalid"');
  });
  it("exports the full result beyond the 50-row queue cap and handles an empty edition", async () => {
    const exportRow = (replies.msrc_staff_registration_export as { rows: unknown[] }).rows[0];
    replies.msrc_staff_registration_export = { state: "ready", rows: Array.from({ length: 101 }, () => exportRow) };
    const response = await handle(request("GET", "?area=registration-export")); expect(response.status).toBe(200);
    expect((await response.text()).match(/person@example.invalid/g)).toHaveLength(101);
    replies.msrc_staff_registration_export = { state: "ready", rows: [] };
    const empty = await handle(request("GET", "?area=registration-export")); expect(empty.status).toBe(200);
    expect((await empty.text()).split("\r\n")).toHaveLength(2);
  });
  it("retains a refreshed native session on the raw CSV response", async () => {
    const expiredAccess = "header." + Buffer.from(JSON.stringify({ ...claims, exp: now / 1000 - 1 })).toString("base64url") + ".signature";
    const input = request("GET", "?area=registration-export");
    input.headers.set("cookie", staffCookie(config, { ...native, accessToken: expiredAccess, origin, deadline: now + 8 * 3600000,
      challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0]);
    const response = await handle(input);
    expect(response.status).toBe(200); expect(backend.refresh).toHaveBeenCalledWith(native.refreshToken);
    expect(response.headers.get("set-cookie")).toBeTruthy();
    const subsequent = request("GET"); subsequent.headers.set("cookie", response.headers.get("set-cookie")!.split(";")[0]);
    expect(readStaffSession(config, subsequent, now)?.accessToken).toBe(accessToken);
  });
  it.each([{ identityMasked: "1234567890" }, { identityEnvelope: { ciphertext: "secret" } }, { name: "bad\u0000value" }, { priority: "true" }])("fails closed on invalid export rows without partial CSV %#", async (invalid) => {
    const exportRow = (replies.msrc_staff_registration_export as { rows: Record<string, unknown>[] }).rows[0];
    replies.msrc_staff_registration_export = { state: "ready", rows: [exportRow, { ...exportRow, ...invalid }] };
    const response = await handle(request("GET", "?area=registration-export"));
    expect(response.status).toBe(503); expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.json()).toMatchObject({ state: "unavailable" });
  });
  it("accepts the export audit row count but rejects arbitrary audit details", async () => {
    const audit = { id: requestId, actorId, targetId: null, action: "registration.exported", result: "allowed", occurredAt: row.createdAt,
      details: { source: "registration", rowCount: 7 } };
    replies.msrc_staff_audit = { rows: [audit] };
    expect((await handle(request("GET", "?area=audit"))).status).toBe(200);
    replies.msrc_staff_audit = { rows: [{ ...audit, details: { ...audit.details, rowCount: -1 } }] };
    expect((await handle(request("GET", "?area=audit"))).status).toBe(503);
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
