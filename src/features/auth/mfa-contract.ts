/** Client-safe closed preview contract. No real managed account or grant is created. */
export type PreviewKind = "staff" | "participant";
export type PreviewAction =
  | Readonly<{ type: "start"; kind: PreviewKind }>
  | Readonly<{ type: "verify"; code: string }>
  | Readonly<{ type: "enroll" | "challenge" | "status" | "refresh" | "protected" | "logout" | "suspend" | "simulate-factor-reset" | "request-reset" | "reauthenticate" }>;

export type PreviewCode = "started" | "enrolled" | "challenge_created" | "verified" | "status" | "refreshed" | "protected_allowed" | "logged_out" | "suspended" | "factor_reset_revoked" | "reauthenticated" | "no_session" | "session_revoked" | "session_expired" | "mfa_required" | "challenge_required" | "invalid_code" | "challenge_expired" | "retry_limited" | "recovery_unconfigured" | "unavailable" | "factor_already_enrolled" | "invalid_action";

export interface PreviewView {
  readonly synthetic: true;
  readonly kind: PreviewKind;
  readonly assurance: "aal1" | "aal2";
  readonly status: "active" | "revoked" | "expired";
  readonly factor: "none" | "pending" | "verified";
  readonly challengeRequired: boolean;
  readonly challengePending: boolean;
  readonly startedAt: number;
  readonly lastActivityAt: number;
  readonly absoluteExpiresAt: number;
  readonly idleExpiresAt: number | null;
  readonly previewAccessAllowed: boolean;
  readonly operationalAccessReady: false;
  readonly privilegedAccessReady: false;
  /** Returned once, by enrollment only; never persisted in browser storage. */
  readonly enrollment?: Readonly<{ secret: string; uri: string; qrDataUrl: string }>;
}

export interface PreviewResult {
  readonly state: "ok" | "denied" | "unavailable";
  readonly code: PreviewCode;
  readonly view?: PreviewView;
  /** Server transport only: set HttpOnly cookie and remove this before JSON serialization. */
  readonly token?: string;
}
