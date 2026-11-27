import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import type { Role } from "@/lib/permissions/contract";
import { decodeWorkshopStaffPayload, decodeWorkshopStaffView, workshopRecord, workshopStaffMutationSucceeded, type WorkshopStaffOverview, type WorkshopStaffResponse } from "./staff-contract";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const failures = new Set(["closed", "denied", "invalid", "conflict", "full", "not_found", "expired", "overlap", "ineligible", "registration_required", "capacity_below_allocations", "settings_required", "approval_required", "payment_required", "not_checked_in", "limited", "operation_conflict", "no_eligible_waitlist", "enable_not_allowed"]);
const readers = new Set<Role>(["superAdmin", "registrationWorkshopAdministrator", "checkInStaff"]);
const statusFor = (state: string) => state === "ready" ? 200 : state === "denied" ? 403 : state === "limited" ? 429
  : ["closed", "area-not-ready", "unavailable"].includes(state) ? 503 : 409;
const failedRead = (error: unknown): WorkshopStaffOverview => ({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" });

/** Native sessions, exact-session assurance and the database independently authorize each action. */
export function createWorkshopStaffHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const getReadiness = dependencies.readiness ?? getStaffConfig, clock = dependencies.now ?? Date.now;
    const readiness = getReadiness(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = clock(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: WorkshopStaffResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    const staffReady = async () => {
      const status = workshopRecord(await backend.rpc("msrc_staff_status"));
      return status?.enabled === true && status.emailDailyLimit === config.emailDailyLimit;
    };
    try {
      if (!await staffReady()) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, manager = roles.includes("superAdmin") || roles.includes("registrationWorkshopAdministrator"), checkin = roles.some((role) => readers.has(role));
      const accessToken = session.accessToken;
      const readOverview = async (): Promise<WorkshopStaffOverview> => {
        const data = workshopRecord(await backend.rpc("msrc_staff_workshop_read", { edition_key: config.editionKey }, accessToken));
        if (typeof data?.state === "string" && failures.has(data.state)) return { state: data.state };
        const view = data?.state === "ready" ? decodeWorkshopStaffView(data) : null;
        return view ? { state: "ready", ...view } : { state: "unavailable" };
      };
      const query = new URL(request.url).searchParams;
      if (request.method === "GET") {
        if (query.size) return reply({ state: "invalid" }, 400);
        // Instructors are individually assigned from the authorized operations staff.
        // SQL rechecks that assignment and returns the minimal workshop-only projection.
        if (!checkin) return reply({ state: "denied" }, 403);
        const overview = await readOverview();
        return reply(overview, statusFor(overview.state));
      }
      const includeOverview = query.size === 1 && query.get("include") === "overview";
      if (query.size && !includeOverview) return reply({ state: "invalid" }, 400);
      let raw: Record<string, unknown> | null; try { raw = workshopRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const input = decodeWorkshopStaffPayload(raw), nonce = readStaffFormToken(config, raw?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      if (input.action === "save_policy" && !roles.includes("superAdmin") || ["checkin", "complete"].includes(input.action) && !checkin || !["save_policy", "checkin", "complete"].includes(input.action) && !manager) return reply({ state: "denied" }, 403);
      // Saving settings cannot activate booking. A separate reviewed release controls it.
      if (input.action === "save_policy" && input.policy?.enabled) return reply({ state: "enable_not_allowed" }, 409);
      const claimed = workshopRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) })); if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      const data = workshopRecord(await backend.rpc("msrc_staff_workshop_mutate", { edition_key: config.editionKey, input }, accessToken));
      const state = typeof data?.state === "string" ? data.state : "unavailable";
      if (failures.has(state)) return reply({ state }, statusFor(state));
      if (!workshopStaffMutationSucceeded(state)) return reply({ state: "unavailable" }, 503);
      if (!includeOverview) return reply({ state });
      let overview: WorkshopStaffOverview;
      try {
        // A committed write and its subsequent private read have separate outcomes.
        if (getReadiness().state !== "ready" || !await staffReady()) overview = { state: "closed" };
        else {
          const current = await readStaffToolAuthority(config, backend, session, clock());
          overview = current && current.context.timing.absoluteExpiresAtMs === session.deadline && current.profile.roles.some((role) => readers.has(role))
            ? await readOverview() : { state: "denied" };
        }
      } catch (error) { overview = failedRead(error); }
      return reply({ state, overview });
    } catch (error) { return reply(failedRead(error), 503); }
  };
}
export const handleWorkshopStaffRequest = createWorkshopStaffHandler();
