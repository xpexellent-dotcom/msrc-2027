import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { createStaffBackend, type StaffBackend } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig } from "@/features/staff-portal/config.server";
import { observeStaffPage } from "@/features/staff-portal/handler.server";
import { staffCookie } from "@/features/staff-portal/security.server";

vi.mock("@/features/staff-portal/backend.server", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/staff-portal/backend.server")>(),
  createStaffBackend: vi.fn(),
}));

const origin = "http://127.0.0.1:3219";
const now = Date.parse("2026-10-16T00:00:00Z");
const deadline = now + 8 * 60 * 60 * 1000;
const actorId = "c3100000-0000-4000-8000-000000000011";
const sessionId = "c3100000-0000-4000-8000-000000000012";
const readiness = resolveStaffConfig({
  STAFF_PORTAL_ENABLED: "true",
  STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only",
  STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only",
  STAFF_EDITION_KEY: "synthetic-staff-2027",
  STAFF_AUTH_EMAIL_DAILY_LIMIT: "40",
});
if (readiness.state !== "ready") throw new Error("Synthetic staff configuration must be ready");
const { config } = readiness;

const profile = { actorId, name: "Synthetic Staff", roles: ["superAdmin"] };
const persisted = {
  schemaVersion: 1,
  editionId: config.editionKey,
  principal: { userId: actorId, sessionId },
  privileged: true,
  authenticationTier: "super_admin",
  sessionPolicySatisfied: true,
  reason: null,
  mfaValid: true,
  passwordValid: true,
  staffEmailValid: false,
  emailVerified: true,
  timing: {
    startedAt: new Date(now).toISOString(),
    lastActivityAt: new Date(now).toISOString(),
    absoluteExpiresAt: new Date(deadline).toISOString(),
    idleExpiresAt: new Date(now + 30 * 60 * 1000).toISOString(),
    authenticatedAt: new Date(now).toISOString(),
  },
  policy: SESSION_POLICY,
  operationalAccessReady: false,
  privilegedAccessReady: false,
};

function sessionRequest(tokenExpiresAt = now + 60 * 60 * 1000) {
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId, exp: tokenExpiresAt / 1000 })).toString("base64url");
  const accessToken = ["header", payload, "signature"].join(".");
  const cookie = staffCookie(config, { actorId, sessionId, origin, deadline, accessToken, refreshToken: "synthetic-refresh",
    challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
  return { accessToken, request: new Request(new URL("/api/staff-portal", origin), { headers: { cookie } }) };
}

function backendFixture({ enabled = true, failure }: { enabled?: boolean; failure?: "status" | "identity" | "profile" } = {}) {
  const operations: string[] = [];
  const backend = {
    rpc: vi.fn<StaffBackend["rpc"]>(async (name) => {
      operations.push(name);
      if (name === "msrc_staff_status") {
        if (failure === "status") throw new Error("Synthetic status failure");
        return { enabled, emailDailyLimit: config.emailDailyLimit };
      }
      if (name === "msrc_session_context") return persisted;
      if (name === "msrc_staff_profile") {
        if (failure === "profile") throw new Error("Synthetic profile failure");
        return { ...profile, schemaVersion: 1, session: persisted };
      }
      throw new Error("Unexpected RPC " + name);
    }),
    identity: vi.fn<StaffBackend["identity"]>(async () => {
      operations.push("identity");
      if (failure === "identity") throw new Error("Synthetic identity failure");
      return actorId;
    }),
    refresh: vi.fn<StaffBackend["refresh"]>(),
  };
  vi.mocked(createStaffBackend).mockReturnValue(backend as unknown as StaffBackend);
  return { backend, operations };
}

describe("staff page session observation", () => {
  beforeEach(() => {
    vi.mocked(createStaffBackend).mockReset();
    vi.spyOn(Date, "now").mockReturnValue(now);
  });
  afterEach(() => vi.restoreAllMocks());

  it("checks readiness once before verifying native identity, session, and profile", async () => {
    const { backend, operations } = backendFixture();
    const { request, accessToken } = sessionRequest();
    expect(await observeStaffPage(request, config)).toEqual({ enabled: true, profile });
    expect(createStaffBackend).toHaveBeenCalledExactlyOnceWith(config);
    expect(backend.identity).toHaveBeenCalledExactlyOnceWith(accessToken);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_session_context", { edition_key: config.editionKey }, accessToken);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_profile", { edition_key: config.editionKey }, accessToken);
    expect(operations).toEqual(["msrc_staff_status", "identity", "msrc_session_context", "msrc_staff_profile"]);
    expect(backend.refresh).not.toHaveBeenCalled();
  });

  it.each([{ enabled: false }, { failure: "status" as const }])("closes the route when status is disabled or unavailable (%j)", async (fixture) => {
    const { operations } = backendFixture(fixture);
    expect(await observeStaffPage(sessionRequest().request, config)).toEqual({ enabled: false, profile: null });
    expect(operations).toEqual(["msrc_staff_status"]);
  });

  it.each([
    ["identity", ["msrc_staff_status", "identity"]],
    ["profile", ["msrc_staff_status", "identity", "msrc_session_context", "msrc_staff_profile"]],
  ] as const)("returns no profile after a verified readiness check if %s fails", async (failure, expected) => {
    const { backend, operations } = backendFixture({ failure });
    expect(await observeStaffPage(sessionRequest().request, config)).toEqual({ enabled: true, profile: null });
    expect(operations).toEqual(expected);
    expect(backend.refresh).not.toHaveBeenCalled();
  });

  it("leaves sessions that need native refresh to the API", async () => {
    const { backend, operations } = backendFixture();
    const { request } = sessionRequest(now + 30 * 1000);
    expect(await observeStaffPage(request, config)).toEqual({ enabled: true, profile: null });
    expect(operations).toEqual(["msrc_staff_status"]);
    expect(backend.refresh).not.toHaveBeenCalled();
  });
});
