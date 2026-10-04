import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveContactDeliveryConfig, type ContactDeliveryConfig } from "@/features/contact/delivery-config.server";
import { contactHash, contactRequestOrigin, createContactToken, readContactJson, trustedContactIp, verifyContactToken } from "@/features/contact/security.server";

const secret = "ab".repeat(32);
const origin = "https://msrc2027.com";
const now = 1_790_000_000_000;
const lifetime = 30 * 60 * 1_000;
const productionEnv: Readonly<Record<string, string | undefined>> = {
  CONTACT_DELIVERY_ENABLED: "true", VERCEL: "1", VERCEL_ENV: "production",
  CONTACT_SECURITY_SECRET: secret, RESEND_API_KEY: "re_contact_unit_dummy",
  CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_unit_dummy",
  CONTACT_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co",
};
const mockEnv: Readonly<Record<string, string | undefined>> = {
  CONTACT_DELIVERY_ENABLED: "true", CONTACT_TEST_MODE: "true", CONTACT_SECURITY_SECRET: secret,
  RESEND_API_KEY: "re_contact_mock_only", CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_mock_only",
  CONTACT_SUPABASE_URL: "http://127.0.0.1:3214",
};

function config(env: Readonly<Record<string, string | undefined>> = productionEnv): ContactDeliveryConfig {
  const result = resolveContactDeliveryConfig(env);
  if (result.state !== "ready") throw new Error("Synthetic Contact configuration was rejected");
  return result.config;
}

function signedPayload(value: unknown): string {
  const encoded = Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
  const signature = createHmac("sha256", Buffer.from(secret, "hex")).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

function tokenPayload() {
  return { purpose: "contact-v1", locale: "en", origin, issued: now - 4_000,
    expires: now - 4_000 + lifetime, nonce: "12".repeat(24) };
}

function definedHeaders(headers: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function ipRequest(headers: Record<string, string | undefined> = {}): Request {
  return new Request(origin + "/api/contact", { headers: definedHeaders(headers) });
}

function jsonRequest(body: string | Uint8Array, headers: Record<string, string | undefined> = {}): Request {
  return new Request(origin + "/api/contact", { method: "POST",
    headers: definedHeaders({ "content-type": "application/json", ...headers }),
    body: typeof body === "string" ? body : new Uint8Array(body) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network is not allowed in this test"); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Contact delivery configuration boundaries", () => {
  it.each([undefined, "", "false", "TRUE", "1", " true", "true "])("requires the exact private on flag, received %s", (value) => {
    expect(resolveContactDeliveryConfig({ ...productionEnv, CONTACT_DELIVERY_ENABLED: value })).toEqual({ state: "closed" });
  });

  it("does not use a public flag or expose partially configured secrets in readiness", () => {
    expect(resolveContactDeliveryConfig({ NEXT_PUBLIC_CONTACT_DELIVERY_ENABLED: "true" })).toEqual({ state: "closed" });
    expect(resolveContactDeliveryConfig({ ...productionEnv, RESEND_API_KEY: undefined })).toEqual({ state: "unavailable" });
  });

  it("pins real delivery to Production, approved origins and fixed provider/project endpoints", () => {
    const value = config();
    expect(value).toMatchObject({ testMode: false, resendEndpoint: "https://api.resend.com/emails",
      counterEndpoint: "https://ecemjggwlzqpjcwmchrl.supabase.co/rest/v1/rpc/msrc_contact_reserve_attempt",
      origins: [origin, "https://www.msrc2027.com"], minimumFillSeconds: 3,
      ipHourLimit: 3, ipDayLimit: 10, emailHourLimit: 3, emailDayLimit: 10 });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.origins)).toBe(true);
  });

  it.each([
    { VERCEL: undefined }, { VERCEL: "0" }, { VERCEL_ENV: undefined }, { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "development" }, { CONTACT_SUPABASE_URL: "https://other.supabase.co" },
    { CONTACT_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co/" },
    { CONTACT_SUPABASE_URL: "http://127.0.0.1:3214" }, { RESEND_API_KEY: "not-a-provider-key" },
    { CONTACT_SUPABASE_SECRET_KEY: "eyJ_legacy_role_token" },
    { CONTACT_SECURITY_SECRET: "ab".repeat(31) }, { CONTACT_SECURITY_SECRET: "z".repeat(64) },
    { CONTACT_SECURITY_SECRET: undefined },
  ])("fails closed for an invalid production scope or setting %j", (change) => {
    expect(resolveContactDeliveryConfig({ ...productionEnv, ...change })).toEqual({ state: "unavailable" });
  });

  it.each([
    { RESEND_API_KEY: "re_contact_mock_only" }, { CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_mock_only" },
  ])("never accepts a local mock credential in Production %j", (change) => {
    expect(resolveContactDeliveryConfig({ ...productionEnv, ...change })).toEqual({ state: "unavailable" });
  });

  it("allows local isolation only with the exact dummy keys and loopback destinations", () => {
    expect(config(mockEnv)).toMatchObject({ testMode: true, resendEndpoint: "http://127.0.0.1:3214/emails",
      counterEndpoint: "http://127.0.0.1:3214/rest/v1/rpc/msrc_contact_reserve_attempt",
      origins: ["http://127.0.0.1:3212"] });
  });

  it.each([
    { VERCEL: "1" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" },
    { RESEND_API_KEY: "re_contact_unit_dummy" }, { CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_unit_dummy" },
    { CONTACT_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co" },
    { CONTACT_SUPABASE_URL: "http://localhost:3214" },
  ])("rejects a mixed live/mock environment %j", (change) => {
    expect(resolveContactDeliveryConfig({ ...mockEnv, ...change })).toEqual({ state: "unavailable" });
  });

  it("accepts bounded configurable thresholds without changing fixed daily provider caps", () => {
    expect(config({ ...productionEnv, CONTACT_MINIMUM_FILL_SECONDS: "5", CONTACT_IP_HOUR_LIMIT: "4",
      CONTACT_IP_DAY_LIMIT: "20", CONTACT_EMAIL_HOUR_LIMIT: "2", CONTACT_EMAIL_DAY_LIMIT: "10" }))
      .toMatchObject({ minimumFillSeconds: 5, ipHourLimit: 4, ipDayLimit: 20, emailHourLimit: 2, emailDayLimit: 10 });
  });

  it.each([
    { CONTACT_MINIMUM_FILL_SECONDS: "2" }, { CONTACT_MINIMUM_FILL_SECONDS: "301" },
    { CONTACT_IP_HOUR_LIMIT: "0" }, { CONTACT_IP_HOUR_LIMIT: "4.5" }, { CONTACT_IP_HOUR_LIMIT: "03" },
    { CONTACT_IP_HOUR_LIMIT: "-1" }, { CONTACT_IP_DAY_LIMIT: "61" },
    { CONTACT_EMAIL_DAY_LIMIT: "NaN" }, { CONTACT_IP_HOUR_LIMIT: "11", CONTACT_IP_DAY_LIMIT: "10" },
    { CONTACT_EMAIL_HOUR_LIMIT: "11", CONTACT_EMAIL_DAY_LIMIT: "10" },
  ])("rejects unsafe or inconsistent counter thresholds %j", (change) => {
    expect(resolveContactDeliveryConfig({ ...productionEnv, ...change })).toEqual({ state: "unavailable" });
  });
});

describe("signed Contact fill-time and replay identity", () => {
  it("uses independent cryptographic nonces for forms issued at the same time", () => {
    const first = verifyContactToken(config(), createContactToken(config(), "en", origin, now - 4_000), "en", origin, now);
    const second = verifyContactToken(config(), createContactToken(config(), "en", origin, now - 4_000), "en", origin, now);
    expect(first).toMatchObject({ ok: true, expires: now - 4_000 + lifetime });
    expect(second).toMatchObject({ ok: true });
    if (!first.ok || !second.ok) throw new Error("Expected verified synthetic tokens");
    expect(first.nonce).toMatch(/^[a-f0-9]{48}$/);
    expect(first.nonce).not.toBe(second.nonce);
  });

  it("binds a token to its locale, exact origin and current signing key", () => {
    const token = createContactToken(config(), "ar", origin, now - 4_000);
    expect(verifyContactToken(config(), token, "ar", origin, now).ok).toBe(true);
    expect(verifyContactToken(config(), token, "en", origin, now).ok).toBe(false);
    expect(verifyContactToken(config(), token, "ar", "https://www.msrc2027.com", now).ok).toBe(false);
    expect(verifyContactToken({ ...config(), securitySecret: "cd".repeat(32) }, token, "ar", origin, now).ok).toBe(false);
    expect(() => createContactToken(config(), "en", "https://unapproved.example", now)).toThrow();
  });

  it("enforces the minimum fill time and exact expiry without refreshing a token", () => {
    const token = createContactToken(config(), "en", origin, now);
    expect(verifyContactToken(config(), token, "en", origin, now + 2_999)).toEqual({ ok: false, code: "CONTACT_TOO_FAST" });
    expect(verifyContactToken(config(), token, "en", origin, now + 3_000).ok).toBe(true);
    expect(verifyContactToken(config(), token, "en", origin, now + lifetime - 1).ok).toBe(true);
    expect(verifyContactToken(config(), token, "en", origin, now + lifetime)).toEqual({ ok: false, code: "CONTACT_INVALID_TOKEN" });
    expect(verifyContactToken(config(), token, "en", origin, now - 1).ok).toBe(false);
  });

  it.each([null, undefined, 123, {}, "", "a", "a.b.c", "a.!", "a.a", "x".repeat(1_025)])("rejects malformed tokens without throwing %j", (value) => {
    expect(verifyContactToken(config(), value, "en", origin, now)).toEqual({ ok: false, code: "CONTACT_INVALID_TOKEN" });
  });

  it("rejects payload and signature tampering", () => {
    const token = createContactToken(config(), "en", origin, now - 4_000);
    const [payload, signature] = token.split(".");
    const tamperedPayload = (payload[0] === "A" ? "B" : "A") + payload.slice(1);
    const tamperedSignature = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    expect(verifyContactToken(config(), tamperedPayload + "." + signature, "en", origin, now).ok).toBe(false);
    expect(verifyContactToken(config(), payload + "." + tamperedSignature, "en", origin, now).ok).toBe(false);
  });

  it.each([
    null, [], "not-json", { ...tokenPayload(), purpose: "other" },
    { ...tokenPayload(), nonce: "12" }, { ...tokenPayload(), nonce: "AB".repeat(24) },
    { ...tokenPayload(), issued: now + 1, expires: now + 1 + lifetime },
    { ...tokenPayload(), issued: now - 4_000.5, expires: now - 4_000.5 + lifetime },
    { ...tokenPayload(), expires: now - 4_000 + lifetime + 1 },
    { ...tokenPayload(), origin: "https://attacker.example" }, { ...tokenPayload(), extra: true },
    { ...tokenPayload(), nonce: undefined },
  ])("rejects correctly signed but invalid token semantics %j", (value) => {
    expect(verifyContactToken(config(), signedPayload(value), "en", origin, now)).toEqual({ ok: false, code: "CONTACT_INVALID_TOKEN" });
  });

  it("stores domain-separated keyed hashes instead of recoverable raw identifiers", () => {
    const value = "synthetic.visitor@example.org";
    const email = contactHash(config(), "email", value);
    expect(email).toMatch(/^[a-f0-9]{64}$/);
    expect(email).toBe(contactHash(config(), "email", value));
    expect(email).not.toContain(value);
    expect(email).not.toBe(contactHash(config(), "ip", value));
    expect(email).not.toBe(contactHash(config(), "nonce", value));
    expect(email).not.toBe(contactHash({ ...config(), securitySecret: "cd".repeat(32) }, "email", value));
  });
});

describe("configured Contact Host boundary", () => {
  it("uses the exact configured Host when Next exposes an internal URL", () => {
    expect(contactRequestOrigin(config(), new Request("http://localhost:3000/api/contact", {
      headers: { host: "msrc2027.com" },
    }))).toBe(origin);
    expect(contactRequestOrigin(config(), new Request("http://localhost:3000/api/contact", {
      headers: { host: "www.msrc2027.com" },
    }))).toBe("https://www.msrc2027.com");
    expect(contactRequestOrigin(config(mockEnv), new Request("http://localhost:3212/api/contact", {
      headers: { host: "127.0.0.1:3212" },
    }))).toBe("http://127.0.0.1:3212");
  });

  it("uses the exact request URL origin only when Host is absent", () => {
    expect(contactRequestOrigin(config(), new Request(origin + "/api/contact"))).toBe(origin);
    expect(contactRequestOrigin(config(), new Request("http://msrc2027.com/api/contact"))).toBeUndefined();
    expect(contactRequestOrigin(config(), new Request("http://localhost:3000/api/contact"))).toBeUndefined();
    expect(contactRequestOrigin(config(), new Request(origin + "/api/contact", { headers: { host: "" } }))).toBeUndefined();
  });

  it.each(["attacker.example", "msrc2027.com.attacker.example", "msrc2027.com:443", "msrc2027.com, www.msrc2027.com",
    "https://msrc2027.com", "msrc2027.com/path"])("does not fall back from an unapproved Host %s to an approved URL", (host) => {
    expect(contactRequestOrigin(config(), new Request(origin + "/api/contact", { headers: { host } }))).toBeUndefined();
  });

  it("does not accept a forwarded host/protocol when the actual Host or internal URL is unapproved", () => {
    const forwarded = { "x-forwarded-host": "msrc2027.com", "x-forwarded-proto": "https",
      forwarded: "host=msrc2027.com;proto=https" };
    expect(contactRequestOrigin(config(), new Request("http://localhost:3000/api/contact", { headers: forwarded }))).toBeUndefined();
    expect(contactRequestOrigin(config(), new Request(origin + "/api/contact", {
      headers: { ...forwarded, host: "attacker.example" },
    }))).toBeUndefined();
  });

  it("ignores spoofed forwarding values when an exact configured Host is present", () => {
    expect(contactRequestOrigin(config(), new Request("http://localhost:3000/api/contact", { headers: {
      host: "msrc2027.com", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http",
      forwarded: "host=attacker.example;proto=http",
    } }))).toBe(origin);
  });
});

describe("trusted Contact IP boundary", () => {
  it("uses only the Vercel-supplied header and normalizes IPv6 equivalents", () => {
    expect(trustedContactIp(config(), ipRequest({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "198.51.100.9" })))
      .toBe("203.0.113.7");
    expect(trustedContactIp(config(), ipRequest({ "x-vercel-forwarded-for": "2001:0DB8:0:0:0:0:0:1" }))).toBe("2001:db8::1");
    expect(trustedContactIp(config(), ipRequest({ "x-vercel-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it.each([
    {}, { "x-forwarded-for": "203.0.113.7" }, { "x-real-ip": "203.0.113.7" },
    { "x-vercel-forwarded-for": "203.0.113.7, 198.51.100.9" },
    { "x-vercel-forwarded-for": "not-an-ip" }, { "x-vercel-forwarded-for": "203.0.113.7:443" },
    { "x-vercel-forwarded-for": "999.0.0.1" }, { "x-vercel-forwarded-for": "[2001:db8::1]" },
  ])("refuses missing, spoofable fallback, or ambiguous IP input %j", (headers) => {
    expect(trustedContactIp(config(), ipRequest(headers))).toBeNull();
  });

  it("rejects whitespace rather than treating multiple representations as different counter identities", () => {
    const request = { headers: { get: () => " 203.0.113.7 " } } as unknown as Request;
    expect(trustedContactIp(config(), request)).toBeNull();
  });

  it("uses the fixed loopback test identity regardless of caller headers in isolation", () => {
    expect(trustedContactIp(config(mockEnv), ipRequest({ "x-vercel-forwarded-for": "198.51.100.9" }))).toBe("127.0.0.1");
  });
});

describe("bounded Contact JSON input", () => {
  it("reads valid JSON with an optional charset and identity encoding", async () => {
    await expect(readContactJson(jsonRequest('{"locale":"ar"}', {
      "content-type": "Application/JSON; charset=utf-8", "content-encoding": "identity",
    }))).resolves.toEqual({ locale: "ar" });
  });

  it.each([
    { "content-type": "text/plain" }, { "content-type": "multipart/form-data" },
    { "content-type": "application/jsonp" }, { "content-encoding": "gzip" },
    { "content-encoding": "br" }, { "content-encoding": "gzip, identity" },
    { "content-length": "24001" }, { "content-length": "-1" }, { "content-length": "1.5" },
    { "content-length": "junk" },
  ])("rejects unsupported encodings and invalid declared sizes %j", async (headers) => {
    await expect(readContactJson(jsonRequest("{}", headers))).rejects.toThrow();
  });

  it("permits the byte boundary and rejects bytes above it even with a false Content-Length", async () => {
    const atLimit = JSON.stringify("a".repeat(23_998));
    expect(Buffer.byteLength(atLimit)).toBe(24_000);
    await expect(readContactJson(jsonRequest(atLimit))).resolves.toBe("a".repeat(23_998));
    await expect(readContactJson(jsonRequest(JSON.stringify("a".repeat(23_999)), { "content-length": "2" }))).rejects.toThrow();
  });

  it("counts UTF-8 bytes rather than characters", async () => {
    const text = JSON.stringify("ع".repeat(12_000));
    expect(text.length).toBeLessThan(24_000);
    expect(Buffer.byteLength(text)).toBeGreaterThan(24_000);
    await expect(readContactJson(jsonRequest(text))).rejects.toThrow();
  });

  it("bounds chunked streams, cancels an oversized body, and releases the stream lock", async () => {
    const cancelled = vi.fn();
    let chunks = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { chunks += 1; controller.enqueue(new Uint8Array(8_001)); },
      cancel: cancelled,
    });
    const request = { headers: new Headers({ "content-type": "application/json" }), body: stream } as Request;
    await expect(readContactJson(request)).rejects.toThrow();
    expect(chunks).toBeLessThanOrEqual(4);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("rejects invalid UTF-8, invalid JSON and absent bodies", async () => {
    await expect(readContactJson(jsonRequest(new Uint8Array([0xff, 0xfe])))).rejects.toThrow();
    await expect(readContactJson(jsonRequest("{broken"))).rejects.toThrow();
    await expect(readContactJson(new Request(origin + "/api/contact", {
      method: "POST", headers: { "content-type": "application/json" },
    }))).rejects.toThrow();
  });
});
