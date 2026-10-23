import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import { createRegistrationBackend, RegistrationRpcMissingError, type RegistrationBackend } from "@/features/registration/backend.server";
import { createMyRegistrationHandler } from "@/features/registration/my-registration-handler.server";
import { readRegistrationActionToken, registrationActionToken, registrationFormToken } from "@/features/registration/security.server";

const env = { PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
  PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only",
  PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" };
const readiness = resolveParticipantConfig(env);
if (readiness.state !== "ready") throw new Error("Synthetic config must be ready");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 20, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001";
const requestId = "dc000000-0000-4000-8000-000000000001", operationId = "dd000000-0000-4000-8000-000000000001", secret = "d".repeat(64);
const claims = { sub: actorId, session_id: sessionId, exp: now / 1000 + 3600, iat: now / 1000, role: "authenticated", aal: "aal1",
  amr: [{ method: "password", timestamp: now / 1000 }], email: "participant@example.invalid" };
const nativeToken = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const baseRequest = { id: requestId, status: "offered", createdAt: new Date(now - 3600_000).toISOString(), offerExpiresAt: new Date(now + 3600_000).toISOString(), confirmation: null };
const base = { state: "ready", confirmationVersion: 1, request: baseRequest, window: { state: "open", eligible: true, opensAt: null }, fewPlaces: true, serverNow: new Date(now).toISOString() };
const ticketToken = "msrc1." + requestId + "." + createHmac("sha256", Buffer.from(secret, "hex")).update("msrc-ticket-v1:" + requestId).digest("hex");
const rpcNames = { accept: "msrc_registration_accept_offer", decline: "msrc_registration_decline_offer", cancel: "msrc_registration_cancel",
  confirm: "msrc_registration_confirm_seat", release: "msrc_registration_release_seat" };

function fixture(options: { result?: unknown; snapshot?: unknown; next?: unknown; error?: Error; errorRpc?: string; identity?: string | null;
  attendance?: unknown;
  claims?: unknown; observeOnly?: boolean; closed?: boolean; settingsComplete?: boolean; secret?: string | null; claim?: string;
  onClaim?: () => void; onIdentity?: () => void; refresh?: Awaited<ReturnType<RegistrationBackend["refresh"]>> } = {}) {
  let reads = 0;
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => { options.onIdentity?.(); return Object.hasOwn(options, "identity") ? options.identity! : actorId; }),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId, sessionId, accessToken: nativeToken(), refreshToken: "rotated" }),
    rpc: vi.fn(async (name) => {
      if (options.error && name === (options.errorRpc ?? "msrc_registration_me")) throw options.error;
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true,
        cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_registration_status") return { enabled: !options.closed, participantAccountsReady: true, settingsComplete: options.settingsComplete ?? true };
      if (name === "msrc_registration_me") return reads++ > 0 && Object.hasOwn(options, "next") ? options.next : options.snapshot ?? base;
      if (name === "msrc_registration_attendance") return options.attendance ?? { state: "ready", days: [] };
      if (name === "msrc_participant_form_claim") { options.onClaim?.(); return { state: options.claim ?? "claimed" }; }
      if (Object.values(rpcNames).includes(name)) return options.result ?? { state: "updated" };
      if (name === "msrc_registration_ticket") return { state: "ready", ticket: { status: "issued", referenceCode: "DC0000000000", token: ticketToken } };
      throw new Error("Unexpected RPC");
    }),
  };
  const handle = createMyRegistrationHandler({ readiness: () => readiness, secret: () => Object.hasOwn(options, "secret") ? options.secret! : secret,
    backend: () => backend, now: () => now, observeOnly: options.observeOnly });
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: nativeToken(options.claims), refreshToken: "original", origin, deadline: now + 72 * 3600_000 }, now).split(";")[0];
  const formToken = registrationActionToken(config, origin, actorId, sessionId, now);
  return { backend, handle, cookie, formToken,
    get: (headers: Record<string, string> = {}, query = "") => handle(new Request(origin + "/api/registration/me" + query, { headers: { cookie, ...headers } })),
    post: (body: Record<string, unknown> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/registration/me", {
      method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers },
      body: JSON.stringify({ action: "cancel", operationId, formToken, ...body }),
    })),
  };
}
beforeEach(() => vi.stubEnv("REGISTRATION_ENABLED", "true"));

describe("participant My registration projections", () => {
  it("exposes each configured day independently without leaking staff or entitlement identifiers", async () => {
    const days = [{ conferenceDay: "2027-01-27", checkedInAt: "2027-01-27T06:30:00Z" }, { conferenceDay: "2027-01-28", checkedInAt: null }];
    const f = fixture({ attendance: { state: "ready", days } }), response = await f.get();
    expect(response.status).toBe(200); expect((await response.json()).attendance).toEqual(days);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_registration_attendance", { edition_key: config.editionKey, session_claims: claims });
  });
  it.each([
    { state: "ready", days: [{ conferenceDay: "2027-01-27", checkedInAt: null, performerId: actorId }] },
    { state: "ready", days: [{ conferenceDay: "2027-02-29", checkedInAt: null }] },
    { state: "ready", days: [{ conferenceDay: "2027-01-27", checkedInAt: "today" }] },
    { state: "ready", days: [{ conferenceDay: "2027-01-27", checkedInAt: null }, { conferenceDay: "2027-01-27", checkedInAt: null }] },
    { state: "ready", days: [{ conferenceDay: "2027-01-28", checkedInAt: null }, { conferenceDay: "2027-01-27", checkedInAt: null }] },
    { state: "ready", days: [], ticketId: requestId }, { state: "ready", days: null },
  ])("refuses malformed or over-returned attendance %#", async (attendance) => {
    const response = await fixture({ attendance }).get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("keeps the participant cookie when the attendance migration is absent", async () => {
    const response = await fixture({ error: new RegistrationRpcMissingError(), errorRpc: "msrc_registration_attendance" }).get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it.each([["denied", 403], ["closed", 503], ["area_not_ready", 503]] as const)("honors the attendance RPC %s gate", async (state, status) => {
    const response = await fixture({ attendance: { state } }).get();
    expect(response.status).toBe(status); expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it.each([null, ...["pending_approval", "waitlisted", "offered", "approved", "confirmed", "approved_awaiting_payment", "cancelled", "expired"]
    .map((status) => ({ ...baseRequest, status }))])("renders only the canonical participant state %j", async (request) => {
    const f = fixture({ snapshot: { ...base, request } }), response = await f.get(), body = await response.json();
    expect(response.status).toBe(200); expect(body.state).toBe("ready");
    expect(body.registration?.status ?? null).toBe(request?.status ?? null);
    if (body.registration) expect(body.registration).not.toHaveProperty("id"); expect(body).not.toHaveProperty("request");
    expect(body.fewPlacesLeft).toBe(true); expect(body.serverTime).toBe(base.serverNow);
    expect(response.headers.get("cache-control")).toContain("no-store");
    for (const privateValue of [actorId, requestId, claims.email, secret, ticketToken]) expect(JSON.stringify(body)).not.toContain(privateValue);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_registration_me", { edition_key: config.editionKey, session_claims: claims });
    if (request && ["approved", "confirmed"].includes(request.status)) expect(body.ticket.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    else expect(body.ticket).toBeNull();
  });
  it.each(["early_access", "scheduled", "open", "closed"])("reads %s window without requiring submission eligibility", async (state) => {
    const response = await fixture({ snapshot: { ...base, request: null, fewPlaces: false,
      window: { state, eligible: false, opensAt: new Date(now + 7200_000).toISOString() } } }).get();
    expect(await response.json()).toMatchObject({ state: "ready", registration: null, fewPlacesLeft: false,
      window: { state: state === "early_access" ? "early-access" : state, eligible: false } });
  });
  it.each([
    { ...base, email: "private@example.invalid" }, { ...base, remaining: 2 }, { ...base, fewPlaces: "true" },
    { ...base, serverNow: "today" }, { ...base, request: { ...baseRequest, participantId: actorId } },
    { ...base, request: { ...baseRequest, offerExpiresAt: null } }, { ...base, request: { ...baseRequest, status: "unknown" } },
    { ...base, request: { ...baseRequest, id: "bad" } }, { ...base, window: { ...base.window, emails: [claims.email] } },
  ])("rejects malformed or over-returned private data", async (snapshot) => {
    const response = await fixture({ snapshot }).get(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("does not require ticket issuance configuration to read pending or cancelled requests", async () => {
    expect((await fixture({ secret: null }).get()).status).toBe(200);
    expect(await (await fixture({ secret: null, snapshot: { ...base, request: { ...baseRequest, status: "approved" } } }).get()).json()).toEqual({ state: "area-not-ready" });
  });
  it("keeps existing requests manageable when collection settings become incomplete", async () => {
    const f = fixture({ settingsComplete: false });
    expect((await f.get()).status).toBe(200); expect((await f.post()).status).toBe(200);
  });
});

describe("participant lifecycle mutation boundary", () => {
  it.each(["accept", "decline", "cancel"] as const)("%s uses own server-derived request and stable operation id", async (action) => {
    const next = { ...base, request: { ...baseRequest, status: action === "accept" ? "approved" : "cancelled", offerExpiresAt: null } };
    const f = fixture({ next }); const response = await f.post({ action });
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ state: "ready", outcome: "updated", registration: { status: next.request.status } });
    expect(f.backend.rpc).toHaveBeenCalledWith(rpcNames[action], { edition_key: config.editionKey, session_claims: claims,
      request_id: requestId, operation_id: operationId, ...(action === "accept" ? { ticket_secret: secret } : {}) });
    expect(vi.mocked(f.backend.rpc).mock.calls.filter(([name]) => name === "msrc_registration_me")).toHaveLength(2);
  });
  it.each(["expired", "conflict"])("%s returns the refreshed authoritative state", async (state) => {
    const response = await fixture({ result: { state }, next: { ...base, request: { ...baseRequest, status: "expired", offerExpiresAt: null } } }).post({ action: "accept" });
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ state: "ready", outcome: state, registration: { status: "expired" } });
  });
  it("two concurrent retries preserve their operation id and get separate aggregate rate claims", async () => {
    const f = fixture(); const responses = await Promise.all([f.post(), f.post()]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const calls = vi.mocked(f.backend.rpc).mock.calls;
    expect(calls.filter(([name]) => name === rpcNames.cancel).map(([, args]) => args?.operation_id)).toEqual([operationId, operationId]);
    expect(new Set(calls.filter(([name]) => name === "msrc_participant_form_claim").map(([, args]) => args?.nonce_hash)).size).toBe(2);
  });
  it.each([{ requestId: actorId }, { actorId }, { status: "approved" }, { ticket_secret: secret }, { confirmed: true }, { action: "approve" },
    { operationId: "bad" }, { formToken: "bad" }])("rejects forged or invalid action fields %j", async (body) => {
    const f = fixture(); expect((await f.post(body)).status).toBe(400);
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => Object.values(rpcNames).includes(name))).toBe(false);
  });
  it("rejects another participant/session action token", async () => {
    for (const [actor, session] of [[sessionId, sessionId], [actorId, actorId]]) {
      const f = fixture(); expect((await f.post({ formToken: registrationActionToken(config, origin, actor, session, now) })).status).toBe(400);
      expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => Object.values(rpcNames).includes(name))).toBe(false);
    }
  });
  it("denies a database limit before any mutation", async () => {
    const f = fixture({ claim: "denied" }); const response = await f.post(); expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ state: "limited" });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => Object.values(rpcNames).includes(name))).toBe(false);
  });
  it("rechecks a feature closure after a rate claim", async () => {
    const f = fixture({ onClaim: () => vi.stubEnv("REGISTRATION_ENABLED", "false") });
    expect(await (await f.post()).json()).toEqual({ state: "closed" });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => Object.values(rpcNames).includes(name))).toBe(false);
  });
  it("rechecks closure before reading an own status that can automatically expire an offer", async () => {
    const f = fixture({ onIdentity: () => vi.stubEnv("REGISTRATION_ENABLED", "false") });
    expect(await (await f.get()).json()).toEqual({ state: "closed" });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_me")).toBe(false);
  });
  it("does not mutate when no own request exists", async () => {
    const f = fixture({ snapshot: { ...base, request: null } }); const response = await f.post();
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ state: "ready", registration: null, outcome: "conflict" });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => Object.values(rpcNames).includes(name))).toBe(false);
  });
  it("requires the separate secret only to accept, not to release a seat", async () => {
    expect(await (await fixture({ secret: null }).post({ action: "accept" })).json()).toEqual({ state: "area-not-ready" });
    expect((await fixture({ secret: null }).post()).status).toBe(200);
  });
  it.each(["denied", "closed", "area_not_ready", "unavailable"])("honors atomic database refusal %s", async (state) => {
    const response = await fixture({ result: { state } }).post();
    expect(response.status).toBe(state === "denied" ? 403 : 503);
    expect(await response.json()).toEqual({ state: state === "area_not_ready" ? "area-not-ready" : state });
  });
});

describe("participant confirm-your-seat", () => {
  const deadline = new Date(now + 3600_000).toISOString();
  const awaiting = { ...base, request: { ...baseRequest, status: "approved", offerExpiresAt: null, confirmation: { state: "awaiting", deadline } } };
  it.each(["awaiting", "confirmed", "released", "kept"] as const)("projects only public confirmation fields for %s", async (state) => {
    const status = { awaiting: "approved", confirmed: "confirmed", released: "cancelled", kept: "approved" }[state];
    const response = await fixture({ snapshot: { ...awaiting, request: { ...awaiting.request, status, confirmation: { state, deadline } } } }).get();
    expect(response.status).toBe(200);
    expect((await response.json()).registration.confirmation).toEqual({ state, deadline });
  });
  it.each([
    { state: "unknown", deadline }, { state: "awaiting", deadline: "tomorrow" }, { state: "awaiting", deadline, roundId: requestId },
    { state: "confirmed", deadline }, { state: "released", deadline }, {}, [], "awaiting", undefined,
  ])("fails closed for invalid, private or inconsistent confirmation data %#", async (confirmation) => {
    const response = await fixture({ snapshot: { ...awaiting, request: { ...awaiting.request, confirmation } } }).get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("distinguishes an older installed own-status RPC from invalid projections and retains login", async () => {
    const older: Record<string, unknown> = { ...base }; delete older.confirmationVersion;
    const response = await fixture({ snapshot: older }).get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie")).toBeNull();
    const unknown = await fixture({ snapshot: { ...base, confirmationVersion: 2 } }).get();
    expect(await unknown.json()).toEqual({ state: "unavailable" });
  });
  it("confirmation keeps the original ticket while returning the canonical confirmed status", async () => {
    const next = { ...awaiting, request: { ...awaiting.request, status: "confirmed", confirmation: { state: "confirmed", deadline } } };
    const f = fixture({ snapshot: awaiting, next });
    const before = await (await f.get()).json(), response = await f.post({ action: "confirm" }), after = await response.json();
    expect(response.status).toBe(200); expect(after.registration.status).toBe("confirmed");
    expect(after.registration.confirmation.state).toBe("confirmed"); expect(after.ticket).toEqual(before.ticket);
    expect(f.backend.rpc).toHaveBeenCalledWith(rpcNames.confirm, { edition_key: config.editionKey, session_claims: claims,
      request_id: requestId, operation_id: operationId });
  });
  it("release requires no ticket issuance secret and removes the ticket from the refreshed view", async () => {
    const next = { ...awaiting, request: { ...awaiting.request, status: "cancelled", confirmation: { state: "released", deadline } } };
    const f = fixture({ snapshot: awaiting, next, secret: null }), response = await f.post({ action: "release" });
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ registration: { status: "cancelled", confirmation: { state: "released" } }, ticket: null });
    expect(f.backend.rpc).toHaveBeenCalledWith(rpcNames.release, { edition_key: config.editionKey, session_claims: claims,
      request_id: requestId, operation_id: operationId });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_ticket")).toBe(false);
  });
  it.each(["confirm", "release"] as const)("%s retries keep the idempotency key and use fresh canonical reads", async (action) => {
    const f = fixture();
    const results = await Promise.all([f.post({ action }), f.post({ action })]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(vi.mocked(f.backend.rpc).mock.calls.filter(([name]) => name === rpcNames[action]).map(([, args]) => args?.operation_id)).toEqual([operationId, operationId]);
  });
  it.each(["confirm", "release"] as const)("%s remains denied for another identity, invalid token, rate denial or closure", async (action) => {
    for (const [f, body, status] of [
      [fixture({ identity: sessionId }), { action }, 401],
      [fixture(), { action, formToken: registrationActionToken(config, origin, sessionId, sessionId, now) }, 400],
      [fixture({ claim: "denied" }), { action }, 429],
      [fixture({ closed: true }), { action }, 503],
    ] as const) {
      expect((await f.post(body)).status).toBe(status);
      expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === rpcNames[action])).toBe(false);
    }
  });
  it.each(["confirm", "release"] as const)("a missing %s RPC retains the valid session", async (action) => {
    const response = await fixture({ error: new RegistrationRpcMissingError(), errorRpc: rpcNames[action] }).post({ action });
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it.each(["released", "kept"] as const)("a confirm racing expiry displays the server's %s decision", async (state) => {
    const next = { ...awaiting, request: { ...awaiting.request, status: state === "released" ? "cancelled" : "approved", confirmation: { state, deadline } } };
    const response = await fixture({ snapshot: awaiting, next, result: { state: "expired" } }).post({ action: "confirm" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ outcome: "expired", registration: { status: next.request.status, confirmation: { state } } });
  });
});

describe("participant account, deployment and origin guards", () => {
  it("keeps the workflow closed before provider construction", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "false"); const backend = vi.fn();
    expect((await createMyRegistrationHandler({ backend })(new Request(origin))).status).toBe(503); expect(backend).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ cookie: "" }, { origin: "https://evil.example.invalid" }, { "sec-fetch-site": "cross-site" }])("denies unauthorized browser request %j", async (headers) => {
    const f = fixture(); expect([400, 401]).toContain((await f.get(headers)).status);
    expect([400, 401]).toContain((await f.post({}, headers)).status);
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_registration_me")).toBe(false);
  });
  it.each([{ sub: sessionId }, { session_id: actorId }, { role: "service_role" }, { aal: "aal2" }, { amr: [] }])("rejects invalid native claims %j", async (change) => {
    expect((await fixture({ claims: { ...claims, ...change } }).get()).status).toBe(401);
  });
  it("rejects identity mismatch, policy closure, caller-selected participants and invalid methods", async () => {
    expect((await fixture({ identity: sessionId }).get()).status).toBe(401);
    expect((await fixture({ closed: true }).get()).status).toBe(503);
    expect((await fixture().get({}, "?actorId=" + actorId)).status).toBe(400);
    expect((await fixture().get({}, "?locale=fr")).status).toBe(400);
    expect((await fixture().handle(new Request(origin + "/api/registration/me", { method: "PUT" }))).status).toBe(405);
    expect((await fixture().post({}, { origin: "" })).status).toBe(400);
  });
  it.each([new RegistrationRpcMissingError(), new Error("outage")])("missing migration/outage keeps a valid session", async (error) => {
    for (const errorRpc of ["msrc_registration_me", "msrc_registration_cancel"]) {
      const response = await fixture({ error, errorRpc }).post(); expect(response.status).toBe(503); expect(response.headers.get("set-cookie")).toBeNull();
      expect(await response.json()).toEqual({ state: error instanceof RegistrationRpcMissingError ? "area-not-ready" : "unavailable" });
    }
  });
  it("refreshes the same native session; RSC never consumes a refresh", async () => {
    const expired = { ...claims, exp: now / 1000 - 1 };
    const f = fixture({ claims: expired }); expect((await f.get()).headers.get("set-cookie")).toContain("participant"); expect(f.backend.refresh).toHaveBeenCalledOnce();
    const observe = fixture({ claims: expired, observeOnly: true }); expect((await observe.get()).status).toBe(401); expect(observe.backend.refresh).not.toHaveBeenCalled();
    const wrong = fixture({ claims: expired, refresh: { actorId, sessionId: actorId, accessToken: nativeToken(), refreshToken: "wrong" } });
    const response = await wrong.get(); expect(response.status).toBe(401); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it.each(Object.values(rpcNames).concat("msrc_registration_me"))("only calls %s over the private service transport", async (name) => {
    const fetcher = vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 })); vi.stubGlobal("fetch", fetcher);
    try {
      await expect(createRegistrationBackend(config).rpc(name)).rejects.toBeInstanceOf(RegistrationRpcMissingError);
      const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
      expect(new Headers(init.headers).get("apikey")).toBe(config.secretKey);
      expect(new Headers(init.headers).get("authorization")).toBeNull();
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("lifecycle CSRF evidence", () => {
  it("permits immediate actions and retries until the fixed 30-minute expiry", () => {
    const token = registrationActionToken(config, origin, actorId, sessionId, now);
    const payload = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
    expect(payload).not.toContain(actorId); expect(payload).not.toContain(sessionId);
    for (const age of [0, 1, 1000, 29 * 60_000]) expect(readRegistrationActionToken(config, token, origin, actorId, sessionId, now + age)).toBe(true);
    expect(readRegistrationActionToken(config, token, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false);
  });
  it("rejects collection-form tokens, other actors/sessions/origins, future tokens and tampering", () => {
    const token = registrationActionToken(config, origin, actorId, sessionId, now);
    for (const value of [token.slice(0, -4), token + ".extra", "bad", null, registrationFormToken(config, origin, actorId, sessionId, now - 3_000)])
      expect(readRegistrationActionToken(config, value, origin, actorId, sessionId, now)).toBe(false);
    expect(readRegistrationActionToken(config, token, origin, sessionId, sessionId, now)).toBe(false);
    expect(readRegistrationActionToken(config, token, origin, actorId, actorId, now)).toBe(false);
    expect(readRegistrationActionToken(config, token, "https://untrusted.invalid", actorId, sessionId, now)).toBe(false);
    expect(readRegistrationActionToken(config, token, origin, actorId, sessionId, now - 1)).toBe(false);
  });
});
