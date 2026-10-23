import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import { renderAnnouncementEmail } from "@/lib/email/announcement.server";
import { announcementRecord, announcementUuid, announcementVersion, decodeAnnouncement, decodeAnnouncementFields, decodeAnnouncementPreview, decodeAnnouncementSegments, type AnnouncementResponse, type AnnouncementState } from "./contracts";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const failures: Record<string, AnnouncementState> = { denied: "denied", invalid: "invalid", conflict: "conflict", not_found: "conflict", audience_changed: "audience-changed", preview_changed: "audience-changed", not_due: "not-due", area_not_ready: "area-not-ready", limited: "limited" };
export function createAnnouncementHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)();
    if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request);
    let rotated: string | undefined;
    const reply = (body: AnnouncementResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = announcementRecord(await backend.rpc("msrc_staff_status"));
      if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403);
        session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now);
      }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline || !authority.profile.roles.includes("superAdmin")) return reply({ state: "denied" }, 403);
      const rpc = async (name: string, args: Record<string, unknown> = {}) => announcementRecord(await backend.rpc(name, { edition_key: config.editionKey, ...args }, session.accessToken));
      const outcome = (data: Record<string, unknown> | null): Response => {
        if (typeof data?.state !== "string") return reply({ state: "unavailable" }, 503);
        const failure = failures[data.state];
        if (failure) return reply({ state: failure }, failure === "denied" ? 403 : failure === "limited" ? 429 : failure === "area-not-ready" ? 503 : 409);
        if (!["ready", "updated"].includes(data.state)) return reply({ state: "unavailable" }, 503);
        const result: AnnouncementResponse = { state: data.state as "ready" | "updated" };
        if (data.announcements !== undefined) {
          if (!Array.isArray(data.announcements) || data.announcements.length > 1000) return reply({ state: "unavailable" }, 503);
          const rows = data.announcements.map(decodeAnnouncement);
          if (rows.some((row) => !row || row.editionKey !== config.editionKey) || new Set(rows.map((row) => row?.id)).size !== rows.length) return reply({ state: "unavailable" }, 503);
          result.announcements = rows.filter((row) => row !== null);
          const segments = decodeAnnouncementSegments(data.segments); if (!segments) return reply({ state: "unavailable" }, 503); result.segments = segments;
        }
        if (data.announcement !== undefined) { const item = decodeAnnouncement(data.announcement); if (!item || item.editionKey !== config.editionKey) return reply({ state: "unavailable" }, 503); result.announcement = item; }
        if (data.preview !== undefined) { const preview = decodeAnnouncementPreview(data.preview); if (!preview) return reply({ state: "unavailable" }, 503); result.preview = preview; }
        return result.announcements || result.announcement || result.preview ? reply(result) : reply({ state: "unavailable" }, 503);
      };
      if (request.method === "GET") {
        if (new URL(request.url).searchParams.size) return reply({ state: "invalid" }, 400);
        return outcome(await rpc("msrc_staff_announcements_list"));
      }
      let input: Record<string, unknown> | null;
      try { input = announcementRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const keys = (...allowed: string[]) => Object.keys(input).every((key) => ["action", "formToken", ...allowed].includes(key));
      // Rendering is an authorized read; it never consumes a mutation nonce or calls the outbox.
      if (input.action === "render") {
        const fields = decodeAnnouncementFields(input.fields);
        if (!keys("fields") || !fields) return reply({ state: "invalid" }, 400);
        const rendered = renderAnnouncementEmail({ subject_en: fields.subjectEn, subject_ar: fields.subjectAr, body_en: fields.bodyEn, body_ar: fields.bodyAr });
        return reply({ state: "ready", rendered: { subject: rendered.subject, text: rendered.text, html: rendered.html } });
      }
      const claimed = announcementRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }));
      if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      if (input.action === "save") {
        const value = announcementRecord(input.input);
        if (!keys("input") || !value || !Object.keys(value).every((key) => ["id", "expectedVersion", "subjectEn", "subjectAr", "bodyEn", "bodyAr", "segments"].includes(key))) return reply({ state: "invalid" }, 400);
        const { id, expectedVersion, ...rest } = value, fields = decodeAnnouncementFields(rest);
        if (!fields || id !== undefined && (typeof id !== "string" || !announcementUuid.test(id)) || !announcementVersion(expectedVersion, id === undefined ? 0 : 1) || id === undefined && expectedVersion !== 0) return reply({ state: "invalid" }, 400);
        return outcome(await rpc("msrc_staff_announcement_save", { input: { ...fields, ...(id ? { id } : {}), expectedVersion } }));
      }
      if (typeof input.announcementId !== "string" || !announcementUuid.test(input.announcementId) || !announcementVersion(input.version)) return reply({ state: "invalid" }, 400);
      const base = { announcement_id: input.announcementId, expected_version: input.version };
      if (input.action === "preview" && keys("announcementId", "version")) return outcome(await rpc("msrc_staff_announcement_preview", base));
      if (typeof input.operationId !== "string" || !announcementUuid.test(input.operationId) || input.confirmed !== true) return reply({ state: "invalid" }, 400);
      if (input.action === "cancel" && keys("announcementId", "version", "operationId", "confirmed")) return outcome(await rpc("msrc_staff_announcement_cancel", { ...base, operation_id: input.operationId }));
      if (input.action !== "send" || !keys("announcementId", "version", "operationId", "confirmed", "previewToken", "scheduledAt") || typeof input.previewToken !== "string" || !input.previewToken || input.previewToken.length > 2048
        || input.scheduledAt !== null && (typeof input.scheduledAt !== "string" || !Number.isFinite(Date.parse(input.scheduledAt)) || Date.parse(input.scheduledAt) <= now)) return reply({ state: "invalid" }, 400);
      return outcome(await rpc("msrc_staff_announcement_send", { ...base, operation_id: input.operationId, preview_token: input.previewToken, scheduled_at: input.scheduledAt }));
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleAnnouncementRequest = createAnnouncementHandler();
