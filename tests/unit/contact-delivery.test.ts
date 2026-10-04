import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/contact/route";
import { contactTopics } from "@/config/contact";
import { resolveContactDeliveryConfig, type ContactDeliveryConfig } from "@/features/contact/delivery-config.server";
import { buildContactEmail, escapeContactText, reserveContactAttempt, sendContactEmail } from "@/features/contact/delivery.server";
import { contactHash, createContactToken, verifyContactToken } from "@/features/contact/security.server";
import { validateContactSubmission } from "@/features/contact/validation.server";
import type { Locale } from "@/lib/i18n";

const origin = "https://msrc2027.com";
const secret = "ab".repeat(32);
const environment: Readonly<Record<string, string | undefined>> = {
  CONTACT_DELIVERY_ENABLED: "true", VERCEL: "1", VERCEL_ENV: "production",
  CONTACT_SECURITY_SECRET: secret, RESEND_API_KEY: "re_contact_unit_dummy",
  CONTACT_SUPABASE_SECRET_KEY: "sb_secret_contact_unit_dummy",
  CONTACT_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co",
};
const environmentKeys = ["CONTACT_DELIVERY_ENABLED", "CONTACT_TEST_MODE", "CONTACT_SECURITY_SECRET", "RESEND_API_KEY",
  "CONTACT_SUPABASE_SECRET_KEY", "CONTACT_SUPABASE_URL", "VERCEL", "VERCEL_ENV", "CONTACT_MINIMUM_FILL_SECONDS",
  "CONTACT_IP_HOUR_LIMIT", "CONTACT_IP_DAY_LIMIT", "CONTACT_EMAIL_HOUR_LIMIT", "CONTACT_EMAIL_DAY_LIMIT"];
const submission = {
  topic: "general", name: "Synthetic Visitor", email: "synthetic.visitor+conference@example.org",
  relatedReference: "SYNTHETIC-REF", message: "Question about conference information\nAdditional synthetic context.", website: "",
};
const fetchMock = vi.fn<typeof fetch>();

function config(): ContactDeliveryConfig {
  const readiness = resolveContactDeliveryConfig(environment);
  if (readiness.state !== "ready") throw new Error("Synthetic Contact configuration was rejected");
  return readiness.config;
}

function validContact(change: Partial<typeof submission> = {}) {
  const result = validateContactSubmission({ ...submission, ...change });
  if (!result.ok) throw new Error("Expected a valid synthetic Contact submission");
  return result;
}

function rpcResponse(value: unknown = { allowed: true, retry_after_seconds: 0, reason: "allowed" }) {
  return Response.json(value);
}

function definedHeaders(headers: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function request(body: unknown = {}, headers: Record<string, string | undefined> = {}, url = origin + "/api/contact") {
  const combinedHeaders = {
    "Content-Type": "application/json", Origin: origin, "Sec-Fetch-Site": "same-origin", "X-Vercel-Forwarded-For": "203.0.113.7",
    ...headers,
  };
  return new Request(url, { method: "POST", headers: definedHeaders(combinedHeaders), body: JSON.stringify(body) });
}

function payload(locale: Locale = "en", change: Partial<typeof submission> = {}) {
  return { locale, token: createContactToken(config(), locale, origin, Date.now() - 4_000), submission: { ...submission, ...change } };
}

function callBody(index: number): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[index][1]?.body)) as Record<string, unknown>;
}

function providerCalls() {
  return fetchMock.mock.calls.filter(([url]) => String(url) === config().resendEndpoint);
}

beforeEach(() => {
  for (const key of environmentKeys) vi.stubEnv(key, undefined);
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => { throw new Error("Unexpected network request in an isolated test"); });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("fixed Contact email envelope and plaintext content", () => {
  it.each(["en", "ar"] as const)("preserves fixed sender/recipient and English email labels for %s visitors", (locale) => {
    const message = locale === "ar" ? "سؤال عن معلومات المؤتمر\nسياق إضافي" : submission.message;
    const value = buildContactEmail(validContact({ message }), locale);
    expect(value).toEqual({ from: "MSRC 2027 <no-reply@msrc2027.com>", to: ["contact@msrc2027.com"],
      reply_to: submission.email, subject: "[MSRC General] " + message.split("\n")[0],
      text: expect.stringContaining("Language: " + (locale === "en" ? "English (en)" : "Arabic (ar)")) });
    expect(value.text).toContain("Topic: General");
    expect(value.text).toContain(message);
    expect(Object.keys(value).sort()).toEqual(["from", "reply_to", "subject", "text", "to"]);
    expect(value).not.toHaveProperty("html");
    expect(value).not.toHaveProperty("attachments");
    expect(value).not.toHaveProperty("cc");
    expect(value).not.toHaveProperty("bcc");
  });

  it.each(contactTopics.map((topic) => [topic.id, topic.tag, topic.label.en] as const))("uses the approved topic/tag mapping for %s", (topic, tag, label) => {
    const result = buildContactEmail(validContact({ topic }), "en");
    expect(result.subject).toBe(tag + " Question about conference information");
    expect(result.text).toContain("Topic: " + escapeContactText(label));
    expect(result.to).toEqual(["contact@msrc2027.com"]);
  });

  it("escapes visitor-controlled markup in plaintext and does not invent a related reference", () => {
    const result = buildContactEmail(validContact({ name: "Synthetic <Visitor>", relatedReference: "",
      message: "<img src='example' onerror=\"alert(1)\"> & text\nA second line" }), "en");
    expect(result.text).toContain("Name: Synthetic &lt;Visitor&gt;");
    expect(result.text).toContain("Related reference: —");
    expect(result.text).toContain("&lt;img src=&#39;example&#39; onerror=&quot;alert(1)&quot;&gt; &amp; text");
    expect(result.text).not.toContain("<img");
  });

  it("keeps sender and recipient fixed even if an internal envelope contains other addresses", () => {
    const contact = validContact();
    const result = buildContactEmail({ ...contact, envelope: { ...contact.envelope,
      to: "other-recipient@example.org", from: "other-sender@example.org" } }, "en");
    expect(result.to).toEqual(["contact@msrc2027.com"]);
    expect(result.from).toBe("MSRC 2027 <no-reply@msrc2027.com>");
  });
});

describe("private counter admission transport", () => {
  const hashes = { ip: "11".repeat(32), email: "22".repeat(32), nonce: "33".repeat(32) };
  const expires = 1_790_000_000_000;

  it("sends only keyed identifiers, expiry and configured limits using apikey without Bearer", async () => {
    fetchMock.mockResolvedValueOnce(rpcResponse());
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toEqual({ allowed: true, retryAfter: 0, reason: "allowed" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(config().counterEndpoint);
    expect(options).toMatchObject({ method: "POST", cache: "no-store", redirect: "error" });
    const headers = new Headers(options?.headers);
    expect(headers.get("apikey")).toBe(environment.CONTACT_SUPABASE_SECRET_KEY);
    expect(headers.has("Authorization")).toBe(false);
    expect(callBody(0)).toEqual({ p_ip_hash: hashes.ip, p_email_hash: hashes.email, p_nonce_hash: hashes.nonce,
      p_nonce_expires_at: new Date(expires).toISOString(), p_ip_hour_limit: 3, p_ip_day_limit: 10,
      p_email_hour_limit: 3, p_email_day_limit: 10 });
    expect(String(options?.body)).not.toContain(submission.email);
    expect(String(options?.body)).not.toContain(submission.name);
    expect(String(options?.body)).not.toContain(submission.message);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(["limited", "replayed"] as const)("preserves the database's %s denial", async (reason) => {
    fetchMock.mockResolvedValueOnce(rpcResponse({ allowed: false, retry_after_seconds: 60, reason }));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toEqual({ allowed: false, retryAfter: 60, reason });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    null, [], {}, { allowed: "true", retry_after_seconds: 0, reason: "allowed" },
    { allowed: true, retry_after_seconds: "0", reason: "allowed" },
    { allowed: true, retry_after_seconds: 0.5, reason: "allowed" },
    { allowed: true, retry_after_seconds: -1, reason: "allowed" },
    { allowed: true, retry_after_seconds: 86_401, reason: "allowed" },
    { allowed: true, retry_after_seconds: 0, reason: "limited" },
    { allowed: false, retry_after_seconds: 0, reason: "allowed" },
    { allowed: false, retry_after_seconds: 60, reason: "unknown" },
  ])("fails closed for malformed or inconsistent RPC output %j", async (value) => {
    fetchMock.mockResolvedValueOnce(rpcResponse(value));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 429, 500])("fails closed without retry on RPC HTTP %s", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("private database diagnostic", { status }));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails closed for network errors, timeouts and malformed JSON without logging diagnostics", async () => {
    fetchMock.mockRejectedValueOnce(new Error("private diagnostic " + secret));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new DOMException("private diagnostic", "TimeoutError"));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(new Response("not-json"));
    await expect(reserveContactAttempt(config(), hashes, expires)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("one bounded Resend request", () => {
  const nonceHash = "33".repeat(32);

  it("uses the fixed endpoint, private provider key and nonce idempotency identity without response logging", async () => {
    const timeouts = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValueOnce(new Response("provider-id-not-stored"));
    await expect(sendContactEmail(config(), validContact(), "en", nonceHash)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options).toMatchObject({ method: "POST", cache: "no-store", redirect: "error" });
    const headers = new Headers(options?.headers);
    expect(headers.get("Authorization")).toBe("Bearer " + environment.RESEND_API_KEY);
    expect(headers.get("Idempotency-Key")).toBe("contact/" + nonceHash);
    expect(timeouts).toHaveBeenCalledWith(6_000);
    expect(callBody(0)).toEqual(buildContactEmail(validContact(), "en"));
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 409, 429, 500])("treats provider HTTP %s as unconfirmed and makes no retry", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("provider-response-private-detail", { status }));
    await expect(sendContactEmail(config(), validContact(), "en", nonceHash)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("aborts a timed-out request and returns an unconfirmed result without an automatic retry", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    fetchMock.mockImplementationOnce(async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Synthetic timeout", "TimeoutError")), { once: true });
    }));
    const pending = sendContactEmail(config(), validContact(), "en", nonceHash);
    controller.abort();
    await expect(pending).resolves.toBe(false);
    expect(timeout).toHaveBeenCalledWith(6_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("enabled Contact API permission and failure boundaries", () => {
  it("checks the private flag before reading any visitor headers, URL or body", async () => {
    vi.stubEnv("CONTACT_DELIVERY_ENABLED", "false");
    const untouched = { get headers() { throw new Error("Headers must not be read"); },
      get url() { throw new Error("URL must not be read"); }, get body() { throw new Error("Body must not be read"); } } as unknown as Request;
    const response = await POST(untouched);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not read input or expose secrets when an enabled environment is incomplete", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    const untouched = { get headers() { throw new Error("Headers must not be read"); } } as unknown as Request;
    const response = await POST(untouched);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "unavailable", code: "CONTACT_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["en", "ar"] as const)("issues a fresh uncached token and submits %s through counter admission before Resend", async (locale) => {
    const tokenResponse = GET(new Request(origin + "/api/contact?locale=" + locale));
    expect(tokenResponse.headers.get("cache-control")).toBe("no-store");
    const first = await tokenResponse.json() as { state: string; token: string };
    const second = await GET(new Request(origin + "/api/contact?locale=" + locale)).json() as { token: string };
    expect(first.state).toBe("ready");
    expect(first.token).not.toBe(second.token);
    fetchMock.mockResolvedValueOnce(rpcResponse()).mockResolvedValueOnce(new Response("private provider response"));
    const body = payload(locale, locale === "ar" ? { message: "سؤال عن معلومات المؤتمر" } : {});
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "sent", code: "CONTACT_SENT" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([config().counterEndpoint, config().resendEndpoint]);
    const counterBody = callBody(0);
    expect(counterBody.p_ip_hash).toBe(contactHash(config(), "ip", "203.0.113.7"));
    expect(counterBody.p_email_hash).toBe(contactHash(config(), "email", submission.email.toLowerCase()));
    expect(counterBody.p_nonce_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Idempotency-Key")).toBe("contact/" + counterBody.p_nonce_hash);
    expect(callBody(1).to).toEqual(["contact@msrc2027.com"]);
    expect(console.info).toHaveBeenCalledWith({ outcome: "sent", topic: "general" });
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of [secret, environment.RESEND_API_KEY!, environment.CONTACT_SUPABASE_SECRET_KEY!,
      submission.email, submission.name, body.submission.message, "203.0.113.7", body.token, "private provider response"]) {
      expect(logs).not.toContain(value);
    }
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    { origin: "" }, { origin: "null" }, { origin: "https://attacker.example" },
    { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" },
  ])("denies cross-origin and missing-origin submissions before counter/provider calls %j", async (headers) => {
    const response = await POST(request(payload(), headers));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ state: "invalid", code: "INVALID_CONTACT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a matching destination origin and a trusted Vercel IP rather than forwarded fallbacks", async () => {
    const mismatch = await POST(request(payload(), {}, "https://www.msrc2027.com/api/contact"));
    expect(mismatch.status).toBe(400);
    const noTrustedIp = await POST(request(payload(), { "x-vercel-forwarded-for": "", "x-forwarded-for": "203.0.113.7" }));
    expect(noTrustedIp.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues and accepts an origin-bound token through an internal Next URL with the configured external Host", async () => {
    const internalUrl = "http://localhost:3000/api/contact";
    const tokenResponse = GET(new Request(internalUrl + "?locale=en", { headers: { host: "msrc2027.com", origin } }));
    expect(tokenResponse.status).toBe(200);
    const issued = await tokenResponse.json() as { token: string };
    expect(verifyContactToken(config(), issued.token, "en", origin, Date.now() + 4_000).ok).toBe(true);
    fetchMock.mockResolvedValueOnce(rpcResponse()).mockResolvedValueOnce(new Response("accepted"));
    const response = await POST(request(payload(), { host: "msrc2027.com" }, internalUrl));
    expect(response.status).toBe(200);
    expect(providerCalls()).toHaveLength(1);
  });

  it.each([
    { host: "www.msrc2027.com" }, { host: "attacker.example" }, { host: "" },
    { host: "attacker.example", "x-forwarded-host": "msrc2027.com", "x-forwarded-proto": "https" },
  ])("rejects a Host/Origin mismatch and forwarding spoof before any admission %j", async (headers) => {
    const response = await POST(request(payload(), headers));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ state: "invalid", code: "INVALID_CONTACT" });
    const tokenResponse = GET(new Request(origin + "/api/contact?locale=en", { headers: definedHeaders({ ...headers, origin }) }));
    expect(tokenResponse.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not derive an approved origin from spoofed forwarded headers on an internal URL without Host", async () => {
    const internalUrl = "http://localhost:3000/api/contact";
    const forwarded = { "x-forwarded-host": "msrc2027.com", "x-forwarded-proto": "https",
      forwarded: "host=msrc2027.com;proto=https" };
    const tokenResponse = GET(new Request(internalUrl + "?locale=en", { headers: forwarded }));
    expect(tokenResponse.status).toBe(400);
    const response = await POST(request(payload(), forwarded, internalUrl));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { locale: "fr" }, { extra: "unexpected" }, { token: "tampered" }, { submission: null },
  ])("denies invalid body or token input before external calls %j", async (change) => {
    const response = await POST(request({ ...payload(), ...change }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { email: "visitor@example.org\r\nBcc: other@example.org" }, { website: "robot" },
    { to: "other-recipient@example.org" }, { attachments: ["unexpected"] },
  ])("prevents recipient/header injection and honeypot submissions %j", async (change) => {
    const body = payload();
    const response = await POST(request({ ...body, submission: { ...body.submission, ...change } }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only safe field-error codes for invalid staff-readable form input", async () => {
    const response = await POST(request(payload("en", { name: "", email: "invalid", message: "" })));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ state: "invalid", code: "INVALID_CONTACT",
      fieldErrors: { name: "required", email: "invalid", message: "required" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects expired, locale-mismatched and too-fast tokens before quota reservation", async () => {
    const body = payload();
    for (const token of [createContactToken(config(), "en", origin, Date.now() - 30 * 60 * 1_000 - 1),
      createContactToken(config(), "ar", origin, Date.now() - 4_000), createContactToken(config(), "en", origin)]) {
      const response = await POST(request({ ...body, token }));
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { reason: "limited", retryAfter: 60, expected: "CONTACT_LIMITED" },
    { reason: "limited", retryAfter: 3_600, expected: "CONTACT_LIMITED" },
    { reason: "replayed", retryAfter: 0, expected: "CONTACT_ATTEMPT_USED" },
  ])("does not send after per-identity/cap/replay denial %j", async ({ reason, retryAfter, expected }) => {
    fetchMock.mockResolvedValueOnce(rpcResponse({ allowed: false, retry_after_seconds: retryAfter, reason }));
    const response = await POST(request(payload()));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ state: "limited", code: expected, retryAfter });
    expect(response.headers.get("retry-after")).toBe(String(Math.max(1, retryAfter)));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(providerCalls()).toHaveLength(0);
    expect(console.info).toHaveBeenCalledWith({ outcome: "limited", topic: "general" });
  });

  it.each([null, [], { allowed: true, retry_after_seconds: 0, reason: "limited" }])("does not send after malformed counter response %j", async (result) => {
    fetchMock.mockResolvedValueOnce(rpcResponse(result));
    const response = await POST(request(payload()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "unavailable", code: "CONTACT_UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(providerCalls()).toHaveLength(0);
  });

  it("does not send when counter admission is unavailable or timed out", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("private counter failure", "TimeoutError"));
    const response = await POST(request(payload()));
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(providerCalls()).toHaveLength(0);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rechecks the off switch after reservation and starts no provider request", async () => {
    fetchMock.mockImplementationOnce(async () => {
      vi.stubEnv("CONTACT_DELIVERY_ENABLED", "false");
      return rpcResponse();
    });
    const response = await POST(request(payload()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(providerCalls()).toHaveLength(0);
  });

  it.each(["CONTACT_SECURITY_SECRET", "RESEND_API_KEY", "CONTACT_SUPABASE_SECRET_KEY"])("fails closed if %s changes during reservation", async (key) => {
    fetchMock.mockImplementationOnce(async () => {
      vi.stubEnv(key, key === "CONTACT_SECURITY_SECRET" ? "cd".repeat(32) : "unavailable");
      return rpcResponse();
    });
    const response = await POST(request(payload()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "unavailable", code: "CONTACT_UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(providerCalls()).toHaveLength(0);
  });

  it.each(["rejected", "timeout", "network"] as const)("retains the attempt after a provider %s outcome and a replay cannot send again", async (failure) => {
    const body = payload();
    fetchMock.mockResolvedValueOnce(rpcResponse());
    if (failure === "rejected") fetchMock.mockResolvedValueOnce(new Response("private provider failure", { status: 429 }));
    else fetchMock.mockRejectedValueOnce(failure === "timeout" ? new DOMException("private failure", "TimeoutError") : new Error("private failure"));
    const first = await POST(request(body));
    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ state: "unavailable", code: "CONTACT_DELIVERY_UNCONFIRMED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(providerCalls()).toHaveLength(1);
    // The durable counter decides reuse; no decrement/refund endpoint is invoked.
    fetchMock.mockResolvedValueOnce(rpcResponse({ allowed: false, retry_after_seconds: 0, reason: "replayed" }));
    const replay = await POST(request(body));
    expect(replay.status).toBe(429);
    expect(await replay.json()).toMatchObject({ code: "CONTACT_ATTEMPT_USED" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(providerCalls()).toHaveLength(1);
    expect(callBody(0)).toEqual(callBody(2));
    expect(console.info).toHaveBeenCalledWith({ outcome: "rejected", topic: "general" });
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logs).not.toContain("private");
    expect(logs).not.toContain(body.token);
    expect(logs).not.toContain(submission.email);
  });

  it("requires the same CSRF origin and a supported locale for token issuance", async () => {
    for (const tokenRequest of [
      new Request(origin + "/api/contact?locale=fr"), new Request(origin + "/api/contact?locale=en", { headers: { "Sec-Fetch-Site": "cross-site" } }),
      new Request(origin + "/api/contact?locale=en", { headers: { Origin: "https://attacker.example" } }),
      new Request("https://unapproved-preview.example/api/contact?locale=en"),
    ]) {
      const response = GET(tokenRequest);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ state: "invalid", code: "INVALID_CONTACT" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
