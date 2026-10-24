import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin, staffUuid } from "./security.server";
import { checkInDay } from "./check-in-contract.server";
import { decodeOfflineImport, decodeRoster, OFFLINE_IMPORT_MAX_ROWS, rosterCsv, type OfflineImportResult } from "./check-in-fallback-contract";

/** ENG-082 / CHK-05: Super Admin outage roster export and offline reconciliation import. */
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
type FallbackResponse = { state: string; result?: OfflineImportResult; formToken?: string };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function createCheckInFallbackHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: FallbackResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = record(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      // Both paths carry attendee names or create attendance, so they need a fresh Super Admin TOTP session.
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline || !authority.profile.roles.includes("superAdmin")
        || authority.context.authenticationTier !== "super_admin" || !authority.context.mfaValid) return reply({ state: "denied" }, 403);
      const failure = (state: unknown) => state === "denied" ? reply({ state: "denied" }, 403) : state === "wrong_day" ? reply({ state: "wrong-day" }, 409)
        : state === "conflict" ? reply({ state: "conflict" }, 409) : state === "invalid" ? reply({ state: "invalid" }, 400) : reply({ state: "unavailable" }, 503);
      if (request.method === "GET") {
        const query = new URL(request.url).searchParams, day = query.get("day");
        if (query.size !== 2 || query.get("area") !== "roster" || !checkInDay(day)) return reply({ state: "invalid" }, 400);
        const read = await backend.rpc("msrc_staff_checkin_roster", { edition_key: config.editionKey, day }, session.accessToken);
        const rows = decodeRoster(read, day);
        if (!rows) return failure(record(read)?.state);
        return new Response(rosterCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="checkin-roster-${day}.csv"`, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
      }
      let input: Record<string, unknown> | null; try { input = record(await readStaffJson(request)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request); if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const entries = input.entries;
      if (input.action !== "offline-import" || Object.keys(input).some((key) => !["action", "formToken", "day", "operationId", "entries"].includes(key))
        || !checkInDay(input.day) || typeof input.operationId !== "string" || !staffUuid.test(input.operationId)
        || !Array.isArray(entries) || entries.length < 1 || entries.length > OFFLINE_IMPORT_MAX_ROWS
        || !entries.every((entry) => { const row = record(entry); return !!row && Object.keys(row).length === 3 && ["reference", "time", "recorder"].every((key) => typeof row[key] === "string" && (row[key] as string).length <= 120); }))
        return reply({ state: "invalid" }, 400);
      const claimed = record(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) })); if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      const read = await backend.rpc("msrc_staff_checkin_offline_import", { edition_key: config.editionKey, day: input.day, operation_id: input.operationId, entries }, session.accessToken);
      const result = decodeOfflineImport(read, input.day, entries.length);
      return result ? reply({ state: "updated", result }) : failure(record(read)?.state);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleCheckInFallbackRequest = createCheckInFallbackHandler();
