/** AUTH-01/02/04, organizer decision 3 October 2026. Live delivery stays closed. */
export const AUTHENTICATION_POLICY = Object.freeze({
  primaryLogin: "email_password" as const,
  participant: Object.freeze({ emailVerificationRequired: true as const,
    phoneVerificationRequired: true as const, mfaRequired: false as const }),
  staff: Object.freeze({ primaryPasswordRequired: true as const,
    secondFactor: "sms" as const, managedFactorType: "phone" as const }),
  sms: Object.freeze({ provider: null, sender: null, budgetApproved: false as const,
    messageExpirySeconds: null, resendCooldownSeconds: null, maxIssuedPerWindow: null,
    issueWindowSeconds: null, maxFailedAttemptsPerChallenge: null,
    accountIssueLimit: null, accountIssueWindowSeconds: null, ipIssueLimit: null, ipIssueWindowSeconds: null,
    liveReady: false as const }),
  recovery: Object.freeze({ approver: null, operator: null, verifiedResetProcedure: null }),
});
export type AuthenticationPolicy = typeof AUTHENTICATION_POLICY;
