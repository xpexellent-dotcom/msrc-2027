import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { createStaffBackend, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { launchReadinessProjection } from "@/features/staff-portal/launch-readiness-contract.server";
import { staffMenu } from "@/features/staff-portal/menu";
import type { StaffRegistrationSettingsView } from "@/features/staff-portal/ui-contract";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-22T00:00:00Z");
const actorId = "34000000-0000-4000-8000-000000000001", sessionId = "34000000-0000-4000-8000-000000000002";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const settings: StaffRegistrationSettingsView = { settings: null, settingsComplete: false, participantAccountsReady: false, history: [] };
const aggregate = () => ({ state: "ready", participantAccountsEnabled: false, participantPolicyComplete: true, participantEmailDailyLimit: 40,
  retentionEnabled: false, outboxDeliveryEnabled: false, outboxSweepsEnabled: false, outboxDailyCap: 0, registrationSettingsComplete: false,
  registrationEnabled: false, conferenceDaysSet: false, conferenceDayCount: 0, earlyAccessCount: 3,
  secondSuperAdminWithAuthenticator: true, superAdminsWithAuthenticatorCount: 2, healthReady: true, lastOutboxDrainObservable: false,
  staffCounts: Object.fromEntries(ROLES.filter((role) => role !== "participant").map((role) => [role, role === "superAdmin" ? 2 : 0])),
  requiredRpcs: { participantAccounts: true, registration: true, registrationSettings: true, earlyAccess: true, tickets: true, checkIn: true, outbox: true, health: true } });
const environment = { REGISTRATION_TICKET_SECRET: "a".repeat(64), OUTBOX_MONITOR_SECRET: "synthetic_monitor_secret".repeat(3), PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: policySatisfied,
    reason: policySatisfied ? null : superAdmin ? "mfa_required" : "staff_email_check_required", mfaValid: superAdmin && policySatisfied,
    passwordValid: true, staffEmailValid: !superAdmin && policySatisfied, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(),
      idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function request(signedIn = true, query = "?area=launch-readiness") {
  return new Request(origin + "/api/staff-portal" + query, { headers: { host: "127.0.0.1:3219", ...(signedIn ? { cookie: staffCookie(config,
    { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}) } });
}
const handle = (input = request()) => createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, environment: () => environment })(input);
beforeEach(() => {
  roles = ["superAdmin"]; policySatisfied = true;
  replies = { msrc_staff_launch_readiness: aggregate(), msrc_staff_registration_settings: { state: "ready", ...settings } };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles, session: persisted() };
    return replies[name] ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});
afterEach(() => vi.unstubAllGlobals());

describe("Super Admin launch readiness handler", () => {
  it("reads both exact-session RPCs and projects only configuration booleans, entered settings and aggregate counts", async () => {
    const response = await handle(), body = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({ state: "authenticated", launchReadiness: { registrationEnabled: false, earlyAccessCount: 3, settings: null } });
    for (const rpc of ["msrc_staff_launch_readiness", "msrc_staff_registration_settings"]) expect(backend.rpc).toHaveBeenCalledWith(rpc, { edition_key: config.editionKey }, accessToken);
    for (const secret of [environment.REGISTRATION_TICKET_SECRET, environment.OUTBOX_MONITOR_SECRET]) expect(JSON.stringify(body)).not.toContain(secret);
    expect(body.launchReadiness.environment.every((entry: Record<string, unknown>) => Object.entries(entry).every(([key, value]) => ["name", "status"].includes(key) ? typeof value === "string" : typeof value === "boolean"))).toBe(true);
    expect(body.launchReadiness.checks).toEqual(expect.arrayContaining([{ key: "latestDrain", status: "amber" }, { key: "retention", status: "red" }, { key: "secondSuperAdmin", status: "green" }]));
    expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s before any readiness data or env access", async (role) => {
    roles = [role]; const env = vi.fn(() => environment);
    const response = await createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, environment: env })(request());
    expect(response.status).toBe(403); expect(env).not.toHaveBeenCalled();
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => ["msrc_staff_launch_readiness", "msrc_staff_registration_settings"].includes(name))).toBe(false);
    expect(staffMenu([role]).some((entry) => entry.key === "launch-readiness")).toBe(false);
  });
  it("requires anonymous denial, native identity and completed exact-session TOTP", async () => {
    expect((await handle(request(false))).status).toBe(403);
    policySatisfied = false; expect((await handle()).status).toBe(403);
    policySatisfied = true; vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle()).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_launch_readiness")).toBe(false);
  });
  it.each(["msrc_staff_launch_readiness", "msrc_staff_registration_settings"])("preserves the session when %s is absent or unavailable", async (name) => {
    const original = backend.rpc;
    for (const failure of [{ code: "PGRST202", status: 404, state: "area-not-ready" }, { code: "XX000", status: 503, state: "unavailable" }]) {
      vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
        const rpc = input.split("/").at(-1)!;
        return rpc === name ? Response.json({ code: failure.code }, { status: failure.status }) : Response.json(await original(rpc, JSON.parse(String(init.body)), new Headers(init.headers).get("authorization")?.replace(/^Bearer /, "")));
      }));
      backend.rpc = createStaffBackend(config).rpc;
      const response = await handle(); expect(response.status).toBe(503); expect((await response.json()).state).toBe(failure.state);
      expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
    }
  });
  it("preserves the session on malformed data and database denial", async () => {
    for (const [result, status] of [[{ ...aggregate(), secret: "must not leave the server" }, 503], [{ state: "denied" }, 403]] as const) {
      replies.msrc_staff_launch_readiness = result; const response = await handle();
      expect(response.status).toBe(status); expect(response.headers.get("set-cookie")).toBeNull(); expect(await response.text()).not.toContain("must not leave");
    }
    expect(backend.logout).not.toHaveBeenCalled();
  });
  it("rejects search parameters and has no activation mutation", async () => {
    expect((await handle(request(true, "?area=launch-readiness&q=person"))).status).toBe(400);
    const read = request();
    const response = await handle(new Request(origin + "/api/staff-portal", { method: "POST", headers: { ...Object.fromEntries(read.headers), origin, "content-type": "application/json" },
      body: JSON.stringify({ action: "launch-readiness-enable", formToken: staffFormToken(config, origin, now) }) }));
    expect(response.status).toBe(400); expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_launch_readiness")).toBe(false);
  });
});

describe("bounded readiness projection", () => {
  it.each([null, {}, { ...aggregate(), outboxDailyCap: -1 }, { ...aggregate(), earlyAccessCount: 0.5 }, { ...aggregate(), healthReady: "true" },
    { ...aggregate(), staffCounts: { superAdmin: 2 } }, { ...aggregate(), staffCounts: { ...aggregate().staffCounts, email: "private@example.invalid" } },
    { ...aggregate(), requiredRpcs: {} }, { ...aggregate(), lastOutboxDrainObservable: true }, { ...aggregate(), registrationEnabled: true },
    { ...aggregate(), superAdminsWithAuthenticatorCount: 1 }])("rejects a malformed or inconsistent aggregate %#", (input) => {
    expect(launchReadinessProjection(input, settings, environment)).toBeNull();
  });
  it("shows absent required capabilities and insufficient staffing without falsely claiming a migration ledger audit", () => {
    const input = aggregate(); input.requiredRpcs.checkIn = false; input.staffCounts.registrationWorkshopAdministrator = 1;
    const result = launchReadinessProjection(input, settings, environment)!;
    expect(result.checks).toEqual(expect.arrayContaining([{ key: "migrations", status: "red" }, { key: "approvers", status: "amber" }, { key: "checkInStaff", status: "red" }]));
    expect(result.requiredRpcs.checkIn).toBe(false);
  });
  it("keeps a single configured conference day red and refuses a conflicting settings snapshot", () => {
    const input = { ...aggregate(), conferenceDaysSet: true, conferenceDayCount: 1 };
    const oneDay: StaffRegistrationSettingsView = { ...settings, settings: { enabled: false, terms_version: null, payment_required: null,
      general_capacity: null, default_workshop_capacity: null, early_access_start_at: null, early_access_end_at: null, priority_start_at: null,
      priority_end_at: null, general_opening_at: null, closing_at: null, offer_window_hours: null, places_remaining_threshold: null, minimum_age: null,
      waitlist_offer_hours: null, confirm_seat_lead_days: null, confirm_seat_response_hours: null, payment_window_hours: null, conference_days: ["2028-03-11"] } };
    expect(launchReadinessProjection(input, oneDay, environment)?.checks).toContainEqual({ key: "conferenceDays", status: "red" });
    expect(launchReadinessProjection(input, settings, environment)).toBeNull();
  });
  it("requires the participant runtime and database email budgets to match", () => {
    expect(launchReadinessProjection(aggregate(), settings, { ...environment, PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "41" })?.checks).toContainEqual({ key: "participantPolicy", status: "red" });
  });
});
