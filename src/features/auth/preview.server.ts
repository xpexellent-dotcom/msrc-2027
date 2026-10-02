import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { SESSION_POLICY, type SessionPolicy } from "@/config/session-policy";
import { evaluateSessionPolicy, type SessionEvidence } from "@/lib/auth/session-policy.server";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";
import { createSyntheticCodeKey, issueSyntheticCode, matchesSyntheticCode } from "./sms-test.server";
import type { PreviewAction, PreviewCode, PreviewKind, PreviewResult, PreviewView } from "./mfa-contract";

type Factor = { id: string; createdAt: number; updatedAt: number; verified: boolean };
type Challenge = { hash: string; expiresAt: number };
type Session = {
  actorId: string; id: string; kind: PreviewKind; startedAt: number; lastActivityAt: number;
  revokedAt: number | null; suspended: boolean; assurance: "aal1" | "aal2";
  authenticatedAt: number; passwordAuthenticatedAt: number; mfaAuthenticatedAt: number | null;
  emailVerified: boolean; phoneVerified: boolean; factor: Factor | null;
  smsChallenge: Challenge | null; emailChallenge: Challenge | null;
  codeKey: string; issuedHashes: string[];
  failureCount: { sms: number; email: number }; blockedUntil: { sms: number | null; email: number | null };
};

export type PreviewAudit = Readonly<{
  event: "session.started" | "mfa.enrollment_started" | "mfa.challenge_started" | "mfa.verified" | "verification.email_challenge_started" | "verification.phone_challenge_started" | "verification.email_verified" | "verification.phone_verified" | "verification.rejected" | "session.logged_out" | "account.suspension_simulated" | "factor.reset_revocation_simulated" | "factor.reset_denied" | "session.reauthenticated";
  actorId: string; sessionId: string; at: number; outcome: "allowed" | "denied";
}>;

type Options = Readonly<{
  enabled?: () => boolean;
  now?: () => number;
  policy?: SessionPolicy;
  audit?: (event: PreviewAudit) => void | Promise<void>;
}>;

// Abuse/transport bounds for this ephemeral lab, not approved production settings.
const MAX_SESSIONS = 128;
const CHALLENGE_LIFETIME_MS = 2 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;
const MAX_FAILURES = 5;

/** No password collection, managed account, actual email/SMS, provider, grant or domain mutation. */
export function createSyntheticAuthPreview(options: Options = {}) {
  const sessions = new Map<string, Session>();
  const auditEvents: PreviewAudit[] = [];
  const policy = options.policy ?? SESSION_POLICY;
  const enabled = options.enabled ?? isAuthPreviewAllowed;
  const now = options.now ?? Date.now;
  const audit = options.audit ?? ((event: PreviewAudit) => {
    auditEvents.push(Object.freeze(event));
    if (auditEvents.length > 512) auditEvents.shift();
  });
  // Audit and OTP verification serialize: concurrency cannot consume a challenge twice.
  let queue: Promise<void> = Promise.resolve();

  function evidence(session: Session): SessionEvidence {
    const factor = session.factor;
    return {
      actorId: session.actorId, sessionUserId: session.actorId, sessionId: session.id,
      managedSessionExists: true, sessionCreatedAtMs: session.startedAt,
      lastActivityAtMs: session.lastActivityAt,
      tokenExpiresAtMs: session.startedAt + (session.kind === "staff" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      managedNotAfterMs: null, accountActive: !session.suspended, individuallyIdentified: session.kind === "staff",
      emailVerified: session.emailVerified, phoneVerified: session.phoneVerified,
      revokedAtMs: session.revokedAt, actorRevokedBeforeMs: null,
      tokenAssurance: session.assurance, managedAssurance: session.assurance,
      factorId: factor?.id ?? null, factorUserId: factor ? session.actorId : null,
      factorType: factor ? "phone" : null, factorVerified: factor?.verified ?? false,
      factorCreatedAtMs: factor?.createdAt ?? null, factorUpdatedAtMs: factor?.updatedAt ?? null,
      passwordAuthenticatedAtMs: session.passwordAuthenticatedAt,
      phoneMfaAuthenticatedAtMs: session.mfaAuthenticatedAt, authenticatedAtMs: session.authenticatedAt,
    };
  }

  function view(session: Session, at: number): PreviewView {
    const result = evaluateSessionPolicy(policy, evidence(session), at, { privileged: session.kind === "staff" });
    const expired = ["invalid_evidence", "token_expired", "managed_session_expired", "absolute_expired", "idle_expired"].includes(result.reason ?? "");
    return {
      synthetic: true, kind: session.kind, assurance: session.assurance,
      status: session.revokedAt !== null || session.suspended ? "revoked" : expired ? "expired" : "active",
      factor: session.factor ? session.factor.verified ? "verified" : "pending" : "none",
      challengeRequired: session.kind === "staff" && !!session.factor?.verified && !result.mfaValid,
      challengePending: !!session.smsChallenge && session.smsChallenge.expiresAt > at,
      emailChallengePending: !!session.emailChallenge && session.emailChallenge.expiresAt > at,
      passwordVerified: session.passwordAuthenticatedAt >= session.startedAt && session.passwordAuthenticatedAt <= at,
      emailVerified: session.emailVerified, phoneVerified: session.phoneVerified,
      verificationComplete: session.emailVerified && session.phoneVerified,
      startedAt: session.startedAt, lastActivityAt: session.lastActivityAt,
      absoluteExpiresAt: session.startedAt + (session.kind === "staff" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      idleExpiresAt: result.idleExpiresAtMs,
      previewAccessAllowed: result.sessionPolicySatisfied,
      operationalAccessReady: false, privilegedAccessReady: false,
    };
  }

  async function record(session: Session, at: number, event: PreviewAudit["event"], outcome: PreviewAudit["outcome"] = "allowed") {
    await audit({ event, actorId: session.actorId, sessionId: session.id, at, outcome });
  }

  function newSession(kind: PreviewKind, at: number): Session {
    return {
      actorId: randomUUID(), id: randomUUID(), kind, startedAt: at, lastActivityAt: at,
      revokedAt: null, suspended: false, assurance: "aal1", authenticatedAt: at,
      passwordAuthenticatedAt: at, mfaAuthenticatedAt: null,
      emailVerified: kind === "staff", phoneVerified: false,
      factor: null, smsChallenge: null, emailChallenge: null, codeKey: createSyntheticCodeKey(),
      issuedHashes: [], failureCount: { sms: 0, email: 0 }, blockedUntil: { sms: null, email: null },
    };
  }

  async function run(token: string | null, action: PreviewAction): Promise<PreviewResult> {
    if (!enabled()) return { state: "unavailable", code: "unavailable" };
    const at = now();
    if (!Number.isSafeInteger(at) || at < 0) return { state: "unavailable", code: "unavailable" };
    const existing = token && sessions.get(token);
    try {
      if (action.type === "start") {
        if (!["staff", "participant"].includes(action.kind)) return { state: "denied", code: "invalid_action" };
        for (const [key, item] of sessions) if (view(item, at).status !== "active") sessions.delete(key);
        if (sessions.size >= MAX_SESSIONS && !existing) return { state: "unavailable", code: "unavailable" };
        const created = newSession(action.kind, at);
        await record(created, at, "session.started");
        const nextToken = randomBytes(32).toString("base64url");
        if (existing) sessions.delete(token!);
        sessions.set(nextToken, created);
        return { state: "ok", code: "started", token: nextToken, view: view(created, at) };
      }
      if (!existing) return { state: "denied", code: "no_session" };
      const currentView = view(existing, at);
      const denied = (code: PreviewCode): PreviewResult => ({ state: "denied", code, view: view(existing, at) });
      if (action.type === "status") return { state: "ok", code: "status", view: currentView };
      if (action.type === "request-reset") {
        await record(existing, at, "factor.reset_denied", "denied");
        return denied("recovery_unconfigured");
      }
      if (action.type === "logout" || action.type === "suspend" || action.type === "simulate-factor-reset") {
        const next = structuredClone(existing);
        next.revokedAt = at;
        next.assurance = "aal1";
        next.mfaAuthenticatedAt = null;
        next.smsChallenge = null;
        next.emailChallenge = null;
        if (action.type === "suspend") next.suspended = true;
        if (action.type === "simulate-factor-reset") { next.factor = null; next.phoneVerified = false; }
        await record(next, at, action.type === "logout" ? "session.logged_out" : action.type === "suspend" ? "account.suspension_simulated" : "factor.reset_revocation_simulated");
        sessions.set(token!, next);
        return { state: "ok", code: action.type === "logout" ? "logged_out" : action.type === "suspend" ? "suspended" : "factor_reset_revoked", view: view(next, at) };
      }
      if (action.type === "reauthenticate") {
        if (currentView.status === "revoked") return denied("session_revoked");
        const next = { ...newSession(existing.kind, at), actorId: existing.actorId,
          factor: existing.factor ? structuredClone(existing.factor) : null,
          emailVerified: existing.emailVerified, phoneVerified: existing.phoneVerified,
          codeKey: existing.codeKey, issuedHashes: [...existing.issuedHashes],
          failureCount: { ...existing.failureCount }, blockedUntil: { ...existing.blockedUntil } };
        await record(next, at, "session.reauthenticated");
        sessions.delete(token!);
        const nextToken = randomBytes(32).toString("base64url");
        sessions.set(nextToken, next);
        return { state: "ok", code: "reauthenticated", token: nextToken, view: view(next, at) };
      }
      if (currentView.status === "revoked") return denied("session_revoked");
      if (currentView.status === "expired") return denied("session_expired");
      if (action.type === "refresh") return { state: "ok", code: "refreshed", view: currentView };
      const next = structuredClone(existing);
      if (action.type === "enroll" || action.type === "challenge" || action.type === "challenge-email") {
        const email = action.type === "challenge-email";
        const channel = email ? "email" : "sms";
        if (email && next.kind !== "participant") return denied("invalid_action");
        if (action.type === "enroll" && next.kind !== "staff") return denied("invalid_action");
        if (action.type === "enroll" && next.factor) return denied("factor_already_enrolled");
        if (next.kind === "staff" && !currentView.passwordVerified) return denied("password_auth_required");
        if (action.type === "challenge" && next.kind === "staff" && !next.factor) return denied("mfa_required");
        if (next.blockedUntil[channel] !== null && at < next.blockedUntil[channel]) return denied("retry_limited");
        if (action.type === "enroll") next.factor = { id: randomUUID(), createdAt: at, updatedAt: at, verified: false };
        const issued = issueSyntheticCode(next.codeKey, next.issuedHashes);
        const challenge = { hash: issued.hash, expiresAt: at + CHALLENGE_LIFETIME_MS };
        next.issuedHashes.push(issued.hash);
        if (email) next.emailChallenge = challenge; else next.smsChallenge = challenge;
        next.lastActivityAt = at;
        const event = email ? "verification.email_challenge_started" : action.type === "enroll" ? "mfa.enrollment_started"
          : next.kind === "staff" ? "mfa.challenge_started" : "verification.phone_challenge_started";
        await record(next, at, event);
        sessions.set(token!, next);
        return { state: "ok", code: email ? "email_challenge_created" : action.type === "enroll" ? "enrolled" : "challenge_created",
          view: { ...view(next, at), testMessage: { channel: email ? "email" : "sms", code: issued.code,
            destination: email ? "Synthetic email ••••@example.invalid" : "Synthetic phone •••• 0000",
            delivery: "test-only", expiresAt: challenge.expiresAt } } };
      }
      if (action.type === "verify" || action.type === "verify-email") {
        const email = action.type === "verify-email";
        const channel = email ? "email" : "sms";
        if (email && next.kind !== "participant") return denied("invalid_action");
        if (!email && next.kind === "staff" && !next.factor) return denied("mfa_required");
        if (next.kind === "staff" && !currentView.passwordVerified) return denied("password_auth_required");
        if (next.blockedUntil[channel] !== null && at < next.blockedUntil[channel]) return denied("retry_limited");
        const challenge = email ? next.emailChallenge : next.smsChallenge;
        if (!challenge) return denied("challenge_required");
        if (at >= challenge.expiresAt) return denied("challenge_expired");
        if (next.blockedUntil[channel] !== null) { next.failureCount[channel] = 0; next.blockedUntil[channel] = null; }
        if (!matchesSyntheticCode(next.codeKey, challenge.hash, action.code)) {
          next.failureCount[channel] += 1;
          if (next.failureCount[channel] >= MAX_FAILURES) next.blockedUntil[channel] = at + FAILURE_COOLDOWN_MS;
          await record(next, at, "verification.rejected", "denied");
          sessions.set(token!, next);
          return { state: "denied", code: next.blockedUntil[channel] !== null ? "retry_limited" : "invalid_code", view: view(next, at) };
        }
        if (email) { next.emailVerified = true; next.emailChallenge = null; }
        else {
          next.phoneVerified = true;
          next.smsChallenge = null;
          if (next.kind === "staff") {
            next.factor!.verified = true;
            next.assurance = "aal2";
            next.mfaAuthenticatedAt = at;
            next.authenticatedAt = at;
          }
        }
        next.lastActivityAt = at;
        next.failureCount[channel] = 0;
        next.blockedUntil[channel] = null;
        await record(next, at, email ? "verification.email_verified" : next.kind === "staff" ? "mfa.verified" : "verification.phone_verified");
        sessions.set(token!, next);
        return { state: "ok", code: email ? "email_verified" : next.kind === "staff" ? "verified" : "phone_verified", view: view(next, at) };
      }
      if (action.type === "protected") {
        // Own synthetic verification/assurance probe only; never a domain operation/grant.
        if (!currentView.previewAccessAllowed) return denied(next.kind === "staff" ? "mfa_required" : "account_verification_required");
        next.lastActivityAt = at;
        sessions.set(token!, next);
        return { state: "ok", code: "protected_allowed", view: view(next, at) };
      }
      return denied("invalid_action");
    } catch {
      if (existing) {
        existing.revokedAt = at;
        existing.assurance = "aal1";
        existing.mfaAuthenticatedAt = null;
        existing.smsChallenge = null;
        existing.emailChallenge = null;
      }
      return { state: "unavailable", code: "unavailable", ...(existing ? { view: view(existing, at) } : {}) };
    }
  }

  return Object.freeze({
    execute(token: string | null, action: PreviewAction): Promise<PreviewResult> {
      const result = queue.then(() => run(token, action));
      queue = result.then(() => {}, () => {});
      return result;
    },
    auditSnapshot(): readonly PreviewAudit[] { return auditEvents.map((event) => ({ ...event })); },
  });
}

export const authPreview = createSyntheticAuthPreview();
