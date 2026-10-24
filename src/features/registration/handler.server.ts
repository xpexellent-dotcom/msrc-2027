import "server-only";
import { randomUUID } from "node:crypto";
import { currentPolicyVersion } from "@/content/policies";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { participantNotice } from "@/features/participant-accounts/privacy.server";
import { nativeTokenNeedsRefresh, participantCookie, participantHash, participantIp, participantOrigin, participantUuid,
  readParticipantJson, readParticipantSession } from "@/features/participant-accounts/security.server";
import { assertWorkflowOpen, type RegistrationGateEvidence } from "@/lib/workflows.server";
import { createRegistrationBackend, RegistrationRpcMissingError, type RegistrationBackend } from "./backend.server";
import type { RegistrationRequest, RegistrationResponse } from "./contracts";
import { normalizeIdentityNumber, type IdentityDocumentType } from "./identity-number";
import { readRegistrationFormToken, registrationFormToken } from "./security.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const closed = () => Response.json({ error: { code: "WORKFLOW_CLOSED", workflow: "registration" } }, { status: 503, headers: privateHeaders });
function reply(body: RegistrationResponse, status = 200) { return Response.json(body, { status, headers: privateHeaders }); }
function requestSummary(value: unknown): RegistrationRequest | null {
  const row = record(value);
  if (!row || Object.keys(row).sort().join(",") !== "createdAt,id,status" || typeof row.id !== "string" || !participantUuid.test(row.id)
    || typeof row.status !== "string" || !["pending_approval", "approved", "approved_awaiting_payment", "waitlisted", "offered", "confirmed", "cancelled", "expired"].includes(row.status)
    || typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt))) return null;
  return { id: row.id, status: row.status, createdAt: row.createdAt };
}
export async function participantReady(config: ParticipantConfig, backend: RegistrationBackend) {
  const value = record(await backend.rpc("msrc_participant_status"));
  return value?.enabled === true && value.ageEnforcementReady === true && value.retentionEnforcementReady === true
    && value.cleanupEnabled === true && value.privacyVersion === participantNotice("en", config.testMode)?.version
    && value.emailDailyLimit === config.emailDailyLimit;
}

/** Tokens are decoded only after getUser verified their identity; editable metadata is discarded. */
export function verifiedClaims(token: string, actorId: string, sessionId: string, now: number): Record<string, unknown> | null {
  try {
    const value = record(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")));
    if (!value || value.sub !== actorId || value.session_id !== sessionId || value.role !== "authenticated"
      || !Number.isSafeInteger(value.exp) || Number(value.exp) * 1000 <= now || value.aal !== "aal1"
      || !Array.isArray(value.amr) || !value.amr.some((entry) => record(entry)?.method === "password")) return null;
    return { sub: value.sub, session_id: value.session_id, role: value.role, aal: value.aal, amr: value.amr, exp: value.exp,
      ...(typeof value.iat === "number" ? { iat: value.iat } : {}), ...(typeof value.email === "string" ? { email: value.email } : {}) };
  } catch { return null; }
}

export function createRegistrationHandler(dependencies: {
  readiness?: () => ParticipantReadiness;
  backend?: (config: ParticipantConfig) => RegistrationBackend;
  now?: () => number;
  observeOnly?: boolean;
} = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const finish = (response: Response) => { if (changedCookie) response.headers.set("Set-Cookie", changedCookie); return response; };
    const respond = (body: RegistrationResponse, status = 200) => finish(reply(body, status));
    const gateClosed = () => finish(closed());
    // Preserve the pre-existing 503 payload before visitor headers/body or provider construction.
    if (process.env.REGISTRATION_ENABLED !== "true") return gateClosed();
    const readiness = (dependencies.readiness ?? getParticipantConfig)();
    if (readiness.state !== "ready") return gateClosed();
    const config = readiness.config, now = (dependencies.now ?? Date.now)();
    const origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin) return respond({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createRegistrationBackend)(config);
    try {
      if (!await participantReady(config, backend)) return gateClosed();
      const status = record(await backend.rpc("msrc_registration_status", { edition_key: config.editionKey }));
      if (status?.enabled !== true || status.participantAccountsReady !== true || status.settingsComplete !== true) return gateClosed();
      let session = readParticipantSession(config, request, now);
      if (!session) return respond({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        // RSC observes only. The browser GET can attach a rotated cookie; neither path restarts the absolute deadline.
        if (dependencies.observeOnly) return respond({ state: "denied" }, 401);
        if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return gateClosed();
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) {
          changedCookie = participantCookie(config, null, now);
          return respond({ state: "denied" }, 401);
        }
        session = { ...session, ...refreshed };
        changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return respond({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now);
      if (!claims) return respond({ state: "denied" }, 401);
      const context = record(await backend.rpc("msrc_registration_context", { edition_key: config.editionKey, session_claims: claims }));
      if (!context || context.state !== "open" || context.termsVersion !== currentPolicyVersion) return gateClosed();
      try { assertWorkflowOpen("registration", context as unknown as RegistrationGateEvidence); } catch { return gateClosed(); }
      if (!["GET", "HEAD", "POST"].includes(request.method)) return respond({ state: "invalid_input" }, 405);
      const summary = context.request === null ? null : requestSummary(context.request);
      if (context.request !== null && !summary) return respond({ state: "unavailable" }, 503);
      if (request.method === "HEAD") return finish(new Response(null, { headers: privateHeaders }));
      const currentSession = session;
      const fresh = () => registrationFormToken(config, origin, currentSession.actorId, currentSession.sessionId, now);
      if (request.method === "GET") {
        if (Array.from(new URL(request.url).searchParams.keys()).some((key) => key !== "locale")
          || ![null, "en", "ar"].includes(new URL(request.url).searchParams.get("locale"))) return respond({ state: "invalid_input" }, 400);
        return respond({ state: summary ? "submitted" : "ready", request: summary, termsVersion: currentPolicyVersion, formToken: fresh() });
      }
      let value: Record<string, unknown> | null;
      try { value = record(await readParticipantJson(request)); } catch { return respond({ state: "invalid_input", formToken: fresh() }, 400); }
      if (!value || Object.keys(value).sort().join(",") !== "documentNumber,documentType,formToken,termsAccepted,termsVersion,website"
        || !["national_id", "iqama", "passport"].includes(String(value.documentType)) || typeof value.documentNumber !== "string"
        || value.termsAccepted !== true || value.termsVersion !== currentPolicyVersion || value.website !== "") return respond({ state: "invalid_input", formToken: fresh() }, 400);
      const type = value.documentType as IdentityDocumentType, number = normalizeIdentityNumber(type, value.documentNumber);
      const tokenValid = readRegistrationFormToken(config, value.formToken, origin, session.actorId, session.sessionId, now), ip = participantIp(config, request);
      if (!number || !tokenValid || !ip) return respond({ state: "invalid_input", formToken: fresh() }, 400);
      // Fresh per-attempt nonce retains aggregate IP limits while allowing identical signed-form retries.
      const claim = record(await backend.rpc("msrc_participant_form_claim", { nonce_hash: participantHash(config, "nonce", randomUUID()), ip_hash: participantHash(config, "ip", ip) }));
      if (claim?.state !== "claimed") return respond({ state: "limited", formToken: fresh() }, 429);
      // Closing the server flag during an in-flight request prevents collection. The RPC rechecks DB policy and time atomically.
      if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return gateClosed();
      const result = record(await backend.rpc("msrc_registration_submit", { edition_key: config.editionKey, session_claims: claims,
        document_type: type, document_number: number, terms_version: currentPolicyVersion }));
      if (result?.state === "closed") return gateClosed();
      if (result?.state === "denied") return respond({ state: "denied", formToken: fresh() }, 403);
      if (result?.state === "conflict") return respond({ state: "invalid_input", formToken: fresh() }, 400);
      const submitted = requestSummary(result?.request);
      return result?.state === "submitted" && submitted ? respond({ state: "submitted", request: submitted, formToken: fresh(), termsVersion: currentPolicyVersion })
        : respond({ state: "unavailable", formToken: fresh() }, 503);
    } catch (error) { return respond({ state: error instanceof RegistrationRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}

export const handleRegistrationRequest = createRegistrationHandler();
