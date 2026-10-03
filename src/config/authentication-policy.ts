/** AUTH-01/02/04, ORG-015/016. Approved targets are not live enforcement. */
export const AUTHENTICATION_POLICY = Object.freeze({
  primaryLogin: "email_password" as const,
  participant: Object.freeze({ emailVerificationRequired: true as const, mfaRequired: false as const }),
  staff: Object.freeze({ primaryPasswordRequired: true as const,
    additionalCheck: "email_otp" as const, nativeMfa: false as const }),
  superAdmin: Object.freeze({ primaryPasswordRequired: true as const,
    secondFactor: "authenticator" as const, managedFactorType: "totp" as const }),
  staffEmailOtp: Object.freeze({ provider: null, sender: null, liveReady: false as const,
    codeLength: 6, messageExpirySeconds: 5 * 60, resendCooldownSeconds: 60,
    accountIssueLimit: 3, accountIssueWindowSeconds: 15 * 60,
    accountDailyIssueLimit: 10, dailyWindowSeconds: 24 * 60 * 60,
    ipIssueLimit: 20, ipIssueWindowSeconds: 60 * 60,
    maxFailedAttemptsPerChallenge: 5, failureCooldownSeconds: 15 * 60 }),
  recovery: Object.freeze({ procedureTargetApproved: true as const,
    approverRole: "super_admin" as const, operatorRole: "super_admin" as const,
    distinctPeopleRequired: true as const, identityReview: "in_person" as const,
    approver: null, operator: null, verifiedResetProcedure: null }),
});
export type AuthenticationPolicy = typeof AUTHENTICATION_POLICY;
