import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { createParticipantProfileBackend, ParticipantProfileRpcMissingError, type ParticipantProfileBackend } from "@/features/participant-accounts/profile-backend.server";
import { createParticipantProfileHandler } from "@/features/participant-accounts/profile-handler.server";
import { profileFormToken, readProfileFormToken } from "@/features/participant-accounts/profile-security.server";
import { MAX_AVATAR_BYTES, readProfileForm, reencodeProfileAvatar, validateProfileForm } from "@/features/participant-accounts/profile-validation.server";
import { participantCookie, participantFormToken, readParticipantSession } from "@/features/participant-accounts/security.server";
import { EMPTY_PARTICIPANT_PROFILE, PROFILE_STATUSES, isProfileIdentityNumber, isAdultProfileDate, isProfilePhone } from "@/features/participant-accounts/profile-contract";
import { abstractSettings } from "../fixtures/abstracts";

const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
  PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only",
  PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic participant configuration required");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 27, 12), deadline = now + 72 * 3600_000;
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001";
const otherId = "da000000-0000-4000-8000-000000000002", avatarObject = "dc000000-0000-4000-8000-000000000001.webp";
const claims = { sub: actorId, session_id: sessionId, exp: now / 1000 + 3600, iat: now / 1000, role: "authenticated", aal: "aal1", amr: [{ method: "password", timestamp: now / 1000 }] };
const token = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
const profile = { institution: null, institutionId: null, institutionOther: null, studentStatus: null, studentYear: null, arabicName: null, nationality: null, gender: null, dateOfBirth: null, city: null, phone: null, identityType: null, identityLast4: null, specialtyInterests: [], avatarObject: null, version: 0 };
const current = { state: "ready", profile, specialties: abstractSettings.specialties, sessionDeadline: new Date(deadline).toISOString() };
const status = { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
function form(extra: Record<string, string | Blob> = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({ action: "save", institutionId: "", institutionOther: "  Synthetic institution  ", status: "year_3", arabicName: "", nationality: "", gender: "", dateOfBirth: "", city: "", phone: "", identityType: "", identityNumber: "",
    interests: JSON.stringify([abstractSettings.specialties[0].id]), version: "0", formToken: profileFormToken(config, origin, actorId, sessionId, now), website: "", ...extra })) result.set(key, value);
  return result;
}
function fixture(options: { identity?: string | null; accessClaims?: unknown; current?: unknown; save?: unknown; claim?: string;
  refresh?: Awaited<ReturnType<ParticipantProfileBackend["refresh"]>>; upload?: boolean; remove?: boolean; abandon?: string; error?: Error; errorRpc?: string; onSave?: () => void; onRead?: () => void } = {}) {
  const backend: ParticipantProfileBackend = {
    identity: vi.fn(async () => Object.hasOwn(options, "identity") ? options.identity! : actorId),
    refresh: vi.fn(async () => Object.hasOwn(options, "refresh") ? options.refresh! : { actorId, sessionId, accessToken: token(), refreshToken: "synthetic-rotated" }),
    upload: vi.fn(async () => options.upload ?? true), remove: vi.fn(async () => options.remove ?? true),
    download: vi.fn(async () => new Blob(["synthetic image bytes"], { type: "image/webp" })),
    rpc: vi.fn(async (name, args) => {
      if (options.error && name === (options.errorRpc ?? "msrc_participant_profile_read")) throw options.error;
      if (name === "msrc_participant_status") return status;
      if (name === "msrc_participant_profile_read") { options.onRead?.(); return options.current ?? current; }
      if (name === "msrc_participant_form_claim") return { state: options.claim ?? "claimed" };
      if (name === "msrc_participant_profile_avatar_reserve") return { state: "reserved" };
      if (name === "msrc_participant_profile_avatar_abandon") return { state: options.abandon ?? "queued" };
      if (name === "msrc_participant_profile_avatar_deleted") return { state: "deleted" };
      if (name === "msrc_participant_profile_save") {
        options.onSave?.();
        const input = args?.profile_input as Record<string, unknown>;
        const identity = input.identity as { type: string; last4: string } | null;
        return options.save ?? { ...current, profile: { ...profile, institution: input.institutionOther, institutionId: input.institutionId, institutionOther: input.institutionOther, studentStatus: input.status,
          studentYear: null, specialtyInterests: input.interests, identityType: identity?.type ?? null, identityLast4: identity?.last4 ?? null, avatarObject: args?.avatar_object ?? null, version: 1 } };
      }
      throw new Error("Unexpected profile RPC");
    }),
  };
  const handle = createParticipantProfileHandler({ readiness: () => readiness, backend: () => backend, now: () => now });
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: token(options.accessClaims), refreshToken: "synthetic-refresh", origin, deadline }, now).split(";")[0];
  const get = (path = "", headers: Record<string, string> = {}) => handle(new Request(origin + "/api/participant-accounts/profile" + path, { headers: { cookie, ...headers } }));
  const post = (extra: Record<string, string | Blob> = {}, headers: Record<string, string> = {}) => handle(new Request(origin + "/api/participant-accounts/profile", {
    method: "POST", headers: { origin, cookie, ...headers }, body: form(extra),
  }));
  return { backend, handle, cookie, get, post };
}
async function image(format: "jpeg" | "png" | "webp" = "png") {
  const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#7358a6" } }).toFormat(format).toBuffer();
  return new File([new Uint8Array(bytes)], "synthetic." + format, { type: "image/" + format });
}
beforeEach(() => vi.stubEnv("PARTICIPANT_PROFILE_ENABLED", "true"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("optional private participant profile boundary (ENG-086 / AUTH-07 / PRV-02/03/04/06)", () => {
  it.each([undefined, "false", "TRUE", "1", ""])("flag %s closes before inspecting input or constructing providers", async (flag) => {
    vi.stubEnv("PARTICIPANT_PROFILE_ENABLED", flag); vi.stubEnv("NEXT_PUBLIC_PARTICIPANT_PROFILE_ENABLED", "true");
    const backend = vi.fn(), request = new Request(origin, { method: "POST", body: "malformed" });
    const headers = vi.spyOn(request, "headers", "get"), body = vi.spyOn(request, "body", "get");
    const response = await createParticipantProfileHandler({ backend })(request);
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "closed" });
    expect(backend).not.toHaveBeenCalled(); expect(headers).not.toHaveBeenCalled(); expect(body).not.toHaveBeenCalled();
  });
  it("requires account configuration and private readiness gates", async () => {
    const backend = vi.fn();
    expect((await createParticipantProfileHandler({ readiness: () => ({ state: "closed" }), backend })(new Request(origin))).status).toBe(503);
    expect(backend).not.toHaveBeenCalled();
    const f = fixture(); vi.mocked(f.backend.rpc).mockImplementationOnce(async () => ({ ...status, cleanupEnabled: false }));
    expect((await f.get()).status).toBe(503); expect(f.backend.identity).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }, { host: "evil.example" }])("rejects cross-origin headers %j before identity", async (headers) => {
    const f = fixture(); expect((await f.post({}, headers)).status).toBe(400); expect(f.backend.identity).not.toHaveBeenCalled();
  });
  it("requires a private session and verified native identity", async () => {
    expect((await fixture().get("", { cookie: "" })).status).toBe(401);
    for (const identity of [null, otherId]) {
      const f = fixture({ identity }); expect((await f.post()).status).toBe(401);
      expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_read")).toBe(false);
    }
  });
  it.each([{ sub: otherId }, { session_id: otherId }, { role: "service_role" }, { aal: "aal2" }, { amr: [] }])("rejects forged access claims %j", async (change) => {
    const f = fixture({ accessClaims: { ...claims, ...change } }); expect((await f.post()).status).toBe(401); expect(f.backend.upload).not.toHaveBeenCalled();
  });
  it("binds the database absolute session deadline to the private session", async () => {
    for (const sessionDeadline of [undefined, "invalid", new Date(deadline + 1000).toISOString()]) {
      const f = fixture({ current: { ...current, sessionDeadline } }); expect((await f.post()).status).toBe(503); expect(f.backend.upload).not.toHaveBeenCalled();
    }
    expect((await fixture({ current: { state: "denied" } }).get()).status).toBe(403);
  });
  it("returns only the allowed private projection with no storage path or actor identity", async () => {
    const f = fixture({ current: { ...current, profile: { ...profile, avatarObject, secret: "private database diagnostic" } } });
    const response = await f.get("?locale=ar"), body = await response.json();
    expect(response.status).toBe(200); expect(body).toMatchObject({ state: "ready", profile: { avatarUrl: "/api/participant-accounts/profile/avatar?v=0" } });
    expect(JSON.stringify(body)).not.toContain(avatarObject); expect(JSON.stringify(body)).not.toContain("private database diagnostic");
    expect(JSON.stringify(body)).not.toContain(actorId); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer"); expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("normalizes fields and sends only verified claims to the atomic save RPC", async () => {
    const f = fixture({ accessClaims: { ...claims, user_metadata: { role: "super_admin" } } }), response = await f.post();
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ state: "ready", profile: { institutionOther: "Synthetic institution", status: "year_3", year: null } });
    const args = vi.mocked(f.backend.rpc).mock.calls.find(([name]) => name === "msrc_participant_profile_save")![1]!;
    expect(args).toMatchObject({ profile_input: { institutionOther: "Synthetic institution", status: "year_3", interests: [abstractSettings.specialties[0].id] }, expected_version: 0 });
    expect(args.session_claims).not.toHaveProperty("user_metadata"); expect(f.backend.upload).not.toHaveBeenCalled();
  });
  it("rejects other-session, wrong-purpose, malformed and expired form tokens without saving", async () => {
    for (const formToken of [profileFormToken(config, origin, actorId, otherId, now), participantFormToken(config, origin, now),
      profileFormToken(config, origin, actorId, sessionId, now - 31 * 60_000), "invalid"]) {
      const f = fixture(); expect((await f.post({ formToken })).status).toBe(400);
      expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_save")).toBe(false);
    }
  });
  it("encrypts identity before the RPC and returns only the masked suffix", async () => {
    vi.stubEnv("REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION", "synthetic-v1");
    vi.stubEnv("REGISTRATION_IDENTITY_ENCRYPTION_KEYS", JSON.stringify({ "synthetic-v1": "b".repeat(64) }));
    vi.stubEnv("REGISTRATION_IDENTITY_HMAC_SECRET", "c".repeat(64));
    const f = fixture(), response = await f.post({ identityType: "national_id", identityNumber: "1000004321" });
    expect(response.status).toBe(200);
    const args = vi.mocked(f.backend.rpc).mock.calls.find(([name]) => name === "msrc_participant_profile_save")![1]!;
    expect(args.profile_input).toMatchObject({ identity: { type: "national_id", last4: "4321", envelope: expect.stringMatching(/^v1:synthetic-v1:/), lookup: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    const body = await response.json(); expect(body.profile).toMatchObject({ identityType: "national_id", identityLast4: "4321" });
    expect(JSON.stringify(args)).not.toContain("1000004321"); expect(JSON.stringify(body)).not.toContain("1000004321"); expect(JSON.stringify(body)).not.toContain("envelope");
  });
  it("fails closed without encryption keys before saving identity", async () => {
    vi.stubEnv("REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION", "");
    const f = fixture(), response = await f.post({ identityType: "passport", identityNumber: "AB123456" });
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ state: "area-not-ready" });
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_save")).toBe(false);
  });
  it("honors the database IP rate limit before image processing or Storage", async () => {
    const f = fixture({ claim: "denied" }), response = await f.post({ avatar: await image() });
    expect(response.status).toBe(429); expect(await response.json()).toMatchObject({ state: "limited" }); expect(f.backend.upload).not.toHaveBeenCalled();
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_save")).toBe(false);
  });
  it("deletes a staged upload on optimistic conflict and never removes the incumbent avatar", async () => {
    const f = fixture({ current: { ...current, profile: { ...profile, avatarObject } }, save: { state: "conflict" } });
    const response = await f.post({ avatar: await image() }); expect(response.status).toBe(409);
    const uploaded = vi.mocked(f.backend.upload).mock.calls[0][0];
    expect(uploaded).toMatch(/^[a-f0-9-]+\.webp$/); expect(f.backend.remove).toHaveBeenCalledExactlyOnceWith(uploaded); expect(f.backend.remove).not.toHaveBeenCalledWith(avatarObject);
  });
  it("removes old object bytes and acknowledges deletion before successful remove response", async () => {
    const f = fixture({ current: { ...current, profile: { ...profile, avatarObject } } });
    const response = await f.post({ removeAvatar: "true" }); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ profile: { avatarUrl: null } });
    expect(f.backend.remove).toHaveBeenCalledExactlyOnceWith(avatarObject);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_participant_profile_avatar_deleted", { object_name: avatarObject });
  });
  it("does not acknowledge successful replacement/removal when byte deletion fails", async () => {
    const f = fixture({ current: { ...current, profile: { ...profile, avatarObject } }, remove: false });
    expect((await f.post({ removeAvatar: "true" })).status).toBe(503);
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_avatar_deleted")).toBe(false);
  });
  it("cleans a failed upload without saving", async () => {
    const f = fixture({ upload: false }); expect((await f.post({ avatar: await image() })).status).toBe(503);
    expect(f.backend.remove).toHaveBeenCalledWith(vi.mocked(f.backend.upload).mock.calls[0][0]);
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_save")).toBe(false);
  });
  it("preserves an active avatar when save committed but its response was lost", async () => {
    const f = fixture({ error: new Error("response lost after commit"), errorRpc: "msrc_participant_profile_save", abandon: "active" });
    expect((await f.post({ avatar: await image() })).status).toBe(503);
    expect(f.backend.upload).toHaveBeenCalledOnce(); expect(f.backend.remove).not.toHaveBeenCalled();
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_participant_profile_avatar_abandon", expect.objectContaining({ object_name: vi.mocked(f.backend.upload).mock.calls[0][0] }));
  });
  it.each(["msrc_participant_profile_read", "msrc_participant_profile_save", "msrc_participant_profile_avatar_reserve"])("missing RPC %s degrades to area-not-ready without changing login", async (errorRpc) => {
    const f = fixture({ error: new ParticipantProfileRpcMissingError(), errorRpc });
    const response = await f.post(errorRpc.includes("reserve") ? { avatar: await image() } : {});
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" }); expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("rechecks the feature flag after database observation before saving or serving avatar bytes", async () => {
    const f = fixture({ onRead: () => vi.stubEnv("PARTICIPANT_PROFILE_ENABLED", "false") });
    expect((await f.post()).status).toBe(503); expect(f.backend.upload).not.toHaveBeenCalled();
    expect(vi.mocked(f.backend.rpc).mock.calls.some(([name]) => name === "msrc_participant_profile_save")).toBe(false);
  });
  it("refreshes only the same native session and preserves the absolute deadline", async () => {
    const f = fixture({ accessClaims: { ...claims, exp: now / 1000 - 1 } }), response = await f.get();
    expect(response.status).toBe(200); expect(f.backend.refresh).toHaveBeenCalledWith("synthetic-refresh");
    const rotated = readParticipantSession(config, new Request(origin, { headers: { cookie: response.headers.get("set-cookie")!.split(";")[0] } }), now);
    expect(rotated).toMatchObject({ actorId, sessionId, deadline, refreshToken: "synthetic-rotated" });
    const denied = fixture({ accessClaims: { ...claims, exp: now / 1000 - 1 }, refresh: { actorId, sessionId: otherId, accessToken: token(), refreshToken: "other" } });
    expect((await denied.get()).status).toBe(401); expect(denied.backend.identity).not.toHaveBeenCalled();
  });
  it("serves avatar bytes only after own-account authorization and blocks path selection", async () => {
    const f = fixture({ current: { ...current, profile: { ...profile, avatarObject } } }), response = await f.get("/avatar?v=0");
    expect(response.status).toBe(200); expect(await response.text()).toBe("synthetic image bytes"); expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(f.backend.download).toHaveBeenCalledExactlyOnceWith(avatarObject);
    for (const path of ["/avatar?object=someone-else.webp", "/avatar?v=0&v=1", "/avatar?v=../other"]) expect((await fixture().get(path)).status).toBe(400);
    const denied = fixture({ identity: otherId }); expect((await denied.get("/avatar")).status).toBe(401); expect(denied.backend.download).not.toHaveBeenCalled();
    expect((await fixture().get("/avatar")).status).toBe(404);
  });
});

describe("profile field and image validation", () => {
  it("validates ID formats independently and permits a saved masked ID to remain unchanged", () => {
    for (const [type, valid, invalid] of [["national_id", "1000000000", "2000000000"], ["iqama", "2000000000", "1000000000"], ["passport", "AB1234", "AB123"]] as const) {
      expect(isProfileIdentityNumber(type, valid)).toBe(true); expect(isProfileIdentityNumber(type, invalid)).toBe(false);
      expect(validateProfileForm(form({ identityType: type, identityNumber: valid }), abstractSettings.specialties).ok).toBe(true);
      expect(validateProfileForm(form({ identityType: type, identityNumber: invalid }), abstractSettings.specialties).ok).toBe(false);
    }
    const saved = { ...EMPTY_PARTICIPANT_PROFILE, identityType: "national_id" as const, identityLast4: "0000" };
    expect(validateProfileForm(form({ identityType: "national_id" }), abstractSettings.specialties, saved).ok).toBe(true);
    expect(validateProfileForm(form({ identityType: "iqama" }), abstractSettings.specialties, saved).ok).toBe(false);
  });
  it("accepts age 18 exactly and rejects invalid dates, younger people and leap-day rollover", () => {
    const today = new Date("2026-10-28T12:00:00Z");
    expect(isAdultProfileDate("2008-10-28", today)).toBe(true); expect(isAdultProfileDate("2008-10-29", today)).toBe(false);
    for (const value of ["0000-01-01", "2000-02-30", "2027-01-01", "not-a-date"]) expect(isAdultProfileDate(value, today)).toBe(false);
    expect(isAdultProfileDate("2010-03-01", new Date("2028-02-29T12:00:00Z"))).toBe(false);
    expect(validateProfileForm(form({ dateOfBirth: "2008-10-28" }), abstractSettings.specialties, undefined, today).ok).toBe(true);
    expect(validateProfileForm(form({ dateOfBirth: "2008-10-29" }), abstractSettings.specialties, undefined, today).ok).toBe(false);
  });
  it("requires international E.164 contact numbers and bounded city data", () => {
    for (const phone of ["+6831234", "+966500000000", "+442012345678"]) expect(isProfilePhone(phone)).toBe(true);
    for (const phone of ["0500000000", "+0123456789", "+966 500000000", "+" + "1".repeat(16)]) expect(validateProfileForm(form({ phone }), abstractSettings.specialties).ok).toBe(false);
    expect(validateProfileForm(form({ city: "x".repeat(81) }), abstractSettings.specialties)).toMatchObject({ ok: false, fieldErrors: { city: "too_long" } });
  });
  it("accepts partial values, trims institution, and counts Unicode characters", () => {
    expect(validateProfileForm(form({ institutionOther: " ", status: "", interests: "[]" }), abstractSettings.specialties)).toMatchObject({ ok: true, value: { institutionOther: null, status: null, interests: [] } });
    expect(validateProfileForm(form({ institutionOther: "  " + "😀".repeat(160) + "  " }), abstractSettings.specialties).ok).toBe(true);
    expect(validateProfileForm(form({ institutionOther: "😀".repeat(161) }), abstractSettings.specialties)).toMatchObject({ ok: false, fieldErrors: { institutionOther: "too_long" } });
  });
  it.each(PROFILE_STATUSES)("accepts approved status %s", (status) => expect(validateProfileForm(form({ status }), abstractSettings.specialties).ok).toBe(true));
  it.each(["medical_student", "intern", "resident", "other"])("rejects retired status %s", (status) => expect(validateProfileForm(form({ status }), abstractSettings.specialties).ok).toBe(false));
  it("uses only the supplied abstract specialty catalog, with five unique values maximum", () => {
    const catalog = Array.from({ length: 6 }, (_, index) => ({ id: `synthetic-configured-${index}`, label: `Synthetic configured ${index}` }));
    expect(validateProfileForm(form({ interests: JSON.stringify(catalog.slice(0, 5).map(({ id }) => id)) }), catalog).ok).toBe(true);
    for (const interests of [["unconfigured"], [abstractSettings.specialties[0].id, abstractSettings.specialties[0].id], catalog.map(({ id }) => id)]) {
      expect(validateProfileForm(form({ interests: JSON.stringify(interests) }), catalog)).toMatchObject({ ok: false, fieldErrors: { interests: "invalid" } });
    }
    expect(validateProfileForm(form({ interests: "[]" }), []).ok).toBe(true);
    expect(validateProfileForm(form(), []).ok).toBe(false);
  });
  it.each<Record<string, string>>([{ status: "unapproved" }, { institutionOther: "Synthetic\ncontrol" }, { website: "bot" }, { version: "-1" }, { interests: "not-json" }, { ownerId: otherId }])("rejects invalid fields and owner injection %j", (extra) => {
    expect(validateProfileForm(form(extra), abstractSettings.specialties).ok).toBe(false);
  });
  it("rejects duplicate multipart keys and replacing and removing the avatar together", async () => {
    const duplicate = form(); duplicate.append("institutionOther", "second"); expect(validateProfileForm(duplicate, abstractSettings.specialties).ok).toBe(false);
    expect(validateProfileForm(form({ avatar: await image(), removeAvatar: "true" }), abstractSettings.specialties)).toMatchObject({ ok: false, fieldErrors: { avatar: "invalid" } });
  });
  it.each([[0, "image/png"], [MAX_AVATAR_BYTES + 1, "image/png"], [10, "image/gif"], [10, "image/svg+xml"]] as const)("rejects avatar size %s and type %s", (size, type) => {
    expect(validateProfileForm(form({ avatar: new File([new Uint8Array(size)], "synthetic", { type }) }), abstractSettings.specialties)).toMatchObject({ ok: false, fieldErrors: { avatar: "invalid" } });
  });
  it("rejects declared and streamed oversized multipart bodies before parsing", async () => {
    await expect(readProfileForm(new Request(origin, { method: "POST", body: form(), headers: { "content-length": String(MAX_AVATAR_BYTES + 16_385) } }))).rejects.toThrow("Invalid profile input");
    const body = new Uint8Array(MAX_AVATAR_BYTES + 16_385);
    await expect(readProfileForm(new Request(origin, { method: "POST", body, headers: { "content-type": "multipart/form-data; boundary=synthetic" } }))).rejects.toThrow("Invalid profile input");
    await expect(readProfileForm(new Request(origin, { method: "POST", body: "{}", headers: { "content-type": "application/json" } }))).rejects.toThrow("Invalid profile input");
  });
  it.each(["jpeg", "png", "webp"] as const)("decodes actual %s bytes and emits WebP", async (format) => {
    const output = await reencodeProfileAvatar(await image(format)); expect(output).not.toBeNull();
    expect((await sharp(output!).metadata()).format).toBe("webp");
  });
  it("rejects MIME spoofing, malformed data and excessive decoded dimensions", async () => {
    const png = await image();
    expect(await reencodeProfileAvatar(new File([await png.arrayBuffer()], "spoof.jpg", { type: "image/jpeg" }))).toBeNull();
    expect(await reencodeProfileAvatar(new File(["not an image"], "broken.png", { type: "image/png" }))).toBeNull();
    const large = await sharp({ create: { width: 4097, height: 4097, channels: 3, background: "#ffffff" } }).png().toBuffer();
    expect(await reencodeProfileAvatar(new File([new Uint8Array(large)], "large.png", { type: "image/png" }))).toBeNull();
  });
  it("rejects an actual animated WebP", async () => {
    const pixels = Buffer.from([255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255]);
    const bytes = await sharp(pixels, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    expect((await sharp(bytes).metadata()).pages).toBe(2);
    expect(await reencodeProfileAvatar(new File([new Uint8Array(bytes)], "animated.webp", { type: "image/webp" }))).toBeNull();
  });
  it("strips actual EXIF/ICC metadata and orientation while rotating and limiting dimensions", async () => {
    const bytes = await sharp({ create: { width: 1024, height: 256, channels: 3, background: "#7358a6" } })
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: "Synthetic private metadata" } } }).jpeg().toBuffer();
    const input = await sharp(bytes).metadata(); expect(input.exif).toBeDefined(); expect(input.orientation).toBe(6);
    const output = await reencodeProfileAvatar(new File([new Uint8Array(bytes)], "metadata.jpg", { type: "image/jpeg" }));
    expect(output).not.toBeNull(); const meta = await sharp(output!).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 128, height: 512 });
    for (const field of ["exif", "icc", "iptc", "xmp", "orientation"] as const) expect(meta[field]).toBeUndefined();
    expect(Buffer.from(output!).includes(Buffer.from("Synthetic private metadata"))).toBe(false);
  });
});

describe("session-bound profile token and server-only Storage backend", () => {
  it("rejects wrong actor, session, origin, purpose, time and signatures", () => {
    const supplied = profileFormToken(config, origin, actorId, sessionId, now);
    expect(readProfileFormToken(config, supplied, origin, actorId, sessionId, now)).toBe(true);
    expect(readProfileFormToken(config, supplied, origin, otherId, sessionId, now)).toBe(false);
    expect(readProfileFormToken(config, supplied, origin, actorId, otherId, now)).toBe(false);
    expect(readProfileFormToken(config, supplied, "https://evil.example", actorId, sessionId, now)).toBe(false);
    expect(readProfileFormToken(config, supplied, origin, actorId, sessionId, now - 1)).toBe(false);
    expect(readProfileFormToken(config, supplied, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false);
    expect(readProfileFormToken(config, supplied + "x", origin, actorId, sessionId, now)).toBe(false);
    expect(readProfileFormToken(config, participantFormToken(config, origin, now), origin, actorId, sessionId, now)).toBe(false);
  });
  it("recognizes only missing-RPC responses and suppresses private diagnostic bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202", details: "private diagnostic" }, { status: 404 })));
    await expect(createParticipantProfileBackend(config).rpc("msrc_participant_profile_read")).rejects.toBeInstanceOf(ParticipantProfileRpcMissingError);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202", details: "private diagnostic" }, { status: 403 })));
    await expect(createParticipantProfileBackend(config).rpc("msrc_participant_profile_read")).rejects.toThrow("Private profile RPC unavailable");
  });
  it("rejects arbitrary RPC names and object paths before network access", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const backend = createParticipantProfileBackend(config);
    await expect(backend.rpc("msrc_staff_participant_detail")).rejects.toThrow("Unknown private profile RPC");
    for (const object of ["../other.webp", "https://example.invalid/avatar.webp", actorId + "/photo.png"]) {
      await expect(backend.download(object)).rejects.toThrow("Invalid avatar object");
      await expect(backend.remove(object)).rejects.toThrow("Invalid avatar object");
      await expect(backend.upload(object, new Uint8Array())).rejects.toThrow("Invalid avatar object");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("calls profile RPCs with server apikey and no bearer secret, redirect or cache", async () => {
    const fetch = vi.fn(async () => Response.json(current)); vi.stubGlobal("fetch", fetch);
    await createParticipantProfileBackend(config).rpc("msrc_participant_profile_read", { edition_key: config.editionKey, session_claims: claims });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(config.supabaseUrl + "/rest/v1/rpc/msrc_participant_profile_read"); expect(init).toMatchObject({ redirect: "error", cache: "no-store", method: "POST" });
    const headers = new Headers(init.headers); expect(headers.get("apikey")).toBe(config.secretKey); expect(headers.get("authorization")).toBeNull();
  });
});
