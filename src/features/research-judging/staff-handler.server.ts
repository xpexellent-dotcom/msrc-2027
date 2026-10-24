import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import { projectResearchResponse, record, researchActionAllowed, researchSuccess, text, uuid, validateResearchPayload, type ResearchResponse } from "./staff-contract";
export { projectResearchResponse, decodeResearchSettings } from "./staff-contract";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function createStaffResearchEventHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    if (process.env.RESEARCH_JUDGING_ENABLED !== "true") return Response.json({ state: "closed" }, { status: 503, headers: privateHeaders });
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers: privateHeaders });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: ResearchResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = record(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const fresh = await backend.refresh(session.refreshToken); if (!fresh || fresh.actorId !== session.actorId || fresh.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...fresh }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now); if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, admin = roles.includes("superAdmin"), science = roles.includes("scientificAdministrator"), committee = roles.includes("judgingCommittee"), judge = roles.includes("facultyJudge"), query = new URL(request.url).searchParams;
      const deliver = async (view: string, name: string, args: Record<string, unknown>) => {
        if (process.env.RESEARCH_JUDGING_ENABLED !== "true" || (dependencies.readiness ?? getStaffConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        const value = projectResearchResponse(view, await backend.rpc(name, { edition_key: config.editionKey, ...args }, session.accessToken), admin || science);
        if (!value) return reply({ state: "unavailable" }, 503);
        return reply(value, researchSuccess(value.state) ? 200 : value.state === "denied" ? 403 : value.state === "limited" ? 429 : ["closed", "unavailable", "area-not-ready"].includes(value.state) ? 503 : 409);
      };
      if (request.method === "GET") {
        const view = query.get("view"); if (query.size !== 1 || !view || !["settings", "list", "judge_queue"].includes(view)) return reply({ state: "invalid" }, 400);
        if (!(view === "judge_queue" ? judge || admin : admin || science || committee)) return reply({ state: "denied" }, 403);
        return await deliver(view, "msrc_staff_research_event_read", { view });
      }
      let input: Record<string, unknown> | null = null; try { input = record(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      if (!input || query.size || Object.keys(input).sort().join(",") !== ["action", "formToken", "operationId", "payload"].sort().join(",") || !text(input.action, 50) || !uuid(input.operationId)) return reply({ state: "invalid" }, 400);
      if (!researchActionAllowed(input.action, roles)) return reply({ state: "denied" }, 403);
      const payload = validateResearchPayload(input.action, input.payload), nonce = readStaffFormToken(config, input.formToken, origin, now), ip = staffIp(config, request); if (!payload || !nonce || !ip) return reply({ state: "invalid" }, 400);
      if (record(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }))?.state !== "claimed") return reply({ state: "limited" }, 429);
      return await deliver("mutation", "msrc_staff_research_event_write", { action: input.action, payload, operation_id: input.operationId });
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleStaffResearchEvent = createStaffResearchEventHandler();
