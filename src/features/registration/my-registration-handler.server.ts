import "server-only";
import { randomUUID } from "node:crypto";
import { getParticipantConfig, type ParticipantReadiness, type ParticipantConfig } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantHash, participantIp, participantOrigin, participantUuid,
  readParticipantJson, readParticipantSession } from "@/features/participant-accounts/security.server";
import { createRegistrationBackend, RegistrationRpcMissingError, type RegistrationBackend } from "./backend.server";
import type { MyRegistration, MyRegistrationResponse, RegistrationAction, RegistrationWindow, RegistrationAttendanceDay, SeatConfirmation } from "./contracts";
import { validConferenceDay } from "@/features/attendance/conference-days";
import { participantReady, verifiedClaims } from "./handler.server";
import { readRegistrationActionToken, registrationActionToken } from "./security.server";
import { getRegistrationTicketSecret, registrationTicketProjection } from "./ticket-crypto.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const timestamp = (value: unknown): value is string => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const statuses = ["pending_approval", "waitlisted", "offered", "approved", "confirmed", "approved_awaiting_payment", "cancelled", "expired"];
type Snapshot = { requestId: string | null; registration: MyRegistration | null; window: RegistrationWindow; fewPlacesLeft: boolean; serverTime: string };

/** Own-account attendance exposes no staff, ticket or participant identifiers. */
function attendanceProjection(value: unknown): RegistrationAttendanceDay[] | null {
  const data = record(value);
  if (!data || Object.keys(data).sort().join(",") !== "days,state" || data.state !== "ready"
    || !Array.isArray(data.days) || data.days.length > 31) return null;
  const days: RegistrationAttendanceDay[] = [];
  for (const entry of data.days) {
    const day = record(entry);
    if (!day || Object.keys(day).sort().join(",") !== "checkedInAt,conferenceDay" || !validConferenceDay(day.conferenceDay)
      || day.checkedInAt !== null && !timestamp(day.checkedInAt)
      || days.length && day.conferenceDay <= days[days.length - 1].conferenceDay) return null;
    days.push({ conferenceDay: day.conferenceDay, checkedInAt: day.checkedInAt as string | null });
  }
  return days;
}

/** Fail closed on over-returned private fields; identifiers stay on the server. */
function snapshot(value: unknown): Snapshot | null {
  const data = record(value), window = record(data?.window), request = record(data?.request);
  if (data?.state === "ready" && data.confirmationVersion === undefined) throw new RegistrationRpcMissingError();
  if (!data || Object.keys(data).sort().join(",") !== "confirmationVersion,fewPlaces,request,serverNow,state,window" || data.state !== "ready" || data.confirmationVersion !== 1
    || !window || Object.keys(window).sort().join(",") !== "eligible,opensAt,state"
    || !["early_access", "scheduled", "open", "closed"].includes(String(window.state)) || typeof window.eligible !== "boolean"
    || window.opensAt !== null && !timestamp(window.opensAt) || typeof data.fewPlaces !== "boolean" || !timestamp(data.serverNow)) return null;
  if (data.request !== null && (!request || Object.keys(request).sort().join(",") !== "confirmation,createdAt,id,offerExpiresAt,status"
    || typeof request.id !== "string" || !participantUuid.test(request.id) || !statuses.includes(String(request.status))
    || !timestamp(request.createdAt) || request.offerExpiresAt !== null && !timestamp(request.offerExpiresAt)
    || request.status === "offered" && request.offerExpiresAt === null)) return null;
  let confirmation: SeatConfirmation | null = null;
  if (request && request.confirmation !== null) {
    const value = record(request.confirmation);
    if (!value || Object.keys(value).sort().join(",") !== "deadline,state" || !timestamp(value.deadline)
      || !["awaiting", "confirmed", "released", "kept"].includes(String(value.state))) return null;
    const state = value.state as SeatConfirmation["state"];
    if (request.status !== { awaiting: "approved", confirmed: "confirmed", released: "cancelled", kept: "approved" }[state]) return null;
    confirmation = { state, deadline: value.deadline };
  }
  return { requestId: request?.id as string | undefined ?? null,
    registration: request ? { status: request.status as MyRegistration["status"], createdAt: request.createdAt as string, offerExpiresAt: request.offerExpiresAt as string | null, confirmation } : null,
    window: { state: window.state === "early_access" ? "early-access" : window.state as RegistrationWindow["state"],
      eligible: window.eligible, opensAt: window.opensAt as string | null }, fewPlacesLeft: data.fewPlaces, serverTime: data.serverNow };
}

export function createMyRegistrationHandler(dependencies: {
  readiness?: () => ParticipantReadiness; secret?: () => string | null;
  backend?: (config: ParticipantConfig) => RegistrationBackend; now?: () => number; observeOnly?: boolean;
} = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const reply = (body: MyRegistrationResponse, status = 200) => Response.json(body, {
      status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) },
    });
    if (process.env.REGISTRATION_ENABLED !== "true") return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)();
    if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)();
    const origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin
      || Array.from(new URL(request.url).searchParams.keys()).some((key) => key !== "locale")
      || ![null, "en", "ar"].includes(new URL(request.url).searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createRegistrationBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      const status = record(await backend.rpc("msrc_registration_status", { edition_key: config.editionKey }));
      if (status?.enabled !== true || status.participantAccountsReady !== true) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
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
      const args = { edition_key: config.editionKey, session_claims: claims };
      const fresh = () => registrationActionToken(config, origin, session.actorId, session.sessionId, now);
      const read = () => backend.rpc("msrc_registration_me", args);
      const gate = (value: unknown): Response | null => {
        const state = record(value)?.state;
        if (state === "denied") return reply({ state: "denied" }, 403);
        if (state === "closed") return reply({ state: "closed" }, 503);
        if (state === "area_not_ready") return reply({ state: "area-not-ready" }, 503);
        return null;
      };
      // Reading an elapsed own offer may perform the automatic expiry/hand-on.
      // Recheck the server switch before that RPC, as for explicit mutations.
      if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      const raw = await read(), refused = gate(raw);
      if (refused) return refused;
      let current = snapshot(raw);
      if (!current) return reply({ state: "unavailable" }, 503);
      let outcome: "updated" | "expired" | "conflict" | undefined;
      if (request.method === "POST") {
        if (dependencies.observeOnly) return reply({ state: "invalid_input" }, 405);
        let body: Record<string, unknown> | null;
        try { body = record(await readParticipantJson(request)); } catch { return reply({ state: "invalid_input", formToken: fresh() }, 400); }
        const ip = participantIp(config, request);
        if (!body || Object.keys(body).sort().join(",") !== "action,formToken,operationId" || !["accept", "decline", "cancel", "confirm", "release"].includes(String(body.action))
          || typeof body.operationId !== "string" || !participantUuid.test(body.operationId) || !ip
          || !readRegistrationActionToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input", formToken: fresh() }, 400);
        const claim = record(await backend.rpc("msrc_participant_form_claim", {
          nonce_hash: participantHash(config, "nonce", randomUUID()), ip_hash: participantHash(config, "ip", ip),
        }));
        if (claim?.state !== "claimed") return reply({ state: "limited", formToken: fresh() }, 429);
        // The edition lock and database clock decide eligibility, expiry and retry.
        // Never authorize against the countdown, request status or actor from a client.
        if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        if (!current.requestId) outcome = "conflict";
        else {
          const action = body.action as RegistrationAction;
          const secret = action === "accept" ? (dependencies.secret ?? getRegistrationTicketSecret)() : null;
          if (action === "accept" && !secret) return reply({ state: "area-not-ready" }, 503);
          const rpc = { accept: "msrc_registration_accept_offer", decline: "msrc_registration_decline_offer", cancel: "msrc_registration_cancel",
            confirm: "msrc_registration_confirm_seat", release: "msrc_registration_release_seat" }[action];
          const result = await backend.rpc(rpc, { ...args, request_id: current.requestId, operation_id: body.operationId,
            ...(action === "accept" ? { ticket_secret: secret } : {}) });
          const refused = gate(result);
          if (refused) return refused;
          const state = record(result)?.state;
          if (state !== "updated" && state !== "expired" && state !== "conflict") return reply({ state: "unavailable" }, 503);
          outcome = state;
          const next = await read(), refusal = gate(next);
          if (refusal) return refusal;
          current = snapshot(next);
          if (!current) return reply({ state: "unavailable" }, 503);
        }
      }
      let ticket = null;
      if (process.env.REGISTRATION_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
      if (current.registration && ["approved", "confirmed"].includes(current.registration.status)) {
        const secret = (dependencies.secret ?? getRegistrationTicketSecret)();
        if (!secret) return reply({ state: "area-not-ready" }, 503);
        const rawTicket = await backend.rpc("msrc_registration_ticket", { ...args, ticket_secret: secret });
        const refused = gate(rawTicket);
        if (refused) return refused;
        const projection = await registrationTicketProjection(rawTicket, secret);
        if (!projection) return reply({ state: "unavailable" }, 503);
        ticket = projection.ticket ?? null;
      }
      const rawAttendance = await backend.rpc("msrc_registration_attendance", args), attendanceRefusal = gate(rawAttendance);
      if (attendanceRefusal) return attendanceRefusal;
      const attendance = attendanceProjection(rawAttendance);
      if (!attendance) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", registration: current.registration, window: current.window, fewPlacesLeft: current.fewPlacesLeft,
        serverTime: current.serverTime, formToken: fresh(), ticket, attendance, ...(outcome ? { outcome } : {}) }, outcome === "conflict" || outcome === "expired" ? 409 : 200);
    } catch (error) {
      // Code ships before hosted migrations. Missing capabilities retain login.
      return reply({ state: error instanceof RegistrationRpcMissingError ? "area-not-ready" : "unavailable" }, 503);
    }
  };
}
export const handleMyRegistration = createMyRegistrationHandler();
