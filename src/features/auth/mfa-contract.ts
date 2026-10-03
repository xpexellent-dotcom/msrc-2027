/** Client-safe closed preview contract. No real managed account or grant is created. */
export type PreviewKind = "staff" | "super_admin" | "participant";
export type PreviewAction =
  | Readonly<{ type: "start"; kind: PreviewKind }>
  | Readonly<{ type: "verify" | "verify-email"; code: string }>
  | Readonly<{ type: "enroll" | "challenge" | "challenge-email" | "status" | "refresh" | "protected" | "logout" | "suspend" | "simulate-factor-reset" | "simulate-email-change" | "simulate-role-revocation" | "request-reset" | "reauthenticate" }>;

export type PreviewCode = "started" | "enrolled" | "challenge_created" | "email_challenge_created" | "verified" | "email_verified" | "staff_email_verified" | "staff_email_check_required" | "status" | "refreshed" | "protected_allowed" | "logged_out" | "suspended" | "factor_reset_revoked" | "reauthenticated" | "no_session" | "session_revoked" | "session_expired" | "mfa_required" | "password_auth_required" | "account_verification_required" | "challenge_required" | "invalid_code" | "challenge_expired" | "retry_limited" | "recovery_unconfigured" | "unavailable" | "factor_already_enrolled" | "invalid_action";

export interface PreviewView {
  readonly synthetic: true;
  readonly kind: PreviewKind;
  readonly assurance: "aal1" | "aal2";
  readonly status: "active" | "revoked" | "expired";
  readonly factor: "none" | "pending" | "verified";
  readonly challengeRequired: boolean;
  readonly challengePending: boolean;
  readonly emailChallengePending: boolean;
  readonly emailVerified: boolean;
  readonly staffEmailVerified: boolean;
  readonly emailResendAvailableAt: number | null;
  readonly passwordVerified: boolean;
  readonly verificationComplete: boolean;
  readonly startedAt: number;
  readonly lastActivityAt: number;
  readonly absoluteExpiresAt: number;
  readonly idleExpiresAt: number | null;
  readonly previewAccessAllowed: boolean;
  readonly operationalAccessReady: false;
  readonly privilegedAccessReady: false;
  /** Synthetic email inbox only: returned by send actions; no email is sent or logged. */
  readonly testMessage?: Readonly<{ channel: "email"; code: string; destination: string; delivery: "test-only"; expiresAt: number }>;
  /** Synthetic enrollment only: returned once, never persisted in browser storage. */
  readonly enrollment?: Readonly<{ secret: string; uri: string; qrDataUrl: string }>;
}

export interface PreviewResult {
  readonly state: "ok" | "denied" | "unavailable";
  readonly code: PreviewCode;
  readonly view?: PreviewView;
  /** Server transport only: set HttpOnly cookie and remove this before JSON serialization. */
  readonly token?: string;
}
