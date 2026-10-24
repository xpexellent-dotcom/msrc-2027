import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { parsePersistedSessionContext, type PersistedSessionContext } from "@/lib/supabase/session.server";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash,
  staffIp, staffOrigin, staffUuid, type StaffSessionCookie } from "./security.server";
import { validateStaffPayload, validStaffRegistrationFilter, validStaffRegistrationStatus } from "./validation.server";
import { canReadStaffArea, earlyAccessAddResult, earlyAccessProjection, earlyAccessRemoveResult, priorityProjection, registrationDecision, registrationDetailProjection, registrationExportCsv, registrationProjection, summaryProjection, verifiedPriorityClaims, verifiedStaffRegistrationClaims } from "./registration-contract.server";
import type { StaffArea } from "./ui-contract";
import { registrationSettingsProjection } from "./registration-settings-contract.server";
import { getRegistrationTicketSecret } from "@/features/registration/ticket-crypto.server";
import { renderRegistrationEmailPreviews } from "./email-previews.server";
import { checkInDay, checkInResultProjection, checkInSummaryProjection, checkInUndoProjection } from "./check-in-contract.server";
import { confirmationPreviewProjection } from "./confirmation-contract.server";
import { launchReadinessProjection } from "./launch-readiness-contract.server";

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
async function passwordChangeReady(config: StaffConfig, backend: StaffBackend): Promise<boolean> {
  if (!config.passwordChangeEnabled) return false;
  const value = record(await backend.rpc("msrc_staff_status"));
  return value?.enabled === true && value.emailDailyLimit === config.emailDailyLimit && value.passwordChangeEnabled === true;
}
export interface StaffProfile { actorId: string; name: string; roles: Role[] }

const missingRpc = Symbol("missing private RPC");
/** Lets code that ships ahead of its hosted migration fall back instead of locking staff out. */
async function optionalRpc(backend: StaffBackend, name: string, args: Record<string, unknown>, accessToken?: string): Promise<unknown> {
  try { return await (accessToken === undefined ? backend.rpc(name, args) : backend.rpc(name, args, accessToken)); } catch (error) { if (error instanceof StaffRpcMissingError) return missingRpc; throw error; }
}
/** Records a failed sign-in; before the hardening migration, closes the attempt the pre-ENG-044 way. */
async function loginFailure(backend: StaffBackend, attemptId: string, attemptedEmail: string | undefined, editionKey: string): Promise<unknown> {
  const failed = await optionalRpc(backend, "msrc_staff_login_failure", { attempt_id: attemptId, attempted_email: attemptedEmail, edition_key: editionKey });
  return failed === missingRpc ? backend.rpc("msrc_staff_login_finish", { attempt_id: attemptId, actor_id: null, session_id: null }) : failed;
}
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
/** Shared native verification for the bounded media route; no cookie or client role is authority. */
export async function readStaffToolAuthority(config: StaffConfig, backend: StaffBackend, session: NativeStaffSession, now: number) {
  const observed = await context(config, backend, session, now);
  if (!observed?.sessionPolicySatisfied) return null;
  const own = await profile(config, backend, session, observed);
  return own ? { profile: own, context: observed } : null;
}
const fields = {
  staff: ["actorId", "name", "email", "roles", "status", "lastSignIn", "recoveryState"],
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
    if (kind === "staff" && Object.hasOwn(row, "recoveryState")
      && !["none", "pending", "failed", "awaiting_invitation"].includes(row.recoveryState as string)) return null;
    rows.push({ ...row });
  }
  return rows;
}
function safeDetails(value: unknown): boolean {
  const details = record(value); if (!details) return false;
  if (details.source === "registration") return Object.entries(details).every(([key, entry]) => {
    if (key === "source") return entry === "registration";
    if (["requestId", "earlyAccessEntryId"].includes(key)) return entry === null || typeof entry === "string" && staffUuid.test(entry);
    if (["previousStatus", "newStatus"].includes(key)) return entry === null || validStaffRegistrationStatus(entry) && entry !== "all";
    if (["previousActive", "newActive"].includes(key)) return entry === null || typeof entry === "boolean";
    if (key === "rowCount") return entry === null || typeof entry === "number" && Number.isSafeInteger(entry) && entry >= 0;
    if (key === "reason") return entry === null || typeof entry === "string" && entry.length > 0 && entry.length <= 300 && !/[\x00-\x1f\x7f]/.test(entry);
    return false;
  });
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

export function createStaffHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number; environment?: () => Record<string, string | undefined> } = {}) {
  const getReadiness = dependencies.readiness ?? getStaffConfig;
  const getBackend = dependencies.backend ?? createStaffBackend;
  const clock = dependencies.now ?? Date.now;
  return async function handle(request: Request): Promise<Response> {
    // Closed before body inspection, provider construction or credential collection.
    const readiness = getReadiness();
    if (readiness.state !== "ready") {
      // A configured provider is unnecessary to discard fixed-name cookies.
      // The explicit client signal avoids parsing credentials on a closed route.
      if (request instanceof Request && request.method === "POST" && request.headers.get("x-msrc-staff-logout") === "1"
        && request.headers.get("origin") === new URL(request.url).origin
        && (!request.headers.get("host") || request.headers.get("host") === new URL(request.url).host)
        && [null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))) {
        const headers = new Headers(privateHeaders);
        headers.append("Set-Cookie", "__Host-msrc-staff=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure");
        headers.append("Set-Cookie", "msrc-staff-test=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
        return Response.json({ state: "signed-out" }, { headers });
      }
      return reply({ state: readiness.state }, 503);
    }
    const config = readiness.config, now = clock();
    const resolvedOrigin = staffOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!resolvedOrigin || (site && !["same-origin", "none"].includes(site)) || request.headers.get("origin") && request.headers.get("origin") !== resolvedOrigin
      || request.method === "POST" && request.headers.get("origin") !== resolvedOrigin) return reply({ state: "invalid-input" }, 400);
    const origin: string = resolvedOrigin;
    if (!["GET", "HEAD", "POST"].includes(request.method)) return reply({ state: "invalid-input" }, 405);
    // Signing out only removes authority. Same-origin enforcement above remains
    // mandatory, but a stale form token, abuse quota or unavailable provider must
    // never prevent clearing the browser's private session.
    let submitted: unknown;
    if (request.method === "POST") {
      try { submitted = await readStaffJson(request); } catch { return reply({ state: "invalid-input" }, 400); }
      const input = record(submitted);
      if (input?.action === "logout" && Object.keys(input).every((key) => ["action", "formToken", "website"].includes(key))) {
        const clear = staffCookie(config, null, now);
        try {
          const previous = readStaffSession(config, request, now);
          if (previous) {
            const logoutBackend = getBackend(config);
            let revokeToken = previous.accessToken;
            if (nativeTokenNeedsRefresh(revokeToken, now)) {
              try {
                const refreshed = await logoutBackend.refresh(previous.refreshToken);
                if (refreshed?.actorId === previous.actorId && refreshed.sessionId === previous.sessionId) revokeToken = refreshed.accessToken;
              } catch { /* Still attempt both revocations with the available token. */ }
            }
            // These revocations are independent: still try the provider when the
            // application database is down, and vice versa.
            await Promise.allSettled([
              Promise.resolve().then(() => logoutBackend.rpc("msrc_session_logout", { edition_key: config.editionKey }, revokeToken)),
              Promise.resolve().then(() => logoutBackend.logout(revokeToken)),
            ]);
          }
        } catch { /* The browser must always be able to discard its session. */ }
        return reply({ state: "signed-out" }, 200, clear);
      }
    }
    const backend = getBackend(config);
    const stillReady = async () => getReadiness().state === "ready" && await ready(config, backend);
    try { if (!await stillReady()) return reply({ state: "closed" }, 503); } catch { return reply({ state: "unavailable" }, 503); }
    if (request.method === "HEAD") return new Response(null, { headers: privateHeaders });
    let session = readStaffSession(config, request, now);
    let changed = false;
    let invalidated = false;
    // Rotation must survive every response path, including a denied or failed
    // administrative operation after a successful native refresh.
    const respond = (body: Record<string, unknown>, status = 200, cookie?: string) => reply({ ...body, formToken: staffFormToken(config, origin, now) }, status,
      invalidated ? staffCookie(config, null, now) : cookie ?? (changed && session ? staffCookie(config, session, now) : undefined));
    let passwordAttempted = false;
    async function current() {
      if (!session) return null;
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (!await stillReady()) return null;
        let refreshed: NativeStaffSession | null;
        try { refreshed = await backend.refresh(session.refreshToken); }
        catch { invalidated = true; throw new Error("Private staff refresh unavailable"); }
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) { invalidated = true; return null; }
        session = { ...session, ...refreshed }; changed = true;
      }
      const observed = await context(config, backend, session, now);
      if (observed?.timing.absoluteExpiresAtMs === session.deadline) return observed;
      invalidated = true; return null;
    }
    async function view(observed: PersistedSessionContext | null) {
      if (!session || !observed) return { state: "ready", profile: null };
      if (observed.sessionPolicySatisfied) {
        const own = await profile(config, backend, session, observed);
        return own ? { state: "authenticated", profile: own, passwordChangeAvailable: await passwordChangeReady(config, backend) }
          : { state: "denied", profile: null };
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
        if (Array.from(params.keys()).some((key) => !["locale", "area", "q", "query", "status", "requestId", "day"].includes(key) || params.getAll(key).length !== 1)
          || params.has("q") && params.has("query") || params.get("locale") && !["en", "ar"].includes(params.get("locale")!)) return respond({ state: "invalid-input" }, 400);
        const observed = await current();
        const area = params.get("area");
        if (params.has("day") && (area !== "check-in" || !checkInDay(params.get("day")))) return respond({ state: "invalid-input" }, 400);
        if (params.has("status") && (area !== "registration" || !validStaffRegistrationFilter(params.get("status")))) return respond({ state: "invalid-input" }, 400);
        if (area === "registration-detail" ? !staffUuid.test(params.get("requestId") ?? "") : params.has("requestId")) return respond({ state: "invalid-input" }, 400);
        if (["registration-detail", "registration-export"].includes(area ?? "") && (params.has("q") || params.has("query"))) return respond({ state: "invalid-input" }, 400);
        if (!area) {
          const body = await view(observed);
          return respond(body, 200, changed && session ? staffCookie(config, session, now) : session && !observed ? staffCookie(config, null, now) : undefined);
        }
        if (!session || !observed?.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
        const own = await profile(config, backend, session, observed); if (!own) return respond({ state: "denied" }, 403);
        const search = params.get("query") ?? params.get("q") ?? "";
        if (!["people", "audit", "participants", "registration", "registration-detail", "registration-export", "priority", "early-access", "registration-settings", "registration-confirmation-preview", "email-previews", "summary", "check-in", "launch-readiness"].includes(area) || search.length > 120 || /[\x00-\x1f\x7f]/.test(search)
          || ["registration-settings", "registration-confirmation-preview", "email-previews", "check-in", "launch-readiness"].includes(area) && search !== "") return respond({ state: "invalid-input" }, 400);
        if (!canReadStaffArea(own.roles, area as StaffArea)) return respond({ state: "denied" }, 403);
        if (["registration-export", "early-access", "registration-settings", "registration-confirmation-preview", "email-previews", "launch-readiness"].includes(area) && (observed.authenticationTier !== "super_admin" || !observed.mfaValid)) return respond({ state: "denied" }, 403);
        if (area === "registration-confirmation-preview") {
          const read = await optionalRpc(backend, "msrc_staff_registration_confirmation_preview", { edition_key: config.editionKey }, session.accessToken);
          if (read === missingRpc || record(read)?.state === "area_not_ready") return respond({ state: "area-not-ready" }, 503);
          if (record(read)?.state === "denied") return respond({ state: "denied" }, 403);
          const confirmationPreview = record(read)?.state === "ready" && confirmationPreviewProjection(record(read)?.confirmation);
          return confirmationPreview ? respond({ state: "authenticated", profile: own, confirmationPreview }) : respond({ state: "unavailable" }, 503);
        }
        if (area === "launch-readiness") {
          const reads = await Promise.all([
            optionalRpc(backend, "msrc_staff_launch_readiness", { edition_key: config.editionKey }, session.accessToken),
            optionalRpc(backend, "msrc_staff_registration_settings", { edition_key: config.editionKey }, session.accessToken),
          ]);
          if (reads.includes(missingRpc)) return respond({ state: "area-not-ready" }, 503);
          if (reads.some((read) => record(read)?.state === "denied")) return respond({ state: "denied" }, 403);
          if (record(reads[0])?.state === "ready" && (!Object.hasOwn(record(reads[0])!, "confirmationSettingsSet")
            || !Object.hasOwn(record(record(reads[0])?.requiredRpcs) ?? {}, "confirmation"))) return respond({ state: "area-not-ready" }, 503);
          const settingsSource = record(record(reads[1])?.settings);
          if (settingsSource && !Object.hasOwn(settingsSource, "conference_days")) return respond({ state: "area-not-ready" }, 503);
          const settings = registrationSettingsProjection(reads[1], config.editionKey);
          const launchReadiness = settings && launchReadinessProjection(reads[0], settings, dependencies.environment?.() ?? process.env);
          return launchReadiness ? respond({ state: "authenticated", profile: own, launchReadiness,
            passwordChangeAvailable: await passwordChangeReady(config, backend) }) : respond({ state: "unavailable" }, 503);
        }
        // Static approved templates need the existing session authority, but no area RPC or migration.
        if (area === "email-previews") return respond({ state: "authenticated", profile: own, emailPreviews: renderRegistrationEmailPreviews(),
          passwordChangeAvailable: await passwordChangeReady(config, backend) });
        if (area === "check-in") {
          const read = await optionalRpc(backend, "msrc_staff_attendance_summary", { edition_key: config.editionKey, day: params.get("day") }, session.accessToken);
          if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
          const data = record(read);
          if (data?.state === "denied") return respond({ state: "denied" }, 403);
          if (data?.state === "wrong_day" || data?.state === "invalid") return respond({ state: "invalid-input" }, 400);
          if (data?.state === "rate_limited") return respond({ state: "limited" }, 429);
          const checkIn = checkInSummaryProjection(read, params.get("day"));
          return checkIn ? respond({ state: "authenticated", profile: own, checkIn,
            passwordChangeAvailable: await passwordChangeReady(config, backend) }) : respond({ state: "unavailable" }, 503);
        }
        const read = await optionalRpc(backend, "msrc_staff_" + area.replaceAll("-", "_"), { edition_key: config.editionKey,
          ...(["summary", "registration-detail", "registration-export", "registration-settings"].includes(area) ? {} : { search }),
          ...(area === "registration-detail" ? { request_id: params.get("requestId") } : {}),
          ...(area === "registration" ? { status_filter: params.get("status") ?? "all" } : {}) }, session.accessToken);
        if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
        const data = record(read);
        if (!data || data.state === "denied") return respond({ state: "denied" }, 403);
        if (area === "registration-settings") {
          const settings = record(data.settings);
          if (settings && !Object.hasOwn(settings, "conference_days")) return respond({ state: "area-not-ready" }, 503);
          const registrationSettings = registrationSettingsProjection(data, config.editionKey);
          return registrationSettings ? respond({ state: "authenticated", profile: own, registrationSettings,
            passwordChangeAvailable: await passwordChangeReady(config, backend) }) : respond({ state: "unavailable" }, 503);
        }
        if (area === "registration-detail") {
          // The existing RPC may still be the older, staff-decisions-only read.
          if (data.state === "ready" && (data.historyVersion === undefined || data.identityVersion === undefined)) return respond({ state: "area-not-ready" }, 503);
          if (data.historyVersion !== 1 || data.identityVersion !== 1) return respond({ state: "unavailable" }, 503);
          const detail = data.state === "ready" && registrationDetailProjection(data.detail, params.get("requestId")!);
          return detail ? respond({ state: "authenticated", profile: own, registrationDetail: detail,
            passwordChangeAvailable: await passwordChangeReady(config, backend) }) : respond({ state: "unavailable" }, 503);
        }
        if (area === "registration-export") {
          const csv = data.state === "ready" ? registrationExportCsv(data.rows) : null;
          if (csv === null) return respond({ state: "unavailable" }, 503);
          return new Response(csv, { headers: { ...privateHeaders, "Cache-Control": "no-store", "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="registration-${config.editionKey}.csv"`,
            ...(changed ? { "Set-Cookie": staffCookie(config, session, now) } : {}) } });
        }
        if (area === "registration" && params.get("status")?.startsWith("confirmation_") && data.confirmationVersion !== 1) return respond({ state: "area-not-ready" }, 503);
        if (["registration", "priority", "early-access", "summary"].includes(area)) {
          if (data.state !== "ready") return respond({ state: "unavailable" }, 503);
          const projection = area === "registration" ? registrationProjection(data.registration)
            : area === "priority" ? priorityProjection(data.priority)
              : area === "early-access" ? earlyAccessProjection(data.earlyAccess) : summaryProjection(data.summary, own.roles);
          return projection ? respond({ state: "authenticated", profile: own, [area === "early-access" ? "earlyAccess" : area]: projection,
            passwordChangeAvailable: await passwordChangeReady(config, backend) }) : respond({ state: "unavailable" }, 503);
        }
        if (area === "people") {
          const people = safeRows(data.staff, "staff"), invitations = safeRows(data.invitations, "invitations");
          return people && invitations ? respond({ state: "authenticated", profile: own, people, invitations, passwordChangeAvailable: await passwordChangeReady(config, backend) }, 200, changed ? staffCookie(config, session, now) : undefined) : respond({ state: "unavailable" }, 503);
        }
        const rows = safeRows(data.rows, area as "audit" | "participants");
        return rows ? respond({ state: "authenticated", profile: own, [area]: rows, passwordChangeAvailable: await passwordChangeReady(config, backend) }, 200, changed ? staffCookie(config, session, now) : undefined) : respond({ state: "unavailable" }, 503);
      }
      const payload = validateStaffPayload(submitted);
      if (payload?.action === "password-change" && !await passwordChangeReady(config, backend)) return respond({ state: "denied" }, 403);
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
          const admission = record(native ? await backend.rpc("msrc_staff_login_finish", { attempt_id: attemptId, actor_id: native.actorId, session_id: native.sessionId })
            : await loginFailure(backend, attemptId, payload.email, config.editionKey));
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
        finally { const admission = record(native ? await backend.rpc("msrc_staff_login_finish", { attempt_id: attemptId, actor_id: native.actorId, session_id: native.sessionId })
          : await loginFailure(backend, attemptId, proof.email, config.editionKey));
          if (admission?.state !== "admitted" || admission.editionKey !== config.editionKey) { if (native) await backend.logout(native.accessToken); native = null; }
        }
        return native ? setNative(native) : respond({ state: "accepted" }, 200, staffCookie(config, null, now));
      }
      const observed = await current();
      if (!session || !observed) return respond({ state: payload.action === "password-change" ? "reauthentication-required" : "denied" }, 403, staffCookie(config, null, now));
      if (payload.action === "password-change") {
        if (observed.authenticationTier !== "super_admin") return respond({ state: "denied" }, 403);
        if (!observed.sessionPolicySatisfied || !observed.mfaValid
          || observed.timing.startedAtMs <= now - 120_000 || observed.timing.startedAtMs > now
          || observed.timing.authenticatedAtMs === null || observed.timing.authenticatedAtMs <= now - 120_000
          || observed.timing.authenticatedAtMs > now) return respond({ state: "reauthentication-required" }, 403, staffCookie(config, null, now));
        const operationId = randomUUID();
        const reserved = record(await backend.rpc("msrc_staff_password_change_begin", {
          edition_key: config.editionKey, operation_id: operationId,
        }, session.accessToken));
        if (reserved?.state === "denied") return respond({ state: "reauthentication-required" }, 403, staffCookie(config, null, now));
        if (!reserved || Object.keys(reserved).sort().join(",") !== "actorId,operationId,sessionId,state"
          || reserved.state !== "reserved" || reserved.operationId !== operationId || reserved.actorId !== session.actorId
          || reserved.sessionId !== session.sessionId) return respond({ state: "denied" }, 403);
        let updated = false, completed: Record<string, unknown> | null = null;
        try {
          if (await stillReady() && await passwordChangeReady(config, backend)) {
            passwordAttempted = true;
            updated = await backend.changeOwnPassword(session, operationId, payload.password!);
          }
        } catch { /* Provider ambiguity never acknowledges a password change. */ }
        finally { completed = record(await backend.rpc("msrc_staff_password_change_result", { operation_id: operationId })); }
        const verified = updated && passwordAttempted && completed
          && Object.keys(completed).sort().join(",") === "actorId,operationId,sessionId,state"
          && completed.state === "completed" && completed.operationId === operationId
          && completed.actorId === session.actorId && completed.sessionId === session.sessionId;
        return respond({ state: verified ? "password-changed" : "unavailable" }, verified ? 200 : 503,
          passwordAttempted ? staffCookie(config, null, now) : undefined);
      }
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
        if (!session.factorId || !session.challengeId || payload.factorId !== session.factorId) return respond({ state: "invalid-code" }, 400);
        // Supabase challenges expire quickly; answer each code against a fresh one so a slow entry never needs a manual restart.
        const fresh = await backend.challenge(session, session.factorId); const freshAudited = await audit("totp_challenge", Boolean(fresh));
        if (!fresh || !freshAudited) return respond({ state: "unavailable" }, 503);
        session.challengeId = fresh;
        const attemptId = randomUUID();
        const begun = await optionalRpc(backend, "msrc_staff_totp_begin", { actor_id: session.actorId, session_id: session.sessionId, attempt_id: attemptId });
        if (begun === missingRpc) {
          // Pre-ENG-044 database: the lockout tables are not installed yet, so verify exactly as before the hardening migration.
          const upgraded = await backend.verify(session, session.factorId, session.challengeId, payload.code!); const audited = await audit("totp_verify", Boolean(upgraded));
          if (!audited) return respond({ state: "unavailable" }, 503);
          if (!upgraded) return respond({ state: "invalid-code" }, 400);
          session = { ...session, ...upgraded }; const after = await current();
          if (!after?.sessionPolicySatisfied || !after.mfaValid) return respond({ state: "denied" }, 403);
          return respond(await view(after), 200, staffCookie(config, session, now));
        }
        const reservation = record(begun);
        if (reservation?.state === "limited") return respond({ state: "limited" }, 429);
        if (reservation?.state !== "reserved") return respond({ state: "denied" }, 403);
        let upgraded: NativeStaffSession | null = null, completion: Record<string, unknown> | null = null;
        try { upgraded = await backend.verify(session, session.factorId, session.challengeId, payload.code!); }
        finally { completion = record(await backend.rpc("msrc_staff_totp_finish", { actor_id: session.actorId, session_id: session.sessionId,
          attempt_id: attemptId, succeeded: Boolean(upgraded) })); }
        if (completion?.state === "limited") return respond({ state: "limited" }, 429);
        if (completion?.state === "failed") return respond({ state: "invalid-code" }, 400);
        if (completion?.state !== "completed" || !upgraded) return respond({ state: "unavailable" }, 503);
        session = { ...session, ...upgraded }; const after = await current();
        if (!after?.sessionPolicySatisfied || !after.mfaValid) return respond({ state: "denied" }, 403);
        return respond(await view(after), 200, staffCookie(config, session, now));
      }
      if (!observed.sessionPolicySatisfied) return respond({ state: "denied" }, 403);
      if (payload.action === "activity") {
        const active = parsePersistedSessionContext(await backend.rpc("msrc_session_activity", { edition_key: config.editionKey }, session.accessToken), session.actorId, config.editionKey);
        if (!active?.sessionPolicySatisfied || active.principal.sessionId !== session.sessionId
          || active.authenticationTier !== observed.authenticationTier || active.timing.absoluteExpiresAtMs !== session.deadline
          || active.timing.idleExpiresAtMs === null || active.timing.idleExpiresAtMs <= now) return respond({ state: "denied" }, 403);
        return respond(await view(active));
      }
      if (payload.action === "check-in" || payload.action === "check-in-undo") {
        const own = await profile(config, backend, session, observed);
        if (!own || !canReadStaffArea(own.roles, "check-in")
          || payload.action === "check-in-undo" && (!own.roles.includes("superAdmin") || observed.authenticationTier !== "super_admin" || !observed.mfaValid)) return respond({ state: "denied" }, 403);
        const read = await optionalRpc(backend, payload.action === "check-in" ? "msrc_staff_checkin" : "msrc_staff_checkin_undo",
          { edition_key: config.editionKey, ...(payload.action === "check-in" ? {
            ticket_token_or_reference: payload.ticketTokenOrReference, conference_day: payload.conferenceDay, entry_point: payload.entryPoint || null,
          } : { attendance_id: payload.attendanceId, reason: payload.reason }) }, session.accessToken);
        if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
        const data = record(read);
        if (data?.state === "denied") return respond({ state: "denied" }, 403);
        if (data?.state === "rate_limited") return respond({ state: "limited" }, 429);
        if (data?.state === "invalid") return respond({ state: "invalid-input" }, 400);
        if (payload.action === "check-in-undo") {
          if (data?.state === "not_found") return respond({ state: "invalid-input" }, 404);
          return checkInUndoProjection(read) ? respond({ state: "updated" }) : respond({ state: "unavailable" }, 503);
        }
        const checkInResult = checkInResultProjection(read, payload.conferenceDay!);
        return checkInResult ? respond({ state: "updated", checkInResult }) : respond({ state: "unavailable" }, 503);
      }
      if (payload.action === "registration-approve" || payload.action === "registration-waitlist" || payload.action === "registration-offer") {
        const own = await profile(config, backend, session, observed);
        if (!own || !canReadStaffArea(own.roles, "registration")) return respond({ state: "denied" }, 403);
        let read: unknown;
        if (payload.action === "registration-approve") {
          const ticketSecret = getRegistrationTicketSecret();
          if (!ticketSecret) return respond({ state: "area-not-ready" }, 503);
          const claims = verifiedStaffRegistrationClaims(session, now);
          if (!claims) return respond({ state: "denied" }, 403);
          read = await optionalRpc(backend, "msrc_staff_registration_approve_tickets", {
            edition_key: config.editionKey, session_claims: claims, request_ids: payload.requestIds, ticket_secret: ticketSecret,
          });
        } else {
          read = await optionalRpc(backend, "msrc_staff_" + payload.action.replaceAll("-", "_"),
            { edition_key: config.editionKey, request_ids: payload.requestIds }, session.accessToken);
        }
        if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
        const result = record(read);
        if (result?.state === "area_not_ready") return respond({ state: "area-not-ready" }, 503);
        if (result?.state === "denied") return respond({ state: "denied" }, 403);
        if (result?.state === "offer_window_not_set") return respond({ state: "offer-window-not-set" }, 409);
        if (result?.state === "capacity_not_set" || result?.state === "payment_configuration_required") {
          return respond({ state: result.state === "capacity_not_set" ? "capacity-not-set" : "payment-configuration-required" }, 409);
        }
        const registration = registrationProjection(result?.registration), decided = registrationDecision(result?.decided, payload.requestIds!.length, payload.action);
        return result?.state === "updated" && registration && decided
          ? respond({ state: "updated", registration, decided }) : respond({ state: "unavailable" }, 503);
      }
      if (payload.action === "registration-confirmation-start") {
        const own = await profile(config, backend, session, observed);
        if (!own?.roles.includes("superAdmin") || observed.authenticationTier !== "super_admin" || !observed.mfaValid) return respond({ state: "denied" }, 403);
        const read = await optionalRpc(backend, "msrc_staff_registration_confirmation_start", { edition_key: config.editionKey, operation_id: payload.operationId,
          nonresponse_policy: payload.nonresponsePolicy, preview_token: payload.previewToken }, session.accessToken);
        if (read === missingRpc || record(read)?.state === "area_not_ready") return respond({ state: "area-not-ready" }, 503);
        const result = record(read);
        if (result?.state === "denied") return respond({ state: "denied" }, 403);
        if (result?.state === "conflict") return respond({ state: "operation-conflict" }, 409);
        if (result?.state === "not_due") return respond({ state: "confirmation-not-due" }, 409);
        return result?.state === "updated" && Object.keys(result).sort().join(",") === "opened,state" && Number.isSafeInteger(result.opened) && Number(result.opened) >= 0
          ? respond({ state: "updated", confirmationOpened: result.opened }) : respond({ state: "unavailable" }, 503);
      }
      if (payload.action === "registration-settings-save") {
        const own = await profile(config, backend, session, observed);
        if (!own || !canReadStaffArea(own.roles, "registration-settings") || observed.authenticationTier !== "super_admin" || !observed.mfaValid) return respond({ state: "denied" }, 403);
        if (payload.changes?.enabled === true) return respond({ state: "enable-not-allowed-here" }, 409);
        const read = await optionalRpc(backend, "msrc_staff_registration_settings_save", {
          edition_key: config.editionKey, changes: payload.changes, operation_id: payload.operationId,
        }, session.accessToken);
        if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
        const result = record(read);
        if (result?.state === "denied") return respond({ state: "denied" }, 403);
        if (result?.state === "invalid") return respond({ state: "invalid-input" }, 400);
        const settings = record(result?.settings);
        if (settings && !Object.hasOwn(settings, "conference_days")) return respond({ state: "area-not-ready" }, 503);
        if (["capacity_below_held", "enable_not_allowed_here", "operation_conflict"].includes(String(result?.state))) return respond({ state: String(result!.state).replaceAll("_", "-") }, 409);
        const registrationSettings = registrationSettingsProjection(read, config.editionKey, payload.operationId);
        return registrationSettings ? respond({ state: "updated", registrationSettings, operationId: payload.operationId }) : respond({ state: "unavailable" }, 503);
      }
      if (payload.action === "early-access-add" || payload.action === "early-access-remove") {
        const own = await profile(config, backend, session, observed);
        if (!own || !canReadStaffArea(own.roles, "early-access") || observed.authenticationTier !== "super_admin" || !observed.mfaValid) return respond({ state: "denied" }, 403);
        const read = await optionalRpc(backend, "msrc_staff_" + payload.action.replaceAll("-", "_"),
          { edition_key: config.editionKey, ...(payload.action === "early-access-add" ? { emails: payload.emails } : { entry_ids: payload.entryIds }) }, session.accessToken);
        if (read === missingRpc) return respond({ state: "area-not-ready" }, 503);
        if (record(read)?.state === "denied") return respond({ state: "denied" }, 403);
        const result = payload.action === "early-access-add" ? earlyAccessAddResult(read, payload.emails!) : earlyAccessRemoveResult(read, payload.entryIds!);
        return result ? respond({ state: "updated", ...result }) : respond({ state: "unavailable" }, 503);
      }
      if (payload.action === "priority-set" || payload.action === "priority-remove") {
        const own = await profile(config, backend, session, observed);
        if (!own || !canReadStaffArea(own.roles, "priority") || observed.authenticationTier !== "super_admin" || !observed.mfaValid) return respond({ state: "denied" }, 403);
        const claims = verifiedPriorityClaims(session, now);
        if (!claims) return respond({ state: "denied" }, 403);
        const result = record(await backend.rpc("msrc_registration_priority_set", { edition_key: config.editionKey, session_claims: claims,
          target_actor: payload.targetId, active: payload.action === "priority-set", reason: payload.reason }));
        return result?.state === "updated" ? respond({ state: "updated" })
          : result?.state === "denied" ? respond({ state: "denied" }, 403) : respond({ state: "unavailable" }, 503);
      }
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
      if (payload.action === "reveal-identity") return respond({ state: "denied" }, 403);
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
    } catch { return respond({ state: "unavailable" }, 503, passwordAttempted ? staffCookie(config, null, now) : undefined); }
  };
}
export const handleStaffRequest = createStaffHandler();
export async function staffPageReady(config: StaffConfig): Promise<boolean> {
  try { return await ready(config, createStaffBackend(config)); } catch { return false; }
}
/** Separate default-off server and database gate; contains no identity or activity read. */
export async function staffPasswordChangeReady(config: StaffConfig): Promise<boolean> {
  if (!config.passwordChangeEnabled) return false;
  try { return await passwordChangeReady(config, createStaffBackend(config)); } catch { return false; }
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
