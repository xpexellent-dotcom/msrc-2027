import { describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie, participantFormToken, readParticipantSession } from "@/features/participant-accounts/security.server";
import { RegistrationRpcMissingError, type RegistrationBackend } from "@/features/registration/backend.server";
import { createRegistrationHandler } from "@/features/registration/handler.server";
import { decryptIdentityDocument, type IdentityCryptoConfig } from "@/features/registration/identity-crypto.server";
import { readRegistrationFormToken, registrationFormToken } from "@/features/registration/security.server";

const env = { PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
  PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only",
  PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" };
const readiness = resolveParticipantConfig(env);
if (readiness.state !== "ready") throw new Error("Synthetic participant config must be ready");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 16, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001";
const claims = { sub: actorId, session_id: sessionId, exp: Math.floor(now / 1000) + 3600, iat: Math.floor(now / 1000), role: "authenticated", aal: "aal1", amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
const token = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const crypto: IdentityCryptoConfig = { keys: { synthetic_v1: "b".repeat(64) }, activeKeyVersion: "synthetic_v1", hmacSecret: "c".repeat(64) };
const summary = { id: "dc000000-0000-4000-8000-000000000001", status: "pending_approval", createdAt: new Date(now).toISOString() };
const evidence = { enabled: true, participantAccountsReady: true, settingsComplete: true, windowOpen: true, eligible: true, state: "open", request: null, termsVersion: "v1.0" };

function fixture(options: { context?: unknown; status?: unknown; participantStatus?: unknown; identity?: string | null; accessClaims?: unknown; submit?: unknown; claim?: string;
  refresh?: Awaited<ReturnType<RegistrationBackend["refresh"]>>; observeOnly?: boolean; error?: Error; errorRpc?: string } = {}) {
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => Object.hasOwn(options, "identity") ? options.identity! : actorId),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId, sessionId, accessToken: token(), refreshToken: "synthetic-rotated-refresh" }),
    rpc: vi.fn(async (name) => {
      if (options.error && name === (options.errorRpc ?? "msrc_registration_context")) throw options.error;
      if (name === "msrc_participant_status") return options.participantStatus ?? { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true,
        cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_registration_status") return options.status ?? { enabled: true, participantAccountsReady: true, settingsComplete: true };
      if (name === "msrc_registration_context") return options.context ?? evidence;
      if (name === "msrc_participant_form_claim") return { state: options.claim ?? "claimed" };
      if (name === "msrc_registration_submit") return options.submit ?? { state: "submitted", request: summary };
      throw new Error("Unexpected private RPC");
    }),
  };
  const handle = createRegistrationHandler({ readiness: () => readiness, crypto: () => crypto, backend: () => backend, now: () => now, observeOnly: options.observeOnly });
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: token(options.accessClaims), refreshToken: "synthetic-refresh", origin, deadline: now + 72 * 3600_000 }, now).split(";")[0];
  const post = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/workflows/registration", {
    method: "POST", headers: { origin, cookie, "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ documentType: "passport", documentNumber: "FAKE0001", termsAccepted: true, termsVersion: "v1.0", website: "",
      formToken: registrationFormToken(config, origin, actorId, sessionId, now - 3_000), ...extra }),
  }));
  return { backend, handle, cookie, post };
}

describe("closed registration request boundary (REG-01/02, ORG-039/041/051, SEC-01/02)", () => {
  it.each([undefined, "false", "TRUE", "1", ""])("flag %s refuses visitor input before constructing a provider", async (flag) => {
    vi.stubEnv("REGISTRATION_ENABLED", flag); vi.stubEnv("NEXT_PUBLIC_REGISTRATION_ENABLED", "true");
    const backend = vi.fn();
    const response = await createRegistrationHandler({ backend })(new Request(origin, { method: "POST", body: "broken" }));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: { code: "WORKFLOW_CLOSED", workflow: "registration" } }); expect(backend).not.toHaveBeenCalled();
  });
  it("requires configured identity protection and participant configuration", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    for (const dependencies of [{ readiness: () => readiness, crypto: () => null }, { readiness: () => ({ state: "closed" } as const), crypto: () => crypto }]) {
      const backend = vi.fn(); const response = await createRegistrationHandler({ ...dependencies, backend })(new Request(origin));
      expect(response.status).toBe(503); expect(backend).not.toHaveBeenCalled();
    }
  });
  it.each(["enabled", "participantAccountsReady", "settingsComplete", "windowOpen", "eligible"])("refuses missing/false private context %s", async (field) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    for (const value of [false, null, undefined]) {
      const { post, backend } = fixture({ context: { ...evidence, [field]: value } });
      expect((await post()).status).toBe(503);
      expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_submit")).toBe(false);
    }
  });
  it.each(["enabled", "participantAccountsReady", "settingsComplete"])("requires private status %s before identity work", async (field) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    const { post, backend } = fixture({ status: { enabled: true, participantAccountsReady: true, settingsComplete: true, [field]: false } });
    expect((await post()).status).toBe(503); expect(backend.identity).not.toHaveBeenCalled();
  });
  it.each(["enabled", "ageEnforcementReady", "retentionEnforcementReady", "cleanupEnabled"])("requires participant readiness %s", async (field) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    const { post, backend } = fixture({ participantStatus: { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true,
      privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40, [field]: false } });
    expect((await post()).status).toBe(503); expect(backend.identity).not.toHaveBeenCalled();
  });
  it.each([null, "de000000-0000-4000-8000-000000000001"])("requires native verified identity %s", async (identity) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); expect((await fixture({ identity }).post()).status).toBe(401);
  });
  it.each([{ sub: "other" }, { session_id: "other" }, { role: "service_role" }, { amr: [] }])("refuses forged session claims %j", async (change) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); expect((await fixture({ accessClaims: { ...claims, ...change } }).post()).status).toBe(401);
  });
  it.each([{ termsAccepted: false }, { termsAccepted: "true" }, { termsVersion: "old" }, { documentType: "unknown" }, { documentNumber: "<script>" },
    { documentType: "iqama", documentNumber: "123" }, { website: "bot" }, { ownerId: "forged" }, { status: "confirmed" }])("rejects invalid or forged input %j", async (change) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { post, backend } = fixture(); expect((await post(change)).status).toBe(400);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_submit")).toBe(false);
  });
  it.each<Record<string, string>>([{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }, { cookie: "" }])("refuses cross-origin/anonymous request %j", async (headers) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); expect([400, 401]).toContain((await fixture().post({}, headers)).status);
  });
  it("encrypts before the private RPC and returns only the neutral request summary", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { post, backend } = fixture(); const response = await post();
    expect(response.status).toBe(200); const result = await response.json(); expect(result).toMatchObject({ state: "submitted", request: summary });
    expect(JSON.stringify(result)).not.toContain("FAKE0001");
    const call = vi.mocked(backend.rpc).mock.calls.find(([name]) => name === "msrc_registration_submit")!;
    expect(JSON.stringify(call)).not.toContain("FAKE0001"); expect(call[1]).toMatchObject({ document_type: "passport", identity_masked: "••••••0001", key_version: "synthetic_v1", terms_version: "v1.0" });
    expect(decryptIdentityDocument(crypto, { editionKey: config.editionKey, actorId, documentType: "passport" }, call[1]!.identity_envelope as Parameters<typeof decryptIdentityDocument>[2])).toBe("FAKE0001");
  });
  it("two identical concurrent attempts reach the idempotent RPC and return one request with separate IP-rate claims", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { post, backend } = fixture();
    const formToken = registrationFormToken(config, origin, actorId, sessionId, now - 3_000);
    const results = await Promise.all([post({ formToken }), post({ formToken })]);
    expect(await Promise.all(results.map(async (response) => (await response.json()).request.id))).toEqual([summary.id, summary.id]);
    const rateClaims = vi.mocked(backend.rpc).mock.calls.filter(([name]) => name === "msrc_participant_form_claim").map(([, args]) => args!.nonce_hash);
    expect(new Set(rateClaims).size).toBe(2);
  });
  it("returns 429 on the database IP limit and never submits", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { post, backend } = fixture({ claim: "denied" }); expect((await post()).status).toBe(429);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_submit")).toBe(false);
  });
  it.each(["closed", "denied", "conflict"])("honors atomic database outcome %s", async (state) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); expect((await fixture({ submit: { state } }).post()).status).toBe(state === "closed" ? 503 : state === "denied" ? 403 : 400);
  });
  it("never returns unexpected private RPC data", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const response = await fixture({ submit: { state: "submitted", request: { ...summary, plaintext: "FAKE0001" } } }).post();
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("FAKE0001");
  });
  it.each(["msrc_registration_status", "msrc_registration_context", "msrc_registration_submit"])("keeps login and returns area-not-ready when %s is not installed", async (errorRpc) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const f = fixture({ error: new RegistrationRpcMissingError(), errorRpc });
    const response = await f.post(); expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull(); expect(await response.json()).toEqual({ state: "area-not-ready" });
  });
  it("keeps a generic failure distinct from a missing registration migration", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const response = await fixture({ error: new Error("unavailable") }).post();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("observes the existing request without exposing identity data", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { handle, cookie } = fixture({ context: { ...evidence, request: summary } });
    const response = await handle(new Request(origin + "/api/workflows/registration?locale=ar", { headers: { cookie } }));
    expect(await response.json()).toMatchObject({ state: "submitted", request: summary, termsVersion: "v1.0" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("refreshes an expired native token in the same72-hour session without moving its absolute deadline", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { handle, backend, cookie } = fixture({ accessClaims: { ...claims, exp: Math.floor(now / 1000) - 1 } });
    const response = await handle(new Request(origin + "/api/workflows/registration", { headers: { cookie } }));
    expect(response.status).toBe(200); expect((await response.json()).state).toBe("ready"); expect(backend.refresh).toHaveBeenCalledWith("synthetic-refresh");
    const restored = readParticipantSession(config, new Request(origin, { headers: { cookie: response.headers.get("set-cookie")!.split(";")[0] } }), now);
    expect(restored).toMatchObject({ actorId, sessionId, deadline: now + 72 * 3600_000, refreshToken: "synthetic-rotated-refresh" });
  });
  it.each([null, { actorId: "other", sessionId, accessToken: token(), refreshToken: "synthetic" },
    { actorId, sessionId: "other", accessToken: token(), refreshToken: "synthetic" }])("denies a failed or mismatched refresh %j", async (refresh) => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { post, backend } = fixture({ accessClaims: { ...claims, exp: Math.floor(now / 1000) }, refresh });
    const response = await post(); expect(response.status).toBe(401); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(backend.identity).not.toHaveBeenCalled();
  });
  it("RSC observation never consumes a refresh token or changes cookies", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true"); const { handle, backend, cookie } = fixture({ observeOnly: true, accessClaims: { ...claims, exp: Math.floor(now / 1000) } });
    const response = await handle(new Request(origin + "/api/workflows/registration", { headers: { cookie } }));
    expect(response.status).toBe(401); expect(backend.refresh).not.toHaveBeenCalled(); expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("registration CSRF token binds session and origin while supporting retry", () => {
  it("rejects participant-form tokens, other sessions, future/expired values and invalid signatures", () => {
    const form = registrationFormToken(config, origin, actorId, sessionId, now - 3_000);
    expect(readRegistrationFormToken(config, form, origin, actorId, sessionId, now)).toBe(true);
    expect(readRegistrationFormToken(config, form, origin, actorId, "other", now)).toBe(false);
    expect(readRegistrationFormToken(config, form, "https://other.example", actorId, sessionId, now)).toBe(false);
    expect(readRegistrationFormToken(config, form, origin, actorId, sessionId, now + 31 * 60_000)).toBe(false);
    expect(readRegistrationFormToken(config, form, origin, actorId, sessionId, now - 4_000)).toBe(false);
    expect(readRegistrationFormToken(config, form + "x", origin, actorId, sessionId, now)).toBe(false);
    expect(readRegistrationFormToken(config, participantFormToken(config, origin, now - 3_000), origin, actorId, sessionId, now)).toBe(false);
  });
});
