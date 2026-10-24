import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { createWorkshopParticipantHandler } from "@/features/workshops/participant-handler.server";
import { createWorkshopParticipantBackend, WorkshopRpcMissingError } from "@/features/workshops/participant-backend.server";
import { workshopActionToken, validWorkshopActionToken } from "@/features/workshops/participant-security.server";
import { workshopParticipantProjection, workshopProjection } from "@/features/workshops/participant-contracts";
import { createWorkshopRequester } from "@/features/workshops/participant-client";
import { publicWorkshopProjection } from "@/features/workshops/public-contract";
import { handlePublicWorkshops } from "@/features/workshops/public.server";

const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only",
  RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic workshop configuration must be ready");
const config = readiness.config, origin = config.origins[0], now = Date.UTC(2026, 9, 24, 12), iso = new Date(now).toISOString();
const actor = "a1000000-0000-4000-8000-000000000001", session = "a2000000-0000-4000-8000-000000000001", workshopId = "a3000000-0000-4000-8000-000000000001";
const bookingId = "a4000000-0000-4000-8000-000000000001", operationId = "a5000000-0000-4000-8000-000000000001";
const claims = { sub: actor, session_id: session, exp: now / 1000 + 3600, role: "authenticated", aal: "aal1", amr: [{ method: "password" }] };
const token = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const workshop = { id: workshopId, version: 1, titleEn: "Synthetic workshop", titleAr: "ورشة تجريبية", descriptionEn: "Synthetic description", descriptionAr: "وصف تجريبي", instructor: "Synthetic instructor", room: "Synthetic room", startAt: iso, endAt: new Date(now + 3600000).toISOString(), capacity: 1, remaining: 1, eligibilityEn: "Confirmed registration", eligibilityAr: "تسجيل مؤكد", eligibilityRule: "confirmed_registration", priceMinor: 0, currency: "SAR", bookingDeadline: iso, transferBufferMinutes: 0, removed: false, published: true, ready: true };
const booking = { id: bookingId, workshopId, status: "held", requestedAt: iso, expiresAt: iso, approvedAt: null, checkedInAt: null, completedAt: null, conflict: false, fullDiscount: false };
const snapshot = { state: "ready", workshops: [workshop], bookings: [booking], serverNow: iso, mockPaymentEnabled: true };
function fixture(options: { raw?: unknown; result?: unknown; error?: Error; identity?: string | null; observeOnly?: boolean; onClaim?: () => void; customClaims?: unknown; refresh?: Awaited<ReturnType<RegistrationBackend["refresh"]>> } = {}) {
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => Object.hasOwn(options, "identity") ? options.identity! : actor),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId: actor, sessionId: session, accessToken: token(), refreshToken: "rotated" }),
    rpc: vi.fn(async (name) => {
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_participant_form_claim") { options.onClaim?.(); return { state: "claimed" }; }
      if (options.error) throw options.error;
      if (name === "msrc_workshop_participant_read") return options.raw ?? snapshot;
      if (name === "msrc_workshop_participant_mutate") return options.result ?? { state: "updated" };
      throw new Error("Unexpected RPC");
    }),
  };
  const handle = createWorkshopParticipantHandler({ backend: () => backend, readiness: () => readiness, now: () => now, observeOnly: options.observeOnly });
  const cookie = participantCookie(config, { actorId: actor, sessionId: session, accessToken: token(options.customClaims), refreshToken: "original", deadline: now + 72 * 3600000, origin }, now).split(";")[0];
  const formToken = workshopActionToken(config, origin, actor, session, now);
  return { backend, handle, cookie, formToken,
    get: (extra: Record<string, string> = {}, query = "") => handle(new Request(origin + "/api/workshops" + query, { headers: { cookie, ...extra } })),
    post: (body: Record<string, unknown> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/workshops", { method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers }, body: JSON.stringify({ action: "cancel", bookingId, operationId, formToken, ...body }) })),
  };
}
beforeEach(() => { vi.stubEnv("WORKSHOP_BOOKING_ENABLED", "true"); vi.stubEnv("WORKSHOP_MOCK_PAYMENT_ENABLED", ""); });

describe("workshop participant authority and lifecycle", () => {
  it("is closed before provider construction when the runtime flag is absent", async () => {
    vi.stubEnv("WORKSHOP_BOOKING_ENABLED", ""); const backend = vi.fn();
    const response = await createWorkshopParticipantHandler({ backend })(new Request(origin + "/api/workshops"));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "closed" }); expect(backend).not.toHaveBeenCalled();
  });
  it("reads only verified own claims, never client actor IDs, and keeps responses private", async () => {
    const f = fixture(), response = await f.get(), value = await response.json();
    expect(response.status).toBe(200); expect(value.bookings).toEqual([booking]); expect(value.mockPaymentEnabled).toBe(false);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_workshop_participant_read", { edition_key: config.editionKey, session_claims: claims });
    expect(JSON.stringify(value)).not.toContain(actor); expect(JSON.stringify(value)).not.toContain(session);
  });
  it.each(["request", "waitlist", "accept_offer", "decline_offer", "cancel", "redeem_discount", "mock_pay"])("passes a bounded idempotent %s action to the database", async (action) => {
    vi.stubEnv("WORKSHOP_MOCK_PAYMENT_ENABLED", "true"); const f = fixture();
    const response = await f.post(action === "request" || action === "waitlist" ? { action, bookingId: undefined, workshopId } : { action });
    expect(response.status).toBe(200); expect((await response.json()).outcome).toBe("updated");
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_workshop_participant_mutate", { edition_key: config.editionKey, session_claims: claims, input: { action, operationId, [action === "request" || action === "waitlist" ? "workshopId" : "bookingId"]: action === "request" || action === "waitlist" ? workshopId : bookingId } });
  });
  it("holds mock payment behind a separate runtime gate", async () => {
    const f = fixture(), response = await f.post({ action: "mock_pay" }); expect(response.status).toBe(503);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_workshop_participant_mutate", expect.anything());
  });
  it.each(["conflict", "full", "expired", "not_found"])("refreshes authoritative rows after %s without claiming success", async (state) => {
    const response = await fixture({ result: { state } }).post(); expect(response.status).toBe(409); expect((await response.json()).outcome).toBe(state);
  });
  it.each(["closed", "denied", "area_not_ready"])("honors database gate %s", async (state) => {
    const response = await fixture({ raw: { state } }).get(); expect((await response.json()).state).toBe(state.replaceAll("_", "-")); expect(response.status).toBe(state === "denied" ? 403 : 503);
  });
  it("retains login when the pending migration is absent", async () => {
    const response = await fixture({ error: new WorkshopRpcMissingError() }).get(); expect(await response.json()).toEqual({ state: "area-not-ready" }); expect(response.headers.get("set-cookie")).toBeNull();
  });
  it.each([{ actorId: actor }, { status: "confirmed" }, { fullDiscount: true }, { action: "approve" }, { operationId: "bad" }, { formToken: "bad" }])("rejects client authority, malformed fields and invalid CSRF %#", async (body) => {
    const f = fixture(); expect((await f.post(body)).status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_workshop_participant_mutate", expect.anything());
  });
  it("rejects cross-origin and anonymous reads", async () => {
    const f = fixture(); expect((await f.get({ origin: "https://evil.invalid" })).status).toBe(400);
    expect((await f.get({ cookie: "" })).status).toBe(401); expect((await f.get({}, "?actor=" + actor)).status).toBe(400);
  });
  it("never forwards editable claims and rejects mismatched native identity", async () => {
    const f = fixture({ customClaims: { ...claims, user_metadata: { role: "super_admin" } } }); await f.get();
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_workshop_participant_read", { edition_key: config.editionKey, session_claims: claims });
    expect((await fixture({ identity: null }).get()).status).toBe(401);
  });
  it("rechecks closure after rate limiting before mutation", async () => {
    const f = fixture({ onClaim: () => vi.stubEnv("WORKSHOP_BOOKING_ENABLED", "") }); expect((await f.post()).status).toBe(503);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_workshop_participant_mutate", expect.anything());
  });
  it("does not refresh or mutate in server-component observation", async () => {
    const f = fixture({ observeOnly: true, customClaims: { ...claims, exp: now / 1000 - 1 } }); expect((await f.get()).status).toBe(401); expect(f.backend.refresh).not.toHaveBeenCalled();
    expect((await fixture({ observeOnly: true }).post()).status).toBe(405);
  });
});

describe("workshop projection privacy", () => {
  it.each([{ ...snapshot, actorId: actor }, { ...snapshot, bookings: [{ ...booking, actorId: actor }] }, { ...snapshot, workshops: [{ ...workshop, instructorActorId: actor }] }, { ...snapshot, bookings: [{ ...booking, status: "future" }] }, { ...snapshot, bookings: [{ ...booking, requestedAt: "today" }] }, { ...snapshot, workshops: [{ ...workshop, capacity: -1 }] }])("rejects malformed or over-returned private records %#", async (raw) => {
    expect(workshopParticipantProjection(raw)).toBeNull(); const response = await fixture({ raw }).get(); expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("supports nullable records without turning them into operational values", () => {
    const unset = { ...Object.fromEntries(Object.entries(workshop).map(([key, value]) => [key, ["id", "version", "published", "ready", "removed"].includes(key) ? value : null])), ready: false };
    expect(workshopProjection([unset])).toEqual([unset]);
  });
  it.each([{ remaining: 2 }, { priceMinor: null }, { transferBufferMinutes: null }, { endAt: iso }])("refuses impossible or incomplete bookable data %#", (change) => {
    expect(workshopProjection([{ ...workshop, ...change }])).toBeNull();
  });
  it("publishes remaining counts and bilingual details without participant records", () => {
    const projection = publicWorkshopProjection({ state: "ready", workshops: [workshop] }); expect(projection?.[0]).toMatchObject({ remainingSeats: 1, capacity: 1, title: { en: workshop.titleEn, ar: workshop.titleAr }, instructor: workshop.instructor });
    expect(publicWorkshopProjection({ state: "ready", workshops: [{ ...workshop, removed: true }] })).toBeNull();
    expect(publicWorkshopProjection({ state: "ready", workshops: [{ ...workshop, published: false }] })).toBeNull();
    expect(publicWorkshopProjection({ state: "ready", workshops: [workshop], bookings: [booking] })).toBeNull();
  });
  it("binds action evidence to the workshop purpose, actor, session, origin and lifetime", () => {
    const signed = workshopActionToken(config, origin, actor, session, now);
    expect(validWorkshopActionToken(config, signed, origin, actor, session, now)).toBe(true);
    expect(validWorkshopActionToken(config, signed, origin, workshopId, session, now)).toBe(false);
    expect(validWorkshopActionToken(config, signed, origin, actor, bookingId, now)).toBe(false);
    expect(validWorkshopActionToken(config, signed, "https://evil.invalid", actor, session, now)).toBe(false);
    expect(validWorkshopActionToken(config, signed, origin, actor, session, now + 30 * 60000)).toBe(false);
  });
});

describe("workshop transport", () => {
  it.each([404, 400])("returns a missing-capability error for absent RPC status %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202" }, { status })));
    await expect(createWorkshopParticipantBackend(config).rpc("msrc_workshop_participant_read")).rejects.toBeInstanceOf(WorkshopRpcMissingError);
  });
  it("preserves the same operation across network, malformed and server errors, then clears only definite results", async () => {
    const bodies: Record<string, unknown>[] = []; let count = 0;
    const request = vi.fn(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body))); count += 1;
      if (count === 1) throw new Error("network failed after commit");
      if (count === 2) return new Response("bad", { status: 503 });
      if (count === 3) return Response.json({ state: "unavailable" }, { status: 503 });
      return Response.json({ state: "ready", outcome: "updated" });
    }) as typeof fetch;
    let ids = 0; const send = createWorkshopRequester(request, () => String(++ids));
    await expect(send("cancel", bookingId, "token", "en")).rejects.toThrow();
    await expect(send("cancel", bookingId, "token", "ar")).rejects.toThrow();
    await send("cancel", bookingId, "token", "en"); await send("cancel", bookingId, "token", "ar"); await send("cancel", bookingId, "token", "en");
    expect(bodies.map((body) => body.operationId)).toEqual(["1", "1", "1", "1", "2"]);
  });
  it("keeps an anonymous public endpoint no-store and empty without configuration", async () => {
    vi.stubEnv("STAFF_SUPABASE_URL", ""); const response = await handlePublicWorkshops();
    expect(await response.json()).toEqual({ state: "ready", workshops: [] }); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("never forwards extra public fields from a service response", async () => {
    vi.stubEnv("STAFF_SUPABASE_URL", "https://ecemjggwlzqpjcwmchrl.supabase.co"); vi.stubEnv("STAFF_SUPABASE_SECRET_KEY", "sb_secret_synthetic"); vi.stubEnv("STAFF_EDITION_KEY", "synthetic-workshops");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ state: "ready", workshops: [workshop], bookings: [booking] })));
    const response = await handlePublicWorkshops(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
  });
});
