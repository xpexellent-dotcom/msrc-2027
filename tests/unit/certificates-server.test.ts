import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { createCertificateParticipantHandler } from "@/features/certificates/participant-handler.server";
import { certificateFormToken, validCertificateFormToken } from "@/features/certificates/security.server";
import { certificateRpc, CertificateRpcMissingError } from "@/features/certificates/backend.server";
import { verifyCertificate } from "@/features/certificates/verification.server";
import { generatePendingCertificates } from "@/features/certificates/generation.server";
import { generateCertificatePdf } from "@/features/certificates/pdf.server";
import { drainOutbox } from "@/lib/jobs/outbox.server";
import { isDraftParticipantTemplate, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";

const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only",
  RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic config required");
const config = readiness.config, origin = config.origins[0], now = Date.UTC(2026, 9, 24, 12);
const actor = "75000000-0000-4000-8000-000000000001", session = "75000000-0000-4000-8000-000000000002", id = "75000000-0000-4000-8000-000000000003";
const claims = { sub: actor, session_id: session, exp: now / 1000 + 3600, role: "authenticated", aal: "aal1", amr: [{ method: "password" }] };
const token = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
const snapshot = { state: "ready", surveys: [], eligibility: [], certificates: [] };
const artwork = { recipientName: "Synthetic Recipient", certificateType: "Full Two-Day Conference Attendance", edition: "Synthetic edition", activity: "Synthetic activity", code: "a".repeat(64), signature: "Synthetic signature" };
const database = { databaseUrl: "http://127.0.0.1:3218", databaseKey: "sb_secret_participant_mock_only" };
function fixture(options: { raw?: unknown; result?: unknown; error?: Error; identity?: string | null; download?: boolean } = {}) {
  const backend: RegistrationBackend = { identity: vi.fn(async () => options.identity === undefined ? actor : options.identity), refresh: vi.fn(), rpc: vi.fn(async (name) => {
    if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
    if (name === "msrc_participant_form_claim") return { state: "claimed" };
    if (options.error) throw options.error;
    if (name === "msrc_certificates_participant_manage") return options.result ?? { state: "completed" };
    return options.raw ?? snapshot;
  }) };
  const handler = createCertificateParticipantHandler({ readiness: () => readiness, backend: () => backend, now: () => now, download: options.download });
  const cookie = participantCookie(config, { actorId: actor, sessionId: session, accessToken: token, refreshToken: "synthetic", deadline: now + 72 * 3600000, origin }, now).split(";")[0];
  const formToken = certificateFormToken(config, origin, actor, session, now);
  const request = (body?: Record<string, unknown>, headers: Record<string, string> = {}, query = "") => handler(new Request(origin + "/api/certificates" + query, {
    method: body ? "POST" : "GET", headers: { cookie, ...(body ? { origin, "Content-Type": "application/json" } : {}), ...headers },
    ...(body ? { body: JSON.stringify({ action: "submitSurvey", surveyId: id, answers: { q1: 5 }, formToken, ...body }) } : {}),
  }));
  return { backend, request, formToken };
}
beforeEach(() => vi.stubEnv("CERTIFICATES_ENABLED", "true"));

describe("CRT-02 participant server boundary", () => {
  it("stays closed before provider construction by default", async () => {
    vi.stubEnv("CERTIFICATES_ENABLED", ""); const backend = vi.fn();
    const response = await createCertificateParticipantHandler({ backend })(new Request(origin + "/api/certificates"));
    expect(await response.json()).toEqual({ state: "closed" }); expect(backend).not.toHaveBeenCalled();
  });
  it("sends only native verified claims and unlinked answers, with no CSRF or request key", async () => {
    const f = fixture(), response = await f.request({}); expect(response.status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_certificates_participant_manage", { edition_key: config.editionKey, session_claims: claims,
      input: { action: "submitSurvey", surveyId: id, answers: { q1: 5 } } });
    expect(await response.text()).not.toContain(actor); expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
  it.each([{ actorId: actor }, { operationId: id }, { responseId: id }, { formToken: "bad" }, { answers: { q1: {} } }])("denies injected identity/linkage and invalid fields %#", async (body) => {
    const f = fixture(); expect((await f.request(body)).status).toBe(400);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_certificates_participant_manage", expect.anything());
  });
  it("denies anonymous, mismatched native identity and cross-origin access", async () => {
    expect((await fixture().request(undefined, { cookie: "" })).status).toBe(401);
    expect((await fixture({ identity: null }).request()).status).toBe(401);
    expect((await fixture().request({}, { origin: "https://evil.invalid" })).status).toBe(400);
    expect((await fixture().request(undefined, {}, "?actorId=" + actor)).status).toBe(400);
  });
  it("retains the session when migration is missing and suppresses private diagnostics", async () => {
    const response = await fixture({ error: new CertificateRpcMissingError() }).request();
    expect(await response.json()).toEqual({ state: "area-not-ready" }); expect(response.headers.get("set-cookie")).toBeNull();
    expect(await (await fixture({ error: new Error("secret body") }).request()).text()).not.toContain("secret");
  });
  it("treats duplicate completion as successful and reads current own state", async () => {
    const response = await fixture({ result: { state: "already_completed" } }).request({}); expect(response.status).toBe(200);
  });
  it("accepts a bounded survey larger than an authentication form and rejects oversized/encoded bodies", async () => {
    expect((await fixture().request({ answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => ["q" + i, "x".repeat(1000)])) })).status).toBe(200);
    expect((await fixture().request({}, { "content-length": "131073" })).status).toBe(400);
    expect((await fixture().request({}, { "content-encoding": "gzip" })).status).toBe(400);
  });
  it("requires owning claims for every private PDF and validates bytes", async () => {
    const f = fixture({ download: true, raw: { state: "ready", pdfBase64: Buffer.from("%PDF-1.7\nsynthetic").toString("base64") } });
    const response = await f.request(undefined, {}, "?id=" + id);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_certificates_download", { edition_key: config.editionKey, session_claims: claims, certificate_id: id });
    expect((await fixture({ download: true, raw: { state: "ready", pdfBase64: Buffer.from("<html>").toString("base64") } }).request(undefined, {}, "?id=" + id)).status).toBe(503);
  });
  it("binds CSRF to purpose, actor, session, origin and lifetime", () => {
    const signed = certificateFormToken(config, origin, actor, session, now);
    expect(validCertificateFormToken(config, signed, origin, actor, session, now)).toBe(true);
    for (const [o, a, s, t] of [[origin, id, session, now], [origin, actor, id, now], ["https://evil.invalid", actor, session, now], [origin, actor, session, now + 1800000]] as const)
      expect(validCertificateFormToken(config, signed, o, a, s, t)).toBe(false);
  });
});
describe("CRT-05 minimal rate-limited verification", () => {
  const details = { recipient_name: "Synthetic Recipient", certificate_type: artwork.certificateType, edition: "Synthetic edition", activity: artwork.activity, validity: "valid" };
  it("uses an independent HMAC abuse bucket and exposes only five approved fields", async () => {
    const rpc = vi.fn(async () => details);
    expect(await verifyCertificate(artwork.code, "192.0.2.1", { ...database, securitySecret: config.securitySecret }, rpc)).toEqual({ state: "ready", certificate: details });
    expect(rpc.mock.calls[0]).toEqual([expect.anything(), "msrc_certificates_verify", { code: artwork.code, rate_key: expect.stringMatching(/^[a-f0-9]{64}$/) }]);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("192.0.2.1");
  });
  it.each(["email", "actor_id", "score", "phone", "code"])("rejects over-returned %s", async (extra) => {
    const result = await verifyCertificate(artwork.code, "192.0.2.1", { ...database, securitySecret: config.securitySecret }, async () => ({ ...details, [extra]: "private" }));
    expect(result).toEqual({ state: "unavailable" });
  });
  it("fails closed without trusted IP and handles missing RPC/rate limit", async () => {
    const rpc = vi.fn(); expect(await verifyCertificate(artwork.code, "", { ...database, securitySecret: config.securitySecret }, rpc)).toEqual({ state: "unavailable" }); expect(rpc).not.toHaveBeenCalled();
    expect(await verifyCertificate(artwork.code, "192.0.2.1", { ...database, securitySecret: config.securitySecret }, async () => ({ state: "rate_limited" }))).toEqual({ state: "limited" });
    expect(await verifyCertificate(artwork.code, "192.0.2.1", { ...database, securitySecret: config.securitySecret }, async () => { throw new CertificateRpcMissingError(); })).toEqual({ state: "area-not-ready" });
  });
});
describe("CRT-04 durable PDF issuance and held English DRAFT", () => {
  it("generates bounded server PDFs with embedded Latin and Arabic fonts", async () => {
    for (const name of [artwork.recipientName, "متلق تجريبي", "Synthetic متلق", "م" + "W".repeat(199)]) {
      const pdf = await generateCertificatePdf({ ...artwork, recipientName: name });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeLessThan(1_000_000); expect(pdf.toString("latin1")).toContain("/Type /Font");
      expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
    }
  });
  it("persists PDF under the durable lease before issuance and queues no email itself", async () => {
    const rpc = vi.fn(async (_config, name) => name.endsWith("claim") ? [{ ...artwork, id, leaseToken: session }] : { state: "issued" });
    const result = await generatePendingCertificates(database, { rpc, pdf: async () => Buffer.from("%PDF-1.7\nsynthetic") });
    expect(result).toEqual({ state: "updated", issued: 1 });
    expect(rpc.mock.calls[1]).toEqual([database, "msrc_certificates_generation_finish", { certificate_id: id, worker_id: expect.stringMatching(/^[a-f0-9-]{36}$/), lease_token: session, pdf_base64: expect.any(String) }]);
  });
  it("leaves failures pending for another durable drain and gates generation off", async () => {
    const rpc = vi.fn(async () => [{ ...artwork, id, leaseToken: session }]);
    await expect(generatePendingCertificates(database, { rpc, pdf: async () => { throw new Error("private"); } })).rejects.toThrow("Certificate generation unavailable");
    expect(rpc).toHaveBeenCalledTimes(1); vi.stubEnv("CERTIFICATES_ENABLED", ""); rpc.mockClear();
    expect(await generatePendingCertificates(database, { rpc })).toEqual({ state: "closed", issued: 0 }); expect(rpc).not.toHaveBeenCalled();
  });
  it("renders English preview but refuses sending even a frozen DRAFT provider snapshot", async () => {
    const message = { id, template_key: "certificate_notice", template_version: 1, locale: "en", recipient_email: "synthetic@example.invalid",
      payload: { certificate_id: id, certificate_type: artwork.certificateType, edition: artwork.edition, activity: artwork.activity },
      attempt_count: 1, lease_token: session, lease_expires_at: new Date(now + 3600000).toISOString(), provider_idempotency_key: "synthetic", first_attempt_at: new Date(now).toISOString(), provider_request: null } satisfies OutboxMessage;
    const preview = renderOutboxMessage(message); expect(preview.text).toContain("My MSRC"); expect(preview.html).toContain("/brand/email-banner.png"); expect(preview.text).not.toContain(artwork.code);
    expect(isDraftParticipantTemplate("certificate_notice")).toBe(true);
    const sender = { send: vi.fn() }, store = { claim: vi.fn().mockResolvedValueOnce([{ ...message, provider_request: preview }]).mockResolvedValue([]), prepare: vi.fn(), finish: vi.fn().mockResolvedValue("failed_permanent") };
    expect(await drainOutbox({ store, sender, now: () => now, dailyCap: 1 })).toMatchObject({ sent: 0, permanent: 1 }); expect(store.prepare).not.toHaveBeenCalled(); expect(sender.send).not.toHaveBeenCalled();
  });
  it("maps missing service-only RPCs to readiness without leaking arguments", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 })));
    await expect(certificateRpc(database, "msrc_certificates_verify", { code: artwork.code })).rejects.toBeInstanceOf(CertificateRpcMissingError);
  });
});
