import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { parsePersistedSessionContext, type PersistedSessionContext } from "@/lib/supabase/session.server";
import { createStaffBackend, type StaffBackend, type NativeStaffSession } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash,
  staffIp, staffOrigin, staffUuid, type StaffSessionCookie } from "./security.server";
import { validateStaffPayload } from "./validation.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0",
  "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const hasState = (value: unknown, state: string) => record(value)?.state === state;
function reply(body: Record<string, unknown>, status = 200, cookie?: string) {
  return Response.json(body, { status, headers: { ...privateHeaders, ...(cookie ? { "Set-Cookie": cookie } : {}) } });
}
async function ready(config: StaffConfig, backend: StaffBackend): Promise<boolean> {
  const value = record(await backend.rpc("msrc_staff_status"));
  return value?.enabled === true && value.emailDailyLimit === config.emailDailyLimit;
}
export interface StaffProfile { actorId: string; name: string; roles: Role[] }
async function context(config: StaffConfig, backend: StaffBackend, session: NativeStaffSession, now: number) {
  if (await backend.identity(session.accessToken) !== session.actorId) return null;
  const value = parsePersistedSessionContext(await backend.rpc("msrc_session_context", { edition_key: config.editionKey }, session.accessToken), session.actorId, config.editionKey);
  return value && value.principal.sessionId === session.sessionId && value.privileged && value.passwordValid && value.emailVerified
    && value.authenticationTier !== "participant" && (value.sessionPolicySatisfied || ["mfa_required", "staff_email_check_required"].includes(value.reason ?? ""))
    && value.timing.absoluteExpiresAtMs > now && value.timing.idleExpiresAtMs !== null && value.timing.idleExpiresAtMs > now ? value : null;
}
async function profile(config: StaffConfig, backend: StaffBackend, session: NativeStaffSession, before: PersistedSessionContext): Promise<StaffProfile | null> {
  const value = record(await backend.rpc("msrc_staff_profile", { edition_key: config.editionKey }, session.accessToken));
  if (!value || Object.keys(value).sort().join(",") !== "actorId,name,roles,schemaVersion,session" || value.schemaVersion !== 1 || value.actorId !== session.actorId
    || typeof value.name !== "string" || value.name.length < 1 || value.name.length > 200 || !Array.isArray(value.roles) || !value.roles.length
    || value.roles.some((role) => typeof role !== "string" || role === "participant" || !ROLES.includes(role as Role))) return null;
  const observed = parsePersistedSessionContext(value.session, session.actorId, config.editionKey);
  return observed && observed.sessionPolicySatisfied && observed.principal.sessionId === session.sessionId
    && observed.authenticationTier === before.authenticationTier && observed.timing.absoluteExpiresAtMs === before.timing.absoluteExpiresAtMs
    ? { actorId: session.actorId, name: value.name, roles: value.roles as Role[] } : null;
}
const fields = {
  staff: ["actorId", "name", "email", "roles", "status", "lastSignIn"],
  invitations: ["id", "email", "roles", "status", "expiresAt"],
  audit: ["id", "actorId", "targetId", "action", "result", "occurredAt", "actorName", "targetName", "details"],
  participants: ["actorId", "name", "email", "status", "createdAt", "identityMasked"],
} as const;
function safeRows(value: unknown, kind: keyof typeof fields): Record<string, unknown>[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const rows: Record<string, unknown>[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row || Object.keys(row).some((key) => !fields[kind].includes(key as never))
      || Object.entries(row).some(([key, entry]) => key === "details" ? !safeDetails(entry) : key === "roles"
        ? !Array.isArray(entry) || entry.some((role) => typeof role !== "string" || !ROLES.includes(role as Role))
        : entry !== null && typeof entry !== "string")) return null;
    if (kind === "participants" && row.identityMasked !== null && row.identityMasked !== undefined
      && (typeof row.identityMasked !== "string" || !/^•{6}(?:[\p{L}\p{N}]{4})?$/u.test(row.identityMasked))) return null;
    rows.push({ ...row });
  }
  return rows;
}
function safeDetails(value: unknown): boolean {
  const details = record(value); if (!details) return false;
  return Object.entries(details).every(([key, entry]) => {
    if (["previousRoles", "newRoles"].includes(key)) return Array.isArray(entry) && entry.length <= ROLES.length
      && entry.every((role) => typeof role === "string" && ROLES.includes(role as Role));
    if (["previousStatus", "newStatus"].includes(key)) return entry === null || ["active", "suspended"].includes(entry as string);
    if (key === "source") return ["grant", "session", "staff_email"].includes(entry as string);
    if (key === "role") return typeof entry === "string" && ROLES.includes(entry as Role);
    if (key === "scope") return ["edition", "track", "assignment", "function", "resource"].includes(entry as string);
    if (key === "cause") return entry === null || ["logout", "suspension", "factor_reset", "policy_expired", "security"].includes(entry as string);
    if (key === "reason") return ["other_super_admin_requested"].includes(entry as string);
    return false;
  });
}

export function createStaffHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  const getReadiness = dependencies.readiness ?? getStaffConfig;
  const getBackend = dependencies.backend ?? createStaffBackend;
  const clock = dependencies.now ?? Date.now;
  return async function handle(request: Request): Promise<Response> {
    // Closed before header/body inspection, provider construction or credential collection.
    const readiness = getReadiness();
    if (readiness.state !== "ready") return reply({ state: readiness.state }, 503);
    const config = readiness.config, now = clock();
    const resolvedOrigin = staffOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!resolvedOrigin || (site && !["same-origin", "none"].includes(site)) || request.headers.get("origin") && request.headers.get("origin") !== resolvedOrigin
      || request.method === "POST" && request.headers.get("origin") !== resolvedOrigin) return reply({ state: "invalid-input" }, 400);
    const origin: string = resolvedOrigin;
    if (!["GET", "HEAD", "POST"].includes(request.method)) return reply({ state: "invalid-input" }, 405);
    const backend = getBackend(config);
    const stillReady = async () => getReadiness().state === "ready" && await ready(config, backend);
    try { if (!await stillReady()) return reply({ state: "closed" }, 503); } catch { return reply({ state: "unavailable" }, 503); }
    if (request.method === "HEAD") return new Response(null, { headers: privateHeaders });
    const respond = (body: Record<string, unknown>, status = 200, cookie?: string) => reply({ ...body, formToken: staffFormToken(config, origin, now) }, status, cookie);
    let session = readStaffSession(config, request, now);
    let changed = false;
    async function current() {
      if (!session) return null;
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (!await stillReady()) return null;
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return null;
        session = { ...session, ...refreshed }; changed = true;
      }
      const observed = await context(config, backend, session, now);
      return observed?.timing.absoluteExpiresAtMs === session.deadline ? observed : null;
    }
    async function view(observed: PersistedSessionContext | null) {
      if (!session || !observed) return { state: "ready", profile: null };
      if (observed.sessionPolicySatisfied) {
        const own = await profile(config, backend, session, observed);
        return own ? { state: "authenticated", profile: own } : { state: "denied", profile: null };
      }
      return { state: observed.authenticationTier === "staff" ? "pending-email" : session.factorId ? "pending-totp" : "enroll-totp",
        profile: null, challengeId: session.challengeId, factorId: session.factorId, expiresAt: session.challengeExpiresAt };
    }
    async function setNative(native: NativeStaffSession) {
      const observed = await context(config, backend, native, now);
      if (!observed) { await backend.logout(native.accessToken); return respond({ state: "invalid-credentials" }, 401); }
      const pending: StaffSessionCookie = { ...native, origin, deadline: observed.timing.absoluteExpiresAtMs, challengeId: null, factorId: null, challengeExpiresAt: null };
      session = pending;
      if (observed.authenticationTier === "super_admin") {
        const factors = await backend.factors(native);
        if (factors === null) return respond({ state: "unavailable" }, 503, staffCookie(config, null, now));
        if (factors[0]) {
          pending.factorId = factors[0]; pending.challengeId = await backend.challenge(native, factors[0]);
          const audited = await backend.rpc("msrc_staff_auth_event", { actor_id: native.actorId, session_id: native.sessionId, event: "totp_challenge", result: pending.challengeId ? "completed" : "failed" });
          if (!pending.challengeId || !hasState(audited, "completed")) return respond({ state: "unavailable" }, 503, staffCookie(config, null, now));
        }
      }
      return respond(await view(observed), 200, staffCookie(config, session, now));
    }
    try {
      if (request.method === "GET") {
        const params = new URL(request.url).searchParams;
        if (Array.from(params.keys()).some((key) => !["locale", "area", "q"].includes(key)) || params.get("locale") && !["en", "ar"].includes(params.get("locale")!)) return respond({ state: "invalid-input" }, 400);
        const observed = await current();
        const area = params.get("area");
        if (!area) {
          const body = await view(observed);
          return respond(body, 200, changed && session ? staffCookie(config, session, now) : session && !observed ? staffCookie(config, null, now) : undefined);
        }
        if (!session || !observed?.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
        const own = await profile(config, backend, session, observed); if (!own) return respond({ state: "denied" }, 403);
        const search = params.get("q") ?? "";
        if (!["people", "audit", "participants"].includes(area) || search.length > 120 || /[\x00-\x1f\x7f]/.test(search)) return respond({ state: "invalid-input" }, 400);
        const data = record(await backend.rpc("msrc_staff_" + area, { edition_key: config.editionKey, search }, session.accessToken));
        if (!data || data.state === "denied") return respond({ state: "denied" }, 403);
        if (area === "people") {
          const people = safeRows(data.staff, "staff"), invitations = safeRows(data.invitations, "invitations");
          return people && invitations ? respond({ state: "authenticated", profile: own, people, invitations }, 200, changed ? staffCookie(config, session, now) : undefined) : respond({ state: "unavailable" }, 503);
        }
        const rows = safeRows(data.rows, area as "audit" | "participants");
        return rows ? respond({ state: "authenticated", profile: own, [area]: rows }, 200, changed ? staffCookie(config, session, now) : undefined) : respond({ state: "unavailable" }, 503);
      }
      const payload = validateStaffPayload(await readStaffJson(request));
      const ip = staffIp(config, request);
      const nonce = payload && readStaffFormToken(config, payload.formToken, origin, now);
      if (!payload || !ip || !nonce || payload.website || config.testMode && payload.email && !payload.email.endsWith("@example.invalid")) return respond({ state: "invalid-input" }, 400);
      if (!hasState(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }), "claimed")) return respond({ state: "limited" }, 429);
      if (!await stillReady()) return respond({ state: "closed" }, 503);
      if (payload.action === "signin") {
        const attemptId = randomUUID();
        if (!hasState(await backend.rpc("msrc_staff_login_begin", { attempt_id: attemptId, email_hash: staffHash(config, "email", payload.email!), ip_hash: staffHash(config, "ip", ip) }), "reserved")) return respond({ state: "limited" }, 429);
        let native: NativeStaffSession | null = null;
        try { if (await stillReady()) native = await backend.login(payload.email!, payload.password!); }
        finally {
          const admission = record(await backend.rpc("msrc_staff_login_finish", { attempt_id: attemptId, actor_id: native?.actorId ?? null, session_id: native?.sessionId ?? null }));
          if (admission?.state !== "admitted" || admission.editionKey !== config.editionKey) { if (native) await backend.logout(native.accessToken); native = null; }
        }
        return native ? setNative(native) : respond({ state: "invalid-credentials" }, 401, staffCookie(config, null, now));
      }
      if (payload.action === "invite-accept") {
        const operationId = randomUUID();
        const proof = record(await backend.rpc("msrc_staff_invite_consume", { invite_id: payload.invitationId, token_hash: staffHash(config, "invitation", payload.invitationId + ":" + payload.token), operation_id: operationId, actor_id: randomUUID(), name: payload.name }));
        if (proof?.state !== "consumed" || proof.reservationId !== operationId || typeof proof.actorId !== "string" || !staffUuid.test(proof.actorId)
          || typeof proof.email !== "string" || typeof proof.existing !== "boolean") return respond({ state: "invalid-code" }, 400);
        let succeeded = false;
        try { if (await stillReady()) succeeded = proof.existing ? await backend.updateUser(proof.actorId, payload.password!, true)
          : await backend.createUser({ actorId: proof.actorId, reservationId: operationId, email: proof.email, name: payload.name!, password: payload.password! }); }
        finally { const done = await backend.rpc("msrc_staff_invite_complete", { operation_id: operationId, succeeded }); succeeded = succeeded && hasState(done, "completed"); }
        if (!succeeded) return respond({ state: "invalid-code" }, 400, staffCookie(config, null, now));
        const attemptId = randomUUID();
        if (!hasState(await backend.rpc("msrc_staff_login_begin", { attempt_id: attemptId, email_hash: staffHash(config, "email", proof.email),
          ip_hash: staffHash(config, "ip", ip) }), "reserved")) return respond({ state: "accepted" }, 200, staffCookie(config, null, now));
        let native: NativeStaffSession | null = null;
        try { if (await stillReady()) native = await backend.login(proof.email, payload.password!); }
        finally { const admission = record(await backend.rpc("msrc_staff_login_finish", { attempt_id: attemptId,
          actor_id: native?.actorId ?? null, session_id: native?.sessionId ?? null }));
          if (admission?.state !== "admitted" || admission.editionKey !== config.editionKey) { if (native) await backend.logout(native.accessToken); native = null; }
        }
        return native ? setNative(native) : respond({ state: "accepted" }, 200, staffCookie(config, null, now));
      }
      if (payload.action === "logout") {
        const clear = staffCookie(config, null, now);
        try { if (session) {
          const revoked = await backend.rpc("msrc_session_logout", { edition_key: config.editionKey }, session.accessToken);
          const loggedOut = await backend.logout(session.accessToken);
          if (revoked !== true || !loggedOut) return respond({ state: "unavailable" }, 503, clear);
        } return respond({ state: "signed-out" }, 200, clear); } catch { return respond({ state: "unavailable" }, 503, clear); }
      }
      const observed = await current();
      if (!session || !observed) return respond({ state: "denied" }, 403, staffCookie(config, null, now));
      if (["challenge-email", "verify-email"].includes(payload.action)) {
        if (observed.authenticationTier !== "staff") return respond({ state: "denied" }, 403);
        if (payload.action === "challenge-email") {
          const issued = await backend.emailIssue(session.accessToken, ip);
          if (issued.state !== "issued") return respond({ state: issued.state === "unavailable" ? "unavailable" : "denied" }, issued.state === "unavailable" ? 503 : 403);
          session.challengeId = issued.challengeId; session.challengeExpiresAt = issued.expiresAt;
          return respond({ state: "pending-email", challengeId: issued.challengeId, expiresAt: issued.expiresAt }, 200, staffCookie(config, session, now));
        }
        if (!session.challengeId || payload.challengeId && payload.challengeId !== session.challengeId) return respond({ state: "invalid-code" }, 400);
        const checked = await backend.emailVerify(session.accessToken, session.challengeId, payload.code!);
        if (checked.state !== "verified") return respond({ state: checked.state === "unavailable" ? "unavailable" : "invalid-code" }, checked.state === "unavailable" ? 503 : 400);
        const after = await current();
        if (!after?.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
        return respond(await view(after), 200, staffCookie(config, session, now));
      }
      if (["enroll-totp", "challenge-totp", "verify-totp"].includes(payload.action)) {
        if (observed.authenticationTier !== "super_admin" || observed.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
        const audit = async (event: string, success: boolean) => hasState(await backend.rpc("msrc_staff_auth_event", { actor_id: session!.actorId, session_id: session!.sessionId, event, result: success ? "completed" : "failed" }), "completed");
        if (payload.action === "enroll-totp") {
          const factors = await backend.factors(session);
          if (factors === null || factors.length || session.factorId) return respond({ state: "denied" }, 403);
          const enrollment = await backend.enroll(session); const enrolledAudit = await audit("totp_enroll", Boolean(enrollment));
          if (!enrollment || !enrolledAudit) return respond({ state: "unavailable" }, 503);
          session.factorId = enrollment.factorId; session.challengeId = await backend.challenge(session, enrollment.factorId);
          const challengedAudit = await audit("totp_challenge", Boolean(session.challengeId));
          if (!session.challengeId || !challengedAudit) return respond({ state: "unavailable" }, 503);
          const qrCode = await QRCode.toDataURL(enrollment.uri, { errorCorrectionLevel: "M", width: 256, margin: 2 });
          return respond({ state: "pending-totp", factorId: session.factorId, challengeId: session.challengeId,
            enrollment: { factorId: enrollment.factorId, secret: enrollment.secret, qrCode } }, 200, staffCookie(config, session, now));
        }
        if (payload.action === "challenge-totp") {
          if (!session.factorId) return respond({ state: "denied" }, 403);
          session.challengeId = await backend.challenge(session, session.factorId); const audited = await audit("totp_challenge", Boolean(session.challengeId));
          return session.challengeId && audited ? respond({ state: "pending-totp", factorId: session.factorId, challengeId: session.challengeId }, 200, staffCookie(config, session, now)) : respond({ state: "unavailable" }, 503);
        }
        if (!session.factorId || !session.challengeId || payload.factorId !== session.factorId || payload.challengeId !== session.challengeId) return respond({ state: "invalid-code" }, 400);
        const upgraded = await backend.verify(session, session.factorId, session.challengeId, payload.code!); const audited = await audit("totp_verify", Boolean(upgraded));
        if (!audited) return respond({ state: "unavailable" }, 503);
        if (!upgraded) return respond({ state: "invalid-code" }, 400);
        session = { ...session, ...upgraded }; const after = await current();
        if (!after?.sessionPolicySatisfied || !after.mfaValid) return respond({ state: "denied" }, 403);
        return respond(await view(after), 200, staffCookie(config, session, now));
      }
      if (!observed.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
      if (payload.action === "invite" || payload.action === "invite-resend") {
        const invitationId = randomUUID(), token = randomBytes(32).toString("base64url");
        const reservation = record(await backend.rpc("msrc_staff_invite_begin", { edition_key: config.editionKey, email: payload.email, roles: payload.roles,
          invite_id: invitationId, token_hash: staffHash(config, "invitation", invitationId + ":" + token) }, session.accessToken));
        if (reservation?.state !== "reserved" || reservation.invitationId !== invitationId || reservation.email !== payload.email) return respond({ state: "denied" }, 403);
        let delivered = false;
        try { if (await stillReady()) delivered = await backend.invite(payload.email!, invitationId, token, origin); }
        finally { const done = await backend.rpc("msrc_staff_invite_delivery", { invite_id: invitationId, delivered }); delivered = delivered && hasState(done, "completed"); }
        return respond({ state: delivered ? "invited" : "unavailable" }, delivered ? 200 : 503);
      }
      if (payload.action === "invite-revoke") {
        const result = await backend.rpc("msrc_staff_invite_revoke", { edition_key: config.editionKey, invite_id: payload.invitationId }, session.accessToken);
        return respond({ state: hasState(result, "completed") ? "updated" : "denied" }, hasState(result, "completed") ? 200 : 403);
      }
      if (payload.action === "reveal-identity") {
        const result = record(await backend.rpc("msrc_staff_identity_reveal", { edition_key: config.editionKey, target_actor: payload.targetId }, session.accessToken));
        // The registration identity field does not exist yet; no native plaintext is projected here.
        return respond({ state: result?.state === "unavailable" ? "identity-unavailable" : "denied" }, result?.state === "unavailable" ? 200 : 403);
      }
      const operationId = randomUUID();
      const result = record(await backend.rpc("msrc_staff_admin_change", { edition_key: config.editionKey, target_actor: payload.targetId,
        action: payload.action === "roles" ? "set_roles" : payload.action.replaceAll("-", "_"), roles: payload.roles ?? [], operation_id: operationId }, session.accessToken));
      if (!["reset-authenticator", "reset-account"].includes(payload.action)) return respond({ state: result?.state === "completed" ? "updated" : "denied" }, result?.state === "completed" ? 200 : 403);
      if (result?.state !== "reserved" || result.operationId !== operationId || payload.targetId === session.actorId) return respond({ state: "denied" }, 403);
      const operation = record(await backend.rpc("msrc_staff_admin_operation", { operation_id: operationId }));
      if (operation?.state !== "reserved" || operation.actorId !== payload.targetId || !Array.isArray(operation.factorIds)
        || operation.factorIds.some((id) => typeof id !== "string" || !staffUuid.test(id))) return respond({ state: "denied" }, 403);
      let succeeded = false;
      try { if (await stillReady()) {
        succeeded = await backend.resetFactors(payload.targetId!, operation.factorIds as string[]);
        if (succeeded && payload.action === "reset-account") succeeded = await backend.updateUser(payload.targetId!, randomBytes(32).toString("base64url"));
      } } finally { const done = await backend.rpc("msrc_staff_admin_complete", { operation_id: operationId, succeeded }); succeeded = succeeded && hasState(done, "completed"); }
      if (!succeeded) return respond({ state: "unavailable" }, 503);
      if (payload.action === "reset-account") {
        if (typeof operation.email !== "string" || !Array.isArray(operation.roles)) return respond({ state: "unavailable" }, 503);
        const inviteId = randomUUID(), token = randomBytes(32).toString("base64url");
        const reserved = record(await backend.rpc("msrc_staff_invite_begin", { edition_key: config.editionKey, email: operation.email, roles: operation.roles,
          invite_id: inviteId, token_hash: staffHash(config, "invitation", inviteId + ":" + token) }, session.accessToken));
        if (reserved?.state !== "reserved") return respond({ state: "unavailable" }, 503);
        let delivered = false;
        try { if (await stillReady()) delivered = await backend.invite(operation.email, inviteId, token, origin); }
        finally { const done = await backend.rpc("msrc_staff_invite_delivery", { invite_id: inviteId, delivered }); delivered = delivered && hasState(done, "completed"); }
        if (!delivered) return respond({ state: "unavailable" }, 503);
      }
      return respond({ state: "updated" });
    } catch { return respond({ state: "unavailable" }, 503); }
  };
}
export const handleStaffRequest = createStaffHandler();
export async function staffPageReady(config: StaffConfig): Promise<boolean> {
  try { return await ready(config, createStaffBackend(config)); } catch { return false; }
}
/** Server rendering observes only. Token refresh stays in the API so it can update the cookie. */
export async function observeStaffPage(request: Request, config: StaffConfig): Promise<StaffProfile | null> {
  const session = readStaffSession(config, request);
  if (!session || nativeTokenNeedsRefresh(session.accessToken)) return null;
  try { const backend = createStaffBackend(config); if (!await ready(config, backend)) return null;
    const observed = await context(config, backend, session, Date.now());
    return observed?.sessionPolicySatisfied && observed.timing.absoluteExpiresAtMs === session.deadline ? profile(config, backend, session, observed) : null;
  } catch { return null; }
}
