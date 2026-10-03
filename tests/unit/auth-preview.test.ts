import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSyntheticAuthPreview, type PreviewAudit } from "@/features/auth/preview.server";
import type { PreviewKind } from "@/features/auth/mfa-contract";
import { totpAt } from "@/features/auth/totp.server";
import { SESSION_POLICY } from "@/config/session-policy";

let at: number;
beforeEach(() => { at = 1_800_000_000_000; });
function lab(extra: Parameters<typeof createSyntheticAuthPreview>[0] = {}) {
  return createSyntheticAuthPreview({ enabled: () => true, now: () => at, ...extra });
}
type Lab = ReturnType<typeof lab>;
async function start(service: Lab, kind: PreviewKind = "super_admin") {
  const result = await service.execute(null, { type: "start", kind });
  expect(result.state).toBe("ok");
  return result.token!;
}
const secrets = new Map<string, string>();
async function send(service: Lab, token: string, type: "enroll" | "challenge" | "challenge-email") {
  const result = await service.execute(token, { type });
  expect(result.state).toBe("ok");
  if (type === "challenge-email") {
    expect(Boolean(result.view?.testMessage?.code.match(/^\d{6}$/))).toBe(true);
    return result.view!.testMessage!.code;
  }
  if (type === "enroll") secrets.set(token, result.view!.enrollment!.secret);
  return totpAt(secrets.get(token)!, at);
}
async function assure(service: Lab, token: string) {
  const code = await send(service, token, "enroll");
  expect((await service.execute(token, { type: "verify", code })).code).toBe("verified");
  return code;
}
async function reauth(service: Lab, token: string) {
  const result = await service.execute(token, { type: "reauthenticate" });
  if (result.token && secrets.has(token)) secrets.set(result.token, secrets.get(token)!);
  return result;
}
async function verifyParticipant(service: Lab, token: string) {
  const email = await send(service, token, "challenge-email");
  expect((await service.execute(token, { type: "verify-email", code: email })).code).toBe("email_verified");
}
function wrongCode(code: string) { return code === "000000" ? "000001" : "000000"; }
async function checkStaffEmail(service: Lab, token: string) {
  const code = await send(service, token, "challenge-email");
  expect((await service.execute(token, { type: "verify-email", code })).code).toBe("staff_email_verified");
  return code;
}

describe("regular staff password plus session-bound additional email check", () => {
  it("denies password-only access even if the returned presentation state is edited", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const status = await service.execute(token, { type: "status" });
    expect(status.view).toMatchObject({ kind: "staff", passwordVerified: true, emailVerified: true,
      staffEmailVerified: false, assurance: "aal1", factor: "none", previewAccessAllowed: false,
      operationalAccessReady: false, privilegedAccessReady: false });
    Object.assign(status.view!, { staffEmailVerified: true, previewAccessAllowed: true });
    expect((await service.execute(token, { type: "protected" })).code).toBe("staff_email_check_required");
    for (const type of ["enroll", "challenge", "verify"] as const) {
      expect((await service.execute(token, type === "verify" ? { type, code: "123456" } : { type })).code).toBe("invalid_action");
    }
  });

  it("keeps native assurance AAL1 after successful verification and consumes the code once", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const code = await send(service, token, "challenge-email");
    const results = await Promise.all([service.execute(token, { type: "verify-email", code }), service.execute(token, { type: "verify-email", code })]);
    expect(results.map((result) => result.code).sort()).toEqual(["challenge_required", "staff_email_verified"]);
    expect((await service.execute(token, { type: "status" })).view).toMatchObject({
      staffEmailVerified: true, assurance: "aal1", factor: "none",
      previewAccessAllowed: true, operationalAccessReady: false, privilegedAccessReady: false,
    });
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "protected" })).code).toBe("protected_allowed");
  });

  it("returns masked test delivery only on send, with the approved five-minute expiry", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const issued = await service.execute(token, { type: "challenge-email" });
    expect(issued.view).toMatchObject({ emailChallengePending: true, staffEmailVerified: false,
      emailResendAvailableAt: at + 60_000,
      testMessage: { channel: "email", delivery: "test-only", destination: "Synthetic email ••••@example.invalid", expiresAt: at + 300_000 } });
    expect((await service.execute(token, { type: "status" })).view).not.toHaveProperty("testMessage");
    const code = issued.view!.testMessage!.code;
    at += 300_000;
    expect((await service.execute(token, { type: "verify-email", code })).code).toBe("challenge_expired");
    const replacement = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: replacement })).code).toBe("staff_email_verified");
  });

  it("binds challenges to the current cookie, user and login session", async () => {
    const service = lab();
    const first = await start(service, "staff");
    const second = await start(service, "staff");
    const code = await send(service, first, "challenge-email");
    expect((await service.execute(second, { type: "verify-email", code })).code).toBe("challenge_required");
    expect((await service.execute(second, { type: "status" })).view?.staffEmailVerified).toBe(false);
    const reauth = await service.execute(first, { type: "reauthenticate" });
    expect((await service.execute(first, { type: "verify-email", code })).code).toBe("no_session");
    expect((await service.execute(reauth.token!, { type: "verify-email", code })).code).toBe("challenge_required");
    expect((await service.execute(reauth.token!, { type: "protected" })).code).toBe("staff_email_check_required");
  });

  it("replacement invalidates the previous code after the resend cooldown", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const first = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 59_999;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 1;
    const replacement = await send(service, token, "challenge-email");
    expect(Boolean(replacement !== first)).toBe(true);
    expect((await service.execute(token, { type: "verify-email", code: first })).code).toBe("invalid_code");
    expect((await service.execute(token, { type: "verify-email", code: replacement })).code).toBe("staff_email_verified");
    expect((await service.execute(token, { type: "verify-email", code: replacement })).code).toBe("challenge_required");
  });

  it("limits rolling account sends across replacement login sessions and recovers at equality", async () => {
    const service = lab();
    let token = await start(service, "staff");
    const origin = at;
    for (let index = 0; index < 3; index += 1) {
      if (index) { at += 60_000; token = (await service.execute(token, { type: "reauthenticate" })).token!; }
      await send(service, token, "challenge-email");
    }
    at += 60_000;
    token = (await service.execute(token, { type: "start", kind: "staff" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at = origin + 15 * 60_000;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("email_challenge_created");
  });

  it("limits ten daily sends across fresh sessions while retaining the daily window", async () => {
    const service = lab();
    let token = await start(service, "staff");
    const origin = at;
    for (let index = 0; index < 10; index += 1) {
      if (index) { at += 15 * 60_000; token = (await service.execute(token, { type: "reauthenticate" })).token!; }
      await send(service, token, "challenge-email");
    }
    at += 15 * 60_000;
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at = origin + 24 * 3_600_000;
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("email_challenge_created");
  });

  it("limits the shared loopback IP across different accounts and recovers after an hour", async () => {
    const service = lab();
    for (let index = 0; index < 20; index += 1) await send(service, await start(service, "staff"), "challenge-email");
    let next = await start(service, "staff");
    expect((await service.execute(next, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 3_600_000;
    next = (await service.execute(next, { type: "reauthenticate" })).token!;
    expect((await service.execute(next, { type: "challenge-email" })).code).toBe("email_challenge_created");
  });

  it("preserves five failed attempts through replacement and new login, then enforces the 15-minute cooldown", async () => {
    const service = lab();
    let token = await start(service, "staff");
    const first = await send(service, token, "challenge-email");
    for (let index = 0; index < 4; index += 1) expect((await service.execute(token, { type: "verify-email", code: wrongCode(first) })).code).toBe("invalid_code");
    at += 60_000;
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    const replacement = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: wrongCode(replacement) })).code).toBe("retry_limited");
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 15 * 60_000 - 1;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 1;
    const fresh = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: fresh })).code).toBe("staff_email_verified");
  });

  it("delivery failure invalidates the replaced challenge and consumes limits without approving access", async () => {
    let deliveryWorks = true;
    const service = lab({ emailDelivery: () => deliveryWorks });
    const token = await start(service, "staff");
    const old = await send(service, token, "challenge-email");
    at += 60_000;
    deliveryWorks = false;
    const failure = await service.execute(token, { type: "challenge-email" });
    expect(failure).toMatchObject({ state: "unavailable", code: "unavailable", view: { emailChallengePending: false, staffEmailVerified: false, previewAccessAllowed: false } });
    expect(failure.view).not.toHaveProperty("testMessage");
    expect((await service.execute(token, { type: "verify-email", code: old })).code).toBe("challenge_required");
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 60_000;
    deliveryWorks = true;
    await checkStaffEmail(service, token);
    expect(service.auditSnapshot().some((event) => event.event === "staff.email.delivery_failed" && event.outcome === "denied")).toBe(true);
  });

  it("audit failure revokes assurance and emits no code or provider details", async () => {
    let auditWorks = true;
    const service = lab({ audit: () => { if (!auditWorks) throw new Error("private-provider-detail"); } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await start(service, "staff");
    const code = await send(service, token, "challenge-email");
    auditWorks = false;
    expect((await service.execute(token, { type: "verify-email", code })).state).toBe("unavailable");
    expect((await service.execute(token, { type: "status" })).view).toMatchObject({ staffEmailVerified: false, status: "revoked", previewAccessAllowed: false });
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
    expect(error).not.toHaveBeenCalled();
  });

  it("refresh preserves a successful check and absolute origin; a fresh login discards both old cookie and check", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const code = await checkStaffEmail(service, token);
    const origin = at;
    at += 20 * 60_000;
    const refreshed = await service.execute(token, { type: "refresh" });
    expect(refreshed.view).toMatchObject({ staffEmailVerified: true, startedAt: origin,
      absoluteExpiresAt: origin + 8 * 3_600_000, lastActivityAt: origin, assurance: "aal1" });
    const freshLogin = await service.execute(token, { type: "start", kind: "staff" });
    expect(freshLogin.view).toMatchObject({ staffEmailVerified: false, previewAccessAllowed: false, assurance: "aal1", factor: "none", startedAt: at });
    expect((await service.execute(token, { type: "protected" })).code).toBe("no_session");
    expect((await service.execute(freshLogin.token!, { type: "verify-email", code })).code).toBe("challenge_required");
  });

  it("issuing email codes does not extend the 30-minute idle timeout", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const origin = at;
    at += 29 * 60_000;
    const code = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "status" })).view?.lastActivityAt).toBe(origin);
    at += 60_000;
    expect((await service.execute(token, { type: "verify-email", code })).code).toBe("session_expired");
  });

  it("successful activity cannot exceed the original eight-hour absolute cap", async () => {
    const service = lab();
    const token = await start(service, "staff");
    await checkStaffEmail(service, token);
    const origin = at;
    for (let minutes = 20; minutes < 480; minutes += 20) {
      at = origin + minutes * 60_000;
      const activity = await service.execute(token, { type: "protected" });
      expect(activity.code).toBe("protected_allowed");
      expect(activity.view?.absoluteExpiresAt).toBe(origin + 8 * 3_600_000);
    }
    at = origin + 8 * 3_600_000;
    expect((await service.execute(token, { type: "refresh" })).code).toBe("session_expired");
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_expired");
  });

  it.each(["logout", "suspend", "simulate-email-change", "simulate-role-revocation"] as const)("%s invalidates the retained regular-staff check", async (type) => {
    const service = lab();
    const token = await start(service, "staff");
    const code = await checkStaffEmail(service, token);
    const revoked = await service.execute(token, { type });
    expect(revoked.view).toMatchObject({ status: "revoked", staffEmailVerified: false, emailChallengePending: false, previewAccessAllowed: false });
    for (const action of [{ type: "protected" as const }, { type: "refresh" as const }, { type: "verify-email" as const, code }, { type: "reauthenticate" as const }]) {
      expect((await service.execute(token, action)).code).toBe("session_revoked");
    }
  });

  it("email or role revocation controls cannot amend participant or Super Admin authentication", async () => {
    const service = lab();
    for (const kind of ["participant", "super_admin"] as const) {
      const token = await start(service, kind);
      for (const type of ["simulate-email-change", "simulate-role-revocation"] as const) expect((await service.execute(token, { type })).code).toBe("invalid_action");
      expect((await service.execute(token, { type: "status" })).view?.kind).toBe(kind);
    }
  });

  it("recovery remains closed and safe audit references contain no email code or destination", async () => {
    const service = lab();
    const token = await start(service, "staff");
    const code = await checkStaffEmail(service, token);
    expect((await service.execute(token, { type: "request-reset" })).code).toBe("recovery_unconfigured");
    const serialized = JSON.stringify(service.auditSnapshot());
    expect(service.auditSnapshot().some((event) => Object.values(event).includes(code))).toBe(false);
    expect(serialized).not.toContain("example.invalid");
    for (const event of service.auditSnapshot()) expect(Object.keys(event).sort()).toEqual(["actorId", "at", "event", "outcome", "sessionId"]);
  });
});

describe("local synthetic password then Super Admin authenticator MFA", () => {
  it("starts password-proved identities without collecting credentials or creating authority", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    expect(Boolean(/^[\w-]{43}$/.test(first) && first !== second)).toBe(true);
    expect((await service.execute(first, { type: "status" })).view).toMatchObject({
      synthetic: true, passwordVerified: true, emailVerified: true,
      assurance: "aal1", factor: "none", previewAccessAllowed: false,
      operationalAccessReady: false, privilegedAccessReady: false,
    });
    expect(await service.execute("other-cookie", { type: "protected" })).toEqual({ state: "denied", code: "no_session" });
  });

  it("returns a private QR/manual setup once and requires authenticator proof after password", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
    const enrollment = await service.execute(token, { type: "enroll" });
    expect(enrollment.view).toMatchObject({ factor: "pending", assurance: "aal1", challengePending: true });
    expect(Boolean(enrollment.view!.enrollment!.secret.match(/^[A-Z2-7]{32}$/))).toBe(true);
    const setup = enrollment.view!.enrollment!;
    const parsed = new URL(setup.uri);
    expect(parsed.protocol).toBe("otpauth:");
    expect(parsed.searchParams.get("secret") === setup.secret).toBe(true);
    expect(setup.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(enrollment.view).not.toHaveProperty("testMessage");
    expect((await service.execute(token, { type: "status" })).view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "refresh" })).view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "challenge" })).view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "enroll" })).code).toBe("factor_already_enrolled");
    const code = totpAt(setup.secret, at);
    expect((await service.execute(token, { type: "verify", code }))).toMatchObject({ code: "verified", view: {
      factor: "verified", assurance: "aal2", previewAccessAllowed: true, privilegedAccessReady: false,
    } });
    expect((await service.execute(token, { type: "status" })).view).not.toHaveProperty("phoneVerified");
    expect((await service.execute(token, { type: "protected" })).code).toBe("protected_allowed");
    expect((await service.execute(token, { type: "verify", code })).code).toBe("challenge_required");
  });

  it("isolates authenticator secrets between actor cookies", async () => {
    const service = lab();
    const first = await start(service);
    const second = await start(service);
    const firstCode = await send(service, first, "enroll");
    expect((await service.execute(second, { type: "verify", code: firstCode })).code).toBe("mfa_required");
    expect((await service.execute(second, { type: "status" })).view?.factor).toBe("none");
  });

  it("serializes verification and consumes each time step once", async () => {
    const service = lab();
    const token = await start(service);
    const code = await send(service, token, "enroll");
    const results = await Promise.all([service.execute(token, { type: "verify", code }), service.execute(token, { type: "verify", code })]);
    expect(results.map((result) => result.code).sort()).toEqual(["challenge_required", "verified"]);
  });

  it("serializes enrollment without creating two factors or revealing two setups", async () => {
    const service = lab();
    const token = await start(service);
    const results = await Promise.all([service.execute(token, { type: "enroll" }), service.execute(token, { type: "enroll" })]);
    expect(results.map((result) => result.code).sort()).toEqual(["enrolled", "factor_already_enrolled"]);
    expect(results.filter((result) => result.view?.enrollment)).toHaveLength(1);
  });

  it("cannot replay a consumed app code after reauthentication or a replacement check", async () => {
    const service = lab();
    const token = await start(service);
    const oldCode = await assure(service, token);
    const result = await reauth(service, token);
    const next = result.token!;
    expect(result.view).toMatchObject({ passwordVerified: true, assurance: "aal1", factor: "verified", challengeRequired: true, previewAccessAllowed: false });
    expect((await service.execute(token, { type: "protected" })).code).toBe("no_session");
    expect((await service.execute(next, { type: "verify", code: oldCode })).code).toBe("challenge_required");
    await service.execute(next, { type: "challenge" });
    expect((await service.execute(next, { type: "verify", code: oldCode })).code).toBe("invalid_code");
    await service.execute(next, { type: "challenge" });
    expect((await service.execute(next, { type: "verify", code: oldCode })).code).toBe("invalid_code");
    at += 30_000;
    expect((await service.execute(next, { type: "verify", code: totpAt(secrets.get(next)!, at) })).code).toBe("verified");
  });

  it("replacement checks preserve failed attempts and local cooldown permits recovery", async () => {
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

  it("reauthentication preserves TOTP failures and active local cooldown", async () => {
    const service = lab();
    let token = await start(service);
    await send(service, token, "enroll");
    for (let attempt = 0; attempt < 4; attempt += 1) await service.execute(token, { type: "verify", code: "invalid" });
    token = (await reauth(service, token)).token!;
    await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code: "invalid" })).code).toBe("retry_limited");
    token = (await reauth(service, token)).token!;
    expect((await service.execute(token, { type: "challenge" })).code).toBe("retry_limited");
    at += 60_000;
    const code = await send(service, token, "challenge");
    expect((await service.execute(token, { type: "verify", code })).code).toBe("verified");
  });

  it("check window expires at equality and a fresh check recovers", async () => {
    const service = lab();
    const token = await start(service);
    await send(service, token, "enroll");
    at += 120_000;
    const code = totpAt(secrets.get(token)!, at);
    expect((await service.execute(token, { type: "verify", code })).code).toBe("challenge_expired");
    await service.execute(token, { type: "challenge" });
    expect((await service.execute(token, { type: "verify", code })).code).toBe("verified");
  });

  it.each(["logout", "suspend", "simulate-factor-reset"] as const)("%s invalidates retained session and factor assurance", async (type) => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    expect((await service.execute(token, { type })).state).toBe("ok");
    for (const action of ["protected", "refresh", "reauthenticate"] as const) expect((await service.execute(token, { type: action })).code).toBe("session_revoked");
  });

  it("factor recovery stays unconfigured with no silent reset", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "request-reset" })).code).toBe("recovery_unconfigured");
    expect((await service.execute(token, { type: "status" })).view?.assurance).toBe("aal1");
    expect(service.auditSnapshot().at(-1)).toMatchObject({ event: "factor.reset_denied", outcome: "denied" });
  });

  it("audit fields exclude setup keys, codes, QR, tokens and free-form provider details", async () => {
    const service = lab();
    const token = await start(service);
    const code = await assure(service, token);
    for (const event of service.auditSnapshot()) expect(Object.keys(event).sort()).toEqual(["actorId", "at", "event", "outcome", "sessionId"]);
    expect(service.auditSnapshot().some((event) => Object.values(event).some((value) => value === token || value === code || value === secrets.get(token)))).toBe(false);
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

  it.each([async () => { throw new Error("private-setup"); }, async () => "<svg>unsafe</svg>"])("QR failure revokes the setup without leaking a secret %#", async (qr) => {
    const service = lab({ qr });
    const token = await start(service);
    const result = await service.execute(token, { type: "enroll" });
    expect(result.state).toBe("unavailable");
    expect(result.view).not.toHaveProperty("enrollment");
    expect((await service.execute(token, { type: "protected" })).code).toBe("session_revoked");
  });

  it("bounds active identities while permitting same-cookie replacement and reauthentication", async () => {
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

describe("participant account email verification without MFA or phone", () => {
  it.each(["participant", "staff"] as const)("%s cannot invoke a synthetic MFA factor reset", async (kind) => {
    const service = lab();
    const token = await start(service, kind);
    expect((await service.execute(token, { type: "simulate-factor-reset" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "status" })).view?.status).toBe("active");
  });

  it("requires only verified email while preserving AAL1 and no factor", async () => {
    const service = lab();
    const token = await start(service, "participant");
    const initial = (await service.execute(token, { type: "status" })).view!;
    expect(initial).toMatchObject({ emailVerified: false, passwordVerified: true, assurance: "aal1", factor: "none", verificationComplete: false });
    expect(initial).not.toHaveProperty("phoneVerified");
    expect((await service.execute(token, { type: "protected" })).code).toBe("account_verification_required");
    await verifyParticipant(service, token);
    expect((await service.execute(token, { type: "protected" }))).toMatchObject({ code: "protected_allowed", view: {
      assurance: "aal1", factor: "none", emailVerified: true, verificationComplete: true, operationalAccessReady: false, privilegedAccessReady: false,
    } });
    for (const type of ["enroll", "challenge", "verify"] as const) expect((await service.execute(token, type === "verify" ? { type, code: "123456" } : { type })).code).toBe("invalid_action");
  });

  it("email resend invalidates the old code and success consumes the replacement", async () => {
    const service = lab();
    const token = await start(service, "participant");
    const old = await send(service, token, "challenge-email");
    const current = await send(service, token, "challenge-email");
    expect((await service.execute(token, { type: "verify-email", code: old })).code).toBe("invalid_code");
    expect((await service.execute(token, { type: "verify-email", code: current })).code).toBe("email_verified");
    expect((await service.execute(token, { type: "verify-email", code: current })).code).toBe("challenge_required");
  });

  it("reauthentication preserves email attempts and local cooldown", async () => {
    const service = lab();
    let token = await start(service, "participant");
    await send(service, token, "challenge-email");
    for (let attempt = 0; attempt < 5; attempt += 1) await service.execute(token, { type: "verify-email", code: "invalid" });
    token = (await service.execute(token, { type: "reauthenticate" })).token!;
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("retry_limited");
    at += 60_000;
    await verifyParticipant(service, token);
  });

  it("participant reauthentication preserves email confirmation without a second factor", async () => {
    const service = lab();
    const token = await start(service, "participant");
    await verifyParticipant(service, token);
    const result = await service.execute(token, { type: "reauthenticate" });
    expect(result.view).toMatchObject({ assurance: "aal1", factor: "none", verificationComplete: true, passwordVerified: true, previewAccessAllowed: true });
  });

  it("participant code expiry and foreign cookie verification fail closed", async () => {
    const service = lab();
    const token = await start(service, "participant");
    const other = await start(service, "participant");
    const code = await send(service, token, "challenge-email");
    expect((await service.execute(other, { type: "verify-email", code })).code).toBe("challenge_required");
    at += 120_000;
    expect((await service.execute(token, { type: "verify-email", code })).code).toBe("challenge_expired");
    await verifyParticipant(service, token);
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

  it("cannot substitute an email code for Super Admin authenticator MFA", async () => {
    const service = lab();
    const token = await start(service);
    expect((await service.execute(token, { type: "challenge-email" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "verify-email", code: "123456" })).code).toBe("invalid_action");
    expect((await service.execute(token, { type: "protected" })).code).toBe("mfa_required");
  });
});

describe("session caps are unchanged by email verification and authenticator MFA", () => {
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
  it("status and refresh do not restart Super Admin idle timeout", async () => {
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
  it("Super Admin activity extends idle only with the eight-hour absolute cap", async () => {
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
  it("reauthentication after idle expiry requires fresh authenticator verification", async () => {
    const service = lab();
    const token = await start(service);
    await assure(service, token);
    at += SESSION_POLICY.privilegedIdleSeconds * 1000;
    const result = await reauth(service, token);
    expect(result.view).toMatchObject({ startedAt: at, assurance: "aal1", factor: "verified", previewAccessAllowed: false });
    const code = await send(service, result.token!, "challenge");
    expect((await service.execute(result.token!, { type: "verify", code })).code).toBe("verified");
  });
});
