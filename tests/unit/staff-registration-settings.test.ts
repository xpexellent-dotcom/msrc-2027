import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createStaffHandler } from "@/features/staff-portal/handler.server";
import { createStaffBackend, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { validateStaffPayload } from "@/features/staff-portal/validation.server";
import { registrationSettingsProjection } from "@/features/staff-portal/registration-settings-contract.server";
import { registrationSettingsChanges, registrationSettingsComplete, riyadhLocalToTimestamp, timestampToRiyadhLocal } from "@/features/staff-portal/registration-settings-validation";
import type { StaffRegistrationSettings, StaffRegistrationSettingsChanges } from "@/features/staff-portal/ui-contract";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-20T00:00:00Z");
const actorId = "33000000-0000-4000-8000-000000000001", sessionId = "33000000-0000-4000-8000-000000000002";
const otherId = "33000000-0000-4000-8000-000000000003", operationId = "33000000-0000-4000-8000-000000000004";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
// Every value is a local synthetic fixture, never an organizer setting or seed.
const settings: StaffRegistrationSettings = { enabled: false, terms_version: "synthetic-terms", payment_required: false, general_capacity: 3,
  conference_days: null,
  default_workshop_capacity: null, early_access_start_at: "2027-01-01T17:00:00Z", early_access_end_at: "2027-01-02T17:00:00Z",
  priority_start_at: "2027-01-01T17:00:00Z", priority_end_at: "2027-01-02T17:00:00Z", general_opening_at: "2027-01-02T17:00:00Z",
  closing_at: "2027-01-03T17:00:00Z", offer_window_hours: null, places_remaining_threshold: 0, minimum_age: 18,
  waitlist_offer_hours: 1, confirm_seat_lead_days: 0, confirm_seat_response_hours: 1, payment_window_hours: null };
const history = { id: otherId, operationId, performerId: actorId, performerName: "Synthetic Staff", at: new Date(now).toISOString(),
  changes: { general_capacity: { before: null, after: 3 }, enabled: { before: null, after: false } } };
const saved = () => ({ state: "updated", operationId, settings: { ...settings, edition_key: config.editionKey, updated_at: new Date(now).toISOString() },
  settingsComplete: true, participantAccountsReady: false, history: [history] });
const read = () => { const { operationId: _operation, ...result } = saved(); void _operation; return { ...result, state: "ready" }; };
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
const post = (changes: unknown = { general_capacity: 3 }, extra: Record<string, unknown> = {}) => request("POST", "", { action: "registration-settings-save", changes, operationId, ...extra });
function handle(input: Request) { return createStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input); }
beforeEach(() => {
  roles = ["superAdmin"]; policySatisfied = true;
  replies = { msrc_staff_registration_settings: read(), msrc_staff_registration_settings_save: saved() };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles, session: persisted() };
    return replies[name] ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});
afterEach(() => vi.unstubAllGlobals());

describe("closed Super Admin registration settings", () => {
  it("reads settings and history through a native authorized session, stripping database metadata", async () => {
    const response = await handle(request("GET", "?area=registration-settings&q="));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "authenticated", registrationSettings: { settings, settingsComplete: true, participantAccountsReady: false, history: [history] } });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_settings", { edition_key: config.editionKey }, accessToken);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("preserves an empty settings row and closed readiness without introducing defaults", async () => {
    replies.msrc_staff_registration_settings = { state: "ready", settings: null, settingsComplete: false, participantAccountsReady: false, history: [] };
    expect(await (await handle(request("GET", "?area=registration-settings"))).json()).toMatchObject({ registrationSettings: { settings: null, settingsComplete: false, history: [] } });
  });
  it("keeps staff signed in when the installed settings projection predates conference days", async () => {
    const oldSettings = Object.fromEntries(Object.entries(settings).filter(([field]) => field !== "conference_days"));
    replies.msrc_staff_registration_settings = { ...read(), settings: oldSettings };
    const response = await handle(request("GET", "?area=registration-settings"));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
    expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("sends only the requested settings changes and operation identifier under the user's bearer", async () => {
    const response = await handle(post());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", operationId, registrationSettings: { settings, history: [history] } });
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_registration_settings_save", { edition_key: config.editionKey, changes: { general_capacity: 3 }, operation_id: operationId }, accessToken);
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s reads and saves before the settings RPC", async (role) => {
    roles = [role];
    expect((await handle(request("GET", "?area=registration-settings"))).status).toBe(403);
    expect((await handle(post())).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_registration_settings"))).toBe(false);
  });
  it("requires the exact session's completed TOTP and verified native identity", async () => {
    policySatisfied = false;
    expect((await handle(request("GET", "?area=registration-settings"))).status).toBe(403);
    expect((await handle(post())).status).toBe(403);
    policySatisfied = true; vi.mocked(backend.identity).mockResolvedValue(otherId);
    expect((await handle(post())).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_registration_settings"))).toBe(false);
  });
  it("denies anonymous reads and saves", async () => {
    expect((await handle(request("GET", "?area=registration-settings", undefined, false))).status).toBe(403);
    expect((await handle(request("POST", "", { action: "registration-settings-save", changes: { general_capacity: 3 }, operationId }, false))).status).toBe(403);
  });
  it("refuses enabling registration here without calling the database save", async () => {
    const response = await handle(post({ enabled: true }));
    expect(response.status).toBe(409); expect((await response.json()).state).toBe("enable-not-allowed-here");
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_registration_settings_save")).toBe(false);
  });
  it.each([
    ["denied", "denied", 403], ["invalid", "invalid-input", 400], ["capacity_below_held", "capacity-below-held", 409],
    ["enable_not_allowed_here", "enable-not-allowed-here", 409], ["operation_conflict", "operation-conflict", 409],
  ])("projects database %s refusal", async (databaseState, browserState, status) => {
    replies.msrc_staff_registration_settings_save = { state: databaseState };
    const response = await handle(post());
    expect(response.status).toBe(status); expect((await response.json()).state).toBe(browserState);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it.each(["msrc_staff_registration_settings", "msrc_staff_registration_settings_save"])("keeps the staff session for missing %s and provider failures", async (name) => {
    const original = backend.rpc;
    for (const failure of [
      { status: 404, code: "PGRST202", state: "area-not-ready" },
      { status: 404, code: "PGRST116", state: "unavailable" },
      { status: 503, code: "XX000", state: "unavailable" },
    ]) {
      vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
        const rpc = input.split("/").at(-1)!;
        return rpc === name ? Response.json({ code: failure.code }, { status: failure.status })
          : Response.json(await original(rpc, JSON.parse(String(init.body)), new Headers(init.headers).get("authorization")?.replace(/^Bearer /, "")));
      }));
      backend.rpc = createStaffBackend(config).rpc;
      const response = await handle(name.endsWith("_save") ? post() : request("GET", "?area=registration-settings"));
      expect(response.status).toBe(503); expect((await response.json()).state).toBe(failure.state);
      expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
    }
  });
  it("rejects forged form tokens and unsupported query filters", async () => {
    expect((await handle(post({ general_capacity: 3 }, { formToken: "forged" }))).status).toBe(400);
    for (const query of ["&q=person", "&status=all", "&requestId=" + otherId, "&edition_key=other"]) {
      expect((await handle(request("GET", "?area=registration-settings" + query))).status).toBe(400);
    }
  });
  it("refuses a response bound to another operation or edition", async () => {
    replies.msrc_staff_registration_settings_save = { ...saved(), operationId: otherId };
    expect((await handle(post())).status).toBe(503);
    replies.msrc_staff_registration_settings = { ...read(), settings: { ...settings, edition_key: "another-edition" } };
    expect((await handle(request("GET", "?area=registration-settings"))).status).toBe(503);
  });
});

describe("registration settings validation and projection", () => {
  it.each([
    null, [], {}, { general_capacity: 0 }, { general_capacity: 2.5 }, { general_capacity: "3" }, { general_capacity: 2_147_483_648 },
    { terms_version: "" }, { terms_version: " synthetic " }, { terms_version: "x".repeat(129) }, { terms_version: "x\0" },
    { minimum_age: 17 }, { minimum_age: 19 }, { offer_window_hours: 0 }, { places_remaining_threshold: -1 },
    { waitlist_offer_hours: 0 }, { confirm_seat_lead_days: -1 }, { confirm_seat_response_hours: 0 }, { payment_window_hours: -1 },
    { payment_required: "false" }, { enabled: null }, { default_workshop_capacity: 3 }, { edition_key: "another-edition" },
    { priority_start_at: "2026-11-15T20:00" }, { closing_at: "infinity" }, { closing_at: "2026-02-30T20:00:00+03:00" },
  ])("rejects malformed mutation %#", (changes) => {
    expect(registrationSettingsChanges(changes)).toBeNull();
    expect(validateStaffPayload({ action: "registration-settings-save", formToken: "token", operationId, changes })).toBeNull();
  });
  it("accepts integer bounds, optional nulls, zero lead/threshold and non-ASCII terms within database character limits", () => {
    const changes = { terms_version: "🔒".repeat(128), general_capacity: 2_147_483_647, offer_window_hours: null, places_remaining_threshold: 0, confirm_seat_lead_days: 0, minimum_age: 18 };
    expect(registrationSettingsChanges(changes)).toEqual(changes);
  });
  it.each([{}, { operationId: "bad" }, { operationId, email: "extra@example.invalid" }, { operationId, targetId: otherId }])("rejects missing identity or unrelated action fields %#", (extra) => {
    expect(validateStaffPayload({ action: "registration-settings-save", formToken: "token", changes: { general_capacity: 3 }, ...extra })).toBeNull();
  });
  it("does not attach settings changes or operation IDs to unrelated actions", () => {
    expect(validateStaffPayload({ action: "activity", formToken: "token", operationId })).toBeNull();
    expect(validateStaffPayload({ action: "activity", formToken: "token", changes: { general_capacity: 3 } })).toBeNull();
  });
  it("canonicalizes operation UUIDs before binding PostgreSQL's save receipt", () => {
    const upper = "ABCDEF00-0000-4000-8000-000000000001";
    expect(validateStaffPayload({ action: "registration-settings-save", formToken: "token", operationId: upper, changes: { general_capacity: 3 } })?.operationId).toBe(upper.toLowerCase());
  });
  it("matches required legacy fields while keeping the offer window optional and payment duration conditional", () => {
    expect(registrationSettingsComplete(settings)).toBe(true);
    for (const field of ["waitlist_offer_hours", "confirm_seat_lead_days", "confirm_seat_response_hours", "early_access_start_at", "early_access_end_at", "minimum_age", "closing_at"] as const) {
      expect(registrationSettingsComplete({ ...settings, [field]: null })).toBe(false);
    }
    expect(registrationSettingsComplete({ ...settings, payment_required: true })).toBe(false);
    expect(registrationSettingsComplete({ ...settings, payment_required: true, payment_window_hours: 1 })).toBe(true);
  });
  it.each([
    { priority_start_at: settings.priority_end_at }, { priority_end_at: settings.closing_at },
    { closing_at: settings.general_opening_at }, { early_access_end_at: settings.closing_at },
  ])("checks temporal order %#", (changes) => expect(registrationSettingsComplete({ ...settings, ...changes })).toBe(false));
  it("converts Riyadh time independently of host timezone and rejects rollover dates", () => {
    expect(riyadhLocalToTimestamp("2026-11-15T20:00")).toBe("2026-11-15T17:00:00.000Z");
    expect(timestampToRiyadhLocal("2026-11-15T17:00:00+00:00")).toBe("2026-11-15T20:00");
    expect(riyadhLocalToTimestamp("2026-01-01T01:30")).toBe("2025-12-31T22:30:00.000Z");
    expect(riyadhLocalToTimestamp("2028-02-29T20:00:12.123")).toBe("2028-02-29T17:00:12.123Z");
    expect(timestampToRiyadhLocal("2028-02-29T17:00:12.123Z")).toBe("2028-02-29T20:00:12.123");
    for (const value of ["2026-02-29T20:00", "2026-11-15T24:00", "2026-11-15T20:00Z", "", "infinity"]) expect(riyadhLocalToTimestamp(value)).toBeNull();
  });
  it("projects only known settings and ordered, bounded immutable history", () => {
    expect(registrationSettingsProjection(read(), config.editionKey)).toEqual({ settings, settingsComplete: true, participantAccountsReady: false, history: [history] });
    for (const result of [
      { ...read(), history: Array(21).fill(history) }, { ...read(), history: [history, history] },
      { ...read(), history: [history, { ...history, id: sessionId, operationId: sessionId, at: new Date(now + 1).toISOString() }] },
      { ...read(), history: [{ ...history, changes: { secret: { before: null, after: "leak" } } }] },
      { ...read(), history: [{ ...history, changes: { general_capacity: { before: null, after: "3" } } }] },
      { ...read(), history: [{ ...history, email: "leak@example.invalid" }] },
      { ...read(), settings: { ...settings, secret: "leak" } }, { ...read(), settingsComplete: false },
    ]) expect(registrationSettingsProjection(result, config.editionKey)).toBeNull();
    expect(registrationSettingsProjection({ ...read(), history: [{ ...history, changes: {} }] }, config.editionKey)).not.toBeNull();
  });
  it("leaves incomplete existing settings readable rather than defaulting missing fields", () => {
    const incomplete = { ...settings, terms_version: null, general_capacity: null, minimum_age: null };
    expect(registrationSettingsProjection({ ...read(), settings: incomplete, settingsComplete: false, history: [] }, config.editionKey)?.settings).toEqual(incomplete);
  });
  it("reads PostgreSQL microseconds and compares window ordering without millisecond rounding", () => {
    const precise = { ...settings, priority_start_at: "2027-01-01T17:00:00.123001+00:00", priority_end_at: "2027-01-01T17:00:00.123002+00:00" };
    expect(registrationSettingsComplete(precise)).toBe(true);
    expect(registrationSettingsProjection({ ...read(), settings: precise, history: [{ ...history, at: "2026-10-20T00:00:00.123456+00:00" }] }, config.editionKey)).not.toBeNull();
    expect(registrationSettingsComplete({ ...precise, priority_end_at: "2027-01-01T17:00:00.123000+00:00" })).toBe(false);
  });
  it("does not mutate caller-owned changes", () => {
    const changes: StaffRegistrationSettingsChanges = { general_capacity: 3 };
    const output = registrationSettingsChanges(changes)!; output.general_capacity = 4;
    expect(changes.general_capacity).toBe(3);
  });
  it("validates nullable conference days without making them a registration completeness gate", () => {
    expect(registrationSettingsChanges({ conference_days: null })).toEqual({ conference_days: null });
    const days = ["2027-01-27", "2027-01-28"];
    expect(registrationSettingsChanges({ conference_days: days })).toEqual({ conference_days: days });
    for (const conference_days of [[], ["2027-02-29"], ["2027-01-27", "2027-01-27"], ["2027-01-28", "2027-01-27"], "2027-01-27"]) {
      expect(registrationSettingsChanges({ conference_days })).toBeNull();
      expect(registrationSettingsProjection({ ...read(), settings: { ...settings, conference_days } }, config.editionKey)).toBeNull();
    }
    expect(registrationSettingsComplete({ ...settings, conference_days: null })).toBe(true);
    expect(registrationSettingsComplete({ ...settings, conference_days: days })).toBe(true);
    const result = registrationSettingsProjection({ ...read(), settings: { ...settings, conference_days: days },
      history: [{ ...history, changes: { conference_days: { before: null, after: days } } }] }, config.editionKey);
    expect(result?.history[0].changes.conference_days).toEqual({ before: null, after: days });
  });
});
