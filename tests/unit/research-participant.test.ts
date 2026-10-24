import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { createResearchParticipantBackend, ResearchParticipantRpcMissingError } from "@/features/research-judging/participant-backend.server";
import { createResearchParticipantHandler } from "@/features/research-judging/participant-handler.server";
import { decodeWinnerSupervisor, projectResearchParticipantEntries } from "@/features/research-judging/participant-contracts";
import { researchParticipantFormToken, readResearchParticipantFormToken } from "@/features/research-judging/participant-security.server";

const origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 25, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001", awardId = "df000000-0000-4000-8000-000000000001", operationId = "df000000-0000-4000-8000-000000000002";
const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only",
  RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic participant configuration");
const config = readiness.config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: now / 1000 + 3600, amr: [{ method: "password", timestamp: now / 1000 }] };
const token = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
const details = { name: "Synthetic Supervisor", affiliation: "Synthetic institution", email: "supervisor@example.invalid", confirmed: true };
const entry = { id: actorId, title: "Synthetic research", reference: "SYNTHETIC-1", presentationFormat: null, award: null, supervisorRequest: null };
function fixture(options: { context?: unknown; error?: Error; identity?: string | null; outcome?: string; onIdentity?: () => void } = {}) {
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => { options.onIdentity?.(); return Object.hasOwn(options, "identity") ? options.identity! : actorId; }), refresh: vi.fn(async () => null),
    rpc: vi.fn(async (name) => {
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (options.error) throw options.error;
      if (name === "msrc_research_event_me") return options.context ?? { state: "ready", entries: [entry] };
      if (name === "msrc_research_event_supervisor") return { state: options.outcome ?? "saved" };
      throw new Error("Unexpected RPC");
    }),
  };
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: token, refreshToken: "synthetic", deadline: now + 72 * 3600_000, origin }, now).split(";")[0];
  const formToken = researchParticipantFormToken(config, origin, actorId, sessionId, now);
  const handle = createResearchParticipantHandler({ readiness: () => readiness, backend: () => backend, now: () => now });
  return { backend, handle, cookie, formToken,
    get: (headers: Record<string, string> = {}, query = "") => handle(new Request(origin + "/api/research-event" + query, { headers: { cookie, ...headers } })),
    post: (change: Record<string, unknown> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/research-event", { method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers },
      body: JSON.stringify({ action: "supervisor", awardId, details, operationId, formToken, ...change }) })),
  };
}
beforeEach(() => vi.stubEnv("RESEARCH_JUDGING_ENABLED", "true"));
describe("REV-07/10 participant publication and private supervisor contract", () => {
  it("allows an ordinary accepted abstract without a supervisor or a published outcome", () => expect(projectResearchParticipantEntries({ state: "ready", entries: [entry] })).toEqual([entry]));
  it("projects published oral/poster formats and an award only through explicit contract fields", () => {
    const row = { ...entry, presentationFormat: "poster", award: { categoryId: "synthetic", label: "Synthetic category" } };
    expect(projectResearchParticipantEntries({ state: "ready", entries: [row] })).toEqual([row]);
  });
  it("accepts a selected-winner request with private confirmed supervisor details", () => {
    const row = { ...entry, supervisorRequest: { awardId, deadline: "2026-12-01T00:00:00Z", evidence: "Synthetic evidence request", details } };
    expect(projectResearchParticipantEntries({ state: "ready", entries: [row] })).toEqual([row]);
  });
  it.each(["reviewerScores", "judgeScores", "preparedAward", "internalNotes", "supervisor"])("rejects unexpected private %s", (key) => expect(projectResearchParticipantEntries({ state: "ready", entries: [{ ...entry, [key]: "private" }] })).toBeNull());
  it("rejects unexpected top-level data and duplicate submissions", () => {
    expect(projectResearchParticipantEntries({ state: "ready", entries: [entry], reviews: [] })).toBeNull();
    expect(projectResearchParticipantEntries({ state: "ready", entries: [entry, entry] })).toBeNull();
  });
  it.each([{ ...details, name: "" }, { ...details, affiliation: "" }, { ...details, email: "invalid" }, { ...details, phone: "unapproved" }, { ...details, confirmed: "true" }])("rejects malformed supervisor details %#", (value) => expect(decodeWinnerSupervisor(value)).toBeNull());
});
describe("research participant HTTP boundary", () => {
  it("fails closed before constructing a backend with the flag absent", async () => {
    vi.stubEnv("RESEARCH_JUDGING_ENABLED", ""); const f = fixture(); expect((await f.get()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalled();
  });
  it("returns an owner projection with private headers and a session form token", async () => {
    const response = await fixture().get(); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ state: "ready", entries: [entry], formToken: expect.any(String) });
  });
  it("does not trust a cookie when native identity does not match", async () => { const f = fixture({ identity: null }); expect((await f.get()).status).toBe(401); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_research_event_me", expect.anything()); });
  it("denies a missing session", async () => expect((await fixture().get({ cookie: "" })).status).toBe(401));
  it.each(["?locale=de", "?submissionId=" + actorId, "?locale=en&debug=true", "?locale=en&locale=ar"])("rejects uncontracted query %s", async (query) => expect((await fixture().get({}, query)).status).toBe(400));
  it("rejects cross-origin reads and writes", async () => {
    const f = fixture(); expect((await f.get({ origin: "https://other.invalid" })).status).toBe(400);
    expect((await f.post({}, { origin: "https://other.invalid" })).status).toBe(400);
    expect(f.backend.rpc).not.toHaveBeenCalled();
  });
  it("forwards only validated supervisor details with a stable idempotency key and verified claims", async () => {
    const f = fixture(); expect((await f.post()).status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_research_event_supervisor", { edition_key: config.editionKey, session_claims: claims, award_id: awardId, details, operation_id: operationId });
  });
  it.each([{ details: { ...details, confirmed: false } }, { formToken: "forged" }, { operationId: "bad" }, { extra: "unapproved" }, { action: "publish" }])("rejects invalid mutation %#", async (change) => {
    const f = fixture(); expect((await f.post(change)).status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_research_event_supervisor", expect.anything());
  });
  it("rechecks the runtime gate immediately before mutation", async () => {
    const f = fixture({ onIdentity: () => vi.stubEnv("RESEARCH_JUDGING_ENABLED", "false") });
    expect((await f.post()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_research_event_supervisor", expect.anything());
  });
  it("rechecks the runtime gate before reading the private participant projection", async () => {
    const f = fixture({ onIdentity: () => vi.stubEnv("RESEARCH_JUDGING_ENABLED", "false") });
    expect((await f.get()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_research_event_me", expect.anything());
  });
  it("rejects supervisor affiliations exceeding the database bound", () => expect(decodeWinnerSupervisor({ ...details, affiliation: "a".repeat(501) })).toBeNull());
  it.each(["conflict", "invalid", "locked", "not_found"])("preserves a %s failure without claiming saved", async (outcome) => {
    const response = await fixture({ outcome }).post(); expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ state: "ready", outcome });
  });
  it("maps missing migration to area-not-ready", async () => { const response = await fixture({ error: new ResearchParticipantRpcMissingError() }).get(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" }); });
  it("does not serialize provider errors or malformed private projections", async () => {
    const response = await fixture({ error: new Error("synthetic private diagnostic") }).get(); expect(await response.json()).toEqual({ state: "unavailable" });
    expect(await (await fixture({ context: { state: "ready", entries: [{ ...entry, reviewScores: [100] }] } }).get()).json()).toEqual({ state: "unavailable" });
  });
});
describe("supervisor CSRF and optional server-only transport", () => {
  it("binds its token to purpose, actor, session, origin and expiry", () => {
    const token = researchParticipantFormToken(config, origin, actorId, sessionId, now);
    expect(readResearchParticipantFormToken(config, token, origin, actorId, sessionId, now)).toBe(true);
    expect(readResearchParticipantFormToken(config, token, origin, awardId, sessionId, now)).toBe(false);
    expect(readResearchParticipantFormToken(config, token, origin, actorId, awardId, now)).toBe(false);
    expect(readResearchParticipantFormToken(config, token, "https://other.invalid", actorId, sessionId, now)).toBe(false);
    expect(readResearchParticipantFormToken(config, token, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false);
  });
  it("uses service credentials without a bearer and translates PGRST202", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ code: "PGRST202" }), { status: 404 })); vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(createResearchParticipantBackend(config).rpc("msrc_research_event_me", {})).rejects.toBeInstanceOf(ResearchParticipantRpcMissingError);
      const headers = new Headers(fetchMock.mock.calls[0]![1]!.headers); expect(headers.get("authorization")).toBeNull(); expect(headers.get("apikey")).toBe(config.secretKey);
    } finally { vi.unstubAllGlobals(); }
  });
});
