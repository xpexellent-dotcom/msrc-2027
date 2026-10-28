import "server-only";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantOrigin, participantUuid, readParticipantSession } from "@/features/participant-accounts/security.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { AbstractRpcMissingError, createAbstractBackend, type AbstractBackend } from "./backend.server";
import type { AbstractOutcome, AbstractResponse } from "./contracts";
import { abstractRecord, abstractSettingsProjection, abstractSubmissionProjection, countAbstractWords, validateAbstractDocument } from "./validation";
import { abstractFormToken, readAbstractFormToken, readAbstractJson } from "./security.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };
export function createAbstractHandler(dependencies: { readiness?: () => ParticipantReadiness; backend?: (config: ParticipantConfig) => AbstractBackend; now?: () => number; observeOnly?: boolean } = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const reply = (body: AbstractResponse, status = 200) => Response.json(body, { status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) } });
    if (process.env.ABSTRACT_SUBMISSIONS_ENABLED !== "true") return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)();
    if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site");
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin
      || Array.from(new URL(request.url).searchParams.keys()).some((key) => key !== "locale")
      || ![null, "en", "ar"].includes(new URL(request.url).searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    const backend = (dependencies.backend ?? createAbstractBackend)(config);
    try {
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      const status = abstractRecord(await backend.rpc("msrc_abstracts_status", { edition_key: config.editionKey }));
      if (status?.enabled !== true) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) {
          changedCookie = participantCookie(config, null, now); return reply({ state: "denied" }, 401);
        }
        session = { ...session, ...refreshed }; changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now);
      if (!claims) return reply({ state: "denied" }, 401);
      const args = { edition_key: config.editionKey, session_claims: claims };
      const completion = abstractRecord(await backend.rpc("msrc_participant_profile_complete", args));
      if (completion?.state === "denied") return reply({ state: "denied" }, 403);
      if (completion?.state !== "ready" || typeof completion.complete !== "boolean") return reply({ state: "area-not-ready" }, 503);
      const profileComplete = completion.complete;
      const fresh = () => abstractFormToken(config, origin, session.actorId, session.sessionId, now);
      const gate = (value: unknown) => {
        const state = abstractRecord(value)?.state;
        if (state === "profile_incomplete") return reply({ state: "profile_incomplete" }, 409);
        if (state === "denied") return reply({ state: "denied" }, 403);
        if (state === "closed") return reply({ state: "closed" }, 503);
        if (state === "area_not_ready") return reply({ state: "area-not-ready" }, 503);
        if (state === "limited") return reply({ state: "limited" }, 429);
        return null;
      };
      let outcome: AbstractOutcome | undefined, submissionId: string | undefined;
      if (request.method === "POST") {
        if (dependencies.observeOnly) return reply({ state: "invalid_input" }, 405);
        let body: Record<string, unknown> | null;
        try { body = abstractRecord(await readAbstractJson(request)); } catch { return reply({ state: "invalid_input" }, 400); }
        if (!body || !["save", "finalize"].includes(String(body.action)) || Object.keys(body).sort().join(",") !== (body.action === "save"
          ? "action,document,expectedVersion,formToken,operationId,submissionId" : "action,expectedVersion,formToken,operationId,submissionId")
          || typeof body.operationId !== "string" || !participantUuid.test(body.operationId) || !Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0
          || body.submissionId !== null && (typeof body.submissionId !== "string" || !participantUuid.test(body.submissionId))
          || body.action === "finalize" && body.submissionId === null || !readAbstractFormToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input" }, 400);
        const document = body.action === "save" ? validateAbstractDocument(body.document) : null;
        if (body.action === "save" && (!document || countAbstractWords(document.body) > 300)) return reply({ state: "invalid_input" }, 400);
        // The abstract RPC has its own actor-scoped budget. Autosave must not consume
        // the authentication form's shared 20/IP/hour admission quota.
        if (process.env.ABSTRACT_SUBMISSIONS_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        if (body.action === "finalize" && !profileComplete) return reply({ state: "profile_incomplete" }, 409);
        const result = await backend.rpc(body.action === "save" ? "msrc_abstracts_save_draft" : "msrc_abstracts_finalize", { ...args,
          submission_id: body.submissionId, expected_version: body.expectedVersion, operation_id: body.operationId, ...(document ? { document } : {}) });
        const refused = gate(result); if (refused) return refused;
        const row = abstractRecord(result);
        if (!["saved", "finalized", "conflict", "locked", "pi_limit", "evidence_gate", "invalid"].includes(String(row?.state))) return reply({ state: "unavailable" }, 503);
        outcome = row!.state === "locked" ? "conflict" : row!.state as AbstractOutcome;
        const saved = abstractRecord(row?.submission);
        if (saved && typeof saved.id === "string" && participantUuid.test(saved.id)) submissionId = saved.id;
      }
      const raw = await backend.rpc("msrc_abstracts_me", args), refused = gate(raw); if (refused) return refused;
      const data = abstractRecord(raw);
      if (!data || Object.keys(data).sort().join(",") !== "settings,state,submissions" || data.state !== "ready" || !Array.isArray(data.submissions)) return reply({ state: "unavailable" }, 503);
      const settings = abstractSettingsProjection(data.settings), submissions = data.submissions.map(abstractSubmissionProjection);
      if (!settings || submissions.some((row) => !row)) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", profileComplete, settings, submissions: submissions.filter((row) => row !== null), formToken: fresh(), ...(outcome ? { outcome } : {}), ...(submissionId ? { submissionId } : {}) }, outcome && !["saved", "finalized"].includes(outcome) ? 409 : 200);
    } catch (error) { return reply({ state: error instanceof AbstractRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleAbstracts = createAbstractHandler();
