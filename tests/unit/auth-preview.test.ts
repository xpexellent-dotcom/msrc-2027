import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSyntheticAuthPreview, type PreviewAudit } from "@/features/auth/preview.server";
import { totpAt } from "@/features/auth/totp.server";
import type { PreviewKind } from "@/features/auth/mfa-contract";
import { SESSION_POLICY } from "@/config/session-policy";

const png = "data:image/png;base64,c3ludGhldGljLXRlc3Q=";
let at: number;
beforeEach(() => { at = 1_800_000_000_000; });

function lab(extra: Parameters<typeof createSyntheticAuthPreview>[0] = {}) {
  return createSyntheticAuthPreview({ enabled: () => true, now: () => at, qr: async () => png, ...extra });
}
type Lab = ReturnType<typeof lab>;
async function start(service: Lab, kind: PreviewKind = "staff") {
  const result = await service.execute(null, { type: "start", kind });
  expect(result.state).toBe("ok");
  return result.token!;
}
async function enroll(service: Lab, token: string) {
  const result = await service.execute(token, { type: "enroll" });
  expect(result.code).toBe("enrolled");
  return result.view!.enrollment!.secret;
}
async function assure(service: Lab, token: string) {
  const secret = await enroll(service, token);
  expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).code).toBe("verified");
  return secret;
}

describe("local ephemeral staff MFA lab (AUTH-04, ROL-12, SEC-01/06)", () => {
  it("generates separate opaque identities with no hosted, email or production authority", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    expect(first).toMatch(/^[\w-]{43}$/);
    expect(first).not.toBe(second);
    const result = await service.execute(first, { type: "status" });
    expect(result.view).toMatchObject({ synthetic: true, assurance: "aal1", factor: "none", previewAccessAllowed: false, operationalAccessReady: false, privilegedAccessReady: false });
    expect(result.view).not.toHaveProperty("token");
    expect(result.view).not.toHaveProperty("actorId");
    expect(await service.execute("unknown-actor-cookie", { type: "protected" })).toEqual({ state: "denied", code: "no_session" });
  });

  it("denies missing MFA, supports manual/QR setup, and allows only the synthetic assurance probe", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
    const enrolled = await service.execute(token, { type: "enroll" });
    const setup = enrolled.view!.enrollment!;
    expect(setup.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(new URL(setup.uri).searchParams.get("secret")).toBe(setup.secret);
    expect(setup.qrDataUrl).toBe(png);
    expect(enrolled.view).toMatchObject({ factor: "pending", challengePending: true, assurance: "aal1" });
    expect((await service.execute(token, { type: "enroll" })).code).toBe("factor_already_enrolled");
    const verified = await service.execute(token, { type: "verify", code: totpAt(setup.secret, at) });
    expect(verified.view).toMatchObject({ factor: "verified", assurance: "aal2", challengePending: false, previewAccessAllowed: true, privilegedAccessReady: false });
    expect(verified.view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "status" })).view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "protected" })).code).toBe("protected_allowed");
  });

  it("creates actual PNG QR pixels without an external service", async () => {
    const service = createSyntheticAuthPreview({ enabled: () => true, now: () => at });
    const token = await start(service);
    const result = await service.execute(token, { type: "enroll" });
    const encoded = result.view!.enrollment!.qrDataUrl;
    const bytes = Buffer.from(encoded.split(",")[1], "base64");
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("keeps enrollment data and verification isolated between two synthetic actors", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    await assure(service, first);
    expect((await service.execute(second, { type: "protected" })).code).toBe("mfa_required");
    expect((await service.execute(second, { type: "verify", code: "123456" })).code).toBe("mfa_required");
    const secondState = await service.execute(second, { type: "status" });
    expect(secondState.view).toMatchObject({ factor: "none", assurance: "aal1" });
  });

  it("consumes a challenge once under concurrent verification and rejects code replay after reauthentication", async () => {
    const service = lab();
    const token = await start(service);
    const secret = await enroll(service, token);
    const code = totpAt(secret, at);
    const results = await Promise.all([service.execute(token, { type: "verify", code }), service.execute(token, { type: "verify", code })]);
    expect(results.map((result) => result.code).sort()).toEqual(["challenge_required", "verified"]);
    const reauth = await service.execute(token, { type: "reauthenticate" });
    expect(reauth.token).not.toBe(token);
    expect(reauth.view).toMatchObject({ factor: "verified", assurance: "aal1", challengeRequired: true, previewAccessAllowed: false });
    expect((await service.execute(token, { type: "protected" })).code).toBe("no_session");
    const nextToken = reauth.token!;
    expect((await service.execute(nextToken, { type: "verify", code })).code).toBe("challenge_required");
    expect((await service.execute(nextToken, { type: "challenge" })).code).toBe("challenge_created");
    expect((await service.execute(nextToken, { type: "verify", code })).code).toBe("invalid_code");
    at += 30_000;
    expect((await service.execute(nextToken, { type: "verify", code: totpAt(secret, at) })).code).toBe("verified");
  });

  it("serializes concurrent enrollments and does not expose a second secret", async () => {
    const service = lab();
    const token = await start(service);
    const results = await Promise.all([service.execute(token, { type: "enroll" }), service.execute(token, { type: "enroll" })]);
    expect(results.map((result) => result.code).sort()).toEqual(["enrolled", "factor_already_enrolled"]);
    expect(results.filter((result) => result.view?.enrollment)).toHaveLength(1);
  });

  it("bounds active synthetic sessions while permitting same-cookie replacement and reauthentication", async () => {
    const service = lab();
    let own = await start(service);
    for (let index = 1; index < 128; index += 1) await start(service, "participant");
    expect((await service.execute(null, { type: "start", kind: "staff" })).state).toBe("unavailable");
    const replacement = await service.execute(own, { type: "start", kind: "staff" });
    expect(replacement.code).toBe("started");
    own = replacement.token!;
    for (let index = 0; index < 140; index += 1) {
      const renewed = await service.execute(own, { type: "reauthenticate" });
      expect(renewed.code).toBe("reauthenticated");
      expect((await service.execute(own, { type: "protected" })).code).toBe("no_session");
      own = renewed.token!;
    }
    expect((await service.execute(null, { type: "start", kind: "participant" })).state).toBe("unavailable");
  });

  it("challenge reissue does not reset failed-attempt throttling; cooldown recovers with a fresh code", async () => {
    const service = lab();
    const token = await start(service);
    const secret = await enroll(service, token);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service.execute(token, { type: "challenge" });
      const result = await service.execute(token, { type: "verify", code: "abcdef" });
      expect(result.code).toBe(attempt === 4 ? "retry_limited" : "invalid_code");
    }
    expect((await service.execute(token, { type: "challenge" })).code).toBe("retry_limited");
    expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).code).toBe("retry_limited");
    at += 60_000;
    expect((await service.execute(token, { type: "challenge" })).code).toBe("challenge_created");
    expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).code).toBe("verified");
  });

  it("expired challenge can be retried without replacing the enrolled secret", async () => {
    const service = lab();
    const token = await start(service);
    const secret = await enroll(service, token);
    at += 120_000;
    expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).code).toBe("challenge_expired");
    expect((await service.execute(token, { type: "challenge" })).code).toBe("challenge_created");
    expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).code).toBe("verified");
  });

  it.each(["logout", "suspend", "simulate-factor-reset"] as const)("%s immediately invalidates old synthetic assurance", async (type) => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    expect((await service.execute(token, { type })).state).toBe("ok");
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
    expect((await service.execute(token, { type: "refresh" })).code).toBe("session_revoked");
    expect((await service.execute(token, { type: "reauthenticate" })).code).toBe("session_revoked");
    const fresh = await start(service);
    expect((await service.execute(fresh, { type: "status" })).view?.factor).toBe("none");
  });

  it("unauthorized factor-loss recovery remains closed and cannot change assurance", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "request-reset" })).code).toBe("recovery_unconfigured");
    expect((await service.execute(token, { type: "status" })).view?.assurance).toBe("aal1");
    expect(service.auditSnapshot().at(-1)).toMatchObject({ event: "factor.reset_denied", outcome: "denied" });
  });

  it("safe audit contains only an allowlist of opaque IDs and outcomes, never secrets, codes or tokens", async () => {
    const service = lab();
    const token = await start(service);
    const secret = await assure(service, token);
    const audit = service.auditSnapshot();
    expect(audit).toHaveLength(3);
    for (const event of audit) expect(Object.keys(event).sort()).toEqual(["actorId", "at", "event", "outcome", "sessionId"]);
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(secret);
    // A random six-digit value can coincidentally occur inside a timestamp/UUID.
    // The exact event-field allowlist above proves no code-bearing field is recorded.
    expect(serialized).not.toContain('"code"');
    expect(serialized).not.toContain("otpauth");
  });

  it("audit failure denies promotion, revokes current assurance and emits no private diagnostics", async () => {
    let failed = false;
    const audit: PreviewAudit[] = [];
    const service = lab({ audit: (event) => { if (failed) throw new Error("private-factor-code"); audit.push(event); } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await start(service);
    const secret = await enroll(service, token);
    failed = true;
    expect((await service.execute(token, { type: "verify", code: totpAt(secret, at) })).state).toBe("unavailable");
    expect(audit.map((event) => event.event)).toEqual(["session.started", "mfa.enrollment_started"]);
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
    expect(error).not.toHaveBeenCalled();
    failed = false;
    const fresh = await start(service);
    expect((await service.execute(fresh, { type: "status" })).view?.status).toBe("active");
  });

  it("QR-generation failure leaves no pending factor and permits a fresh synthetic retry", async () => {
    let failed = true;
    const service = lab({ qr: async () => { if (failed) throw new Error("private-uri"); return png; } });
    const token = await start(service);
    const result = await service.execute(token, { type: "enroll" });
    expect(result).toMatchObject({ state: "unavailable", code: "unavailable", view: { factor: "none", status: "revoked" } });
    failed = false;
    expect((await service.execute(await start(service), { type: "enroll" })).code).toBe("enrolled");
  });

  it("missing or production preview gates deny before synthetic state or QR work", async () => {
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    vi.stubEnv("VERCEL_ENV", "production");
    const service = createSyntheticAuthPreview();
    expect(await service.execute(null, { type: "start", kind: "staff" })).toEqual({ state: "unavailable", code: "unavailable" });
    expect(service.auditSnapshot()).toEqual([]);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await service.execute(null, { type: "start", kind: "staff" })).toEqual({ state: "unavailable", code: "unavailable" });
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "");
    expect(await service.execute(null, { type: "start", kind: "staff" })).toEqual({ state: "unavailable", code: "unavailable" });
  });
});

describe("synthetic session policy integration (AUTH-05 organizer override)", () => {
  it("refresh preserves the same participant origin and absolute cap across 72 hours", async () => {
    const service = lab();
    const token = await start(service, "participant");
    const origin = at;
    for (let hours = 1; hours < 72; hours += 1) {
      at = origin + hours * 3_600_000;
      const result = await service.execute(token, { type: "refresh" });
      expect(result.code).toBe("refreshed");
      expect(result.view).toMatchObject({ startedAt: origin, lastActivityAt: origin, absoluteExpiresAt: origin + 72 * 3_600_000 });
    }
    at = origin + 72 * 3_600_000 - 1;
    expect((await service.execute(token, { type: "refresh" })).code).toBe("refreshed");
    at += 1;
    expect((await service.execute(token, { type: "refresh" })).code).toBe("session_expired");
    expect((await service.execute(token, { type: "status" })).view?.status).toBe("expired");
  });

  it("staff refresh/status do not count as activity and idle equality expires", async () => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    const origin = at;
    at += 29 * 60_000;
    expect((await service.execute(token, { type: "refresh" })).view?.lastActivityAt).toBe(origin);
    expect((await service.execute(token, { type: "status" })).view?.lastActivityAt).toBe(origin);
    at += 60_000;
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_expired");
  });

  it("successful protected activity extends idle only and never the staff eight-hour cap", async () => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    const origin = at;
    for (let minutes = 20; minutes < 480; minutes += 20) {
      at = origin + minutes * 60_000;
      const result = await service.execute(token, { type: "protected" });
      expect(result.code).toBe("protected_allowed");
      expect(result.view?.absoluteExpiresAt).toBe(origin + 8 * 3_600_000);
    }
    at = origin + 8 * 3_600_000;
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_expired");
  });

  it("genuine synthetic reauthentication after expiry creates a new lifetime, lowers assurance and preserves factor", async () => {
    const service = lab();
    const token = await start(service);
    const secret = await assure(service, token);
    at += SESSION_POLICY.privilegedIdleSeconds * 1000;
    const reauth = await service.execute(token, { type: "reauthenticate" });
    expect(reauth.code).toBe("reauthenticated");
    expect(reauth.view).toMatchObject({ startedAt: at, assurance: "aal1", factor: "verified", previewAccessAllowed: false });
    const nextToken = reauth.token!;
    await service.execute(nextToken, { type: "challenge" });
    expect((await service.execute(nextToken, { type: "verify", code: totpAt(secret, at) })).code).toBe("verified");
  });

  it("participant cannot enroll a staff factor or obtain synthetic privileged assurance", async () => {
    const service = lab();
    const token = await start(service, "participant");
    expect((await service.execute(token, { type: "enroll" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
    expect((await service.execute(token, { type: "status" })).view?.previewAccessAllowed).toBe(false);
  });
});
