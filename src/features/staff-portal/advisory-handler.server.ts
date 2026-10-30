import "server-only";
import { decodeScreeningInput } from "./screening-contract";
import { ABSTRACT_RUBRIC } from "./abstract-rubric";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "./security.server";
import { researchInteger, researchRecord, researchUuid } from "./research-contract";
import { decodeAdvisoryResponse, decodeAdvisorySettings, type AdvisoryResponse } from "./advisory-contract";
import { resolveAdvisoryWorkerConfig } from "@/lib/jobs/advisory-config.server";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function createAdvisoryHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number; env?: Readonly<Record<string, string | undefined>> } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: AdvisoryResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = researchRecord(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, staff = roles.includes("scientificAdministrator") || roles.includes("superAdmin"), reviewer = roles.includes("abstractReviewer");
      if ((!staff && !reviewer) || reviewer) return reply({ state: "denied" }, 403);
      const runtimeReady = resolveAdvisoryWorkerConfig(dependencies.env ?? process.env) !== null;
      const rpc = async (name: string, args: Record<string, unknown> = {}) => {
        const decoded = decodeAdvisoryResponse(name, await backend.rpc("msrc_staff_advisory_" + name, { edition_key: config.editionKey, ...args }, session.accessToken));
        if (!decoded) return reply({ state: "unavailable" }, 503);
        return reply({ ...decoded, ...((name === "workspace" || name === "submission") ? { runtimeReady } : {}) }, ["ready", "updated", "queued"].includes(decoded.state) ? 200 : decoded.state === "denied" ? 403 : decoded.state === "limited" ? 429 : decoded.state === "unavailable" || decoded.state === "area-not-ready" ? 503 : 409);
      };
      if (request.method === "GET") {
        const query = new URL(request.url).searchParams, area = query.get("area");
        if (query.size === 1 && (area === "workspace" || area === "calibration")) return staff ? await rpc(area) : reply({ state: "denied" }, 403);
        if (query.size === 2 && area === "submission" && researchUuid(query.get("submissionId"))) return staff ? await rpc("submission", { submission_id: query.get("submissionId") }) : reply({ state: "denied" }, 403);
        if (query.size === 2 && area === "reviewer" && researchUuid(query.get("assignmentId"))) return reply({ state: "denied" }, 403);
        return reply({ state: "invalid" }, 400);
      }
      if (!staff) return reply({ state: "denied" }, 403);
      let input: Record<string, unknown> | null; try { input = researchRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request); if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const keys = (...allowed: string[]) => Object.keys(input).every(key => ["action", "formToken", ...allowed].includes(key));
      let name: "save_settings" | "start" | "confirm_item" | "confirm_screening", args: Record<string, unknown>;
      if (input.action === "save-settings") {
        const settings = decodeAdvisorySettings(input.settings); if (!settings || !researchInteger(input.version) || !keys("version", "settings")) return reply({ state: "invalid" }, 400);
        name = "save_settings"; args = { expected_version: input.version, configuration: settings };
      } else if (input.action === "start") {
        if (!keys("operationId", "submissionIds") || !researchUuid(input.operationId) || !Array.isArray(input.submissionIds) || input.submissionIds.length < 1 || input.submissionIds.length > 1000 || !input.submissionIds.every(researchUuid) || new Set(input.submissionIds).size !== input.submissionIds.length) return reply({ state: "invalid" }, 400);
        if (!runtimeReady) return reply({ state: "disabled" }, 409);
        name = "start"; args = { operation_id: input.operationId, submission_ids: input.submissionIds };
      } else if (input.action === "confirm-item") {
        if (!keys("advisoryId", "item", "score", "note", "operationId") || !researchUuid(input.advisoryId) || !researchUuid(input.operationId) || !ABSTRACT_RUBRIC.some(r => r.id === input.item) || !researchInteger(input.score,1) || input.score > 4 || typeof input.note !== "string" || !input.note.trim() || input.note.length > 1000) return reply({ state: "invalid" }, 400);
        name = "confirm_item"; args = { advisory_id: input.advisoryId, item_key: input.item, score: input.score, note: input.note, operation_id: input.operationId };
      } else if (input.action === "confirm-screening") {
        const screening = decodeScreeningInput(input.screening);
        if (!keys("submissionId","version","sequence","operationId","screening","advisoryId","items") || !screening || !researchUuid(input.submissionId) || !researchUuid(input.advisoryId) || !researchUuid(input.operationId) || !researchInteger(input.version,1) || !researchInteger(input.sequence) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 6 || !input.items.every(k => typeof k === "string" && /^G[1-6]$/.test(k)) || new Set(input.items).size !== input.items.length) return reply({ state: "invalid" }, 400);
        name = "confirm_screening"; args = { submission_id: input.submissionId, expected_version: input.version, expected_sequence: input.sequence, operation_id: input.operationId, screening, advisory_id: input.advisoryId, items: input.items };
      } else return reply({ state: "invalid" }, 400);
      const claimed = researchRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) })); if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      return await rpc(name, args);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleAdvisoryRequest = createAdvisoryHandler();
