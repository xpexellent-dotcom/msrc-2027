import "server-only";
import { getParticipantConfig, type ParticipantReadiness, type ParticipantConfig } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantOrigin, readParticipantSession } from "@/features/participant-accounts/security.server";
import { createRegistrationBackend, RegistrationRpcMissingError, type RegistrationBackend } from "./backend.server";
import type { RegistrationTicketResponse } from "./contracts";
import { participantReady, verifiedClaims } from "./handler.server";
import { getRegistrationTicketSecret, registrationTicketProjection } from "./ticket-crypto.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function createRegistrationTicketHandler(dependencies: {
  readiness?: () => ParticipantReadiness; secret?: () => string | null;
  backend?: (config: ParticipantConfig) => RegistrationBackend; now?: () => number; observeOnly?: boolean;
} = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const reply = (body: RegistrationTicketResponse, status = 200) => Response.json(body, {
      status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) },
    });
    if (process.env.REGISTRATION_ENABLED !== "true") return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)();
    if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const secret = (dependencies.secret ?? getRegistrationTicketSecret)();
    if (!secret) return reply({ state: "area-not-ready" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)();
    const origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (request.method !== "GET") return reply({ state: "denied" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || Array.from(new URL(request.url).searchParams.keys()).some((key) => key !== "locale")
      || ![null, "en", "ar"].includes(new URL(request.url).searchParams.get("locale"))) return reply({ state: "denied" }, 400);
    const backend = (dependencies.backend ?? createRegistrationBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      const status = record(await backend.rpc("msrc_registration_status", { edition_key: config.editionKey }));
      if (status?.enabled !== true || status.participantAccountsReady !== true || status.settingsComplete !== true) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) {
          changedCookie = participantCookie(config, null, now);
          return reply({ state: "denied" }, 401);
        }
        session = { ...session, ...refreshed };
        changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now);
      if (!claims) return reply({ state: "denied" }, 401);
      if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      // Existing owners retain access after the submission window closes; the RPC
      // rechecks account, exact session and independent policy, not opening time.
      const raw = await backend.rpc("msrc_registration_ticket", { edition_key: config.editionKey, session_claims: claims, ticket_secret: secret });
      const state = record(raw)?.state;
      if (state === "denied") return reply({ state: "denied" }, 403);
      if (state === "closed") return reply({ state: "closed" }, 503);
      if (state === "unavailable") return reply({ state: "unavailable" }, 503);
      const result = await registrationTicketProjection(raw, secret);
      return result ? reply(result) : reply({ state: "unavailable" }, 503);
    } catch (error) {
      // A code-before-migration rollout must not invalidate a valid login.
      return reply({ state: error instanceof RegistrationRpcMissingError ? "area-not-ready" : "unavailable" }, 503);
    }
  };
}
export const handleRegistrationTicket = createRegistrationTicketHandler();
