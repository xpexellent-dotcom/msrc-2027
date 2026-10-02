import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SESSION_POLICY, type SessionPolicy } from "@/config/session-policy";
import type { SessionDenialReason } from "@/lib/auth/session-policy.server";
import { getSupabaseConfig } from "./config";

export type PersistedSessionContext = Readonly<{
  schemaVersion: 1;
  editionId: string;
  principal: Readonly<{ userId: string; sessionId: string }>;
  privileged: boolean;
  sessionPolicySatisfied: boolean;
  reason: SessionDenialReason | null;
  mfaValid: boolean;
  timing: Readonly<{ startedAtMs: number; lastActivityAtMs: number; absoluteExpiresAtMs: number;
    idleExpiresAtMs: number | null; authenticatedAtMs: number | null }>;
  policy: SessionPolicy;
  operationalAccessReady: false;
  privilegedAccessReady: false;
}>;

export type SessionContextResult = Readonly<{ state: "verified"; context: PersistedSessionContext }>
  | Readonly<{ state: "denied" }> | Readonly<{ state: "unavailable" }>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
const reasons: readonly SessionDenialReason[] = ["session_revoked", "account_suspended", "absolute_expired",
  "idle_expired", "individual_identity_required", "mfa_required"];

/** Exact own metadata contract; unknown fields, readiness, policy drift or identity fail closed. */
export function parsePersistedSessionContext(value: unknown, userId: string, editionId: string): PersistedSessionContext | null {
  if (!uuid.test(userId) || !editionId || editionId.trim() !== editionId
    || !exact(value, ["schemaVersion", "editionId", "principal", "privileged", "sessionPolicySatisfied", "reason",
      "mfaValid", "timing", "policy", "operationalAccessReady", "privilegedAccessReady"])
    || value.schemaVersion !== 1 || value.editionId !== editionId
    || value.operationalAccessReady !== false || value.privilegedAccessReady !== false
    || !exact(value.principal, ["userId", "sessionId"]) || value.principal.userId !== userId
    || typeof value.principal.sessionId !== "string" || !uuid.test(value.principal.sessionId)
    || typeof value.privileged !== "boolean" || typeof value.sessionPolicySatisfied !== "boolean"
    || typeof value.mfaValid !== "boolean"
    || (value.reason !== null && (typeof value.reason !== "string" || !reasons.includes(value.reason as SessionDenialReason)))
    || value.sessionPolicySatisfied !== (value.reason === null)
    || (value.privileged && value.sessionPolicySatisfied && !value.mfaValid)
    || !exact(value.policy, Object.keys(SESSION_POLICY))
    || !Object.entries(SESSION_POLICY).every(([key, maximum]) => {
      const configured = (value.policy as Record<string, unknown>)[key];
      return maximum === null ? configured === null : typeof configured === "number"
        && Number.isSafeInteger(configured) && configured > 0 && configured <= maximum;
    })
    || !exact(value.timing, ["startedAt", "lastActivityAt", "absoluteExpiresAt", "idleExpiresAt", "authenticatedAt"])) return null;
  const startedAtMs = parseTimestamp(value.timing.startedAt);
  const lastActivityAtMs = parseTimestamp(value.timing.lastActivityAt);
  const absoluteExpiresAtMs = parseTimestamp(value.timing.absoluteExpiresAt);
  const idleExpiresAtMs = value.timing.idleExpiresAt === null ? null : parseTimestamp(value.timing.idleExpiresAt);
  const authenticatedAtMs = value.timing.authenticatedAt === null ? null : parseTimestamp(value.timing.authenticatedAt);
  const policy = Object.freeze({ ...value.policy }) as SessionPolicy;
  if (startedAtMs === null || lastActivityAtMs === null || absoluteExpiresAtMs === null
    || lastActivityAtMs < startedAtMs || (value.timing.authenticatedAt !== null && authenticatedAtMs === null)
    || (authenticatedAtMs !== null && authenticatedAtMs < Math.floor(startedAtMs / 1000) * 1000)
    || absoluteExpiresAtMs !== startedAtMs + (value.privileged
      ? policy.privilegedAbsoluteSeconds : policy.participantAbsoluteSeconds) * 1000
    || (value.privileged ? idleExpiresAtMs !== lastActivityAtMs + policy.privilegedIdleSeconds * 1000
      : value.timing.idleExpiresAt !== null)) return null;
  return Object.freeze({ schemaVersion: 1, editionId,
    principal: Object.freeze({ userId, sessionId: value.principal.sessionId }),
    privileged: value.privileged, sessionPolicySatisfied: value.sessionPolicySatisfied,
    reason: value.reason as SessionDenialReason | null, mfaValid: value.mfaValid,
    timing: Object.freeze({ startedAtMs, lastActivityAtMs, absoluteExpiresAtMs, idleExpiresAtMs, authenticatedAtMs }),
    policy, operationalAccessReady: false, privilegedAccessReady: false });
}

type SessionDatabase = { public: { Tables: Record<string, never>; Views: Record<string, never>;
  Functions: { msrc_session_context: { Args: { edition_key: string }; Returns: unknown } };
  Enums: Record<string, never>; CompositeTypes: Record<string, never> } };

/** Observation only. No cookie store, refresh, activity touch, privileged key or workflow access. */
export async function readVerifiedSessionContext(accessToken: string, editionId: string): Promise<SessionContextResult> {
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 16384 || /\s/.test(accessToken)
    || typeof editionId !== "string" || !editionId || editionId.length > 128 || editionId.trim() !== editionId)
    return { state: "denied" };
  try {
    const config = getSupabaseConfig();
    if (!config) return { state: "unavailable" };
    const client = createClient<SessionDatabase>(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` },
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
    });
    const identity = await client.auth.getUser(accessToken);
    if (identity.error || !identity.data.user) return { state: "denied" };
    const current = await client.rpc("msrc_session_context", { edition_key: editionId });
    if (current.error) return { state: "unavailable" };
    const context = parsePersistedSessionContext(current.data, identity.data.user.id, editionId);
    return context ? { state: "verified", context } : { state: "denied" };
  } catch {
    return { state: "unavailable" };
  }
}
