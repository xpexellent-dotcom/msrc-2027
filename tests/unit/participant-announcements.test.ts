import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { createParticipantAnnouncementsHandler } from "@/features/announcements/participant-handler.server";
import { createParticipantAnnouncementsBackend, ParticipantAnnouncementsRpcMissingError } from "@/features/announcements/participant-backend.server";
import { participantAnnouncementProjection } from "@/features/announcements/participant-contracts";
import { announcementReadToken } from "@/features/announcements/participant-security.server";
import { ParticipantInbox } from "@/features/announcements/participant-inbox";
import { ParticipantAccountForm } from "@/features/participant-accounts/participant-form";

const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true",
  PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218",
  PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only",
  RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic participant config required");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 23, 12);
const actor = "aa000000-0000-4000-8000-000000000001", session = "ab000000-0000-4000-8000-000000000001";
const id = "ac000000-0000-4000-8000-000000000001";
const claims = { sub: actor, session_id: session, exp: now / 1000 + 3600, iat: now / 1000, role: "authenticated", aal: "aal1",
  amr: [{ method: "password", timestamp: now / 1000 }], email: "synthetic@example.invalid", user_metadata: { role: "superAdmin" } };
const token = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const row = { id, subjectEn: "Synthetic announcement", subjectAr: "إعلان تجريبي", bodyEn: "First paragraph.\n\n<script>plain text</script>",
  bodyAr: "الفقرة الأولى.\n\nالفقرة الثانية.", publishedAt: new Date(now).toISOString(), readAt: null };
afterEach(() => vi.unstubAllGlobals());
function fixture(options: { snapshot?: unknown; error?: Error; identity?: string | null; claims?: unknown; observeOnly?: boolean;
  refresh?: Awaited<ReturnType<RegistrationBackend["refresh"]>>; onIdentity?: () => void; claim?: string; ready?: boolean } = {}) {
  const backend: RegistrationBackend = {
    identity: vi.fn(async () => { options.onIdentity?.(); return Object.hasOwn(options, "identity") ? options.identity! : actor; }),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId: actor, sessionId: session, accessToken: token(), refreshToken: "rotated" }),
    rpc: vi.fn(async (name, args) => {
      if (name === "msrc_participant_status") return { enabled: options.ready !== false, ageEnforcementReady: true, retentionEnforcementReady: true,
        cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_participant_form_claim") return { state: options.claim ?? "claimed" };
      if (name === "msrc_participant_announcements") {
        if (options.error) throw options.error;
        return options.snapshot ?? { state: "ready", announcements: [{ ...row, readAt: args?.mark_read ? new Date(now).toISOString() : null }] };
      }
      throw new Error("Unexpected RPC");
    }),
  };
  const handle = createParticipantAnnouncementsHandler({ readiness: () => readiness, backend: () => backend, now: () => now, observeOnly: options.observeOnly });
  const cookie = participantCookie(config, { actorId: actor, sessionId: session, accessToken: token(options.claims), refreshToken: "original", origin, deadline: now + 72 * 3600_000 }, now).split(";")[0];
  const formToken = announcementReadToken(config, origin, actor, session, now);
  return { backend, handle, cookie, formToken,
    get: (headers: Record<string, string> = {}, query = "") => handle(new Request(origin + "/api/announcements" + query, { headers: { cookie, ...headers } })),
    post: (body: Record<string, unknown> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/announcements", {
      method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers }, body: JSON.stringify({ announcementId: id, formToken, ...body }),
    })),
  };
}

describe("participant announcements authority and projection", () => {
  it("uses verified bound claims, discards editable metadata and returns own inbox only", async () => {
    const f = fixture(), response = await f.get(), body = await response.json();
    expect(response.status).toBe(200); expect(body).toMatchObject({ state: "ready", announcements: [row] });
    expect(body.formToken).toEqual(expect.any(String)); expect(response.headers.get("cache-control")).toContain("no-store");
    const bound = { sub: claims.sub, session_id: claims.session_id, exp: claims.exp, iat: claims.iat, role: claims.role,
      aal: claims.aal, amr: claims.amr, email: claims.email };
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_participant_announcements", { edition_key: config.editionKey, session_claims: bound,
      announcement_id: null, mark_read: false });
    expect(JSON.stringify(body)).not.toContain(claims.email); expect(JSON.stringify(body)).not.toContain(actor);
  });
  it("marks only the requested item through the bound server RPC", async () => {
    const f = fixture(), response = await f.post();
    expect(response.status).toBe(200); expect((await response.json()).announcements[0].readAt).toBe(new Date(now).toISOString());
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_participant_announcements", expect.objectContaining({ announcement_id: id, mark_read: true }));
  });
  it("denies anonymous access without calling the inbox RPC", async () => {
    const f = fixture(), response = await f.get({ cookie: "" });
    expect(response.status).toBe(401); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it.each([null, "ff000000-0000-4000-8000-000000000001"])("denies identity mismatch %s", async (identity) => {
    const f = fixture({ identity }); expect((await f.get()).status).toBe(401);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it.each([{ ...claims, session_id: actor }, { ...claims, aal: "aal2" }, { ...claims, amr: [{ method: "otp" }] }, { ...claims, role: "service_role" }])("denies unbound or nonparticipant claims", async (claims) => {
    const f = fixture({ claims }); expect((await f.get()).status).toBe(401);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it.each([
    { announcementId: "bad" }, { actorId: actor }, { formToken: "forged" },
    { formToken: announcementReadToken(config, origin, actor, actor, now) },
    { formToken: announcementReadToken(config, origin, actor, session, now - 30 * 60_000) },
  ])("refuses forged, stale or over-specified read mutations %#", async (body) => {
    const f = fixture(); expect((await f.post(body)).status).toBe(400);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it.each<Record<string, string>>([{ origin: "https://attacker.invalid" }, { "sec-fetch-site": "cross-site" }, { origin: "" }])("rejects cross-origin mutations %#", async (headers) => {
    const f = fixture(); expect((await f.post({}, headers)).status).toBe(400);
  });
  it("rate limits mutations before the inbox write", async () => {
    const f = fixture({ claim: "limited" }); expect((await f.post()).status).toBe(429);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it("honors closed account readiness", async () => {
    const f = fixture({ ready: false }); expect(await (await f.get()).json()).toEqual({ state: "closed" });
    expect(f.backend.identity).not.toHaveBeenCalled();
  });
  it("rechecks readiness after identity before the RPC", async () => {
    let ready = true; const f = fixture({ onIdentity: () => { ready = false; } });
    const handle = createParticipantAnnouncementsHandler({ readiness: () => ready ? readiness : { state: "closed" }, backend: () => f.backend, now: () => now });
    const response = await handle(new Request(origin + "/api/announcements", { headers: { cookie: f.cookie } }));
    expect(await response.json()).toEqual({ state: "closed" });
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_announcements", expect.anything());
  });
  it.each([["denied", 403], ["closed", 503], ["area_not_ready", 503]] as const)("honors database %s", async (state, status) => {
    const response = await fixture({ snapshot: { state } }).get(); expect(response.status).toBe(status);
    expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it("keeps the signed-in session when the pending RPC is missing", async () => {
    const response = await fixture({ error: new ParticipantAnnouncementsRpcMissingError() }).get();
    expect(await response.json()).toEqual({ state: "area-not-ready" }); expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("converts provider failure to an unavailable response without exposing its text", async () => {
    const response = await fixture({ error: new Error("private database diagnostic") }).get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" }); expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("refreshes only the same actor and session, preserving the absolute deadline", async () => {
    const f = fixture({ claims: { ...claims, exp: now / 1000 - 1 } }), response = await f.get();
    expect(response.status).toBe(200); expect(f.backend.refresh).toHaveBeenCalledWith("original"); expect(response.headers.get("set-cookie")).toBeTruthy();
    const mismatch = fixture({ claims: { ...claims, exp: now / 1000 - 1 }, refresh: { actorId: actor, sessionId: actor, accessToken: token(), refreshToken: "other" } });
    expect((await mismatch.get()).status).toBe(401); expect(mismatch.backend.identity).not.toHaveBeenCalled();
  });
  it("SSR observes without refreshing or marking a message", async () => {
    const f = fixture({ observeOnly: true, claims: { ...claims, exp: now / 1000 - 1 } });
    expect((await f.get()).status).toBe(401); expect((await f.post()).status).toBe(405); expect(f.backend.refresh).not.toHaveBeenCalled();
  });
  it.each(["?actorId=" + actor, "?locale=fr"])("rejects client-controlled query fields %s", async (query) => {
    const f = fixture(); expect((await f.get({}, query)).status).toBe(400); expect(f.backend.identity).not.toHaveBeenCalled();
  });
  it.each([
    { ...row, email: "private@example.invalid" }, { ...row, id: "bad" }, { ...row, readAt: "today" },
    { ...row, bodyAr: "" }, { ...row, publishedAt: "2026" }, { ...row, subjectEn: "a".repeat(301) },
  ])("refuses malformed or over-returned recipient data %#", async (entry) => {
    const response = await fixture({ snapshot: { state: "ready", announcements: [entry] } }).get();
    expect(await response.json()).toEqual({ state: "unavailable" });
  });
  it("rejects duplicate, unsorted and excessive inbox rows", () => {
    expect(participantAnnouncementProjection({ state: "ready", announcements: [row, row] })).toBeNull();
    expect(participantAnnouncementProjection({ state: "ready", announcements: [{ ...row, publishedAt: new Date(now - 1000).toISOString() }, { ...row, id: actor }] })).toBeNull();
    expect(participantAnnouncementProjection({ state: "ready", announcements: Array(101).fill(row) })).toBeNull();
  });
  it.each(["en", "ar"] as const)("renders %s inbox and native translation details in server HTML", (locale) => {
    const html = renderToStaticMarkup(createElement(ParticipantInbox, { locale, initialState: { state: "ready", announcements: [row], formToken: "synthetic" } }));
    expect(html).toContain(row.subjectEn); expect(html).toContain(row.subjectAr); expect(html).toContain("<details"); expect(html).toContain("<summary");
    expect(html).toContain("<time dateTime="); expect(html).toContain('lang="ar" dir="rtl"'); expect(html).toContain("&lt;script&gt;plain text&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    const page = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "my-msrc",
      initialState: { enabled: true, notice: null, profile: { name: "Synthetic Participant", accountState: "verified" }, sessionState: "authenticated" },
      initialAnnouncements: { state: "ready", announcements: [row] } }));
    expect(page).toContain(row.subjectEn); expect(page).toContain(row.subjectAr);
  });
});

describe("participant announcements private transport", () => {
  it("uses a server apikey and never a client bearer or provider caching", async () => {
    const fetch = vi.fn(async () => Response.json({ state: "ready", announcements: [] })); vi.stubGlobal("fetch", fetch);
    await createParticipantAnnouncementsBackend(config).rpc("msrc_participant_announcements", { edition_key: config.editionKey });
    expect(fetch).toHaveBeenCalledWith(config.supabaseUrl + "/rest/v1/rpc/msrc_participant_announcements", expect.objectContaining({ cache: "no-store", redirect: "error",
      headers: { apikey: config.secretKey, "Content-Type": "application/json" } }));
  });
  it.each([["PGRST202", 404], ["42883", 400]] as const)("recognizes missing-function %s as an absent migration", async (code, status) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code }, { status })));
    await expect(createParticipantAnnouncementsBackend(config).rpc("msrc_participant_announcements")).rejects.toBeInstanceOf(ParticipantAnnouncementsRpcMissingError);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "private" }, { status: 404 })));
    await expect(createParticipantAnnouncementsBackend(config).rpc("msrc_participant_announcements")).rejects.not.toBeInstanceOf(ParticipantAnnouncementsRpcMissingError);
  });
  it("refuses unrelated RPC names", async () => {
    await expect(createParticipantAnnouncementsBackend(config).rpc("msrc_staff_announcements")).rejects.toThrow("Unknown private announcements RPC");
  });
});
