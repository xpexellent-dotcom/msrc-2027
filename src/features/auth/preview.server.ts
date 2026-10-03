import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { SESSION_POLICY, type SessionPolicy } from "@/config/session-policy";
import { AUTHENTICATION_POLICY } from "@/config/authentication-policy";
import { evaluateSessionPolicy, type SessionEvidence } from "@/lib/auth/session-policy.server";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";
import { createSyntheticCodeKey, issueSyntheticCode, matchesSyntheticCode } from "./synthetic-email-code.server";
import { createTotpSecret, totpSetupUri, verifyTotp } from "./totp.server";
import type { PreviewAction, PreviewCode, PreviewKind, PreviewResult, PreviewView } from "./mfa-contract";

type Factor = { id: string; secret: string; createdAt: number; updatedAt: number; verified: boolean; consumedCounter: number | null };
type Challenge = { hash: string; expiresAt: number; actorId: string; sessionId: string };
type Session = {
  actorId: string; id: string; kind: PreviewKind; startedAt: number; lastActivityAt: number;
  revokedAt: number | null; suspended: boolean; assurance: "aal1" | "aal2";
  authenticatedAt: number; passwordAuthenticatedAt: number; mfaAuthenticatedAt: number | null;
  emailVerified: boolean; factor: Factor | null;
  staffEmailReceipt: { actorId: string; sessionId: string; verifiedAtMs: number } | null;
  emailChallenge: Challenge | null; totpChallengeExpiresAt: number | null;
  codeKey: string; issuedHashes: string[];
  failureCount: { totp: number; email: number }; blockedUntil: { totp: number | null; email: number | null };
};

export type PreviewAudit = Readonly<{
  event: "session.started" | "mfa.enrollment_started" | "mfa.challenge_started" | "mfa.verified" | "staff.email.challenge_started" | "staff.email.verified" | "staff.email.delivery_failed" | "account.identity_change_simulated" | "grant.revocation_simulated" | "verification.email_challenge_started" | "verification.email_verified" | "verification.rejected" | "session.logged_out" | "account.suspension_simulated" | "factor.reset_revocation_simulated" | "factor.reset_denied" | "session.reauthenticated";
  actorId: string; sessionId: string; at: number; outcome: "allowed" | "denied";
}>;

type Options = Readonly<{
  enabled?: () => boolean;
  now?: () => number;
  policy?: SessionPolicy;
  audit?: (event: PreviewAudit) => void | Promise<void>;
  emailDelivery?: () => boolean | Promise<boolean>;
  qr?: (uri: string) => Promise<string>;
}>;

// Ephemeral lab bounds only; these do not approve production TOTP operating controls.
const MAX_SESSIONS = 128;
const CHALLENGE_LIFETIME_MS = 2 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;
const MAX_FAILURES = 5;

/** No password collection, managed account, provider, actual email, grant or domain mutation. */
export function createSyntheticAuthPreview(options: Options = {}) {
  const sessions = new Map<string, Session>();
  const auditEvents: PreviewAudit[] = [];
  const emailIssues = new Map<string, number[]>();
  let ipEmailIssues: number[] = [];
  const emailPolicy = AUTHENTICATION_POLICY.staffEmailOtp;
  const policy = options.policy ?? SESSION_POLICY;
  const enabled = options.enabled ?? isAuthPreviewAllowed;
  const now = options.now ?? Date.now;
  const qr = options.qr ?? ((uri) => QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 4, width: 280 }));
  const audit = options.audit ?? ((event: PreviewAudit) => {
    auditEvents.push(Object.freeze(event));
    if (auditEvents.length > 512) auditEvents.shift();
  });
  // QR generation, safe audit and OTP consumption serialize across this closed lab.
  let queue: Promise<void> = Promise.resolve();

  function evidence(session: Session): SessionEvidence {
    const factor = session.factor;
    return {
      actorId: session.actorId, sessionUserId: session.actorId, sessionId: session.id,
      managedSessionExists: true, sessionCreatedAtMs: session.startedAt,
      lastActivityAtMs: session.lastActivityAt,
      tokenExpiresAtMs: session.startedAt + (session.kind !== "participant" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      managedNotAfterMs: null, accountActive: !session.suspended, individuallyIdentified: session.kind !== "participant",
      emailVerified: session.emailVerified, revokedAtMs: session.revokedAt, actorRevokedBeforeMs: null,
      tokenAssurance: session.assurance, managedAssurance: session.assurance,
      factorId: factor?.id ?? null, factorUserId: factor ? session.actorId : null,
      factorType: factor ? "totp" : null, factorVerified: factor?.verified ?? false,
      factorCreatedAtMs: factor?.createdAt ?? null, factorUpdatedAtMs: factor?.updatedAt ?? null,
      passwordAuthenticatedAtMs: session.passwordAuthenticatedAt,
      totpMfaAuthenticatedAtMs: session.mfaAuthenticatedAt, authenticatedAtMs: session.authenticatedAt,
      staffEmailReceipt: session.staffEmailReceipt ? { ...session.staffEmailReceipt,
        emailCurrent: true, passwordCurrent: true, grantsCurrent: true } : null,
    };
  }

  function view(session: Session, at: number): PreviewView {
    const result = evaluateSessionPolicy(policy, evidence(session), at, { privileged: session.kind !== "participant",
      ...(session.kind !== "participant" ? { authenticationTier: session.kind } : {}) });
    const expired = ["invalid_evidence", "token_expired", "managed_session_expired", "absolute_expired", "idle_expired"].includes(result.reason ?? "");
    return {
      synthetic: true, kind: session.kind, assurance: session.assurance,
      status: session.revokedAt !== null || session.suspended ? "revoked" : expired ? "expired" : "active",
      factor: session.factor ? session.factor.verified ? "verified" : "pending" : "none",
      challengeRequired: session.kind === "super_admin" && !!session.factor?.verified && !result.mfaValid,
      challengePending: session.totpChallengeExpiresAt !== null && session.totpChallengeExpiresAt > at,
      emailChallengePending: !!session.emailChallenge && session.emailChallenge.expiresAt > at,
      passwordVerified: session.passwordAuthenticatedAt >= session.startedAt && session.passwordAuthenticatedAt <= at,
      emailVerified: session.emailVerified, staffEmailVerified: result.staffEmailValid,
      emailResendAvailableAt: session.kind === "staff" && emailIssues.get(session.actorId)?.length
        ? emailIssues.get(session.actorId)!.at(-1)! + emailPolicy.resendCooldownSeconds * 1000 : null,
      verificationComplete: session.emailVerified,
      startedAt: session.startedAt, lastActivityAt: session.lastActivityAt,
      absoluteExpiresAt: session.startedAt + (session.kind !== "participant" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      idleExpiresAt: result.idleExpiresAtMs, previewAccessAllowed: result.sessionPolicySatisfied,
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
      emailVerified: kind !== "participant", staffEmailReceipt: null, factor: null,
      emailChallenge: null, totpChallengeExpiresAt: null, codeKey: createSyntheticCodeKey(),
      issuedHashes: [], failureCount: { totp: 0, email: 0 }, blockedUntil: { totp: null, email: null },
    };
  }

  async function run(token: string | null, action: PreviewAction): Promise<PreviewResult> {
    if (!enabled()) return { state: "unavailable", code: "unavailable" };
    const at = now();
    if (!Number.isSafeInteger(at) || at < 0) return { state: "unavailable", code: "unavailable" };
    const existing = token && sessions.get(token);
    try {
      if (action.type === "start") {
        if (!["staff", "super_admin", "participant"].includes(action.kind)) return { state: "denied", code: "invalid_action" };
        for (const [key, item] of sessions) if (view(item, at).status !== "active") sessions.delete(key);
        if (sessions.size >= MAX_SESSIONS && !existing) return { state: "unavailable", code: "unavailable" };
        const created = newSession(action.kind, at);
        if (existing && existing.kind === action.kind) {
          created.actorId = existing.actorId; created.codeKey = existing.codeKey;
          created.issuedHashes = [...existing.issuedHashes];
          created.failureCount = { ...existing.failureCount }; created.blockedUntil = { ...existing.blockedUntil };
        }
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
      if (action.type === "simulate-email-change" || action.type === "simulate-role-revocation") {
        if (existing.kind !== "staff") return denied("invalid_action");
        const next = structuredClone(existing);
        next.revokedAt = at; next.staffEmailReceipt = null; next.emailChallenge = null;
        await record(next, at, action.type === "simulate-email-change" ? "account.identity_change_simulated" : "grant.revocation_simulated");
        sessions.set(token!, next);
        return { state: "ok", code: "session_revoked", view: view(next, at) };
      }
      if (action.type === "logout" || action.type === "suspend" || action.type === "simulate-factor-reset") {
        if (action.type === "simulate-factor-reset" && existing.kind !== "super_admin") return denied("invalid_action");
        const next = structuredClone(existing);
        next.revokedAt = at; next.assurance = "aal1"; next.mfaAuthenticatedAt = null;
        next.staffEmailReceipt = null; next.totpChallengeExpiresAt = null; next.emailChallenge = null;
        if (action.type === "suspend") next.suspended = true;
        if (action.type === "simulate-factor-reset") next.factor = null;
        await record(next, at, action.type === "logout" ? "session.logged_out" : action.type === "suspend" ? "account.suspension_simulated" : "factor.reset_revocation_simulated");
        sessions.set(token!, next);
        return { state: "ok", code: action.type === "logout" ? "logged_out" : action.type === "suspend" ? "suspended" : "factor_reset_revoked", view: view(next, at) };
      }
      if (action.type === "reauthenticate") {
        if (currentView.status === "revoked") return denied("session_revoked");
        const next = { ...newSession(existing.kind, at), actorId: existing.actorId,
          factor: existing.factor ? structuredClone(existing.factor) : null,
          emailVerified: existing.emailVerified, codeKey: existing.codeKey,
          issuedHashes: [...existing.issuedHashes], failureCount: { ...existing.failureCount }, blockedUntil: { ...existing.blockedUntil } };
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
      if (action.type === "enroll" || action.type === "challenge") {
        if (next.kind !== "super_admin") return denied("invalid_action");
        if (!currentView.passwordVerified) return denied("password_auth_required");
        if (next.blockedUntil.totp !== null && at < next.blockedUntil.totp) return denied("retry_limited");
        if (action.type === "enroll") {
          if (next.factor) return denied("factor_already_enrolled");
          const secret = createTotpSecret();
          const uri = totpSetupUri(secret, "Super Admin " + next.actorId.slice(0, 8));
          const qrDataUrl = await qr(uri);
          if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(qrDataUrl)) throw new Error("Synthetic QR unavailable");
          next.factor = { id: randomUUID(), secret, createdAt: at, updatedAt: at, verified: false, consumedCounter: null };
          next.totpChallengeExpiresAt = at + CHALLENGE_LIFETIME_MS;
          next.lastActivityAt = at;
          await record(next, at, "mfa.enrollment_started");
          sessions.set(token!, next);
          return { state: "ok", code: "enrolled", view: { ...view(next, at), enrollment: { secret, uri, qrDataUrl } } };
        }
        if (!next.factor) return denied("mfa_required");
        next.totpChallengeExpiresAt = at + CHALLENGE_LIFETIME_MS; next.lastActivityAt = at;
        await record(next, at, "mfa.challenge_started");
        sessions.set(token!, next);
        return { state: "ok", code: "challenge_created", view: view(next, at) };
      }
      if (action.type === "verify") {
        if (next.kind !== "super_admin") return denied("invalid_action");
        if (!next.factor) return denied("mfa_required");
        if (!currentView.passwordVerified) return denied("password_auth_required");
        if (next.blockedUntil.totp !== null && at < next.blockedUntil.totp) return denied("retry_limited");
        if (next.totpChallengeExpiresAt === null) return denied("challenge_required");
        if (at >= next.totpChallengeExpiresAt) return denied("challenge_expired");
        if (next.blockedUntil.totp !== null) { next.failureCount.totp = 0; next.blockedUntil.totp = null; }
        const counter = verifyTotp(next.factor.secret, action.code, at, next.factor.consumedCounter);
        if (counter === null) {
          next.failureCount.totp += 1;
          if (next.failureCount.totp >= MAX_FAILURES) next.blockedUntil.totp = at + FAILURE_COOLDOWN_MS;
          await record(next, at, "verification.rejected", "denied"); sessions.set(token!, next);
          return { state: "denied", code: next.blockedUntil.totp !== null ? "retry_limited" : "invalid_code", view: view(next, at) };
        }
        next.factor.consumedCounter = counter; next.factor.verified = true; next.assurance = "aal2";
        next.mfaAuthenticatedAt = at; next.authenticatedAt = at; next.lastActivityAt = at;
        next.failureCount.totp = 0; next.blockedUntil.totp = null; next.totpChallengeExpiresAt = null;
        await record(next, at, "mfa.verified"); sessions.set(token!, next);
        return { state: "ok", code: "verified", view: view(next, at) };
      }
      if (action.type === "challenge-email") {
        if (next.kind === "super_admin") return denied("invalid_action");
        if (next.kind === "staff" && !currentView.passwordVerified) return denied("password_auth_required");
        if (next.blockedUntil.email !== null && at < next.blockedUntil.email) return denied("retry_limited");
        if (next.kind === "staff") {
          if (currentView.staffEmailVerified) return denied("invalid_action");
          const history = (emailIssues.get(next.actorId) ?? []).filter((time) => time > at - emailPolicy.dailyWindowSeconds * 1000);
          ipEmailIssues = ipEmailIssues.filter((time) => time > at - emailPolicy.ipIssueWindowSeconds * 1000);
          if ((history.length && at - history.at(-1)! < emailPolicy.resendCooldownSeconds * 1000)
            || history.filter((time) => time > at - emailPolicy.accountIssueWindowSeconds * 1000).length >= emailPolicy.accountIssueLimit
            || history.length >= emailPolicy.accountDailyIssueLimit || ipEmailIssues.length >= emailPolicy.ipIssueLimit) return denied("retry_limited");
          emailIssues.set(next.actorId, [...history, at]); ipEmailIssues.push(at);
        }
        const issued = issueSyntheticCode(next.codeKey, next.issuedHashes);
        next.emailChallenge = { hash: issued.hash, actorId: next.actorId, sessionId: next.id,
          expiresAt: at + (next.kind === "staff" ? emailPolicy.messageExpirySeconds * 1000 : CHALLENGE_LIFETIME_MS) };
        next.issuedHashes.push(issued.hash);
        if (next.kind !== "staff") next.lastActivityAt = at;
        if (next.kind === "staff" && options.emailDelivery && !await options.emailDelivery()) {
          next.emailChallenge = null; await record(next, at, "staff.email.delivery_failed", "denied");
          sessions.set(token!, next);
          return { state: "unavailable", code: "unavailable", view: view(next, at) };
        }
        await record(next, at, next.kind === "staff" ? "staff.email.challenge_started" : "verification.email_challenge_started");
        sessions.set(token!, next);
        return { state: "ok", code: "email_challenge_created", view: { ...view(next, at), testMessage: {
          channel: "email", code: issued.code, destination: "Synthetic email ••••@example.invalid",
          delivery: "test-only", expiresAt: next.emailChallenge.expiresAt } } };
      }
      if (action.type === "verify-email") {
        if (next.kind === "super_admin") return denied("invalid_action");
        if (next.kind === "staff" && !currentView.passwordVerified) return denied("password_auth_required");
        if (next.blockedUntil.email !== null && at < next.blockedUntil.email) return denied("retry_limited");
        const challenge = next.emailChallenge;
        if (!challenge || challenge.actorId !== next.actorId || challenge.sessionId !== next.id) return denied("challenge_required");
        if (at >= challenge.expiresAt) return denied("challenge_expired");
        if (next.blockedUntil.email !== null) { next.failureCount.email = 0; next.blockedUntil.email = null; }
        if (!matchesSyntheticCode(next.codeKey, challenge.hash, action.code)) {
          next.failureCount.email += 1;
          if (next.failureCount.email >= MAX_FAILURES) next.blockedUntil.email = at
            + (next.kind === "staff" ? emailPolicy.failureCooldownSeconds * 1000 : FAILURE_COOLDOWN_MS);
          await record(next, at, "verification.rejected", "denied"); sessions.set(token!, next);
          return { state: "denied", code: next.blockedUntil.email !== null ? "retry_limited" : "invalid_code", view: view(next, at) };
        }
        if (next.kind === "staff") next.staffEmailReceipt = { actorId: next.actorId, sessionId: next.id, verifiedAtMs: at };
        else next.emailVerified = true;
        next.emailChallenge = null; next.lastActivityAt = at; next.failureCount.email = 0; next.blockedUntil.email = null;
        await record(next, at, next.kind === "staff" ? "staff.email.verified" : "verification.email_verified");
        sessions.set(token!, next);
        return { state: "ok", code: next.kind === "staff" ? "staff_email_verified" : "email_verified", view: view(next, at) };
      }
      if (action.type === "protected") {
        if (!currentView.previewAccessAllowed) return denied(next.kind === "staff" ? "staff_email_check_required" : next.kind === "super_admin" ? "mfa_required" : "account_verification_required");
        next.lastActivityAt = at; sessions.set(token!, next);
        return { state: "ok", code: "protected_allowed", view: view(next, at) };
      }
      return denied("invalid_action");
    } catch {
      if (existing) {
        existing.revokedAt = at; existing.assurance = "aal1"; existing.mfaAuthenticatedAt = null;
        existing.staffEmailReceipt = null; existing.totpChallengeExpiresAt = null; existing.emailChallenge = null;
      }
      return { state: "unavailable", code: "unavailable", ...(existing ? { view: view(existing, at) } : {}) };
    }
  }

  return Object.freeze({
    execute(token: string | null, action: PreviewAction): Promise<PreviewResult> {
      const result = queue.then(() => run(token, action)); queue = result.then(() => {}, () => {});
      return result;
    },
    auditSnapshot(): readonly PreviewAudit[] { return auditEvents.map((event) => ({ ...event })); },
  });
}

export const authPreview = createSyntheticAuthPreview();
