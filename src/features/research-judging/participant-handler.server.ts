import "server-only";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantOrigin, participantUuid, readParticipantJson, readParticipantSession } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { createResearchParticipantBackend, ResearchParticipantRpcMissingError } from "./participant-backend.server";
import { decodeWinnerSupervisor, projectResearchParticipantEntries, type ResearchParticipantResponse } from "./participant-contracts";
import { readResearchParticipantFormToken, researchParticipantFormToken } from "./participant-security.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function createResearchParticipantHandler(dependencies: { readiness?: () => ParticipantReadiness; backend?: (config: ParticipantConfig) => RegistrationBackend; now?: () => number; observeOnly?: boolean } = {}) {
  return async (request: Request): Promise<Response> => {
    let changedCookie: string | undefined;
    const reply = (body: ResearchParticipantResponse, status = 200) => Response.json(body, { status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) } });
    const enabled = () => process.env.RESEARCH_JUDGING_ENABLED === "true" && (dependencies.readiness ?? getParticipantConfig)().state === "ready";
    if (!enabled()) return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)(); if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site"), url = new URL(request.url);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin || url.searchParams.size > 1 || [...url.searchParams.keys()].some((key) => key !== "locale")
      || ![null, "en", "ar"].includes(url.searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createResearchParticipantBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now); if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        if (!enabled()) return reply({ state: "closed" }, 503);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) { changedCookie = participantCookie(config, null, now); return reply({ state: "denied" }, 401); }
        session = { ...session, ...refreshed }; changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now); if (!claims) return reply({ state: "denied" }, 401);
      const args = { edition_key: config.editionKey, session_claims: claims };
      const gate = (value: unknown) => {
        const state = record(value)?.state;
        if (state === "denied") return reply({ state: "denied" }, 403);
        if (state === "closed" || state === "settings_incomplete") return reply({ state: "closed" }, 503);
        if (state === "area_not_ready") return reply({ state: "area-not-ready" }, 503);
        if (state === "limited") return reply({ state: "limited" }, 429);
        return null;
      };
      let outcome: Extract<ResearchParticipantResponse, { state: "ready" }>["outcome"];
      if (request.method === "POST") {
        if (dependencies.observeOnly) return reply({ state: "invalid_input" }, 405);
        let body: Record<string, unknown> | null;
        try { body = record(await readParticipantJson(request)); } catch { return reply({ state: "invalid_input" }, 400); }
        if (!body || Object.keys(body).sort().join(",") !== "action,awardId,details,formToken,operationId" || body.action !== "supervisor"
          || typeof body.awardId !== "string" || !participantUuid.test(body.awardId) || typeof body.operationId !== "string" || !participantUuid.test(body.operationId)
          || !readResearchParticipantFormToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input" }, 400);
        const details = decodeWinnerSupervisor(body.details); if (!details || !details.confirmed) return reply({ state: "invalid_input" }, 400);
        if (!enabled()) return reply({ state: "closed" }, 503);
        const result = await backend.rpc("msrc_research_event_supervisor", { ...args, award_id: body.awardId, details, operation_id: body.operationId });
        const refused = gate(result); if (refused) return refused;
        const state = record(result)?.state;
        if (!["saved", "conflict", "invalid", "locked", "not_found"].includes(String(state))) return reply({ state: "unavailable" }, 503);
        outcome = state as typeof outcome;
      }
      if (!enabled()) return reply({ state: "closed" }, 503);
      const raw = await backend.rpc("msrc_research_event_me", args), refused = gate(raw); if (refused) return refused;
      const entries = projectResearchParticipantEntries(raw); if (!entries) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", entries, formToken: researchParticipantFormToken(config, origin, session.actorId, session.sessionId, now), ...(outcome ? { outcome } : {}) }, outcome && outcome !== "saved" ? 409 : 200);
    } catch (error) { return reply({ state: error instanceof ResearchParticipantRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleResearchParticipant = createResearchParticipantHandler();
