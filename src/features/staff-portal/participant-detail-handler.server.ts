import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffSession, staffCookie, staffOrigin, staffUuid } from "./security.server";
import { decodeParticipantDetail, type ParticipantDetailResponse } from "./participant-detail-contract";

/** ENG-083: read-only participant record for Super Admins and registration/workshop administrators. */
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function createParticipantDetailHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: ParticipantDetailResponse, status = 200) => Response.json(body, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (request.method !== "GET") return reply({ state: "invalid" }, 405);
    const query = new URL(request.url).searchParams, actorId = query.get("actorId");
    if (query.size !== 1 || !actorId || !staffUuid.test(actorId)) return reply({ state: "invalid" }, 400);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = record(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline
        || !authority.profile.roles.some((role) => role === "superAdmin" || role === "registrationWorkshopAdministrator")) return reply({ state: "denied" }, 403);
      const read = record(await backend.rpc("msrc_staff_participant_detail", { edition_key: config.editionKey, target: actorId }, session.accessToken));
      if (read?.state === "denied") return reply({ state: "denied" }, 403);
      if (read?.state === "not_found") return reply({ state: "not_found" }, 404);
      const participant = read?.state === "ready" ? decodeParticipantDetail(read.participant) : null;
      return participant ? reply({ state: "ready", participant }) : reply({ state: "unavailable" }, 503);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleParticipantDetailRequest = createParticipantDetailHandler();
