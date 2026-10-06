import { describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { createParticipantHandler } from "@/features/participant-accounts/handler.server";
import type { ParticipantBackend } from "@/features/participant-accounts/backend.server";
import { participantCodeEmail } from "@/features/participant-accounts/email.server";
import { approvedParticipantPrivacy, participantNotice } from "@/features/participant-accounts/privacy.server";
import { nativeSessionId, participantCookie, participantFormToken, participantHash, readParticipantFormToken, readParticipantSession,
  sealParticipantSession } from "@/features/participant-accounts/security.server";
import { normalizeParticipantCode, validateParticipantPayload } from "@/features/participant-accounts/validation.server";

const env = { PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
  PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only",
  PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" };
const readiness = resolveParticipantConfig(env);
if (readiness.state !== "ready") throw new Error("Synthetic test config must be ready");
const config = readiness.config, origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 4, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001";
const accessToken = "synthetic." + Buffer.from(JSON.stringify({ session_id: sessionId, exp: Math.floor(now / 1000) + 3600 })).toString("base64url") + ".synthetic";
const native = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh-private" };
function context() {
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: false,
    authenticationTier: "participant", sessionPolicySatisfied: true, reason: null, mfaValid: false, staffEmailValid: false,
    passwordValid: true, emailVerified: true, timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 72 * 3600 * 1000).toISOString(), idleExpiresAt: null, authenticatedAt: new Date(now).toISOString() },
    policy: { ...SESSION_POLICY }, operationalAccessReady: false, privilegedAccessReady: false };
}
function fixture(overrides: Partial<ParticipantBackend> = {}) {
  const claimed = new Set<string>();
  const backend: ParticipantBackend = {
    rpc: vi.fn(async (name, args) => {
      if (name === "msrc_participant_status") return { enabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_participant_form_claim") { const hash = String(args?.nonce_hash); if (claimed.has(hash)) return { state: "denied" }; claimed.add(hash); return { state: "claimed" }; }
      if (name === "msrc_participant_signup_reserve") return { state: "reserved" };
      if (name === "msrc_participant_email_begin") return { state: "issued", challengeId: args?.challenge_id, recipient: args?.email };
      if (name === "msrc_participant_email_delivery") return { state: "ok" };
      if (name === "msrc_participant_login_begin") return { state: "allowed" };
      if (name === "msrc_participant_login_finish") return { state: args?.actor_id ? "admitted" : "denied" };
      if (name === "msrc_session_context") return context();
      if (name === "msrc_participant_profile") return { schemaVersion: 1, name: "Synthetic Participant", accountState: "verified", session: context(), operationalAccessReady: false };
      if (name === "msrc_session_logout") return true;
      return { state: "denied" };
    }), createUser: vi.fn(async () => true), updateUser: vi.fn(async () => true), login: vi.fn(async () => native),
    identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true), deliver: vi.fn(async () => true), ...overrides,
  };
  const pending: Array<() => Promise<void>> = [];
  const handle = createParticipantHandler({ readiness: () => readiness, backend: () => backend, now: () => now,
    defer: (work) => { pending.push(work); } });
  const post = async (action: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => {
    const response = await handle(new Request(origin + "/api/participant-accounts", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ action, formToken: participantFormToken(config, origin, now - 3000), email: "person@example.invalid", password: "Synthetic-only-password", name: "Synthetic Participant", ...extra }),
    }));
    for (const work of pending.splice(0)) await work();
    return response;
  };
  return { backend, handle, post, pending };
}

describe("participant accounts closed-by-default and private server protocol", () => {
  it.each([undefined, "false", "1", "TRUE", ""])('closes for flag %s before accessing visitor input or providers', async (flag) => {
    const backend = vi.fn();
    const handle = createParticipantHandler({ readiness: () => resolveParticipantConfig({ ...env, PARTICIPANT_ACCOUNTS_ENABLED: flag }), backend });
    const request = new Request(origin, { method: "POST", body: "not JSON" });
    const json = vi.spyOn(request, "json");
    const response = await handle(request);
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "closed" }); expect(backend).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled();
  });
  it.each([{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { PARTICIPANT_SUPABASE_URL: "https://other.supabase.co" },
    { PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_real" }, { RESEND_API_KEY: "re_real" }, { PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "100" }])("refuses hybrid test/hosted config %j", (change) => {
    expect(resolveParticipantConfig({ ...env, ...change }).state).toBe("unavailable");
  });
  it("registers approved v1.0 notices without enabling accounts or admitting synthetic provider settings in production", () => {
    for (const locale of ["en", "ar"] as const) {
      const notice = participantNotice(locale, false);
      expect(notice).toEqual(approvedParticipantPrivacy?.[locale]);
      expect(notice).toMatchObject({ version: "v1.0", url: `/${locale}/privacy/v1.0` });
      expect(notice?.summary.length).toBeGreaterThan(30);
      expect(notice?.summary).not.toMatch(/draft|placeholder|awaiting|مسودة|بانتظار/i);
      expect(participantNotice(locale, true)).toMatchObject({ version: "synthetic-privacy-ci-v1", url: `/${locale}/privacy` });
    }
    expect(resolveParticipantConfig({ ...env, PARTICIPANT_ACCOUNTS_ENABLED: undefined }).state).toBe("closed");
    expect(resolveParticipantConfig({ ...env, VERCEL: "1", VERCEL_ENV: "production", PARTICIPANT_ACCOUNTS_TEST_MODE: "false" }).state).toBe("unavailable");
  });
  it.each(["new", "duplicate", "unknown", "quota", "native-error", "delivery-error", "database-error"])("signup/reset response never reveals private %s", async (outcome) => {
    const { backend, post } = fixture();
    const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => {
      if (outcome === "database-error" && name === "msrc_participant_email_begin") throw new Error("private SQL email details");
      if (["duplicate", "unknown", "quota"].includes(outcome) && ["msrc_participant_signup_reserve", "msrc_participant_email_begin"].includes(name)) return { state: "denied" };
      return base(name, args, token);
    });
    if (outcome === "native-error") backend.createUser = vi.fn(async () => { throw new Error("already registered"); });
    if (outcome === "delivery-error") backend.deliver = vi.fn(async () => false);
    for (const action of ["signup", "forgot"]) {
      const response = await post(action); const result = await response.json();
      expect(response.status).toBe(202); expect(result.state).toBe("accepted"); expect(Object.keys(result).sort()).toEqual(["expiresAt", "formToken", "requestId", "resendAvailableAt", "state"]);
      expect(response.headers.get("set-cookie")).toBeNull(); expect(JSON.stringify(result)).not.toMatch(/person@|registered|actorId|recipient|SQL|password|codeValue/);
    }
  });
  it.each(["signup", "resend", "forgot"])("acknowledges %s before private account/provider work or timestamps can reveal eligibility", async (action) => {
    const { handle, backend, pending } = fixture();
    const response = await handle(new Request(origin, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ action, email: "person@example.invalid", name: "Synthetic Participant", password: "Synthetic-only-password",
        formToken: participantFormToken(config, origin, now - 3000) }) }));
    const result = await response.json();
    expect(response.status).toBe(202); expect(result.state).toBe("accepted"); expect(pending).toHaveLength(1);
    expect(backend.createUser).not.toHaveBeenCalled(); expect(backend.deliver).not.toHaveBeenCalled();
    expect(vi.mocked(backend.rpc).mock.calls.every(([name]) => ["msrc_participant_status", "msrc_participant_form_claim"].includes(name))).toBe(true);
    const token = JSON.parse(Buffer.from(result.formToken.split(".")[0], "base64url").toString("utf8"));
    expect(token.issued).toBe(Date.parse(result.expiresAt) - 600_000);
    await pending[0](); expect(backend.deliver).toHaveBeenCalledTimes(1);
  });
  it("omits retained signup fields when requesting password recovery", async () => {
    const { backend, post } = fixture(); const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => name === "msrc_participant_email_begin"
      && (args?.name !== null || args?.privacy_version !== null) ? { state: "denied" } : base(name, args, token));
    const response = await post("forgot", { name: "Name retained after verification" });
    expect(response.status).toBe(202);
    expect(backend.deliver).toHaveBeenCalledTimes(1);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_participant_email_begin", expect.objectContaining({
      purpose: "reset_password", name: null, privacy_version: null,
    }));
  });
  it.each([
    ...["signup", "verify", "reset"].flatMap((action) => ["a".repeat(9), "ع".repeat(9), "😀".repeat(9)].map((password) => [action, password])),
  ])("rejects a short %s password before account creation or code consumption (%s)", async (action, password) => {
    const { backend, post } = fixture();
    const response = await post(action, { password, code: "123456", requestId: "dc000000-0000-4000-8000-000000000001" });
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ state: "invalid_input", fieldErrors: { password: "invalid" } });
    expect(backend.createUser).not.toHaveBeenCalled(); expect(backend.updateUser).not.toHaveBeenCalled(); expect(backend.deliver).not.toHaveBeenCalled();
    expect(vi.mocked(backend.rpc).mock.calls.every(([name]) => name === "msrc_participant_status")).toBe(true);
  });
  it.each(["signup", "verify", "reset"])("accepts a ten-character %s password within the byte limit", (action) => {
    for (const password of ["a".repeat(10), "ع".repeat(10), "😀".repeat(10), "a".repeat(72), "ع".repeat(36)]) {
      expect(validateParticipantPayload({ action, name: "Synthetic Participant", email: "person@example.invalid", password,
        code: "123456", requestId: "dc000000-0000-4000-8000-000000000001" }).ok).toBe(true);
    }
  });
  it.each(["a".repeat(6), "a".repeat(9)])("keeps existing shorter password sign-in unchanged (%s)", async (password) => {
    const { backend, post } = fixture();
    const response = await post("signin", { password });
    expect(response.status).toBe(200); expect((await response.json()).state).toBe("authenticated");
    expect(backend.login).toHaveBeenCalledWith("person@example.invalid", password);
  });
  it.each([
    ["signup", "a".repeat(73)], ["signup", "ع".repeat(37)],
    ["verify", "a".repeat(73)], ["verify", "ع".repeat(37)],
    ["reset", "a".repeat(73)], ["reset", "ع".repeat(37)],
  ])("rejects unsupported %s password bytes before native creation or code consumption", async (action, password) => {
    const { backend, post } = fixture();
    const response = await post(action, { password, code: "123456", requestId: "dc000000-0000-4000-8000-000000000001" });
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ state: "invalid_input", fieldErrors: { password: "too_long" } });
    expect(backend.createUser).not.toHaveBeenCalled(); expect(backend.updateUser).not.toHaveBeenCalled();
    expect(vi.mocked(backend.rpc).mock.calls.every(([name]) => name === "msrc_participant_status")).toBe(true);
  });
  it("denies refused code proof before managed identity mutation", async () => {
    const { backend, post } = fixture();
    const response = await post("verify", { code: "١٢٣٤٥٦", requestId: "dc000000-0000-4000-8000-000000000001" });
    expect(response.status).toBe(400); expect((await response.json()).state).toBe("invalid_code"); expect(backend.updateUser).not.toHaveBeenCalled();
  });
  it("accepts proof bound to the private actor, never a browser-selected actor", async () => {
    const { backend, post } = fixture(); const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => name === "msrc_participant_email_consume"
      ? { state: "consumed", operationId: args?.operation_id, actorId, recipient: "person@example.invalid" }
      : name === "msrc_participant_email_complete" ? { state: "completed" } : base(name, args, token));
    const response = await post("verify", { code: "123456", requestId: "dc000000-0000-4000-8000-000000000001" });
    expect((await response.json()).state).toBe("verified"); expect(backend.updateUser).toHaveBeenCalledWith(actorId, "Synthetic-only-password", true);
    const tampered = await post("reset", { actorId, code: "123456", requestId: "dc000000-0000-4000-8000-000000000001" });
    expect(tampered.status).toBe(400);
  });
  it("denies unverified or unauthorized login with a generic credential response", async () => {
    const { post } = fixture({ login: vi.fn(async () => null) });
    expect((await (await post("signin")).json()).state).toBe("invalid_credentials");
  });
  it("admits only own verified AAL1 identity and keeps native tokens in an encrypted HttpOnly cookie", async () => {
    const { post } = fixture(); const response = await post("signin"); const result = await response.json();
    expect(result).toMatchObject({ state: "authenticated", profile: { name: "Synthetic Participant", accountState: "verified" } });
    expect(JSON.stringify(result)).not.toMatch(/accessToken|refreshToken|sessionId|actorId|synthetic-refresh/);
    const cookie = response.headers.get("set-cookie")!; expect(cookie).toMatch(/HttpOnly; SameSite=Strict; Max-Age=259200/); expect(cookie).not.toContain(accessToken);
  });
  it("denies a context belonging to another account even with a valid encrypted cookie", async () => {
    const { backend, handle } = fixture(); const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => name === "msrc_session_context"
      ? { ...context(), principal: { userId: "dd000000-0000-4000-8000-000000000001", sessionId } } : base(name, args, token));
    const cookie = participantCookie(config, { ...native, deadline: now + 72 * 3600 * 1000, origin }, now).split(";")[0];
    const response = await handle(new Request(origin, { headers: { Cookie: cookie } }));
    expect((await response.json()).profile).toBeNull();
  });
  it("claims each signed form once and honors native/login denial without retries", async () => {
    const { backend, post } = fixture(); const token = participantFormToken(config, origin, now - 3000);
    expect((await post("forgot", { formToken: token })).status).toBe(202); expect((await post("forgot", { formToken: token })).status).toBe(429);
    expect(backend.deliver).toHaveBeenCalledTimes(1);
  });
  it("enforces database closure independently of the server flag", async () => {
    const { backend, post } = fixture();
    backend.rpc = vi.fn(async () => ({ enabled: false, privacyVersion: null, emailDailyLimit: null }));
    const response = await post("signup"); expect(response.status).toBe(503); expect((await response.json()).state).toBe("closed");
    expect(backend.createUser).not.toHaveBeenCalled(); expect(backend.deliver).not.toHaveBeenCalled();
  });
  it("refreshes only the original actor/session and never restarts its 72-hour deadline", async () => {
    const old = { ...native, accessToken: "synthetic." + Buffer.from(JSON.stringify({ session_id: sessionId, exp: Math.floor(now / 1000) - 1 })).toString("base64url") + ".synthetic" };
    const { handle, backend } = fixture();
    const deadline = now + 72 * 3600 * 1000;
    const cookie = participantCookie(config, { ...old, deadline, origin }, now).split(";")[0];
    const response = await handle(new Request(origin, { headers: { Cookie: cookie } }));
    expect((await response.json()).state).toBe("authenticated"); expect(backend.refresh).toHaveBeenCalledTimes(1);
    const rotated = response.headers.get("set-cookie")!.split(";")[0];
    expect(readParticipantSession(config, new Request(origin, { headers: { Cookie: rotated } }), now)?.deadline).toBe(deadline);
    backend.refresh = vi.fn(async () => ({ ...native, actorId: "dd000000-0000-4000-8000-000000000001" }));
    expect((await (await handle(new Request(origin, { headers: { Cookie: cookie } }))).json()).profile).toBeNull();
  });
  it("does not report logout success if shared revocation fails", async () => {
    const { post, backend } = fixture(); const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => name === "msrc_session_logout" ? false : base(name, args, token));
    const cookie = participantCookie(config, { ...native, deadline: now + 72 * 3600 * 1000, origin }, now).split(";")[0];
    const response = await post("logout", {}, { Cookie: cookie });
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("unavailable"); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("clears the local session when shared logout throws without reporting revocation success", async () => {
    const { post, backend } = fixture(); const base = backend.rpc.bind(backend);
    backend.rpc = vi.fn(async (name, args, token) => {
      if (name === "msrc_session_logout") throw new Error("Expired access token");
      return base(name, args, token);
    });
    const cookie = participantCookie(config, { ...native, deadline: now + 72 * 3600 * 1000, origin }, now).split(";")[0];
    const response = await post("logout", {}, { Cookie: cookie });
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("unavailable");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it.each<Record<string, string>>([{ Origin: "https://hostile.example" }, { Host: "hostile.example", "x-forwarded-host": "127.0.0.1:3216" }, { "sec-fetch-site": "cross-site" }])("rejects cross-origin/header spoofing %j", async (headers) => {
    const { backend, post } = fixture(); expect((await post("forgot", {}, headers)).status).toBe(400); expect(backend.deliver).not.toHaveBeenCalled();
  });
});

describe("participant code/cookie protection", () => {
  it("binds form tokens to origin, minimum-fill, expiration and HMAC without client-controlled authority", () => {
    const token = participantFormToken(config, origin, now);
    expect(readParticipantFormToken(config, token, origin, now + 1999)).toBeNull();
    expect(readParticipantFormToken(config, token, origin, now + 2000)).not.toBeNull();
    expect(readParticipantFormToken(config, token, "http://hostile.example", now + 2000)).toBeNull();
    expect(readParticipantFormToken(config, token, origin, now + 1800000)).toBeNull();
    expect(readParticipantFormToken(config, token + "x", origin, now + 2000)).toBeNull();
    expect(participantHash(config, "code", "verify_email:id:123456")).not.toBe(participantHash(config, "code", "reset_password:id:123456"));
  });
  it("rejects expired, tampered, duplicate and foreign-origin encrypted session cookies", () => {
    const value = { ...native, deadline: now + 1000, origin };
    const encoded = sealParticipantSession(config, value);
    const request = (cookie: string, url = origin) => new Request(url, { headers: { Cookie: cookie } });
    expect(readParticipantSession(config, request("msrc-participant-test=" + encoded), now)?.actorId).toBe(actorId);
    expect(readParticipantSession(config, request("msrc-participant-test=" + encoded), now + 1000)).toBeNull();
    expect(readParticipantSession(config, request("msrc-participant-test=" + encoded + "x"), now)).toBeNull();
    expect(readParticipantSession(config, request("msrc-participant-test=" + encoded + "; msrc-participant-test=" + encoded), now)).toBeNull();
    expect(readParticipantSession(config, request("msrc-participant-test=" + encoded, "http://hostile.example"), now)).toBeNull();
    expect(nativeSessionId(accessToken)).toBe(sessionId);
  });
  it("uses English branded transactional templates and accepts both Arabic digit sets", () => {
    expect(normalizeParticipantCode("١٢٣٤٥٦")).toBe("123456"); expect(normalizeParticipantCode("۱۲۳۴۵۶")).toBe("123456");
    for (const purpose of ["verify_email", "reset_password"] as const) {
      const email = participantCodeEmail("person@example.invalid", "012345", purpose);
      expect(email.from).toBe("MSRC 2027 <no-reply@msrc2027.com>"); expect(email.text).toContain("10 minutes"); expect(email.text).toContain("012345"); expect(email.text).not.toMatch(/[\u0600-\u06ff]/);
    }
  });
});
