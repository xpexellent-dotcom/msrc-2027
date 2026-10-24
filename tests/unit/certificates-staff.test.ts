import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { createCertificateStaffHandler } from "@/features/certificates/staff-handler.server";
import type { generatePendingCertificates } from "@/features/certificates/generation.server";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-24T06:00:00Z");
const actorId = "75120000-0000-4000-8000-000000000001", sessionId = "75120000-0000-4000-8000-000000000002", templateId = "75120000-0000-4000-8000-000000000003", correctionId = "75120000-0000-4000-8000-000000000004", operationId = "75120000-0000-4000-8000-000000000005";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000, amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const settings = { enabled: false, surveysEnabled: false, feedbackRetentionDays: null, downloadRetentionDays: null, verificationRetentionDays: null, unlinkingApproved: false };
const view = () => ({ state: "ready", settings, surveys: [], templates: [], eligibility: [], certificates: [], workshops: [] });
const survey = { kind: "conference", workshopId: null, titleEn: "Synthetic survey", titleAr: "استبيان تجريبي", version: 0, questions: [], published: false, deadline: null };
let roles: Role[], satisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>, generation: ReturnType<typeof vi.fn<typeof generatePendingCertificates>>;
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: satisfied,
    reason: satisfied ? null : "staff_email_check_required", mfaValid: superAdmin && satisfied, passwordValid: true, staffEmailValid: !superAdmin && satisfied, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function request(body?: Record<string, unknown>, signedIn = true, extraHeaders: Record<string, string> = {}, query = "") {
  return new Request(origin + "/api/staff-portal/certificates" + query, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219",
    ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}),
    ...(body ? { origin, "Content-Type": "application/json" } : {}), ...extraHeaders }, body: body ? JSON.stringify({ operationId, formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const handle = (input: Request) => createCertificateStaffHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, generate: generation })(input);
beforeEach(() => {
  vi.stubEnv("CERTIFICATES_ENABLED", "true"); roles = ["registrationWorkshopAdministrator"]; satisfied = true;
  generation = vi.fn(async () => ({ state: "updated" as const, issued: 1 }));
  replies = { msrc_staff_certificates_read: view(), msrc_staff_certificates_manage: { state: "saved" } };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Certificate Admin", roles, session: persisted() };
    const result = replies[name]; if (result instanceof Error) throw result; return result ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("ENG-075 certificate staff server authority", () => {
  it.each(ROLES)("checks current certificate read and survey-edit roles for %s", async (role) => {
    roles = [role]; const manager = ["superAdmin", "registrationWorkshopAdministrator"].includes(role);
    expect((await handle(request())).status).toBe(manager ? 200 : 403);
    expect((await handle(request({ action: "saveSurvey", survey }))).status).toBe(manager ? 200 : 403);
    if (!manager) expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_certificates_"))).toBe(false);
  });
  it.each([
    { action: "saveTemplate", template: { kind: "conference", titleEn: "Synthetic certificate", titleAr: "شهادة تجريبية", signature: "Synthetic signatory", version: 0 } },
    { action: "approveTemplate", expectedVersion: 1, templateId }, { action: "release", expectedVersion: 1, templateId, workshopId: null },
    { action: "approveCorrection", correctionId, reason: "Synthetic name verified" }, { action: "settings", settings },
  ])("requires Super Admin authority before %s reaches the database", async (payload) => {
    expect((await handle(request(payload))).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_certificates_manage")).toBe(false);
    roles = ["superAdmin"]; expect((await handle(request(payload))).status).toBe(200);
  });
  it.each(["superAdmin", "registrationWorkshopAdministrator"] as const)("denies insufficient native assurance for %s", async (role) => {
    roles = [role]; satisfied = false; expect((await handle(request())).status).toBe(403);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_certificates_"))).toBe(false);
  });
  it("denies a missing session, native identity mismatch and mismatched absolute deadline", async () => {
    expect((await handle(request(undefined, false))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(request())).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(actorId);
    const cookie = staffCookie(config, { ...native, origin, deadline: now + 7 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
    expect((await handle(request(undefined, true, { cookie }))).status).toBe(403);
  });
  it("rejects cross-origin POST, stale form tokens, unknown fields and query keys", async () => {
    for (const input of [request({ action: "saveSurvey", survey }, true, { origin: "https://evil.invalid" }), request({ action: "saveSurvey", survey, formToken: "" }), request({ action: "saveSurvey", survey, actorId }), request(undefined, true, {}, "?extra=1")]) expect((await handle(input)).status).toBe(400);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_certificates_manage")).toBe(false);
  });
  it("keeps activation closed at both the runtime release flag and settings write", async () => {
    roles = ["superAdmin"]; vi.stubEnv("CERTIFICATES_ENABLED", "false");
    expect((await handle(request({ action: "release", expectedVersion: 1, templateId, workshopId: null }))).status).toBe(503);
    for (const enabled of [{ enabled: true }, { surveysEnabled: true }]) expect((await handle(request({ action: "settings", settings: { ...settings, ...enabled } }))).status).toBe(409);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_certificates_manage")).toBe(false); expect(generation).not.toHaveBeenCalled();
  });
  it("preserves validated operation IDs and uses the native bearer for staff database authority", async () => {
    const response = await handle(request({ action: "saveSurvey", survey })); expect(response.ok).toBe(true);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_certificates_manage", { edition_key: config.editionKey, input: { action: "saveSurvey", operationId, survey } }, accessToken);
    expect(await response.text()).not.toContain(accessToken); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not generate when SQL rejects approval, and generates only after a committed release", async () => {
    roles = ["superAdmin"]; replies.msrc_staff_certificates_manage = { state: "approval_required" };
    expect((await handle(request({ action: "release", expectedVersion: 1, templateId, workshopId: null }))).status).toBe(409); expect(generation).not.toHaveBeenCalled();
    replies.msrc_staff_certificates_manage = { state: "released", batchId: operationId, count: 1 };
    expect((await handle(request({ action: "release", expectedVersion: 1, templateId, workshopId: null }))).status).toBe(200);
    expect(generation).toHaveBeenCalledOnce(); expect(generation).toHaveBeenCalledWith({ databaseUrl: config.supabaseUrl, databaseKey: config.secretKey });
  });
  it("keeps a released batch reviewable if PDF generation is interrupted", async () => {
    roles = ["superAdmin"]; replies.msrc_staff_certificates_manage = { state: "released" }; generation.mockRejectedValue(new Error("private renderer diagnostic"));
    const response = await handle(request({ action: "release", expectedVersion: 1, templateId, workshopId: null })); expect(response.status).toBe(200); expect(await response.text()).not.toContain("diagnostic");
  });
  it("shows area-not-ready without logging staff out when the migration is pending", async () => {
    replies.msrc_staff_certificates_read = new StaffRpcMissingError(); const response = await handle(request());
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready"); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("hides private diagnostics and never forwards extra answer data in staff responses", async () => {
    replies.msrc_staff_certificates_read = { ...view(), answers: [{ actorId, privateAnswer: "never send" }] };
    expect(await (await handle(request())).text()).not.toContain("never send");
    replies.msrc_staff_certificates_read = new Error("private database diagnostic");
    expect(await (await handle(request())).text()).not.toContain("diagnostic");
  });
});
