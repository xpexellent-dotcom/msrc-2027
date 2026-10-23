import "server-only";
import { randomUUID } from "node:crypto";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantHash, participantIp, participantOrigin, participantUuid,
  readParticipantJson, readParticipantSession } from "@/features/participant-accounts/security.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { createParticipantAnnouncementsBackend, ParticipantAnnouncementsRpcMissingError } from "./participant-backend.server";
import { participantAnnouncementProjection, type ParticipantAnnouncementsResponse } from "./participant-contracts";
import { announcementReadToken, validAnnouncementReadToken } from "./participant-security.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function createParticipantAnnouncementsHandler(dependencies: {
  readiness?: () => ParticipantReadiness; backend?: (config: ParticipantConfig) => RegistrationBackend;
  now?: () => number; observeOnly?: boolean;
} = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const reply = (body: ParticipantAnnouncementsResponse, status = 200) => Response.json(body, {
      status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) },
    });
    const getReadiness = dependencies.readiness ?? getParticipantConfig;
    const readiness = getReadiness();
    if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)();
    const origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site"), url = new URL(request.url);
    if (!["GET", "POST"].includes(request.method) || dependencies.observeOnly && request.method !== "GET") return reply({ state: "invalid_input" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin
      || Array.from(url.searchParams.keys()).some((key) => key !== "locale") || ![null, "en", "ar"].includes(url.searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createParticipantAnnouncementsBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        if (getReadiness().state !== "ready") return reply({ state: "closed" }, 503);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) {
          changedCookie = participantCookie(config, null, now);
          return reply({ state: "denied" }, 401);
        }
        session = { ...session, ...refreshed };
        changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now);
      if (!claims) return reply({ state: "denied" }, 401);
      let announcementId: string | null = null;
      if (request.method === "POST") {
        let body: Record<string, unknown> | null;
        try { body = record(await readParticipantJson(request)); } catch { return reply({ state: "invalid_input" }, 400); }
        const ip = participantIp(config, request);
        if (!body || Object.keys(body).sort().join(",") !== "announcementId,formToken" || typeof body.announcementId !== "string"
          || !participantUuid.test(body.announcementId) || !ip || !validAnnouncementReadToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input" }, 400);
        const claim = record(await backend.rpc("msrc_participant_form_claim", {
          nonce_hash: participantHash(config, "nonce", randomUUID()), ip_hash: participantHash(config, "ip", ip),
        }));
        if (claim?.state !== "claimed") return reply({ state: "limited" }, 429);
        announcementId = body.announcementId;
      }
      if (getReadiness().state !== "ready") return reply({ state: "closed" }, 503);
      const raw = await backend.rpc("msrc_participant_announcements", { edition_key: config.editionKey, session_claims: claims,
        announcement_id: announcementId, mark_read: announcementId !== null });
      const state = record(raw)?.state;
      if (state === "denied") return reply({ state: "denied" }, 403);
      if (state === "closed") return reply({ state: "closed" }, 503);
      if (state === "area_not_ready") return reply({ state: "area-not-ready" }, 503);
      const announcements = participantAnnouncementProjection(raw);
      if (!announcements) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", announcements, formToken: announcementReadToken(config, origin, session.actorId, session.sessionId, now) });
    } catch (error) {
      return reply({ state: error instanceof ParticipantAnnouncementsRpcMissingError ? "area-not-ready" : "unavailable" }, 503);
    }
  };
}
export const handleParticipantAnnouncements = createParticipantAnnouncementsHandler();
