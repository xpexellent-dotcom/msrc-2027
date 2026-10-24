import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import { decodeWorkshopStaffPayload, decodeWorkshopStaffView, workshopRecord, type WorkshopStaffResponse } from "./staff-contract";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const failures = new Set(["closed", "denied", "invalid", "conflict", "full", "not_found", "expired", "overlap", "ineligible", "registration_required", "capacity_below_allocations", "settings_required", "approval_required", "payment_required", "not_checked_in", "limited", "operation_conflict", "no_eligible_waitlist", "enable_not_allowed"]);

/** Native sessions, exact-session assurance and the database independently authorize each action. */
export function createWorkshopStaffHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: WorkshopStaffResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = workshopRecord(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, manager = roles.includes("superAdmin") || roles.includes("registrationWorkshopAdministrator"), checkin = manager || roles.includes("checkInStaff");
      const outcome = (raw: unknown, read = false) => {
        const data = workshopRecord(raw); if (!data || typeof data.state !== "string") return reply({ state: "unavailable" }, 503);
        if (failures.has(data.state)) return reply({ state: data.state }, data.state === "denied" ? 403 : data.state === "limited" ? 429 : data.state === "closed" ? 503 : 409);
        if (read) { const view = data.state === "ready" ? decodeWorkshopStaffView(data) : null; return view ? reply({ state: "ready", ...view }) : reply({ state: "unavailable" }, 503); }
        return ["updated", "created", "ready", "already_checked_in", "already_completed"].includes(data.state) ? reply({ state: data.state }) : reply({ state: "unavailable" }, 503);
      };
      if (request.method === "GET") {
        if (new URL(request.url).searchParams.size) return reply({ state: "invalid" }, 400);
        // Instructors are individually assigned from the authorized operations staff.
        // SQL rechecks that assignment and returns the minimal workshop-only projection.
        if (!checkin) return reply({ state: "denied" }, 403);
        return outcome(await backend.rpc("msrc_staff_workshop_read", { edition_key: config.editionKey }, session.accessToken), true);
      }
      let raw: Record<string, unknown> | null; try { raw = workshopRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const input = decodeWorkshopStaffPayload(raw), nonce = readStaffFormToken(config, raw?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      if (input.action === "save_policy" && !roles.includes("superAdmin") || ["checkin", "complete"].includes(input.action) && !checkin || !["save_policy", "checkin", "complete"].includes(input.action) && !manager) return reply({ state: "denied" }, 403);
      // Saving settings cannot activate booking. A separate reviewed release controls it.
      if (input.action === "save_policy" && input.policy?.enabled) return reply({ state: "enable_not_allowed" }, 409);
      const claimed = workshopRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) })); if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      return outcome(await backend.rpc("msrc_staff_workshop_mutate", { edition_key: config.editionKey, input }, session.accessToken));
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleWorkshopStaffRequest = createWorkshopStaffHandler();
