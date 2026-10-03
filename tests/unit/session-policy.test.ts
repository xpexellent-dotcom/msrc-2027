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
    tokenExpiresAtMs: now + hour, managedNotAfterMs: null, accountActive: true, emailVerified: true,
    individuallyIdentified: true, revokedAtMs: null, actorRevokedBeforeMs: null,
    tokenAssurance: "aal2", managedAssurance: "aal2", factorId: "synthetic-factor",
    factorUserId: "synthetic-actor", factorVerified: true, factorType: "totp", factorCreatedAtMs: now - 120_000,
    factorUpdatedAtMs: now - 120_000, totpMfaAuthenticatedAtMs: now - 30_000,
    passwordAuthenticatedAtMs: now - 60_000, authenticatedAtMs: now - 30_000, ...overrides,
  };
}

function staffEvidence(overrides: Partial<SessionEvidence> = {}): SessionEvidence {
  return evidence({ tokenAssurance: "aal1", managedAssurance: "aal1", factorId: null,
    factorUserId: null, factorVerified: false, factorType: null, factorCreatedAtMs: null,
    factorUpdatedAtMs: null, totpMfaAuthenticatedAtMs: null, staffEmailReceipt: {
      actorId: "synthetic-actor", sessionId: "synthetic-session", verifiedAtMs: now - 30_000,
      emailCurrent: true, passwordCurrent: true, grantsCurrent: true }, ...overrides });
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
    [{ factorType: "phone" }, "mfa_required"],
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
    [{ totpMfaAuthenticatedAtMs: now + 1 }, "mfa_required"],
    [{ totpMfaAuthenticatedAtMs: null }, "mfa_required"],
    [{ lastActivityAtMs: now + 1 }, "invalid_evidence"],
    [{ lastActivityAtMs: now - 120_000 }, "invalid_evidence"],
    [{ sessionCreatedAtMs: now + 1 }, "invalid_evidence"],
    [{ sessionCreatedAtMs: Number.NaN }, "invalid_evidence"],
  ] as const)("rejects changed live evidence %j", (changed, reason) => {
    const result = evaluateSessionPolicy(SESSION_POLICY, evidence(changed), now, { privileged: true });
    expect(result).toMatchObject({ reason, sessionPolicySatisfied: false,
      operationalAccessReady: false, privilegedAccessReady: false });
  });

  it("participants require no MFA after current email verification and password login", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ factorVerified: false, factorId: null, factorType: null,
      factorUserId: null, factorCreatedAtMs: null, factorUpdatedAtMs: null, totpMfaAuthenticatedAtMs: null,
      tokenAssurance: "aal1", managedAssurance: "aal1" }), now)).toMatchObject({ sessionPolicySatisfied: true, mfaValid: false });
  });

  it.each([{ emailVerified: false }])(
    "participants require current email verification %j", (changed) => {
      expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ ...changed, tokenAssurance: "aal1",
        managedAssurance: "aal1", factorType: null, factorId: null }), now).reason).toBe("account_verification_required");
    });

  it("Super Admin authenticator MFA has no phone verification dependency", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence(), now, { privileged: true }))
      .toMatchObject({ sessionPolicySatisfied: true, passwordValid: true, mfaValid: true });
  });

  it("generic AAL2 cannot replace either password or current TOTP MFA", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ passwordAuthenticatedAtMs: null,
      totpMfaAuthenticatedAtMs: null }), now, { privileged: true }).reason).toBe("password_auth_required");
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ totpMfaAuthenticatedAtMs: null }), now,
      { privileged: true }).reason).toBe("mfa_required");
  });

  it("records email and authenticator policy without SMS configuration or live recovery", () => {
    expect(AUTHENTICATION_POLICY).toMatchObject({ primaryLogin: "email_password",
      participant: { emailVerificationRequired: true, mfaRequired: false },
      staff: { primaryPasswordRequired: true, additionalCheck: "email_otp", nativeMfa: false },
      superAdmin: { primaryPasswordRequired: true, secondFactor: "authenticator", managedFactorType: "totp" },
      staffEmailOtp: { provider: null, sender: null, liveReady: false,
        codeLength: 6, messageExpirySeconds: 300, resendCooldownSeconds: 60,
        accountIssueLimit: 3, accountIssueWindowSeconds: 900,
        accountDailyIssueLimit: 10, dailyWindowSeconds: 86_400,
        ipIssueLimit: 20, ipIssueWindowSeconds: 3600,
        maxFailedAttemptsPerChallenge: 5, failureCooldownSeconds: 900 },
      recovery: { procedureTargetApproved: true, approverRole: "super_admin", operatorRole: "super_admin",
        distinctPeopleRequired: true, identityReview: "in_person", approver: null, operator: null,
        verifiedResetProcedure: null } });
    expect(Object.hasOwn(AUTHENTICATION_POLICY, "sms")).toBe(false);
    expect(Object.hasOwn(AUTHENTICATION_POLICY.participant, "phoneVerificationRequired")).toBe(false);
  });

  it("denies a factor changed after native proof within the same second", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ factorUpdatedAtMs: now - 29_990,
      totpMfaAuthenticatedAtMs: now - 30_000 }), now, { privileged: true }).reason).toBe("mfa_required");
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ factorUpdatedAtMs: now - 30_010,
      totpMfaAuthenticatedAtMs: now - 30_000 }), now, { privileged: true }).sessionPolicySatisfied).toBe(true);
  });

  it("denies native password proof preceding session creation within the same second", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ passwordAuthenticatedAtMs: now - 60_001 }), now,
      { privileged: true }).reason).toBe("password_auth_required");
  });

  it("new login after suspension cutoff recovers, original token cannot", () => {
    const cutoff = now - 30_000;
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ actorRevokedBeforeMs: cutoff }), now).reason).toBe("session_revoked");
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ actorRevokedBeforeMs: cutoff,
      sessionCreatedAtMs: now - 10_000, lastActivityAtMs: now - 10_000,
      passwordAuthenticatedAtMs: now - 10_000, totpMfaAuthenticatedAtMs: now - 5_000 }), now, { privileged: true }).sessionPolicySatisfied).toBe(true);
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

describe("regular-staff application email check is bound to current password identity", () => {
  const options = { authenticationTier: "staff" as const };

  it("allows password plus a current email receipt at native AAL1 with privileged limits", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence(), now, options))
      .toMatchObject({ sessionPolicySatisfied: true, reason: null, passwordValid: true,
        mfaValid: false, staffEmailValid: true, absoluteExpiresAtMs: now - 60_000 + 8 * hour,
        idleExpiresAtMs: now - 60_000 + 30 * 60_000, operationalAccessReady: false, privilegedAccessReady: false });
  });

  it.each([undefined, null])("denies password-only staff with absent receipt %j", (staffEmailReceipt) => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence({ staffEmailReceipt }), now, options))
      .toMatchObject({ sessionPolicySatisfied: false, reason: "staff_email_check_required", staffEmailValid: false });
  });

  it.each([
    { actorId: "other" }, { sessionId: "new-login-session" }, { verifiedAtMs: now + 1 },
    { verifiedAtMs: now - 60_001 }, { verifiedAtMs: Number.NaN },
    { emailCurrent: false }, { passwordCurrent: false }, { grantsCurrent: false },
    { emailCurrent: "true" }, { passwordCurrent: 1 }, { grantsCurrent: undefined },
  ])("rejects changed actor/session/password/email/grant receipt binding %j", (changed) => {
    const current = staffEvidence();
    const staffEmailReceipt = { ...current.staffEmailReceipt!, ...changed };
    expect(evaluateSessionPolicy(SESSION_POLICY, { ...current, staffEmailReceipt } as SessionEvidence, now, options))
      .toMatchObject({ reason: "staff_email_check_required", sessionPolicySatisfied: false, staffEmailValid: false });
  });

  it.each([
    [{ managedSessionExists: false }, "session_missing"], [{ accountActive: false }, "account_suspended"],
    [{ revokedAtMs: now }, "session_revoked"], [{ actorRevokedBeforeMs: now - 60_000 }, "session_revoked"],
    [{ passwordAuthenticatedAtMs: null }, "password_auth_required"], [{ emailVerified: false }, "account_verification_required"],
    [{ individuallyIdentified: false }, "individual_identity_required"], [{ tokenExpiresAtMs: now }, "token_expired"],
  ] as const)("does not let an email receipt bypass current identity or revocation %j", (changed, reason) => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence(changed), now, options))
      .toMatchObject({ reason, sessionPolicySatisfied: false });
  });

  it("requires a new check after a new login while refresh preserves the current receipt and origin", () => {
    const current = staffEvidence();
    const refreshed = { ...current, tokenExpiresAtMs: now + 2 * hour };
    expect(evaluateSessionPolicy(SESSION_POLICY, refreshed, now, options)).toEqual(
      evaluateSessionPolicy(SESSION_POLICY, current, now, options));
    expect(evaluateSessionPolicy(SESSION_POLICY, { ...current, sessionId: "synthetic-new-session",
      sessionCreatedAtMs: now - 10_000, lastActivityAtMs: now - 10_000,
      passwordAuthenticatedAtMs: now - 10_000 }, now, options).reason).toBe("staff_email_check_required");
  });

  it.each([30 * 60_000 - 1, 30 * 60_000, 30 * 60_000 + 1])("enforces ordinary staff idle boundary %d ms", (idle) => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence({ sessionCreatedAtMs: now - hour,
      lastActivityAtMs: now - idle }), now, options).reason).toBe(idle < 30 * 60_000 ? null : "idle_expired");
  });

  it.each([8 * hour - 1, 8 * hour, 8 * hour + 1])("enforces ordinary staff absolute boundary %d ms", (age) => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence({ sessionCreatedAtMs: now - age,
      lastActivityAtMs: now - 1 }), now, options).reason).toBe(age < 8 * hour ? null : "absolute_expired");
  });

  it("keeps Super Admin native TOTP assurance independent of the custom email receipt", () => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence(), now, { authenticationTier: "super_admin" }))
      .toMatchObject({ reason: "mfa_required", mfaValid: false, staffEmailValid: false });
    expect(evaluateSessionPolicy(SESSION_POLICY, evidence({ staffEmailReceipt: staffEvidence().staffEmailReceipt }), now,
      { authenticationTier: "super_admin" })).toMatchObject({ sessionPolicySatisfied: true, mfaValid: true, staffEmailValid: false });
  });

  it.each([null, "participant", "administrator", ["staff"]])("fails closed on an invalid tier option %j", (authenticationTier) => {
    expect(evaluateSessionPolicy(SESSION_POLICY, staffEvidence(), now,
      { authenticationTier } as unknown as Parameters<typeof evaluateSessionPolicy>[3]).reason).toBe("invalid_evidence");
  });
});
