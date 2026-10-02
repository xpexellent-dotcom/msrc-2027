import { describe, expect, it } from "vitest";
import { AUTHENTICATION_POLICY } from "@/config/authentication-policy";
import { SESSION_POLICY } from "@/config/session-policy";
import { evaluateSessionPolicy, type SessionEvidence } from "@/lib/auth/session-policy.server";

const now = Date.UTC(2026, 9, 2, 12);
const hour = 3_600_000;
function evidence(overrides: Partial<SessionEvidence> = {}): SessionEvidence {
  return {
    actorId: "synthetic-actor", sessionUserId: "synthetic-actor", sessionId: "synthetic-session",
    managedSessionExists: true, sessionCreatedAtMs: now - 60_000, lastActivityAtMs: now - 60_000,
    tokenExpiresAtMs: now + hour, managedNotAfterMs: null, accountActive: true, emailVerified: true, phoneVerified: true,
    individuallyIdentified: true, revokedAtMs: null, actorRevokedBeforeMs: null,
    tokenAssurance: "aal2", managedAssurance: "aal2", factorId: "synthetic-factor",
    factorUserId: "synthetic-actor", factorVerified: true, factorType: "phone", factorCreatedAtMs: now - 120_000,
    factorUpdatedAtMs: now - 120_000, phoneMfaAuthenticatedAtMs: now - 30_000,
    passwordAuthenticatedAtMs: now - 60_000, authenticatedAtMs: now - 30_000, ...overrides,
  };
}

describe("AUTH-05 confirmed session limits and closed readiness", () => {
  it("records only the approved limits and unresolved settings", () => {
    expect(SESSION_POLICY).toEqual({ participantAbsoluteSeconds: 259200, privilegedIdleSeconds: 1800,
      privilegedAbsoluteSeconds: 28800, recentAuthMaxAgeSeconds: null, warningLeadSeconds: null });
    expect(Object.isFrozen(SESSION_POLICY)).toBe(true);
  });

  it.each([0, 24 * hour, 71 * hour, 72 * hour - 1])("allows participant lifetime %d ms", (age) => {
    const current = evidence({ sessionCreatedAtMs: now - age, lastActivityAtMs: now - age,
      tokenAssurance: "aal1", managedAssurance: "aal1", passwordAuthenticatedAtMs: now - age });
    expect(evaluateSessionPolicy(SESSION_POLICY, current, now)).toMatchObject({
      sessionPolicySatisfied: true, absoluteExpiresAtMs: now - age + 72 * hour,
      idleExpiresAtMs: null, operationalAccessReady: false, privilegedAccessReady: false,
    });
  });

  it.each([72 * hour, 72 * hour + 1, 80 * hour])("expires participant at %d ms despite new token", (age) => {
    const original = evidence({ sessionCreatedAtMs: now - age, lastActivityAtMs: now,
      tokenExpiresAtMs: now + hour, tokenAssurance: "aal1", managedAssurance: "aal1" });
    expect(evaluateSessionPolicy(SESSION_POLICY, original, now).reason).toBe("absolute_expired");
  });

  it("refresh cannot extend absolute origin or count as activity", () => {
    const original = evidence({ sessionCreatedAtMs: now - 71 * hour, lastActivityAtMs: now - hour,
      tokenAssurance: "aal1", managedAssurance: "aal1" });
    const refreshed = { ...original, tokenExpiresAtMs: now + 2 * hour };
    expect(evaluateSessionPolicy(SESSION_POLICY, original, now).absoluteExpiresAtMs)
      .toBe(evaluateSessionPolicy(SESSION_POLICY, refreshed, now).absoluteExpiresAtMs);
    expect(evaluateSessionPolicy(SESSION_POLICY, refreshed, now + hour).reason).toBe("absolute_expired");
  });

  it.each([30 * 60_000 - 1, 30 * 60_000, 30 * 60_000 + 1])("checks staff idle boundary %d ms", (idle) => {
    const result = evaluateSessionPolicy(SESSION_POLICY, evidence({ sessionCreatedAtMs: now - hour,
      lastActivityAtMs: now - idle }), now, { privileged: true });
    expect(result.reason).toBe(idle < 30 * 60_000 ? null : "idle_expired");
  });

  it.each([8 * hour - 1, 8 * hour, 8 * hour + 1])("checks staff absolute boundary %d ms", (age) => {
    const result = evaluateSessionPolicy(SESSION_POLICY,
      evidence({ sessionCreatedAtMs: now - age, lastActivityAtMs: now - 1 }), now, { privileged: true });
    expect(result.reason).toBe(age < 8 * hour ? null : "absolute_expired");
  });
});

describe("AUTH-04/05 server evidence denial and recovery", () => {
  it.each([
    [{ managedSessionExists: false }, "session_missing"],
    [{ sessionUserId: "other" }, "invalid_evidence"],
    [{ sessionId: "" }, "invalid_evidence"],
    [{ accountActive: false }, "account_suspended"],
    [{ revokedAtMs: now }, "session_revoked"],
    [{ actorRevokedBeforeMs: now - 60_000 }, "session_revoked"],
    [{ tokenExpiresAtMs: now }, "token_expired"],
    [{ managedNotAfterMs: now }, "managed_session_expired"],
    [{ individuallyIdentified: false }, "individual_identity_required"],
    [{ tokenAssurance: "aal1" }, "mfa_required"],
    [{ managedAssurance: "aal1" }, "mfa_required"],
    [{ factorId: null }, "mfa_required"],
    [{ factorType: "totp" }, "mfa_required"],
    [{ factorType: null }, "mfa_required"],
    [{ passwordAuthenticatedAtMs: null }, "password_auth_required"],
    [{ passwordAuthenticatedAtMs: now + 1 }, "password_auth_required"],
    [{ passwordAuthenticatedAtMs: now - 120_000 }, "password_auth_required"],
    [{ passwordAuthenticatedAtMs: now - 10_000 }, "mfa_required"],
    [{ emailVerified: false }, "account_verification_required"],
    [{ factorVerified: false }, "mfa_required"],
    [{ factorUserId: "other" }, "mfa_required"],
    [{ factorUpdatedAtMs: now - 10_000 }, "mfa_required"],
    [{ factorCreatedAtMs: null }, "mfa_required"],
    [{ phoneMfaAuthenticatedAtMs: now + 1 }, "mfa_required"],
    [{ phoneMfaAuthenticatedAtMs: null }, "mfa_required"],
    [{ lastActivityAtMs: now + 1 }, "invalid_evidence"],
    [{ lastActivityAtMs: now - 120_000 }, "invalid_evidence"],
    [{ sessionCreatedAtMs: now + 1 }, "invalid_evidence"],
    [{ sessionCreatedAtMs: Number.NaN }, "invalid_evidence"],
  ] as const)("rejects changed live evidence %j", (changed, reason) => {
    const result = evaluateSessionPolicy(SESSION_POLICY, evidence(changed), now, { privileged: true });
    expect(result).toMatchObject({ reason, sessionPolicySatisfied: false,
      operationalAccessReady: false, privilegedAccessReady: false });
  });

  it("participants require no MFA after both current account verifications and password login", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ factorVerified: false, factorId: null, factorType: null,
      factorUserId: null, factorCreatedAtMs: null, factorUpdatedAtMs: null, phoneMfaAuthenticatedAtMs: null,
      tokenAssurance: "aal1", managedAssurance: "aal1" }), now)).toMatchObject({ sessionPolicySatisfied: true, mfaValid: false });
  });

  it.each([{ emailVerified: false }, { phoneVerified: false }, { emailVerified: false, phoneVerified: false }])(
    "participants require both current account verifications %j", (changed) => {
      expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ ...changed, tokenAssurance: "aal1",
        managedAssurance: "aal1", factorType: null, factorId: null }), now).reason).toBe("account_verification_required");
    });

  it("staff phone MFA is separate from participant account phone verification", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ phoneVerified: false }), now, { privileged: true }))
      .toMatchObject({ sessionPolicySatisfied: true, passwordValid: true, mfaValid: true });
  });

  it("generic AAL2 and primary SMS evidence cannot replace either password or phone MFA", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ passwordAuthenticatedAtMs: null,
      phoneMfaAuthenticatedAtMs: null }), now, { privileged: true }).reason).toBe("password_auth_required");
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ phoneMfaAuthenticatedAtMs: null }), now,
      { privileged: true }).reason).toBe("mfa_required");
  });

  it("records organizer choices while every live SMS/recovery setting remains unresolved", () => {
    expect(AUTHENTICATION_POLICY).toMatchObject({ primaryLogin: "email_password",
      participant: { emailVerificationRequired: true, phoneVerificationRequired: true, mfaRequired: false },
      staff: { primaryPasswordRequired: true, secondFactor: "sms", managedFactorType: "phone" },
      sms: { provider: null, sender: null, budgetApproved: false, liveReady: false },
      recovery: { approver: null, operator: null, verifiedResetProcedure: null } });
    expect(Object.entries(AUTHENTICATION_POLICY.sms).filter(([key]) => !["budgetApproved", "liveReady"].includes(key))
      .every(([, value]) => value === null)).toBe(true);
  });

  it("uses whole-second provider AMR precision without rejecting same-second verification", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ factorUpdatedAtMs: now - 29_990,
      phoneMfaAuthenticatedAtMs: now - 30_000 }), now, { privileged: true }).sessionPolicySatisfied).toBe(true);
  });

  it("new login after suspension cutoff recovers, original token cannot", () => {
    const cutoff = now - 30_000;
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ actorRevokedBeforeMs: cutoff }), now).reason).toBe("session_revoked");
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ actorRevokedBeforeMs: cutoff,
      sessionCreatedAtMs: now - 10_000, lastActivityAtMs: now - 10_000,
      passwordAuthenticatedAtMs: now - 10_000, phoneMfaAuthenticatedAtMs: now - 5_000 }), now, { privileged: true }).sessionPolicySatisfied).toBe(true);
  });

  it("keeps sensitive actions closed while recent-auth age is unresolved", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence(), now, { sensitive: true }).reason).toBe("recent_auth_unconfigured");
  });

  it.each([59_999, 60_000, 60_001])("enforces configured recent-auth boundary %d ms", (age) => {
    expect(evaluateSessionPolicy({ ...SESSION_POLICY, recentAuthMaxAgeSeconds: 60 },
      evidence({ authenticatedAtMs: now - age, sessionCreatedAtMs: now - hour }), now,
      { sensitive: true }).reason).toBe(age < 60_000 ? null : "recent_auth_required");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.5])("fails closed on invalid policy %s", (limit) => {
    expect(evaluateSessionPolicy({ ...SESSION_POLICY, participantAbsoluteSeconds: limit }, evidence(), now).reason).toBe("invalid_evidence");
  });
  it.each([
    { participantAbsoluteSeconds: 259201 }, { privilegedIdleSeconds: 1801 }, { privilegedAbsoluteSeconds: 28801 },
  ])("rejects limits beyond approved maxima %j", (changed) => {
    expect(evaluateSessionPolicy({ ...SESSION_POLICY, ...changed }, evidence(), now).reason).toBe("invalid_evidence");
  });
  it("allows stricter configurable limits", () => {
    expect(evaluateSessionPolicy({ ...SESSION_POLICY, participantAbsoluteSeconds: 30 },
      evidence({ tokenAssurance: "aal1" }), now).reason).toBe("absolute_expired");
  });
});
