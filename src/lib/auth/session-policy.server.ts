import "server-only";

import { SESSION_POLICY, type SessionPolicy } from "@/config/session-policy";
import { AUTHENTICATION_POLICY } from "@/config/authentication-policy";

/** Only database/provider evidence or the explicitly synthetic server may construct this. */
export type SessionEvidence = Readonly<{
  actorId: string;
  sessionUserId: string;
  sessionId: string;
  managedSessionExists: boolean;
  sessionCreatedAtMs: number;
  lastActivityAtMs: number;
  tokenExpiresAtMs: number;
  managedNotAfterMs: number | null;
  accountActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  individuallyIdentified: boolean;
  revokedAtMs: number | null;
  actorRevokedBeforeMs: number | null;
  tokenAssurance: "aal1" | "aal2";
  managedAssurance: "aal1" | "aal2";
  factorId: string | null;
  factorUserId: string | null;
  factorVerified: boolean;
  factorType: "phone" | "totp" | null;
  factorCreatedAtMs: number | null;
  factorUpdatedAtMs: number | null;
  passwordAuthenticatedAtMs: number | null;
  phoneMfaAuthenticatedAtMs: number | null;
  authenticatedAtMs: number | null;
}>;

export type SessionDenialReason =
  | "invalid_evidence" | "session_missing" | "session_revoked" | "account_suspended"
  | "token_expired" | "managed_session_expired" | "absolute_expired" | "idle_expired"
  | "individual_identity_required" | "mfa_required" | "recent_auth_unconfigured"
  | "recent_auth_required" | "account_verification_required" | "password_auth_required";

export type SessionPolicyResult = Readonly<{
  sessionPolicySatisfied: boolean;
  reason: SessionDenialReason | null;
  absoluteExpiresAtMs: number | null;
  idleExpiresAtMs: number | null;
  mfaValid: boolean;
  passwordValid: boolean;
  operationalAccessReady: false;
  privilegedAccessReady: false;
}>;

const timestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(value);
const optionalTimestamp = (value: unknown): value is number | null => value === null || timestamp(value);
const duration = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER / 1000;

/** Equality expires; refresh/JWT issuance time never supplies an origin or activity. */
export function evaluateSessionPolicy(
  policy: SessionPolicy,
  evidence: SessionEvidence,
  nowMs: number,
  options: Readonly<{ privileged?: boolean; sensitive?: boolean }> = {},
): SessionPolicyResult {
  let absoluteExpiresAtMs: number | null = null;
  let idleExpiresAtMs: number | null = null;
  let mfaValid = false;
  let passwordValid = false;
  const result = (reason: SessionDenialReason | null): SessionPolicyResult => ({
    sessionPolicySatisfied: reason === null, reason, absoluteExpiresAtMs, idleExpiresAtMs, mfaValid, passwordValid,
    operationalAccessReady: false, privilegedAccessReady: false,
  });
  if (!policy || !evidence || !timestamp(nowMs)
    || !duration(policy.participantAbsoluteSeconds) || !duration(policy.privilegedIdleSeconds)
    || !duration(policy.privilegedAbsoluteSeconds)
    || policy.participantAbsoluteSeconds > SESSION_POLICY.participantAbsoluteSeconds
    || policy.privilegedIdleSeconds > SESSION_POLICY.privilegedIdleSeconds
    || policy.privilegedAbsoluteSeconds > SESSION_POLICY.privilegedAbsoluteSeconds
    || (policy.recentAuthMaxAgeSeconds !== null && !duration(policy.recentAuthMaxAgeSeconds))
    || (policy.warningLeadSeconds !== null && !duration(policy.warningLeadSeconds))
    || !evidence.actorId || !evidence.sessionId || evidence.actorId !== evidence.sessionUserId
    || !timestamp(evidence.sessionCreatedAtMs) || !timestamp(evidence.lastActivityAtMs)
    || !timestamp(evidence.tokenExpiresAtMs) || evidence.sessionCreatedAtMs > nowMs
    || evidence.lastActivityAtMs < evidence.sessionCreatedAtMs || evidence.lastActivityAtMs > nowMs
    || ![evidence.managedNotAfterMs, evidence.revokedAtMs, evidence.actorRevokedBeforeMs,
      evidence.factorCreatedAtMs, evidence.factorUpdatedAtMs, evidence.phoneMfaAuthenticatedAtMs,
      evidence.passwordAuthenticatedAtMs,
      evidence.authenticatedAtMs].every(optionalTimestamp)
    || !["aal1", "aal2"].includes(evidence.tokenAssurance)
    || !["aal1", "aal2"].includes(evidence.managedAssurance)
    || (evidence.factorType !== null && !["phone", "totp"].includes(evidence.factorType))
    || ![evidence.managedSessionExists, evidence.accountActive, evidence.emailVerified, evidence.phoneVerified, evidence.individuallyIdentified,
      evidence.factorVerified].every((value) => typeof value === "boolean")) return result("invalid_evidence");

  absoluteExpiresAtMs = evidence.sessionCreatedAtMs
    + (options.privileged ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000;
  idleExpiresAtMs = options.privileged ? evidence.lastActivityAtMs + policy.privilegedIdleSeconds * 1000 : null;
  if (!timestamp(absoluteExpiresAtMs) || (idleExpiresAtMs !== null && !timestamp(idleExpiresAtMs)))
    return result("invalid_evidence");
  if (!evidence.managedSessionExists) return result("session_missing");
  if (evidence.revokedAtMs !== null || (evidence.actorRevokedBeforeMs !== null
    && evidence.sessionCreatedAtMs <= evidence.actorRevokedBeforeMs)) return result("session_revoked");
  if (!evidence.accountActive) return result("account_suspended");
  if (evidence.tokenExpiresAtMs <= nowMs) return result("token_expired");
  if (evidence.managedNotAfterMs !== null && evidence.managedNotAfterMs <= nowMs)
    return result("managed_session_expired");
  if (nowMs >= absoluteExpiresAtMs) return result("absolute_expired");
  if (idleExpiresAtMs !== null && nowMs >= idleExpiresAtMs) return result("idle_expired");

  if (!evidence.emailVerified || (!options.privileged && !evidence.phoneVerified))
    return result("account_verification_required");
  passwordValid = evidence.passwordAuthenticatedAtMs !== null
    && Math.floor(evidence.passwordAuthenticatedAtMs / 1000) >= Math.floor(evidence.sessionCreatedAtMs / 1000)
    && evidence.passwordAuthenticatedAtMs <= nowMs;
  mfaValid = passwordValid && evidence.tokenAssurance === "aal2" && evidence.managedAssurance === "aal2"
    && evidence.factorType === AUTHENTICATION_POLICY.staff.managedFactorType
    && !!evidence.factorId && evidence.factorUserId === evidence.actorId && evidence.factorVerified
    && evidence.factorCreatedAtMs !== null && evidence.factorUpdatedAtMs !== null
    && evidence.phoneMfaAuthenticatedAtMs !== null && evidence.passwordAuthenticatedAtMs !== null
    // Provider AMR has whole-second precision; compare provider instants at that precision.
    && Math.floor(evidence.phoneMfaAuthenticatedAtMs / 1000) >= Math.floor(Math.max(
      evidence.factorCreatedAtMs, evidence.factorUpdatedAtMs, evidence.sessionCreatedAtMs,
      evidence.passwordAuthenticatedAtMs) / 1000)
    && evidence.phoneMfaAuthenticatedAtMs <= nowMs;
  if (options.privileged && !evidence.individuallyIdentified) return result("individual_identity_required");
  if (!passwordValid) return result("password_auth_required");
  if (options.privileged && !mfaValid) return result("mfa_required");
  if (options.sensitive) {
    if (policy.recentAuthMaxAgeSeconds === null) return result("recent_auth_unconfigured");
    if (evidence.authenticatedAtMs === null || evidence.authenticatedAtMs < evidence.sessionCreatedAtMs
      || evidence.authenticatedAtMs > nowMs
      || nowMs - evidence.authenticatedAtMs >= policy.recentAuthMaxAgeSeconds * 1000)
      return result("recent_auth_required");
  }
  return result(null);
}
