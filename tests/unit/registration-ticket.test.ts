import { createHmac } from "node:crypto";
import QRCode from "qrcode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import { createRegistrationBackend, RegistrationRpcMissingError, type RegistrationBackend } from "@/features/registration/backend.server";
import { getRegistrationTicketSecret, registrationTicketProjection } from "@/features/registration/ticket-crypto.server";
import { createRegistrationTicketHandler } from "@/features/registration/ticket-handler.server";

const env = { PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
  PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only",
  PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" };
const readiness = resolveParticipantConfig(env);
if (readiness.state !== "ready") throw new Error("Synthetic config must be ready");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 20, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001";
const id = "dc000000-0000-4000-8000-000000000001", secret = "d".repeat(64);
const claims = { sub: actorId, session_id: sessionId, exp: now / 1000 + 3600, iat: now / 1000, role: "authenticated", aal: "aal1",
  amr: [{ method: "password", timestamp: now / 1000 }], email: "participant@example.invalid" };
const nativeToken = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const token = "msrc1." + id + "." + createHmac("sha256", Buffer.from(secret, "hex")).update("msrc-ticket-v1:" + id).digest("hex");
const ticket = { status: "issued", referenceCode: "DC0000000000", token };
function fixture(options: { result?: unknown; error?: Error; identity?: string | null; claims?: unknown; observeOnly?: boolean; closed?: boolean; settingsComplete?: boolean;
  refresh?: Awaited<ReturnType<RegistrationBackend["refresh"]>> } = {}) {
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => Object.hasOwn(options, "identity") ? options.identity! : actorId),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId, sessionId, accessToken: nativeToken(), refreshToken: "rotated" }),
    rpc: vi.fn(async (name) => {
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true,
        cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_registration_status") return { enabled: !options.closed, participantAccountsReady: true, settingsComplete: options.settingsComplete ?? true };
      if (name === "msrc_registration_ticket") { if (options.error) throw options.error; return options.result ?? { state: "ready", ticket }; }
      throw new Error("Unexpected RPC");
    }),
  };
  const handle = createRegistrationTicketHandler({ readiness: () => readiness, secret: () => secret, backend: () => backend, now: () => now, observeOnly: options.observeOnly });
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: nativeToken(options.claims), refreshToken: "original", origin, deadline: now + 72 * 3600_000 }, now).split(";")[0];
  return { backend, handle, get: (headers: Record<string, string> = {}, query = "") => handle(new Request(origin + "/api/registration/ticket" + query, { headers: { cookie, ...headers } })) };
}
beforeEach(() => vi.stubEnv("REGISTRATION_ENABLED", "true"));

describe("private recoverable ticket and local QR projection", () => {
  it("requires a separate well-formed ticket key", () => {
    expect(getRegistrationTicketSecret({ REGISTRATION_TICKET_SECRET: secret })).toBe(secret);
    for (const key of [undefined, "", "not-a-key", "a".repeat(63)]) expect(getRegistrationTicketSecret({ REGISTRATION_TICKET_SECRET: key })).toBeNull();
    for (const name of ["PARTICIPANT_AUTH_SECURITY_SECRET", "STAFF_AUTH_SECURITY_SECRET"])
      expect(getRegistrationTicketSecret({ REGISTRATION_TICKET_SECRET: secret, [name]: secret.toUpperCase() })).toBeNull();
  });
  it("renders only an opaque signed ticket token with the local qrcode package", async () => {
    const qr = vi.spyOn(QRCode, "toDataURL").mockImplementation((() => Promise.resolve("data:image/png;base64,c3ludGhldGlj")) as typeof QRCode.toDataURL);
    const response = await fixture().get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "ready", ticket: { status: "issued", referenceCode: ticket.referenceCode, qrDataUrl: "data:image/png;base64,c3ludGhldGlj" } });
    expect(qr).toHaveBeenCalledWith(token, { type: "image/png", width: 320, margin: 4, errorCorrectionLevel: "M" });
    const encoded = qr.mock.calls[0][0];
    for (const personal of [claims.email, actorId, sessionId, "passport", "name", "@", config.editionKey]) expect(encoded).not.toContain(personal);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("produces a PNG data URL without network access", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    try { expect((await registrationTicketProjection({ state: "ready", ticket }, secret))?.ticket?.qrDataUrl).toMatch(/^data:image\/png;base64,iVBOR/); expect(fetcher).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
  it.each([{ ...ticket, token: token.slice(0, -1) + "0" }, { ...ticket, referenceCode: "000000000000" },
    { ...ticket, email: "private@example.invalid" }, { ...ticket, token: "https://qr.example.invalid/person@example.invalid" },
    { ...ticket, status: "revoked" }, { ...ticket, status: "unknown", token: null }])("rejects malformed, mismatched or over-returned projection %j", async (bad) => {
    expect(await registrationTicketProjection({ state: "ready", ticket: bad }, secret)).toBeNull();
  });
  it("never renders a revoked token, and permits an absent ticket", async () => {
    const qr = vi.spyOn(QRCode, "toDataURL");
    expect(await registrationTicketProjection({ state: "ready", ticket: { ...ticket, status: "revoked", token: null } }, secret))
      .toEqual({ state: "ready", ticket: { status: "revoked", referenceCode: ticket.referenceCode, qrDataUrl: null } });
    expect(await registrationTicketProjection({ state: "ready", ticket: null }, secret)).toEqual({ state: "ready", ticket: null });
    expect(qr).not.toHaveBeenCalled();
  });
});

describe("participant own-ticket boundary", () => {
  it("keeps the workflow closed before provider construction", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "false"); const backend = vi.fn();
    expect((await createRegistrationTicketHandler({ backend })(new Request(origin))).status).toBe(503); expect(backend).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ cookie: "" }, { origin: "https://evil.example.invalid" }, { "sec-fetch-site": "cross-site" }])("denies unauthorized browser request %j", async (headers) => {
    const f = fixture(); expect([400, 401]).toContain((await f.get(headers)).status);
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_ticket")).toBe(false);
  });
  it.each([{ sub: sessionId }, { session_id: actorId }, { role: "service_role" }, { amr: [] }])("rejects forged actor/session claims %j", async (change) => {
    expect((await fixture({ claims: { ...claims, ...change } }).get()).status).toBe(401);
  });
  it("rejects native identity mismatch, closed policy and caller-selected participant", async () => {
    expect((await fixture({ identity: sessionId }).get()).status).toBe(401);
    expect((await fixture({ closed: true }).get()).status).toBe(503);
    expect((await fixture().get({}, "?actorId=" + actorId)).status).toBe(400);
  });
  it("uses verified own claims and permits a ticket after the submission window", async () => {
    const f = fixture(); expect((await f.get()).status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_registration_ticket", { edition_key: config.editionKey, session_claims: claims, ticket_secret: secret });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_context")).toBe(false);
  });
  it("keeps an existing ticket available when submission settings become incomplete", async () => {
    expect((await fixture({ settingsComplete: false }).get()).status).toBe(200);
  });
  it.each([new RegistrationRpcMissingError(), new Error("outage")])("missing migration/outage keeps valid session", async (error) => {
    const response = await fixture({ error }).get(); expect(response.status).toBe(503); expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ state: error instanceof RegistrationRpcMissingError ? "area-not-ready" : "unavailable" });
  });
  it("refreshes only the same native session; RSC never consumes a refresh", async () => {
    const expired = { ...claims, exp: now / 1000 - 1 };
    const f = fixture({ claims: expired }); expect((await f.get()).headers.get("set-cookie")).toContain("participant"); expect(f.backend.refresh).toHaveBeenCalledOnce();
    const observe = fixture({ claims: expired, observeOnly: true }); expect((await observe.get()).status).toBe(401); expect(observe.backend.refresh).not.toHaveBeenCalled();
    const wrong = fixture({ claims: expired, refresh: { actorId, sessionId: actorId, accessToken: nativeToken(), refreshToken: "wrong" } });
    const response = await wrong.get(); expect(response.status).toBe(401); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it.each(["closed", "denied", "unavailable"])("honors database state %s", async (state) => {
    const response = await fixture({ result: { state } }).get(); expect(response.status).toBe(state === "denied" ? 403 : 503); expect(await response.json()).toEqual({ state });
  });
  it("detects only PGRST202 as missing capability and uses service transport", async () => {
    const fetcher = vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 })); vi.stubGlobal("fetch", fetcher);
    try {
      await expect(createRegistrationBackend(config).rpc("msrc_registration_ticket", { edition_key: config.editionKey })).rejects.toBeInstanceOf(RegistrationRpcMissingError);
      const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
      expect(new Headers(init.headers).get("apikey")).toBe(config.secretKey); expect(new Headers(init.headers).get("authorization")).toBeNull();
      fetcher.mockImplementation(async () => Response.json({ code: "PGRST116" }, { status: 404 }));
      await expect(createRegistrationBackend(config).rpc("msrc_registration_ticket")).rejects.not.toBeInstanceOf(RegistrationRpcMissingError);
    } finally { vi.unstubAllGlobals(); }
  });
});
