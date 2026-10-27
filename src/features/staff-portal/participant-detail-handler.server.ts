import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffSession, staffCookie, staffOrigin, staffUuid } from "./security.server";
import { decodeParticipantDetail, type ParticipantDetailResponse } from "./participant-detail-contract";
import { avatarObjectPattern } from "@/features/participant-accounts/profile-backend.server";
import { downloadStaffParticipantAvatar } from "./participant-avatar.server";

/** ENG-083: read-only participant record for Super Admins and registration/workshop administrators. */
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function createParticipantDetailHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number;
  avatar?: (config: StaffConfig, object: string) => Promise<Blob | null> } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: ParticipantDetailResponse, status = 200) => Response.json(body, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (request.method !== "GET") return reply({ state: "invalid" }, 405);
    const url = new URL(request.url), avatarRequest = url.pathname.endsWith("/avatar"), query = url.searchParams, actorId = query.get("actorId");
    if (avatarRequest && process.env.PARTICIPANT_PROFILE_ENABLED !== "true") return reply({ state: "closed" }, 503);
    if (!actorId || !staffUuid.test(actorId) || (avatarRequest
      ? Array.from(query.keys()).some((key) => !["actorId", "v"].includes(key)) || query.getAll("actorId").length !== 1 || query.getAll("v").length > 1 || query.has("v") && !/^\d+$/.test(query.get("v")!)
      : query.size !== 1)) return reply({ state: "invalid" }, 400);
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
      const raw = read?.state === "ready" ? record(read.participant) : null;
      const optional = record(raw?.optionalProfile);
      const object = optional?.avatarObject;
      if (object !== undefined && object !== null && (typeof object !== "string" || !avatarObjectPattern.test(object))) return reply({ state: "unavailable" }, 503);
      if (avatarRequest) {
        if (typeof object !== "string") return new Response(null, { status: 404, headers });
        const blob = await (dependencies.avatar ?? downloadStaffParticipantAvatar)(config, object);
        if (!blob) return reply({ state: "unavailable" }, 503);
        return new Response(blob, { headers: { ...headers, "Content-Type": "image/webp", "Content-Disposition": "inline; filename=profile.webp", ...(rotated ? { "Set-Cookie": rotated } : {}) } });
      }
      const base = { ...raw };
      delete base.optionalProfile;
      const participant = raw ? decodeParticipantDetail({ ...base, ...(process.env.PARTICIPANT_PROFILE_ENABLED === "true" && optional ? { optionalProfile: {
        institution: optional.institution, status: optional.studentStatus, year: optional.studentYear, interests: optional.specialtyInterests,
        version: optional.version, specialties: optional.specialties,
        avatarUrl: object ? "/api/staff-portal/participant-detail/avatar?actorId=" + actorId + "&v=" + optional.version : null,
      } } : {}) }) : null;
      return participant ? reply({ state: "ready", participant }) : reply({ state: "unavailable" }, 503);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleParticipantDetailRequest = createParticipantDetailHandler();
