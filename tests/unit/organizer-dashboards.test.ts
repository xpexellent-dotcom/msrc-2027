import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createOrganizerHandler } from "@/features/staff-portal/organizer-handler.server";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { dashboardProjection, organizerExport } from "@/features/staff-portal/organizer-projection.server";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-25T08:00:00Z");
const actorId = "79000000-0000-4000-8000-000000000001", sessionId = "79000000-0000-4000-8000-000000000002";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const accessToken = "header." + Buffer.from(JSON.stringify({ sub: actorId, session_id: sessionId, exp: now / 1000 + 3600 })).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
const cell = (value: string, count: number | null) => ({ module: "registrations", dimension: "state", value, count });
function persisted() { const admin = roles.includes("superAdmin"); return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: admin ? "super_admin" : "staff", sessionPolicySatisfied: policySatisfied, reason: policySatisfied ? null : admin ? "mfa_required" : "staff_email_check_required", mfaValid: admin && policySatisfied, passwordValid: true, staffEmailValid: !admin && policySatisfied, emailVerified: true, timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false }; }
type RequestOptions = { cookie?: boolean; headers?: Record<string, string>; query?: string; method?: string; token?: string };
function request(body: Record<string, unknown>, options: RequestOptions = {}) {
  return new Request(origin + "/api/staff-portal/organizer" + (options.query ?? ""), { method: options.method ?? "POST", headers: { host: "127.0.0.1:3219", origin, "Content-Type": "application/json",
    ...(options.cookie === false ? {} : { cookie: staffCookie(config, { ...native, accessToken: options.token ?? accessToken, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] }), ...options.headers },
    ...(options.method === "GET" ? {} : { body: JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) }) });
}
const handle = (input: Request) => createOrganizerHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
beforeEach(() => {
  roles = ["superAdmin"]; policySatisfied = true;
  replies = {
    msrc_staff_dashboard: { state: "ready", dashboard: { cells: [cell("pending_approval", 2), cell("approved", 8)], modules: ["registrations"], suppressionThreshold: 5 } },
    msrc_staff_dashboard_find: { state: "ready", matches: [{ actorId, name: "Synthetic", email: "synthetic@example.invalid", records: [{ module: "registrations", reference: actorId, status: "pending_approval" }] }] },
    msrc_staff_dashboard_export: { state: "ready", columns: ["module", "dimension", "value", "count"], rows: [["registrations", "state", "approved", 10]] },
    msrc_staff_dashboard_audit: { state: "ready", events: [{ id: "reporting:1", module: "reporting", actorId, targetId: null, action: "export.generated", result: "completed", at: new Date(now).toISOString(), details: { rowCount: 10, filters: { module: "registrations" } } }], hasMore: false },
  };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles, session: persisted() };
    const result = replies[name]; if (result instanceof Error) throw result; return result ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native) } as unknown as StaffBackend;
});

describe("ADM organizer server boundary", () => {
  it("closes before reading credentials or constructing a backend", async () => {
    const factory = vi.fn(); const response = await createOrganizerHandler({ readiness: () => ({ state: "closed" }), backend: factory })(request({ action: "find", query: "secret@example.invalid" }));
    expect(response.status).toBe(503); expect(factory).not.toHaveBeenCalled(); expect(await response.text()).not.toContain("secret");
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s personal exports, audit and cross-module lookup before their RPC", async (role) => {
    roles = [role];
    for (const body of [{ action: "find", query: "synthetic@example.invalid" }, { action: "audit" }, { action: "export", module: "registrations", kind: "personal" }]) expect((await handle(request(body))).status).toBe(403);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_dashboard_find", expect.anything(), expect.anything());
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_dashboard_export", expect.anything(), expect.anything());
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_dashboard_audit", expect.anything(), expect.anything());
  });
  it("requires both native identity and exact-session assurance", async () => {
    policySatisfied = false; expect((await handle(request({ action: "dashboard" }))).status).toBe(403);
    policySatisfied = true; vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(request({ action: "dashboard" }))).status).toBe(403);
    expect((await handle(request({ action: "dashboard" }, { cookie: false }))).status).toBe(403);
  });
  it.each<RequestOptions>([{ headers: { origin: "https://foreign.invalid" } }, { headers: { "sec-fetch-site": "cross-site" } }, { query: "?query=secret@example.invalid" }, { method: "GET" }])("refuses cross-origin and URL/body bypasses %j", async (options) => {
    expect((await handle(request({ action: "dashboard" }, options))).status).toBeGreaterThanOrEqual(400);
  });
  it("requires a fresh form token and durable request admission", async () => {
    expect((await handle(request({ action: "dashboard", formToken: "bad" }))).status).toBe(400);
    const previous = backend.rpc; backend.rpc = vi.fn(async (name, ...args) => name === "msrc_staff_form_claim" ? { state: "limited" } : previous(name, ...args));
    expect((await handle(request({ action: "export" }))).status).toBe(429);
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_dashboard_export", expect.anything(), expect.anything());
  });
  it("shows small cells only for Super Admin and suppresses the whole non-admin partition", async () => {
    let body = await (await handle(request({ action: "dashboard" }))).json(); expect(body.dashboard.cells.map((item: { count: number }) => item.count)).toEqual([2, 8]);
    roles = ["registrationWorkshopAdministrator"]; body = await (await handle(request({ action: "dashboard" }))).json(); expect(body.dashboard.cells.map((item: { count: null }) => item.count)).toEqual([null, null]);
  });
  it("applies role projection even when a provider over-returns dashboard modules", async () => {
    roles = ["finance"]; const response = await handle(request({ action: "dashboard" })); expect((await response.json()).dashboard).toMatchObject({ cells: [], modules: [] });
  });
  it("keeps exact lookup in a POST RPC argument and rejects wildcards/unknown fields", async () => {
    expect((await handle(request({ action: "find", query: "synthetic@example.invalid" }))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_dashboard_find", { edition_key: config.editionKey, query: "synthetic@example.invalid" }, accessToken);
    for (const body of [{ action: "find", query: "%" }, { action: "find", query: "synthetic@example.invalid", includeManuscript: true }]) expect((await handle(request(body))).status).toBe(400);
  });
  it("never returns unexpected participant fields", async () => {
    (replies.msrc_staff_dashboard_find as { matches: Record<string, unknown>[] }).matches[0].manuscript = "PRIVATE MANUSCRIPT";
    const response = await handle(request({ action: "find", query: actorId })); expect(response.status).toBe(503); expect(await response.text()).not.toContain("MANUSCRIPT");
  });
  it("downloads a no-store CSV with BOM, safe filename and fresh form token", async () => {
    const response = await handle(request({ action: "export", module: "registrations", kind: "aggregate" }));
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="msrc-registrations-aggregate.csv"');
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("x-msrc-form-token")).toBeTruthy();
    expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 3)]).toEqual([239, 187, 191]);
  });
  it("forbids arbitrary export columns and modules and rejects unscoped operations", async () => {
    for (const input of [{ module: "../secrets" }, { kind: "operational" }, { module: "accounts", kind: "personal", columns: ["password"] }]) expect((await handle(request({ action: "export", ...input }))).status).toBe(400);
    roles = ["finance"]; expect((await handle(request({ action: "export", module: "registrations", kind: "operational" }))).status).toBe(403);
    roles = ["superAdmin"]; replies.msrc_staff_dashboard_export = { state: "ready", columns: ["password"], rows: [["PRIVATE"]] };
    const response = await handle(request({ action: "export" })); expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE");
  });
  it("allows minimal operational exports to registrars and identity exports only to Super Admins", async () => {
    roles = ["registrationWorkshopAdministrator"];
    replies.msrc_staff_dashboard_export = { state: "ready", columns: ["module", "reference", "status"], rows: [["registrations", actorId, "confirmed"]] };
    let response = await handle(request({ action: "export", module: "registrations", kind: "operational", status: "confirmed" }));
    expect(response.status).toBe(200); expect(await response.text()).not.toContain("email");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_dashboard_export", { edition_key: config.editionKey, module_filter: "registrations", export_kind: "operational", status_filter: "confirmed" }, accessToken);
    roles = ["superAdmin"];
    replies.msrc_staff_dashboard_export = { state: "ready", columns: ["module", "reference", "status", "actorId", "name", "email"], rows: [["registrations", actorId, "confirmed", actorId, "=PRIVATE_FORMULA()", "synthetic@example.invalid"]] };
    response = await handle(request({ action: "export", module: "registrations", kind: "personal" }));
    expect(response.status).toBe(200); expect(await response.text()).toContain('"\'=PRIVATE_FORMULA()"');
  });
  it("refuses a provider's export outside the requested module", async () => {
    replies.msrc_staff_dashboard_export = { state: "ready", columns: ["module", "reference", "status"], rows: [["accounts", actorId, "verified"]] };
    const response = await handle(request({ action: "export", module: "registrations", kind: "operational" }));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain(actorId);
  });
  it("binds audit filters and inclusive Riyadh calendar dates to the RPC", async () => {
    expect((await handle(request({ action: "audit", module: "reporting", actor: actorId, event: "export.generated", from: "2026-10-24", to: "2026-10-25", offset: 50 }))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_dashboard_audit", { edition_key: config.editionKey, module_filter: "reporting", actor_filter: actorId, action_filter: "export.generated", from_at: "2026-10-23T21:00:00.000Z", to_at: "2026-10-25T21:00:00.000Z", offset_rows: 50 }, accessToken);
  });
  it.each([{ from: "2026-02-30" }, { to: "garbage" }, { from: "2026-10-26", to: "2026-10-25" }, { offset: -1 }, { offset: 10001 }, { actor: "not-a-uuid" }, { event: "export%" }, { event: "x".repeat(101) }, { module: "orders" }])("rejects invalid audit filters %j", async (filters) => {
    expect((await handle(request({ action: "audit", ...filters }))).status).toBe(400);
  });
  it("maps absent migrations to area-not-ready and redacts all provider failures", async () => {
    replies.msrc_staff_dashboard = new StaffRpcMissingError(); let response = await handle(request({ action: "dashboard" })); expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
    replies.msrc_staff_dashboard = new Error("password=PRIVATE code=123456 manuscript=PRIVATE"); response = await handle(request({ action: "dashboard" })); expect((await response.json()).state).toBe("unavailable");
  });
  it("persists rotated native sessions even if a later RPC is missing", async () => {
    replies.msrc_staff_dashboard = new StaffRpcMissingError(); const response = await handle(request({ action: "dashboard" }, { token: "expired.token.signature" }));
    expect(response.status).toBe(503); expect(backend.refresh).toHaveBeenCalled(); expect(response.headers.get("set-cookie")).toContain("msrc-staff-test=");
  });
  it("redacts backend construction failures and readiness closure after admission", async () => {
    let response = await createOrganizerHandler({ readiness: () => ({ state: "ready", config }), backend: () => { throw new Error("PRIVATE CONFIG"); }, now: () => now })(request({ action: "dashboard" }));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE");
    const readiness = vi.fn().mockReturnValueOnce({ state: "ready", config }).mockReturnValue({ state: "closed" });
    response = await createOrganizerHandler({ readiness, backend: () => backend, now: () => now })(request({ action: "export" }));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("closed");
    expect(backend.rpc).not.toHaveBeenCalledWith("msrc_staff_dashboard_export", expect.anything(), expect.anything());
  });
});

describe("ADM defense in depth for aggregates and exports", () => {
  it("suppresses zero partitions and retains independent large partitions", () => {
    const dashboard = dashboardProjection({ modules: ["registrations"], suppressionThreshold: 5, cells: [cell("pending", 0), cell("approved", 12), { module: "registrations", dimension: "other", value: "confirmed", count: 9 }] }, ["registrationWorkshopAdministrator"]);
    expect(dashboard?.cells.map((item) => item.count)).toEqual([null, null, 9]);
  });
  it("preserves the same suppression policy in statistics CSV", () => {
    const data = { columns: ["module", "dimension", "value", "count"], rows: [["registrations", "state", "pending", 1], ["registrations", "state", "approved", 8]] };
    const csv = organizerExport(data, "aggregate", ["registrationWorkshopAdministrator"]); expect(csv).toContain('"pending",""'); expect(csv).toContain('"approved",""');
    expect(organizerExport(data, "aggregate", ["superAdmin"])).toContain('"approved","8"');
  });
  it("rejects negative or duplicate aggregate cells", () => {
    for (const cells of [[cell("pending", -1)], [cell("pending", 6), cell("pending", 6)]]) expect(dashboardProjection({ modules: ["registrations"], cells, suppressionThreshold: 5 }, ["superAdmin"])).toBeNull();
  });
  it("independently denies personal projections to all non-Super-Admin roles", () => {
    const data = { columns: ["module", "reference", "status", "actorId", "name", "email"], rows: [] };
    for (const role of ROLES.filter((role) => role !== "superAdmin")) expect(organizerExport(data, "personal", [role])).toBeNull();
    expect(organizerExport(data, "unexpected", ["superAdmin"])).toBeNull();
  });
});
