import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStaffEmailCheck, createSupabaseStaffEmailStore, managedStaffEmailCheck, MANAGED_STAFF_EMAIL_READY } from "@/features/auth/staff-email.server";

const actor = "c1000000-0000-4000-8000-000000000001";
const other = "c1000000-0000-4000-8000-000000000002";
const session = "c2000000-0000-4000-8000-000000000001";
const otherSession = "c2000000-0000-4000-8000-000000000002";
const email = "trusted-staff@example.invalid";
const secret = "a1".repeat(32);
const now = Date.UTC(2026, 9, 3, 12);
const expiresAt = new Date(now + 300_000).toISOString();
const ip = "192.0.2.19";
const mac = (text: string) => createHmac("sha256", Buffer.from(secret, "hex")).update(text).digest("hex");

function token(sub = actor, sessionId: unknown = session, extra: Record<string, unknown> = {}) {
  return [Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub, session_id: sessionId, ...extra })).toString("base64url"),
    Buffer.from("synthetic-signature-verified-by-mocked-managed-auth").toString("base64url")].join(".");
}

function fixture() {
  const user = { id: actor, email, email_confirmed_at: new Date(now - 60_000).toISOString(), is_anonymous: false,
    user_metadata: { email: "untrusted-form-recipient@example.invalid" } };
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
  const signInWithOtp = vi.fn();
  const verifyOtp = vi.fn();
  const auth = { getUser, signInWithOtp, verifyOtp } as unknown as SupabaseClient["auth"];
  const begin = vi.fn().mockImplementation(async (input) => ({ state: "issued", challengeId: input.challengeId,
    recipient: email, expiresAt }));
  const delivery = vi.fn().mockResolvedValue({ state: "ok" });
  const consume = vi.fn().mockResolvedValue({ state: "verified", privateProviderDetail: "withheld" });
  const deliver = vi.fn().mockResolvedValue(true);
  const store = { begin, delivery, consume };
  return { user, getUser, signInWithOtp, verifyOtp, auth, store, deliver,
    service: createStaffEmailCheck({ auth, store, deliver, secret }) };
}

function deliveredCode(value: ReturnType<typeof fixture>): string {
  const code: unknown = value.deliver.mock.calls.at(-1)?.[0]?.text.match(/code is (\d{6})\./)?.[1];
  // Only booleans appear in failed test diagnostics; the temporary code is never
  // used as an assertion value, snapshot or report attachment.
  expect(typeof code === "string" && /^\d{6}$/.test(code)).toBe(true);
  return code as string;
}

beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(now); });

describe("ORG-015 closed regular-staff server email check", () => {
  it("keeps the default unavailable and all live readiness false", async () => {
    expect(MANAGED_STAFF_EMAIL_READY).toBe(false);
    expect(await managedStaffEmailCheck()).toEqual({ state: "unavailable", ready: false });
  });

  it("generates a six-digit code and stores keyed digests bound to managed actor, session and challenge", async () => {
    const value = fixture();
    const result = await value.service.issue(token(), ip);
    const code = deliveredCode(value);
    const stored = value.store.begin.mock.calls[0][0];
    expect(stored.actorId === actor && stored.sessionId === session
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored.challengeId)).toBe(true);
    expect(stored.codeHash === mac(`staff-email:${actor}:${session}:${stored.challengeId}:${code}`)).toBe(true);
    expect(stored.ipHash === mac(`ip:${ip}`)).toBe(true);
    expect(/^[0-9a-f]{64}$/.test(stored.codeHash) && /^[0-9a-f]{64}$/.test(stored.ipHash)).toBe(true);
    expect(Object.keys(stored).sort()).toEqual(["actorId", "challengeId", "codeHash", "ipHash", "sessionId"]);
    expect(Object.keys(result).sort()).toEqual(["challengeId", "expiresAt", "state"]);
    expect(result.state === "issued" && result.challengeId === stored.challengeId && result.expiresAt === expiresAt).toBe(true);
    expect(value.getUser.mock.calls[0][0] === token()).toBe(true);
  });

  it("delivers only to the current verified managed email and records delivery before returning issuance", async () => {
    const value = fixture();
    const order: string[] = [];
    value.deliver.mockImplementation(async () => { order.push("test-delivery"); return true; });
    value.store.delivery.mockImplementation(async () => { order.push("trusted-delivery-receipt"); return { state: "ok" }; });
    const result = await value.service.issue(token(actor, session, { email: "forged-token@example.invalid" }), ip);
    const message = value.deliver.mock.calls[0][0];
    expect(message.recipient === email && message.language === "en").toBe(true);
    expect(message.subject).toBe("MSRC 2027 staff sign-in code");
    expect(message.text.includes("expires in 5 minutes") && message.text.includes("Do not share this code")).toBe(true);
    expect(order).toEqual(["test-delivery", "trusted-delivery-receipt"]);
    expect(value.store.delivery.mock.calls[0][0].delivered).toBe(true);
    expect(result.state).toBe("issued");
  });

  it("creates independent challenges and keyed digests for successive requests", async () => {
    const value = fixture();
    await value.service.issue(token(), ip);
    await value.service.issue(token(), ip);
    const first = value.store.begin.mock.calls[0][0];
    const second = value.store.begin.mock.calls[1][0];
    expect(first.challengeId !== second.challengeId && first.codeHash !== second.codeHash).toBe(true);
  });

  it("verifies by sending only the same bound digest to the authoritative store", async () => {
    const value = fixture();
    await value.service.issue(token(), ip);
    const code = deliveredCode(value);
    const issued = value.store.begin.mock.calls[0][0];
    expect(await value.service.verify(token(), issued.challengeId, code)).toEqual({ state: "verified" });
    const consumed = value.store.consume.mock.calls[0][0];
    expect(consumed.actorId === actor && consumed.sessionId === session && consumed.challengeId === issued.challengeId
      && consumed.codeHash === issued.codeHash).toBe(true);
    expect(Object.keys(consumed).sort()).toEqual(["actorId", "challengeId", "codeHash", "sessionId"]);
    expect(value.signInWithOtp).not.toHaveBeenCalled();
    expect(value.verifyOtp).not.toHaveBeenCalled();
  });

  it("changes the proof on every actor, session or challenge mismatch and respects the store denial", async () => {
    const value = fixture();
    await value.service.issue(token(), ip);
    const code = deliveredCode(value);
    const issued = value.store.begin.mock.calls[0][0];
    value.store.consume.mockImplementation(async (input) => ({ state: input.codeHash === issued.codeHash ? "verified" : "denied" }));
    const differentSession = await value.service.verify(token(actor, otherSession), issued.challengeId, code);
    const differentChallenge = await value.service.verify(token(), otherSession, code);
    value.getUser.mockResolvedValue({ data: { user: { ...value.user, id: other } }, error: null });
    const differentActor = await value.service.verify(token(other), issued.challengeId, code);
    expect([differentSession, differentChallenge, differentActor]).toEqual(Array(3).fill({ state: "denied", code: "not_authorized" }));
    expect(value.store.consume.mock.calls.every(([input]) => input.codeHash !== issued.codeHash)).toBe(true);
  });

  it("never uses managed OTP sign-in to supply password proof or elevate assurance", async () => {
    const value = fixture();
    value.store.begin.mockResolvedValue({ state: "denied", code: "ineligible" });
    const result = await value.service.issue(token(actor, session, { aal: "aal1", amr: [{ method: "otp" }] }), ip);
    expect(result).toEqual({ state: "denied", code: "not_authorized" });
    // Native password proof and exact role eligibility are checked by the store;
    // the adapter cannot synthesize password AMR, MFA or an application receipt.
    expect(value.store.begin).toHaveBeenCalledOnce();
    expect(value.deliver).not.toHaveBeenCalled();
    expect(value.signInWithOtp).not.toHaveBeenCalled();
    expect(value.verifyOtp).not.toHaveBeenCalled();
  });

  it.each(["", "not-a-bearer", "a.b.c extra", "a.b.c\n", "x".repeat(16_385)])("rejects malformed bearer before managed verification", async (bearer) => {
    const value = fixture();
    expect(await value.service.issue(bearer, ip)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.getUser).not.toHaveBeenCalled();
    expect(value.store.begin).not.toHaveBeenCalled();
    expect(value.deliver).not.toHaveBeenCalled();
  });

  it.each(["", "unknown", "127.0.0.1:1234", "192.0.2.19, 192.0.2.20", undefined])("rejects missing or malformed trusted request IP", async (address) => {
    const value = fixture();
    expect(await value.service.issue(token(), address as string)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.getUser).not.toHaveBeenCalled();
    expect(value.store.begin).not.toHaveBeenCalled();
  });

  it.each([token(other), token(actor, "invalid"), token(actor, null), token(actor, undefined, { session_id: undefined })])("rejects managed actor/session claim mismatch", async (bearer) => {
    const value = fixture();
    expect(await value.service.issue(bearer, ip)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.getUser).toHaveBeenCalledOnce();
    expect(value.store.begin).not.toHaveBeenCalled();
    expect(value.deliver).not.toHaveBeenCalled();
  });

  it.each([{ id: "not-an-actor" }, { email: "" }, { email_confirmed_at: null }, { is_anonymous: true }])("denies missing trusted identity prerequisites", async (change) => {
    const value = fixture();
    value.getUser.mockResolvedValue({ data: { user: { ...value.user, ...change } }, error: null });
    expect(await value.service.issue(token(), ip)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.store.begin).not.toHaveBeenCalled();
  });

  it("denies a managed identity failure before decoding or trusting claims", async () => {
    const value = fixture();
    value.getUser.mockResolvedValue({ data: { user: null }, error: { message: "sensitive provider response" } });
    expect(await value.service.issue(token(), ip)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.store.begin).not.toHaveBeenCalled();
    expect(value.deliver).not.toHaveBeenCalled();
  });

  it.each(["a.b.c", token(actor, session, { session_id: "bad" })])("fails closed for corrupt claims after exact bearer verification", async (bearer) => {
    const value = fixture();
    const result = await value.service.issue(bearer, ip);
    expect(["unavailable", "denied"].includes(result.state)).toBe(true);
    expect(value.store.begin).not.toHaveBeenCalled();
    expect(value.deliver).not.toHaveBeenCalled();
  });

  it.each([
    { challengeId: "invalid", code: "123456" }, { challengeId: session, code: "12345" },
    { challengeId: session, code: "1234567" }, { challengeId: session, code: "12 456" },
    { challengeId: session, code: "١٢٣٤٥٦" }, { challengeId: session, code: 123456 },
  ])("rejects malformed verification inputs before managed or database calls", async ({ challengeId, code }) => {
    const value = fixture();
    expect(await value.service.verify(token(), challengeId, code as string)).toEqual({ state: "denied", code: "not_authorized" });
    expect(value.getUser).not.toHaveBeenCalled();
    expect(value.store.consume).not.toHaveBeenCalled();
  });

  it.each(["retry_limited", "challenge_required", "invalid_code", "challenge_expired", "private-provider-secret"]) (
    "minimizes store verification denial %s without exposing provider content", async (code) => {
      const value = fixture();
      value.store.consume.mockResolvedValue({ state: "denied", code, text: "private code and destination" });
      expect(await value.service.verify(token(), session, "123456")).toEqual({ state: "denied",
        code: code === "retry_limited" ? "retry_limited" : "not_authorized" });
    });

  it.each([null, [], { code: "invalid_code" }, { state: "issued" }])("denies malformed store consumption result", async (response) => {
    const value = fixture();
    value.store.consume.mockResolvedValue(response);
    expect(await value.service.verify(token(), session, "123456")).toEqual({ state: "denied", code: "not_authorized" });
  });

  it.each([null, [], { state: "denied", code: "retry_limited", rawProviderDetails: "withheld" }])("does not deliver after a rejected or malformed issuance", async (response) => {
    const value = fixture();
    value.store.begin.mockResolvedValue(response);
    expect(await value.service.issue(token(), ip)).toEqual({ state: "denied",
      code: response && !Array.isArray(response) && response.code === "retry_limited" ? "retry_limited" : "not_authorized" });
    expect(value.deliver).not.toHaveBeenCalled();
    expect(value.store.delivery).not.toHaveBeenCalled();
  });

  it.each([
    { recipient: "forged-recipient@example.invalid" }, { challengeId: otherSession },
    { expiresAt: "not-a-date" }, { expiresAt: null },
    { expiresAt: new Date(now).toISOString() }, { expiresAt: new Date(now - 1).toISOString() },
  ])("fails closed before delivery when the trusted issued envelope is inconsistent or expired", async (change) => {
    const value = fixture();
    value.store.begin.mockImplementation(async (input) => ({ state: "issued", challengeId: input.challengeId,
      recipient: email, expiresAt, ...change }));
    expect(await value.service.issue(token(), ip)).toEqual({ state: "unavailable" });
    expect(value.deliver).not.toHaveBeenCalled();
    expect(value.store.delivery.mock.calls.at(-1)?.[0]?.delivered).toBe(false);
  });

  it("retains no usable receipt after failed delivery and succeeds only after a later completed attempt", async () => {
    const value = fixture();
    value.deliver.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await value.service.issue(token(), ip)).toEqual({ state: "unavailable" });
    expect(value.store.delivery.mock.calls[0][0].delivered).toBe(false);
    const retried = await value.service.issue(token(), ip);
    expect(retried.state).toBe("issued");
    expect(value.store.delivery.mock.calls[1][0].delivered).toBe(true);
  });

  it.each([null, [], { state: "denied" }, { state: "verified" }])("never returns issued when delivery confirmation fails", async (confirmation) => {
    const value = fixture();
    value.store.delivery.mockResolvedValue(confirmation);
    expect(await value.service.issue(token(), ip)).toEqual({ state: "unavailable" });
    expect(value.store.delivery.mock.calls.map(([input]) => input.delivered)).toEqual([true, false]);
  });

  it("cancels a sent challenge when its successful delivery acknowledgement is lost", async () => {
    const value = fixture();
    let state = "pending";
    value.store.delivery.mockImplementation(async (input) => {
      state = input.delivered ? "sent" : "failed";
      if (input.delivered) throw new Error("private successful-commit transport detail");
      return { state: "ok" };
    });
    expect(await value.service.issue(token(), ip)).toEqual({ state: "unavailable" });
    expect(value.store.delivery.mock.calls.map(([input]) => input.delivered)).toEqual([true, false]);
    expect(state).toBe("failed");
  });

  it.each(["identity", "begin", "delivery-provider", "delivery-store", "consume"] as const)(
    "sanitizes %s failure without logging credentials, code or provider errors", async (step) => {
      const value = fixture();
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const failure = new Error("private provider payload, destination, code and token");
      if (step === "identity") value.getUser.mockRejectedValue(failure);
      if (step === "begin") value.store.begin.mockRejectedValue(failure);
      if (step === "delivery-provider") value.deliver.mockRejectedValue(failure);
      if (step === "delivery-store") value.store.delivery.mockRejectedValue(failure);
      if (step === "consume") value.store.consume.mockRejectedValue(failure);
      const result = step === "consume" ? await value.service.verify(token(), session, "123456")
        : await value.service.issue(token(), ip);
      expect(result).toEqual({ state: "unavailable" });
      if (["begin", "delivery-provider", "delivery-store"].includes(step)) {
        expect(value.store.delivery.mock.calls.at(-1)?.[0]?.delivered).toBe(false);
      }
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

  it.each(["", "too-short", "x".repeat(64), "a".repeat(63), "a".repeat(65)])("refuses an invalid server protection secret without echoing it", (invalid) => {
    const value = fixture();
    expect(() => createStaffEmailCheck({ auth: value.auth, store: value.store, deliver: value.deliver, secret: invalid }))
      .toThrow("Staff email credential protection is unavailable.");
  });
});

describe("service-only staff email RPC bridge", () => {
  const binding = { actorId: actor, sessionId: session, challengeId: otherSession };
  const codeHash = mac("synthetic fixture digest");
  const ipHash = mac("synthetic fixture IP digest");
  it("maps only the narrow bound arguments to each approved service-only RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { state: "ok" }, error: null });
    const store = createSupabaseStaffEmailStore({ rpc } as unknown as Pick<SupabaseClient, "rpc">);
    await store.begin({ ...binding, codeHash, ipHash });
    await store.delivery({ ...binding, delivered: false });
    await store.consume({ ...binding, codeHash });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "msrc_staff_email_begin", "msrc_staff_email_delivery", "msrc_staff_email_consume",
    ]);
    const expectedBound = { actor_id: actor, session_id: session, challenge_id: otherSession };
    expect(rpc.mock.calls[0][1]).toEqual({ ...expectedBound, code_hash: codeHash, ip_hash: ipHash });
    expect(rpc.mock.calls[1][1]).toEqual({ ...expectedBound, delivered: false });
    expect(rpc.mock.calls[2][1]).toEqual({ ...expectedBound, code_hash: codeHash });
  });

  it.each(["returned", "thrown"])("sanitizes %s RPC failures without exposing server data", async (kind) => {
    const rpc = vi.fn();
    if (kind === "returned") rpc.mockResolvedValue({ data: null, error: { message: "private SQL and server credential" } });
    else rpc.mockRejectedValue(new Error("private transport headers and server credential"));
    const store = createSupabaseStaffEmailStore({ rpc } as unknown as Pick<SupabaseClient, "rpc">);
    await expect(store.consume({ ...binding, codeHash })).rejects.toThrow("Staff email verification storage is unavailable.");
  });
});
