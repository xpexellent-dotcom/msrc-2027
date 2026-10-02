import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { SESSION_POLICY, type SessionPolicy } from "@/config/session-policy";
import { evaluateSessionPolicy, type SessionEvidence } from "@/lib/auth/session-policy.server";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";
import { createTotpSecret, totpSetupUri, verifyTotp } from "./totp.server";
import type { PreviewAction, PreviewCode, PreviewKind, PreviewResult, PreviewView } from "./mfa-contract";

type Factor = { id: string; secret: string; createdAt: number; updatedAt: number; verified: boolean; consumedCounter: number | null };
type Session = {
  actorId: string; id: string; kind: PreviewKind; startedAt: number; lastActivityAt: number;
  revokedAt: number | null; suspended: boolean; assurance: "aal1" | "aal2";
  authenticatedAt: number; mfaAuthenticatedAt: number | null; factor: Factor | null;
  challengeExpiresAt: number | null; failureCount: number; blockedUntil: number | null;
};

export type PreviewAudit = Readonly<{
  event: "session.started" | "mfa.enrollment_started" | "mfa.challenge_started" | "mfa.verified" | "mfa.rejected" | "session.logged_out" | "account.suspension_simulated" | "factor.reset_revocation_simulated" | "factor.reset_denied" | "session.reauthenticated";
  actorId: string; sessionId: string; at: number; outcome: "allowed" | "denied";
}>;

type Options = Readonly<{
  enabled?: () => boolean;
  now?: () => number;
  policy?: SessionPolicy;
  audit?: (event: PreviewAudit) => void | Promise<void>;
  qr?: (uri: string) => Promise<string>;
}>;

// Abuse/transport bounds for this ephemeral synthetic lab, not approved production policy.
const MAX_SESSIONS = 128;
const CHALLENGE_LIFETIME_MS = 2 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;
const MAX_FAILURES = 5;

/** No provider, database, email, real staff identity, grant or operational mutation. */
export function createSyntheticAuthPreview(options: Options = {}) {
  const sessions = new Map<string, Session>();
  const auditEvents: PreviewAudit[] = [];
  const policy = options.policy ?? SESSION_POLICY;
  const enabled = options.enabled ?? isAuthPreviewAllowed;
  const now = options.now ?? Date.now;
  const qr = options.qr ?? ((uri) => QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 4, width: 280 }));
  const audit = options.audit ?? ((event: PreviewAudit) => {
    auditEvents.push(Object.freeze(event));
    if (auditEvents.length > 512) auditEvents.shift();
  });
  // Queue the whole lab: async QR/audit must not admit concurrent verification or replay.
  let queue: Promise<void> = Promise.resolve();

  function evidence(session: Session): SessionEvidence {
    const factor = session.factor;
    return {
      actorId: session.actorId, sessionUserId: session.actorId, sessionId: session.id,
      managedSessionExists: true, sessionCreatedAtMs: session.startedAt,
      lastActivityAtMs: session.lastActivityAt,
      tokenExpiresAtMs: session.startedAt + (session.kind === "staff" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      managedNotAfterMs: null, accountActive: !session.suspended, individuallyIdentified: session.kind === "staff",
      revokedAtMs: session.revokedAt, actorRevokedBeforeMs: null,
      tokenAssurance: session.assurance, managedAssurance: session.assurance,
      factorId: factor?.id ?? null, factorUserId: factor ? session.actorId : null,
      factorVerified: factor?.verified ?? false,
      factorCreatedAtMs: factor?.createdAt ?? null, factorUpdatedAtMs: factor?.updatedAt ?? null,
      totpAuthenticatedAtMs: session.mfaAuthenticatedAt, authenticatedAtMs: session.authenticatedAt,
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
      challengePending: session.challengeExpiresAt !== null && session.challengeExpiresAt > at,
      startedAt: session.startedAt, lastActivityAt: session.lastActivityAt,
      absoluteExpiresAt: session.startedAt + (session.kind === "staff" ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000,
      idleExpiresAt: result.idleExpiresAtMs,
      previewAccessAllowed: session.kind === "staff" && result.sessionPolicySatisfied,
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
      mfaAuthenticatedAt: null, factor: null, challengeExpiresAt: null, failureCount: 0, blockedUntil: null,
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
        // Free only expired/revoked records; never evict another active actor to admit a new one.
        for (const [key, item] of sessions) {
          if (view(item, at).status !== "active") sessions.delete(key);
        }
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
        next.challengeExpiresAt = null;
        if (action.type === "suspend") next.suspended = true;
        if (action.type === "simulate-factor-reset") next.factor = null;
        const event = action.type === "logout" ? "session.logged_out" : action.type === "suspend" ? "account.suspension_simulated" : "factor.reset_revocation_simulated";
        await record(next, at, event);
        sessions.set(token!, next);
        return { state: "ok", code: action.type === "logout" ? "logged_out" : action.type === "suspend" ? "suspended" : "factor_reset_revoked", view: view(next, at) };
      }
      if (action.type === "reauthenticate") {
        if (currentView.status === "revoked") return denied("session_revoked");
        const next = { ...newSession(existing.kind, at), actorId: existing.actorId, factor: existing.factor ? structuredClone(existing.factor) : null };
        await record(next, at, "session.reauthenticated");
        // Genuine synthetic first-factor reauthentication creates a new session. Refresh never does.
        // Remove the old cookie mapping entirely: an obsolete token cannot retain authority
        // or accumulate factor-bearing records under repeated synthetic reauthentication.
        sessions.delete(token!);
        const nextToken = randomBytes(32).toString("base64url");
        sessions.set(nextToken, next);
        return { state: "ok", code: "reauthenticated", token: nextToken, view: view(next, at) };
      }
      if (currentView.status === "revoked") return denied("session_revoked");
      if (currentView.status === "expired") return denied("session_expired");
      if (action.type === "refresh") return { state: "ok", code: "refreshed", view: currentView };
      const next = structuredClone(existing);
      if (action.type === "enroll") {
        if (next.kind !== "staff") return denied("invalid_action");
        if (next.factor) return denied("factor_already_enrolled");
        const secret = createTotpSecret();
        const uri = totpSetupUri(secret, `Staff ${next.actorId.slice(0, 8)}`);
        const qrDataUrl = await qr(uri);
        if (!qrDataUrl.startsWith("data:image/png;base64,")) throw new Error("QR unavailable");
        next.factor = { id: randomUUID(), secret, createdAt: at, updatedAt: at, verified: false, consumedCounter: null };
        next.challengeExpiresAt = at + CHALLENGE_LIFETIME_MS;
        next.lastActivityAt = at;
        await record(next, at, "mfa.enrollment_started");
        sessions.set(token!, next);
        return { state: "ok", code: "enrolled", view: { ...view(next, at), enrollment: { secret, uri, qrDataUrl } } };
      }
      if (action.type === "challenge") {
        if (!next.factor || next.kind !== "staff") return denied("mfa_required");
        if (next.blockedUntil !== null && at < next.blockedUntil) return denied("retry_limited");
        next.challengeExpiresAt = at + CHALLENGE_LIFETIME_MS;
        next.lastActivityAt = at;
        await record(next, at, "mfa.challenge_started");
        sessions.set(token!, next);
        return { state: "ok", code: "challenge_created", view: view(next, at) };
      }
      if (action.type === "verify") {
        if (!next.factor || next.kind !== "staff") return denied("mfa_required");
        if (next.blockedUntil !== null && at < next.blockedUntil) return denied("retry_limited");
        if (next.challengeExpiresAt === null) return denied("challenge_required");
        if (at >= next.challengeExpiresAt) return denied("challenge_expired");
        if (next.blockedUntil !== null) { next.failureCount = 0; next.blockedUntil = null; }
        const consumedCounter = verifyTotp(next.factor.secret, action.code, at, next.factor.consumedCounter);
        if (consumedCounter === null) {
          next.failureCount += 1;
          if (next.failureCount >= MAX_FAILURES) next.blockedUntil = at + FAILURE_COOLDOWN_MS;
          await record(next, at, "mfa.rejected", "denied");
          sessions.set(token!, next);
          return { state: "denied", code: next.blockedUntil !== null ? "retry_limited" : "invalid_code", view: view(next, at) };
        }
        next.factor.consumedCounter = consumedCounter;
        next.factor.verified = true;
        next.assurance = "aal2";
        next.mfaAuthenticatedAt = at;
        next.lastActivityAt = at;
        next.failureCount = 0;
        next.blockedUntil = null;
        next.challengeExpiresAt = null;
        await record(next, at, "mfa.verified");
        sessions.set(token!, next);
        return { state: "ok", code: "verified", view: view(next, at) };
      }
      if (action.type === "protected") {
        // This is only a synthetic assurance probe, with no actual privileged operation.
        if (next.kind !== "staff" || !currentView.previewAccessAllowed) return denied("mfa_required");
        next.lastActivityAt = at;
        sessions.set(token!, next);
        return { state: "ok", code: "protected_allowed", view: view(next, at) };
      }
      return denied("invalid_action");
    } catch {
      // A provider/QR/audit outage never leaves an existing privileged synthetic session usable.
      if (existing) {
        existing.revokedAt = at;
        existing.assurance = "aal1";
        existing.mfaAuthenticatedAt = null;
        existing.challengeExpiresAt = null;
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
    /** Tests inspect safe event fields only; this buffer is not a durable production audit. */
    auditSnapshot(): readonly PreviewAudit[] { return auditEvents.map((event) => ({ ...event })); },
  });
}

export const authPreview = createSyntheticAuthPreview();
