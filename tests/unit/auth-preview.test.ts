import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSyntheticAuthPreview, type PreviewAudit } from "@/features/auth/preview.server";
import type { PreviewKind } from "@/features/auth/mfa-contract";
import { SESSION_POLICY } from "@/config/session-policy";

let at: number;
beforeEach(() => { at = 1_800_000_000_000; });
function lab(extra: Parameters<typeof createSyntheticAuthPreview>[0] = {}) {
  return createSyntheticAuthPreview({ enabled: () => true, now: () => at, ...extra });
}
type Lab = ReturnType<typeof lab>;
async function start(service: Lab, kind: PreviewKind = "staff") {
  const result = await service.execute(null, { type: "start", kind });
  expect(result.state).toBe("ok");
  return result.token!;
}
async function send(service: Lab, token: string, type: "enroll" | "challenge" | "challenge-email") {
  const result = await service.execute(token, { type });
  expect(result.state).toBe("ok");
  expect(Boolean(result.view?.testMessage?.code.match(/^\d{6}$/))).toBe(true);
  return result.view!.testMessage!.code;
}
async function assure(service: Lab, token: string) {
  const code = await send(service, token, "enroll");
  expect((await service.execute(token, { type: "verify", code })).code).toBe("verified");
  return code;
}
async function verifyParticipant(service: Lab, token: string) {
  const email = await send(service, token, "challenge-email");
  expect((await service.execute(token, { type: "verify-email", code: email })).code).toBe("email_verified");
  const sms = await send(service, token, "challenge");
  expect((await service.execute(token, { type: "verify", code: sms })).code).toBe("phone_verified");
}

describe("local synthetic password then staff SMS MFA", () => {
  it("starts separate password-proved identities without collecting credentials or creating authority", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    expect(first).toMatch(/^[\w-]{43}$/);
    expect(first).not.toBe(second);
    expect((await service.execute(first, { type: "status" })).view).toMatchObject({
      synthetic: true, passwordVerified: true, emailVerified: true, phoneVerified: false,
      assurance: "aal1", factor: "none", previewAccessAllowed: false,
      operationalAccessReady: false, privilegedAccessReady: false,
    });
    expect(await service.execute("other-cookie", { type: "protected" })).toEqual({ state: "denied", code: "no_session" });
  });

  it("requires the SMS code after password and returns the test code only during a synthetic send", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
    const enrollment = await service.execute(token, { type: "enroll" });
    expect(enrollment.view).toMatchObject({ factor: "pending", assurance: "aal1", challengePending: true,
      testMessage: { channel: "sms", delivery: "test-only", destination: "Synthetic phone •••• 0000" } });
    expect(enrollment.view).not.toHaveProperty("enrollment");
    const code = enrollment.view!.testMessage!.code;
    expect((await service.execute(token, { type: "status" })).view).not.toHaveProperty("testMessage");
    expect((await service.execute(token, { type: "enroll" })).code).toBe("factor_already_enrolled");
    const verified = await service.execute(token, { type: "verify", code });
    expect(verified).toMatchObject({ code: "verified", view: { factor: "verified", phoneVerified: true,
      assurance: "aal2", previewAccessAllowed: true, privilegedAccessReady: false } });
    expect(verified.view).not.toHaveProperty("testMessage");
    expect((await service.execute(token, { type: "protected" })).code).toBe("protected_allowed");
    expect((await service.execute(token, { type: "verify", code })).code).toBe("challenge_required");
  });

  it("isolates codes between two actor cookies", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    const firstCode = await send(service, first, "enroll");
    expect((await service.execute(second, { type: "verify", code: firstCode })).code).toBe("mfa_required");
    expect((await service.execute(second, { type: "status" })).view).toMatchObject({ factor: "none", phoneVerified: false });
  });

  it("serializes verification and consumes each challenge once", async () => {
    const service = lab();
    const token = await start(service);
    const code = await send(service, token, "enroll");
    const results = await Promise.all([service.execute(token, { type: "verify", code }), service.execute(token, { type: "verify", code })]);
    expect(results.map((result) => result.code).sort()).toEqual(["challenge_required", "verified"]);
  });

  it("serializes enrollment without creating two factors or showing two test codes", async () => {
    const service = lab();
    const token = await start(service);
    const results = await Promise.all([service.execute(token, { type: "enroll" }), service.execute(token, { type: "enroll" })]);
    expect(results.map((result) => result.code).sort()).toEqual(["enrolled", "factor_already_enrolled"]);
    expect(results.filter((result) => result.view?.testMessage)).toHaveLength(1);
  });

  it("reissue invalidates the prior SMS code even before expiry", async () => {
    const service = lab();
    const token = await start(service);
    const firstCode = await send(service, token, "enroll");
    const secondCode = await send(service, token, "challenge");
    expect(Boolean(firstCode !== secondCode)).toBe(true);
    expect((await service.execute(token, { type: "verify", code: firstCode })).code).toBe("invalid_code");
    expect((await service.execute(token, { type: "verify", code: secondCode })).code).toBe("verified");
  });

  it("reauthentication removes old cookie access and requires a fresh SMS challenge after password", async () => {
    const service = lab();
    const token = await start(service);
    const oldCode = await assure(service, token);
    const reauth = await service.execute(token, { type: "reauthenticate" });
    const next = reauth.token!;
    expect(reauth.view).toMatchObject({ passwordVerified: true, assurance: "aal1", factor: "verified", challengeRequired: true, previewAccessAllowed: false });
    expect((await service.execute(token, { type: "protected" })).code).toBe("no_session");
    expect((await service.execute(next, { type: "verify", code: oldCode })).code).toBe("challenge_required");
    const newCode = await send(service, next, "challenge");
    expect((await service.execute(next, { type: "verify", code: oldCode })).code).toBe("invalid_code");
    expect((await service.execute(next, { type: "verify", code: newCode })).code).toBe("verified");
  });

  it("fresh challenges do not reset failed SMS attempts and cooldown permits recovery", async () => {
    const service = lab();
    const token = await start(service);
    await send(service, token, "enroll");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await send(service, token, "challenge");
      expect((await service.execute(token, { type: "verify", code: "invalid" })).code).toBe(attempt === 4 ? "retry_limited" : "invalid_code");
    }
    expect((await service.execute(token, { type: "challenge" })).code).toBe("retry_limited");
    at += 60_000;
    const code = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code })).code).toBe("verified");
  });

  it.each(["staff", "participant"] as const)("reauthentication preserves %s SMS failures and active cooldown", async (kind) => {
    const service = lab();
    let token = await start(service, kind);
    await send(service, token, kind === "staff" ? "enroll" : "challenge");
    for (let attempt = 0; attempt < 4; attempt += 1) await service.execute(token, { type: "verify", code: "invalid" });
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code: "invalid" })).code).toBe("retry_limited");
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge" })).code).toBe("retry_limited");
    at += 60_000;
    const code = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code })).code).toBe(kind === "staff" ? "verified" : "phone_verified");
  });

  it("reauthentication preserves participant email cooldown independently of phone verification", async () => {
    const service = lab();
    let token = await start(service, "participant");
    await send(service, token, "challenge-email");
    for (let attempt = 0; attempt < 5; attempt += 1) await service.execute(token, { type: "verify-email", code: "invalid" });
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    const sms = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code: sms })).code).toBe("phone_verified");
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 60_000;
    const email = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: email })).code).toBe("email_verified");
  });

  it("challenge expiry denies at equality, and resend recovers", async () => {
    const service = lab();
    const token = await start(service);
    const expired = await send(service, token, "enroll");
    at += 120_000;
    expect((await service.execute(token, { type: "verify", code: expired })).code).toBe("challenge_expired");
    const fresh = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code: fresh })).code).toBe("verified");
  });

  it.each(["logout", "suspend", "simulate-factor-reset"] as const)("%s invalidates retained session and factor assurance", async (type) => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    expect((await service.execute(token, { type })).state).toBe("ok");
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
    expect((await service.execute(token, { type: "refresh" })).code).toBe("session_revoked");
    expect((await service.execute(token, { type: "reauthenticate" })).code).toBe("session_revoked");
  });

  it("factor recovery stays unconfigured, with no silent reset", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "request-reset" })).code).toBe("recovery_unconfigured");
    expect((await service.execute(token, { type: "status" })).view?.assurance).toBe("aal1");
    expect(service.auditSnapshot().at(-1)).toMatchObject({ event: "factor.reset_denied", outcome: "denied" });
  });

  it("audit fields contain no password, code, destination, token or free-form provider detail", async () => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    for (const event of service.auditSnapshot()) expect(Object.keys(event).sort()).toEqual(["actorId", "at", "event", "outcome", "sessionId"]);
    expect(JSON.stringify(service.auditSnapshot())).not.toContain(token);
  });

  it("audit failure blocks MFA promotion and revokes existing assurance without logs", async () => {
    let failed = false;
    const events: PreviewAudit[] = [];
    const service = lab({ audit: (event) => { if (failed) throw new Error("private-code"); events.push(event); } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await start(service);
    const code = await send(service, token, "enroll");
    failed = true;
    expect((await service.execute(token, { type: "verify", code })).state).toBe("unavailable");
    expect(events.map((event) => event.event)).toEqual(["session.started", "mfa.enrollment_started"]);
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
    expect(error).not.toHaveBeenCalled();
  });

  it("bounds active identities while permitting same-cookie replacement and repeated reauthentication", async () => {
    const service = lab();
    let own = await start(service);
    for (let index = 1; index < 128; index += 1) await start(service, "participant");
    expect((await service.execute(null, { type: "start", kind: "staff" })).state).toBe("unavailable");
    own = (await service.execute(own, { type: "start", kind: "staff" })).token!;
    for (let index = 0; index < 140; index += 1) own = (await service.execute(own, { type: "reauthenticate" })).token!;
    expect((await service.execute(null, { type: "start", kind: "staff" })).state).toBe("unavailable");
  });

  it("deployment environments and absent opt-in stay closed", async () => {
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    const service = createSyntheticAuthPreview();
    for (const target of ["production", "preview", "development"]) {
      vi.stubEnv("VERCEL_ENV", target);
      expect(await service.execute(null, { type: "start", kind: "staff" })).toEqual({ state: "unavailable", code: "unavailable" });
    }
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "");
    expect(await service.execute(null, { type: "start", kind: "staff" })).toEqual({ state: "unavailable", code: "unavailable" });
  });
});

describe("participant account email plus phone verification without MFA", () => {
  it.each([true, false])("allows either verification order (%s) while preserving AAL1 and no factor", async (emailFirst) => {
    const service = lab();
    const token = await start(service, "participant");
    expect((await service.execute(token, { type: "status" })).view).toMatchObject({ emailVerified: false, phoneVerified: false, passwordVerified: true, assurance: "aal1", factor: "none", verificationComplete: false });
    expect((await service.execute(token, { type: "protected" })).code).toBe("account_verification_required");
    const email = await send(service, token, "challenge-email");
    const sms = await send(service, token, "challenge");
    const steps = emailFirst ? [{ type: "verify-email" as const, code: email }, { type: "verify" as const, code: sms }]
      : [{ type: "verify" as const, code: sms }, { type: "verify-email" as const, code: email }];
    await service.execute(token, steps[0]);
    expect((await service.execute(token, { type: "protected" })).code).toBe("account_verification_required");
    await service.execute(token, steps[1]);
    const probe = await service.execute(token, { type: "protected" });
    expect(probe).toMatchObject({ code: "protected_allowed", view: { assurance: "aal1", factor: "none", emailVerified: true, phoneVerified: true, verificationComplete: true, operationalAccessReady: false, privilegedAccessReady: false } });
    expect((await service.execute(token, { type: "enroll" })).code).toBe("invalid_action");
  });

  it("email and SMS codes are purpose-bound; email resend invalidates old code", async () => {
    const service = lab();
    const token = await start(service, "participant");
    const email = await send(service, token, "challenge-email");
    const sms = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify-email", code: sms })).code).toBe("invalid_code");
    expect((await service.execute(token, { type: "verify", code: email })).code).toBe("invalid_code");
    const replacedEmail = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: email })).code).toBe("invalid_code");
    expect((await service.execute(token, { type: "verify-email", code: replacedEmail })).code).toBe("email_verified");
    expect((await service.execute(token, { type: "verify", code: sms })).code).toBe("phone_verified");
  });

  it("successful email verification cannot reset failed phone attempts", async () => {
    const service = lab();
    const token = await start(service, "participant");
    await send(service, token, "challenge");
    for (let index = 0; index < 4; index += 1) await service.execute(token, { type: "verify", code: "invalid" });
    const email = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: email })).code).toBe("email_verified");
    expect((await service.execute(token, { type: "verify", code: "invalid" })).code).toBe("retry_limited");
  });

  it("participant reauthentication preserves account confirmations without enrolling a second factor", async () => {
    const service = lab();
    const token = await start(service, "participant");
    await verifyParticipant(service, token);
    const reauth = await service.execute(token, { type: "reauthenticate" });
    expect(reauth.view).toMatchObject({ assurance: "aal1", factor: "none", verificationComplete: true, passwordVerified: true, previewAccessAllowed: true });
  });

  it("audit outage during participant verification revokes retained first-factor access", async () => {
    let failed = false;
    const service = lab({ audit: () => { if (failed) throw new Error("private-code"); } });
    const token = await start(service, "participant");
    const code = await send(service, token, "challenge-email");
    failed = true;
    expect((await service.execute(token, { type: "verify-email", code })).state).toBe("unavailable");
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
  });

  it("cannot use participant email verification to substitute staff phone MFA", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "verify-email", code: "123456" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
  });
});

describe("session caps are unchanged by account verification and SMS MFA", () => {
  it("refresh preserves participant origin and expires exactly at 72 hours", async () => {
    const service = lab();
    const token = await start(service, "participant");
    await verifyParticipant(service, token);
    const origin = at;
    for (let hours = 1; hours < 72; hours += 1) {
      at = origin + hours * 3_600_000;
      const result = await service.execute(token, { type: "refresh" });
      expect(result.code).toBe("refreshed");
      expect(result.view).toMatchObject({ startedAt: origin, lastActivityAt: origin, absoluteExpiresAt: origin + 72 * 3_600_000 });
    }
    at = origin + 72 * 3_600_000;
    expect((await service.execute(token, { type: "refresh" })).code).toBe("session_expired");
  });
  it("status and refresh do not restart staff idle timeout", async () => {
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
  it("staff activity extends idle only, with absolute eight-hour cap", async () => {
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
  it("reauthentication after idle expiry requires fresh staff SMS verification", async () => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    at += SESSION_POLICY.privilegedIdleSeconds * 1000;
    const reauth = await service.execute(token, { type: "reauthenticate" });
    expect(reauth.view).toMatchObject({ startedAt: at, assurance: "aal1", factor: "verified", previewAccessAllowed: false });
    const code = await send(service, reauth.token!, "challenge");
    expect((await service.execute(reauth.token!, { type: "verify", code })).code).toBe("verified");
  });
});
