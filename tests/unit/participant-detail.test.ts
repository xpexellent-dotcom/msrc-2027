import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createParticipantDetailHandler } from "@/features/staff-portal/participant-detail-handler.server";
import type { NativeStaffSession, StaffBackend } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie } from "@/features/staff-portal/security.server";
import { decodeParticipantDetail } from "@/features/staff-portal/participant-detail-contract";

// ENG-083. Synthetic values only.
const origin = "http://127.0.0.1:3219", now = Date.parse("2027-01-27T09:00:00Z");
const actorId = "39000000-0000-4000-8000-000000000001", sessionId = "39000000-0000-4000-8000-000000000002", target = "39000000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const native: NativeStaffSession = { actorId, sessionId, accessToken: "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature", refreshToken: "synthetic-refresh" };
const participant = {
  actorId: target, name: "Synthetic Participant", email: "synthetic@example.invalid", status: "verified", createdAt: "2027-01-01T00:00:00Z",
  verifiedAt: "2027-01-01T00:05:00Z", lastSignInAt: null, privacyVersion: "v1.0", ageConfirmedAt: "2027-01-01T00:00:00Z",
  registration: { status: "approved", createdAt: "2027-01-02T00:00:00Z", decidedAt: null, identityMasked: "••••1234", ticket: { reference: "A1B2C3D4E5F6", status: "active", issuedAt: null }, attendance: [] },
  workshops: [], submissions: [{ reference: "MSRC-1", title: "Synthetic abstract", status: "submitted", createdAt: "2027-01-03T00:00:00Z" }],
  competitions: [], hackathonProfile: null, certificates: [],
};
let roles: Role[], backend: StaffBackend, reply: unknown;
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: true, reason: null,
    mfaValid: superAdmin, passwordValid: true, staffEmailValid: !superAdmin, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
const request = (query = `?actorId=${target}`, method = "GET") => new Request(origin + "/api/staff-portal/participant-detail" + query, { method, headers: { host: "127.0.0.1:3219",
  cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } });
const handle = (input: Request) => createParticipantDetailHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
const rpcNames = () => vi.mocked(backend.rpc).mock.calls.map(([name]) => name);

beforeEach(() => {
  roles = ["superAdmin"]; reply = { state: "ready", participant };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Staff", roles, session: persisted() };
    if (name === "msrc_staff_participant_detail") return reply;
    return null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("ENG-083 participant detail", () => {
  it.each(["superAdmin", "registrationWorkshopAdministrator"] as const)("returns the full record for %s", async (role) => {
    roles = [role];
    const response = await handle(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "ready", participant });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(vi.mocked(backend.rpc).mock.calls.find(([name]) => name === "msrc_staff_participant_detail")?.[1]).toEqual({ edition_key: config.editionKey, target });
  });
  it.each(ROLES.filter((role) => role !== "superAdmin" && role !== "registrationWorkshopAdministrator"))("denies %s before reading any record", async (role) => {
    roles = [role];
    expect((await handle(request())).status).toBe(403);
    expect(rpcNames()).not.toContain("msrc_staff_participant_detail");
  });
  it.each(["", "?actorId=not-a-uuid", `?actorId=${target}&extra=1`])("rejects query %j", async (query) => {
    expect((await handle(request(query))).status).toBe(400);
    expect(rpcNames()).not.toContain("msrc_staff_participant_detail");
  });
  it("is read-only", async () => { expect((await handle(request(undefined, "POST"))).status).toBe(405); });
  it("maps not-found and refuses unexpected shapes", async () => {
    reply = { state: "not_found" }; expect((await handle(request())).status).toBe(404);
    reply = { state: "ready", participant: { ...participant, password: "x", status: "admin" } }; expect((await handle(request())).status).toBe(503);
  });
  it("decodes only the documented shape", () => {
    expect(decodeParticipantDetail(participant)).toEqual(participant);
    expect(decodeParticipantDetail({ ...participant, registration: { ...participant.registration, attendance: "none" } })).toBeNull();
    expect(decodeParticipantDetail({ ...participant, competitions: [{ kind: "hackathon", title: null, status: "draft", isLead: "yes", confirmed: true }] })).toBeNull();
    expect(decodeParticipantDetail({ ...participant, hackathonProfile: { university: "U", fieldOfStudy: "F", phone: "+966", enrolled: true } })?.hackathonProfile?.phone).toBe("+966");
  });
});
