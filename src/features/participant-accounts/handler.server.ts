import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { after } from "next/server";
import { parsePersistedSessionContext } from "@/lib/supabase/session.server";
import type { Locale } from "@/lib/i18n";
import { createParticipantBackend, type ParticipantBackend, type NativeParticipantSession } from "./backend.server";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "./config.server";
import type { ParticipantPayload, ParticipantProfile, ParticipantResponse } from "./contracts";
import { participantNotice } from "./privacy.server";
import { nativeTokenNeedsRefresh, participantCookie, participantFormToken, participantHash, participantIp, participantOrigin,
  participantUuid, readParticipantFormToken, readParticipantJson, readParticipantSession, type ParticipantSessionCookie } from "./security.server";
import { validateParticipantPayload } from "./validation.server";
import type { ParticipantCodePurpose } from "./email.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function state(value: unknown, expected: string): boolean { return record(value)?.state === expected; }
function reply(body: ParticipantResponse, status = 200, cookie?: string): Response {
  return Response.json(body, { status, headers: { ...privateHeaders, ...(cookie ? { "Set-Cookie": cookie } : {}),
    ...(body.retryAfterSeconds ? { "Retry-After": String(body.retryAfterSeconds) } : {}) } });
}
async function ready(config: ParticipantConfig, backend: ParticipantBackend): Promise<boolean> {
  const result = record(await backend.rpc("msrc_participant_status"));
  // Installed controls and the independent cleanup activation are both required.
  // An older hosted schema cannot become ready from an application flag alone.
  return result?.enabled === true && result.ageEnforcementReady === true && result.retentionEnforcementReady === true
    && result.cleanupEnabled === true
    && result.privacyVersion === participantNotice("en", config.testMode)?.version
    && result.emailDailyLimit === config.emailDailyLimit;
}
async function ownProfile(config: ParticipantConfig, backend: ParticipantBackend, native: NativeParticipantSession, now: number) {
  if (await backend.identity(native.accessToken) !== native.actorId) return null;
  const context = parsePersistedSessionContext(await backend.rpc("msrc_session_context", { edition_key: config.editionKey }, native.accessToken), native.actorId, config.editionKey);
  if (!context || !context.sessionPolicySatisfied || context.authenticationTier !== "participant"
    || context.principal.sessionId !== native.sessionId || context.timing.absoluteExpiresAtMs <= now) return null;
  const value = record(await backend.rpc("msrc_participant_profile", { edition_key: config.editionKey }, native.accessToken));
  if (!value || Object.keys(value).sort().join(",") !== "accountState,name,operationalAccessReady,schemaVersion,session"
    || value.schemaVersion !== 1 || value.accountState !== "verified" || value.operationalAccessReady !== false
    || typeof value.name !== "string" || value.name.length < 1 || value.name.length > 120) return null;
  const observed = parsePersistedSessionContext(value.session, native.actorId, config.editionKey);
  if (!observed || !observed.sessionPolicySatisfied || observed.authenticationTier !== "participant"
    || observed.principal.sessionId !== native.sessionId || observed.timing.absoluteExpiresAtMs !== context.timing.absoluteExpiresAtMs) return null;
  return { profile: { name: value.name, accountState: "verified" } as ParticipantProfile, deadline: context.timing.absoluteExpiresAtMs };
}

export function createParticipantHandler(dependencies: {
  readiness?: () => ParticipantReadiness;
  backend?: (config: ParticipantConfig) => ParticipantBackend;
  now?: () => number;
  defer?: (work: () => Promise<void>) => void;
} = {}) {
  const getReadiness = dependencies.readiness ?? getParticipantConfig;
  const getBackend = dependencies.backend ?? createParticipantBackend;
  const clock = dependencies.now ?? Date.now;
  const defer = dependencies.defer ?? after;
  return async function handle(request: Request): Promise<Response> {
    // Before accessing headers/body or creating a provider client: closed means no collection or native user creation.
    const readiness = getReadiness();
    if (readiness.state !== "ready") return reply({ state: readiness.state }, 503);
    const config = readiness.config;
    const origin = participantOrigin(config, request);
    const site = request.headers.get("sec-fetch-site");
    if (!origin || (site && !["same-origin", "none"].includes(site))
      || (request.headers.get("origin") && request.headers.get("origin") !== origin)
      || (request.method === "POST" && request.headers.get("origin") !== origin)) return reply({ state: "invalid_input" }, 400);
    if (!["GET", "POST", "HEAD"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    const now = clock();
    const backend = getBackend(config);
    try { if (!await ready(config, backend)) return reply({ state: "closed" }, 503); }
    catch { return reply({ state: "unavailable" }, 503); }
    if (request.method === "HEAD") return new Response(null, { headers: privateHeaders });
    const fresh = () => participantFormToken(config, origin, now);
    if (request.method === "GET") {
      const localeValue = new URL(request.url).searchParams.get("locale");
      if (localeValue !== null && localeValue !== "en" && localeValue !== "ar") return reply({ state: "invalid_input" }, 400);
      const locale: Locale = localeValue === "ar" ? "ar" : "en";
      let cookie = readParticipantSession(config, request, now);
      try {
        let changed = false;
        if (cookie && nativeTokenNeedsRefresh(cookie.accessToken, now)) {
          const refreshed = await backend.refresh(cookie.refreshToken);
          if (!refreshed || refreshed.actorId !== cookie.actorId || refreshed.sessionId !== cookie.sessionId) cookie = null;
          else { cookie = { ...cookie, ...refreshed }; changed = true; }
        }
        const own = cookie && await ownProfile(config, backend, cookie, now);
        const allowed = cookie && own?.deadline === cookie.deadline ? own : null;
        if (cookie && !allowed) cookie = null;
        return reply({ state: allowed ? "authenticated" : "ready", notice: participantNotice(locale, config.testMode),
          profile: allowed?.profile ?? null, formToken: fresh() }, 200, changed && cookie ? participantCookie(config, cookie, now)
            : !cookie && request.headers.get("cookie") ? participantCookie(config, null, now) : undefined);
      } catch { return reply({ state: "unavailable", formToken: fresh() }, 503); }
    }
    const respond = (result: ParticipantResponse, status = 200, cookie?: string) => reply({ ...result, formToken: fresh() }, status, cookie);
    let payload: ParticipantPayload;
    try {
      const parsed = validateParticipantPayload(await readParticipantJson(request));
      if (!parsed.ok) return respond({ state: "invalid_input", fieldErrors: parsed.fieldErrors }, 400);
      payload = parsed.value;
    } catch { return respond({ state: "invalid_input" }, 400); }
    const nonce = readParticipantFormToken(config, payload.formToken, origin, now);
    const ip = participantIp(config, request);
    if (!nonce || !ip || payload.website) return respond({ state: "invalid_input" }, 400);
    const ipHash = participantHash(config, "ip", ip);
    try {
      if (!state(await backend.rpc("msrc_participant_form_claim", { nonce_hash: participantHash(config, "nonce", nonce), ip_hash: ipHash }), "claimed"))
        return respond({ state: "limited", retryAfterSeconds: 60 }, 429);
    } catch { return respond({ state: "unavailable" }, 503); }
    const issuing = ["signup", "resend", "forgot"].includes(payload.action);
    const challengeId = randomUUID();
    const accepted = () => respond({ state: "accepted", requestId: challengeId,
      expiresAt: new Date(now + 600_000).toISOString(), resendAvailableAt: new Date(now + 60_000).toISOString() }, 202);
    try {
      // Recheck the mutable flag/readiness directly before any identity or delivery operation.
      if (getReadiness().state !== "ready" || !await ready(config, backend)) return respond({ state: "closed" }, 503);
      if (issuing) {
        // Identical acknowledgement precedes every account lookup, hash and email
        // attempt. Next/Vercel keeps this bounded work alive after the response.
        defer(async () => {
          try {
            if (getReadiness().state !== "ready" || !await ready(config, backend)) return;
            if (payload.action === "signup") {
              const actorId = randomUUID(), reservationId = randomUUID();
              const admission = await backend.rpc("msrc_participant_signup_reserve", { actor_id: actorId, reservation_id: reservationId,
                email: payload.email!, name: payload.name!, privacy_version: participantNotice("en", config.testMode)!.version,
                age_confirmed: payload.ageConfirmed === true });
              if (state(admission, "reserved")) await backend.createUser({ actorId, reservationId, email: payload.email!, name: payload.name!, password: payload.password! });
            }
            const purpose: ParticipantCodePurpose = payload.action === "forgot" ? "reset_password" : "verify_email";
            const code = String(randomInt(1_000_000)).padStart(6, "0");
            const result = record(await backend.rpc("msrc_participant_email_begin", { email: payload.email!, purpose,
              challenge_id: challengeId, code_hash: participantHash(config, "code", purpose + ":" + challengeId + ":" + code),
              email_hash: participantHash(config, "email", payload.email!), ip_hash: ipHash,
              name: purpose === "verify_email" ? payload.name || null : null,
              privacy_version: purpose === "verify_email" ? participantNotice("en", config.testMode)!.version : null }));
            if (result?.state === "issued" && result.challengeId === challengeId && result.recipient === payload.email
              && getReadiness().state === "ready" && await ready(config, backend)) {
              const delivered = await backend.deliver(payload.email!, code, purpose, challengeId);
              await backend.rpc("msrc_participant_email_delivery", { challenge_id: challengeId, delivered });
            }
          } catch { /* Generic acknowledgement never promises account or delivery success. */ }
        });
        return accepted();
      }
      if (payload.action === "verify" || payload.action === "reset") {
        const purpose: ParticipantCodePurpose = payload.action === "verify" ? "verify_email" : "reset_password";
        const operationId = randomUUID();
        const proof = record(await backend.rpc("msrc_participant_email_consume", { email: payload.email!, purpose,
          challenge_id: payload.requestId!, code_hash: participantHash(config, "code", purpose + ":" + payload.requestId + ":" + payload.code),
          operation_id: operationId, ip_hash: ipHash }));
        if (proof?.state !== "consumed" || proof.operationId !== operationId || typeof proof.actorId !== "string"
          || !participantUuid.test(proof.actorId) || proof.recipient !== payload.email) return respond({ state: "invalid_code" }, 400);
        let succeeded = false;
        try { if (getReadiness().state === "ready" && await ready(config, backend)) succeeded = await backend.updateUser(proof.actorId, payload.password!, payload.action === "verify"); }
        finally { const completion = await backend.rpc("msrc_participant_email_complete", { operation_id: operationId, succeeded }); succeeded = succeeded && state(completion, "completed"); }
        return succeeded ? respond({ state: payload.action === "verify" ? "verified" : "password_reset" }, 200, participantCookie(config, null, now))
          : respond({ state: "invalid_code" }, 400);
      }
      if (payload.action === "signin") {
        const attemptId = randomUUID();
        if (!state(await backend.rpc("msrc_participant_login_begin", { attempt_id: attemptId,
          email_hash: participantHash(config, "email", payload.email!), ip_hash: ipHash }), "allowed")) return respond({ state: "limited", retryAfterSeconds: 900 }, 429);
        let native: NativeParticipantSession | null = null;
        try { native = await backend.login(payload.email!, payload.password!); }
        finally {
          const finished = await backend.rpc("msrc_participant_login_finish", { attempt_id: attemptId, actor_id: native?.actorId ?? null, session_id: native?.sessionId ?? null });
          if (!state(finished, "admitted")) { if (native) await backend.logout(native.accessToken); native = null; }
        }
        if (!native) return respond({ state: "invalid_credentials" }, 401);
        const own = await ownProfile(config, backend, native, now);
        if (!own) { await backend.logout(native.accessToken); return respond({ state: "invalid_credentials" }, 401); }
        const session: ParticipantSessionCookie = { ...native, deadline: own.deadline, origin };
        return respond({ state: "authenticated", profile: own.profile }, 200, participantCookie(config, session, now));
      }
      if (payload.action === "logout") {
        const cleared = participantCookie(config, null, now);
        try {
          const native = readParticipantSession(config, request, now);
          if (native) {
            const revoked = await backend.rpc("msrc_session_logout", { edition_key: config.editionKey }, native.accessToken);
            const loggedOut = await backend.logout(native.accessToken);
            if (revoked !== true || !loggedOut) return respond({ state: "unavailable" }, 503, cleared);
          }
          return respond({ state: "signed_out" }, 200, cleared);
        } catch {
          return respond({ state: "unavailable" }, 503, cleared);
        }
      }
      return respond({ state: "invalid_input" }, 400);
    } catch { return issuing ? accepted() : respond({ state: "unavailable" }, 503); }
  };
}

export const handleParticipantRequest = createParticipantHandler();
export async function participantPageReady(config: ParticipantConfig): Promise<boolean> {
  try { return await ready(config, createParticipantBackend(config)); } catch { return false; }
}
/** RSC renders never rotate refresh tokens: only API GET can attach the new encrypted cookie. */
export async function observeParticipantPage(request: Request, config: ParticipantConfig): Promise<ParticipantProfile | null> {
  const cookie = readParticipantSession(config, request);
  if (!cookie || nativeTokenNeedsRefresh(cookie.accessToken)) return null;
  try { const backend = createParticipantBackend(config);
    if (!await ready(config, backend)) return null;
    const own = await ownProfile(config, backend, cookie, Date.now());
    return own?.deadline === cookie.deadline ? own.profile : null;
  } catch { return null; }
}
