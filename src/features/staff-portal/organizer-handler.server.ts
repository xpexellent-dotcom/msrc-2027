import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin, staffUuid } from "./security.server";
import { auditTimeline, canReadOrganizerModule, dashboardProjection, organizerExport, organizerModules, organizerRecord as record, organizerText as text, participantMatches } from "./organizer-projection.server";
import { validStaffEarlyAccessEmail } from "./validation.server";
import { ORGANIZER_AUDIT_MODULES } from "./organizer-contract";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const failures: Record<string, string> = { denied: "denied", invalid: "invalid", limited: "limited", closed: "closed", unavailable: "unavailable", area_not_ready: "area-not-ready", too_many_rows: "too-many-rows", too_large: "too-many-rows" };
/** Audit dates are inclusive Riyadh calendar dates, matching the rest of the staff console. */
function dateBound(value: unknown, end = false): string | null {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return null;
  const time = Date.parse(value + "T00:00:00+03:00") + (end ? 86400000 : 0);
  return new Date(time).toISOString();
}

/** ADM-01..04. Search terms stay in POST bodies, outside access-log URLs. */
export function createOrganizerHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)();
    if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers: privateHeaders });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request);
    let rotated: string | undefined;
    const reply = (body: Record<string, unknown>, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) },
      { status, headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || new URL(request.url).search !== "" || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))
      || request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (request.method !== "POST") return reply({ state: "invalid" }, 405);
    try {
      const backend = (dependencies.backend ?? createStaffBackend)(config);
      const status = record(await backend.rpc("msrc_staff_status"));
      if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403);
        session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now);
      }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      let input: Record<string, unknown> | null;
      try { input = record(await readStaffJson(request)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const roles = authority.profile.roles, superAdmin = roles.includes("superAdmin") && authority.context.authenticationTier === "super_admin" && authority.context.mfaValid;
      const keys = (...allowed: string[]) => Object.keys(input).every((key) => ["action", "formToken", ...allowed].includes(key));
      const action = input.action;
      if (!["dashboard", "find", "export", "audit"].includes(String(action))) return reply({ state: "invalid" }, 400);
      if ((action === "find" || action === "audit" || action === "export" && input.kind === "personal") && !superAdmin) return reply({ state: "denied" }, 403);
      let rpcName = "msrc_staff_dashboard", args: Record<string, unknown> = { edition_key: config.editionKey };
      const moduleFilter = input.module ?? "all", kind = input.kind ?? "aggregate";
      if (action === "dashboard" && !keys()) return reply({ state: "invalid" }, 400);
      if (action === "find") {
        if (!keys("query") || !text(input.query, 254) || !(validStaffEarlyAccessEmail(input.query) || /^[A-Za-z0-9][A-Za-z0-9_-]{1,159}$/.test(input.query))) return reply({ state: "invalid" }, 400);
        rpcName += "_find"; args.query = input.query;
      }
      if (action === "export") {
        if (!keys("module", "kind", "status") || typeof moduleFilter !== "string" || moduleFilter !== "all" && !organizerModules.includes(moduleFilter as typeof organizerModules[number])
          || !["aggregate", "operational", "personal"].includes(String(kind)) || kind !== "aggregate" && moduleFilter === "all"
          || kind === "aggregate" && input.status !== undefined && input.status !== "all"
          || input.status !== undefined && (!text(input.status, 100) || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.status))) return reply({ state: "invalid" }, 400);
        if (moduleFilter !== "all" && !canReadOrganizerModule(roles, moduleFilter)) return reply({ state: "denied" }, 403);
        rpcName += "_export"; args = { ...args, module_filter: moduleFilter, export_kind: kind, status_filter: input.status ?? "all" };
      }
      if (action === "audit") {
        const from = dateBound(input.from), to = dateBound(input.to, true);
        if (!keys("module", "actor", "event", "from", "to", "offset") || typeof moduleFilter !== "string"
          || moduleFilter !== "all" && !ORGANIZER_AUDIT_MODULES.includes(moduleFilter as typeof ORGANIZER_AUDIT_MODULES[number])
          || input.actor !== undefined && input.actor !== "" && (typeof input.actor !== "string" || !staffUuid.test(input.actor))
          || input.event !== undefined && (!text(input.event, 100) || !/^[a-zA-Z0-9_.-]*$/.test(input.event))
          || input.from !== undefined && input.from !== "" && !from || input.to !== undefined && input.to !== "" && !to
          || from && to && from >= to || input.offset !== undefined && (!Number.isSafeInteger(input.offset) || Number(input.offset) < 0 || Number(input.offset) > 10000)) return reply({ state: "invalid" }, 400);
        rpcName += "_audit"; args = { ...args, module_filter: moduleFilter, actor_filter: input.actor || null, action_filter: input.event ?? "",
          from_at: from, to_at: to, offset_rows: input.offset ?? 0 };
      }
      const admission = record(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }));
      if (admission?.state !== "claimed") return reply({ state: "limited" }, 429);
      if ((dependencies.readiness ?? getStaffConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      // PostgREST missing-function errors become area-not-ready, allowing code to ship before its migration.
      const data = record(await backend.rpc(rpcName, args, session.accessToken));
      if (!data || typeof data.state !== "string") return reply({ state: "unavailable" }, 503);
      if (Object.hasOwn(failures, data.state)) return reply({ state: failures[data.state] }, data.state === "denied" ? 403 : data.state === "invalid" ? 400 : data.state === "limited" ? 429 : ["too_many_rows", "too_large"].includes(data.state) ? 409 : 503);
      if (data.state !== "ready") return reply({ state: "unavailable" }, 503);
      if (action === "dashboard") { const dashboard = dashboardProjection(data.dashboard, roles); return dashboard ? reply({ state: "ready", dashboard }) : reply({ state: "unavailable" }, 503); }
      if (action === "find") { const matches = participantMatches(data.matches); return matches ? reply({ state: "ready", matches }) : reply({ state: "unavailable" }, 503); }
      if (action === "audit") { const events = auditTimeline(data.events); return events && typeof data.hasMore === "boolean" ? reply({ state: "ready", events, hasMore: data.hasMore }) : reply({ state: "unavailable" }, 503); }
      const csv = organizerExport(data, String(kind), roles, String(moduleFilter)); if (csv === null) return reply({ state: "unavailable" }, 503);
      return new Response(csv, { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="msrc-${moduleFilter}-${kind}.csv"`,
        "X-MSRC-Form-Token": staffFormToken(config, origin, now), ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleOrganizerRequest = createOrganizerHandler();
