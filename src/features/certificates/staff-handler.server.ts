import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import { certificateObject, decodeCertificateStaffPayload, decodeCertificateStaffResponse } from "@/lib/certificates/contracts";
import { certificatePrivateHeaders } from "./participant-handler.server";
import { generatePendingCertificates } from "./generation.server";

export function createCertificateStaffHandler(dependencies: { readiness?: () => StaffReadiness;
  backend?: (config: StaffConfig) => StaffBackend; now?: () => number; generate?: typeof generatePendingCertificates } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)();
    if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers: certificatePrivateHeaders });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: Record<string, unknown>, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, {
      status, headers: { ...certificatePrivateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) },
    });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))
      || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    if (new URL(request.url).searchParams.size) return reply({ state: "invalid" }, 400);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = certificateObject(await backend.rpc("msrc_staff_status"));
      if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403);
        session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now);
      }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles;
      if (!roles.includes("superAdmin") && !roles.includes("registrationWorkshopAdministrator")) return reply({ state: "denied" }, 403);
      if (request.method === "POST") {
        let raw: unknown; try { raw = await readStaffJson(request, 131072); } catch { return reply({ state: "invalid" }, 400); }
        const input = decodeCertificateStaffPayload(raw), nonce = readStaffFormToken(config, certificateObject(raw)?.formToken, origin, now), ip = staffIp(config, request);
        if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
        if (["settings", "saveTemplate", "approveTemplate", "release", "approveCorrection"].includes(input.action) && !roles.includes("superAdmin")) return reply({ state: "denied" }, 403);
        if (input.action === "settings" && (input.settings?.enabled || input.settings?.surveysEnabled)) return reply({ state: "enable_not_allowed" }, 409);
        if (input.action === "release" && process.env.CERTIFICATES_ENABLED !== "true") return reply({ state: "closed" }, 503);
        const rate = certificateObject(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }));
        if (rate?.state !== "claimed") return reply({ state: "limited" }, 429);
        const result = certificateObject(await backend.rpc("msrc_staff_certificates_manage", { edition_key: config.editionKey, input }, session.accessToken));
        if (!["saved", "released", "revoked", "reissued", "updated", "approved", "rejected"].includes(String(result?.state))) {
          const state = typeof result?.state === "string" ? result.state : "unavailable";
          return reply({ state }, state === "denied" ? 403 : state === "closed" ? 503 : 409);
        }
        if (["released", "reissued"].includes(String(result?.state))) {
          // Release is committed first; an interrupted renderer leaves durable pending jobs.
          await (dependencies.generate ?? generatePendingCertificates)({ databaseUrl: config.supabaseUrl, databaseKey: config.secretKey }).catch(() => undefined);
        }
      }
      const current = decodeCertificateStaffResponse(await backend.rpc("msrc_staff_certificates_read", { edition_key: config.editionKey }, session.accessToken));
      return current ? reply(current, current.state === "ready" ? 200 : current.state === "denied" ? 403 : 503) : reply({ state: "unavailable" }, 503);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleCertificateStaff = createCertificateStaffHandler();
