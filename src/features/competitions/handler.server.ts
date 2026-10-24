import "server-only";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantOrigin, readParticipantSession } from "@/features/participant-accounts/security.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { CompetitionRpcMissingError, createCompetitionBackend, type CompetitionBackend } from "./backend.server";
import type { CompetitionResponse } from "./contracts";
import { competitionEntryProjection, competitionRecord, competitionSettingsProjection, competitionUuid, exactKeys, isCompetitionKind, validateCompetitionDocument } from "./validation";
import { competitionFormToken, readCompetitionFormToken, readCompetitionJson } from "./security.server";
import { createCompetitionStorage, type CompetitionStorage } from "./storage.server";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function createCompetitionHandler(dependencies: { readiness?: () => ParticipantReadiness; backend?: (config: ParticipantConfig) => CompetitionBackend; storage?: (config: ParticipantConfig) => CompetitionStorage; now?: () => number; observeOnly?: boolean } = {}) {
  return async function handle(request: Request): Promise<Response> {
    let changedCookie: string | undefined;
    const reply = (body: CompetitionResponse, status = 200) => Response.json(body, { status, headers: { ...privateHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) } });
    if (process.env.COMPETITIONS_ENABLED !== "true") return reply({ state: "closed" }, 503);
    const readiness = (dependencies.readiness ?? getParticipantConfig)(); if (readiness.state !== "ready") return reply({ state: "closed" }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = participantOrigin(config, request), site = request.headers.get("sec-fetch-site"), url = new URL(request.url);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid_input" }, 405);
    if (!origin || site && !["same-origin", "none"].includes(site) || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin || Array.from(url.searchParams.keys()).some((key) => key !== "locale") || ![null, "en", "ar"].includes(url.searchParams.get("locale"))) return reply({ state: "invalid_input" }, 400);
    try {
      const backend = (dependencies.backend ?? createCompetitionBackend)(config);
      if (!await participantReady(config, backend)) return reply({ state: "closed" }, 503);
      const status = competitionRecord(await backend.rpc("msrc_competitions_status", { edition_key: config.editionKey }));
      if (status?.enabled !== true) return reply({ state: "closed" }, 503);
      let session = readParticipantSession(config, request, now); if (!session) return reply({ state: "denied" }, 401);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        if (dependencies.observeOnly) return reply({ state: "denied" }, 401);
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) { changedCookie = participantCookie(config, null, now); return reply({ state: "denied" }, 401); }
        session = { ...session, ...refreshed }; changedCookie = participantCookie(config, session, now);
      }
      if (await backend.identity(session.accessToken) !== session.actorId) return reply({ state: "denied" }, 401);
      const claims = verifiedClaims(session.accessToken, session.actorId, session.sessionId, now); if (!claims) return reply({ state: "denied" }, 401);
      const args = { edition_key: config.editionKey, session_claims: claims };
      const gate = (value: unknown) => { const state = competitionRecord(value)?.state;
        if (state === "denied") return reply({ state: "denied" }, 403);
        if (state === "closed") return reply({ state: "closed" }, 503);
        if (state === "area_not_ready") return reply({ state: "area-not-ready" }, 503);
        if (state === "limited") return reply({ state: "limited" }, 429);
        return null;
      };
      let outcome: string | undefined, entryId: string | undefined, fileTransfer: { fileId: string; url: string; operation: "upload" | "download" } | undefined;
      if (request.method === "POST") {
        if (dependencies.observeOnly) return reply({ state: "invalid_input" }, 405);
        let body: Record<string, unknown> | null; try { body = competitionRecord(await readCompetitionJson(request)); } catch { return reply({ state: "invalid_input" }, 400); }
        const fields = ["action", "kind", "entryId", "expectedVersion", "operationId", "formToken"];
        if (body?.action === "save") fields.push("document"); if (body?.action === "invite") fields.push("email");
        if (body?.action === "file_reserve") fields.push("metadata"); if (body?.action === "file_read") fields.push("fileId");
        if (!body || !["save", "submit", "invite", "confirm", "file_reserve", "file_read"].includes(String(body.action)) || !exactKeys(body, fields) || !isCompetitionKind(body.kind)
          || typeof body.operationId !== "string" || !competitionUuid.test(body.operationId) || !Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0
          || body.entryId !== null && (typeof body.entryId !== "string" || !competitionUuid.test(body.entryId)) || body.action !== "save" && body.entryId === null
          || !readCompetitionFormToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input" }, 400);
        const document = body.action === "save" ? validateCompetitionDocument(body.kind, body.document) : null;
        if (body.action === "save" && !document || body.action === "invite" && (body.kind !== "hackathon" || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) return reply({ state: "invalid_input" }, 400);
        const metadata = competitionRecord(body.metadata);
        if (body.action === "file_reserve" && (!metadata || !exactKeys(metadata, ["name", "mime", "size", "stage"]) || typeof metadata.name !== "string" || metadata.name.length < 1 || metadata.name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(metadata.name)
          || !["application/pdf", "image/png", "image/jpeg"].includes(String(metadata.mime)) || !Number.isSafeInteger(metadata.size) || Number(metadata.size) < 1 || Number(metadata.size) > 26214400 || !["supporting", "final"].includes(String(metadata.stage)))
          || body.action === "file_read" && (typeof body.fileId !== "string" || !competitionUuid.test(body.fileId))) return reply({ state: "invalid_input" }, 400);
        if (process.env.COMPETITIONS_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        const mutationArgs = { ...args, competition_type: body.kind, entry_id: body.entryId, expected_version: body.expectedVersion, operation_id: body.operationId };
        const fileAction = body.action === "file_reserve" || body.action === "file_read";
        const raw = await backend.rpc(body.action === "save" ? "msrc_competitions_save_draft" : body.action === "submit" ? "msrc_competitions_submit" : fileAction ? "msrc_competitions_file_action" : "msrc_competitions_member_action",
          { ...mutationArgs, ...(document ? { document } : {}), ...(["invite", "confirm"].includes(String(body.action)) ? { action: body.action, email: body.action === "invite" ? body.email : null, member_id: null } : {}),
            ...(fileAction ? { action: body.action === "file_reserve" ? "reserve" : "read", file_id: body.action === "file_read" ? body.fileId : null, metadata: metadata ?? null } : {}) });
        const refused = gate(raw); if (refused) return refused;
        const result = competitionRecord(raw);
        if (!["saved", "submitted", "invited", "confirmed", "reserved", "available", "full", "unavailable", "conflict", "locked", "invalid", "not_ready", "settings_incomplete", "roster_limit", "verified_account_required", "already_member", "evidence_gate", "membership_closed"].includes(String(result?.state))) return reply({ state: "unavailable" }, 503);
        outcome = String(result!.state);
        if (outcome === "reserved" || outcome === "available") {
          if (process.env.COMPETITIONS_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
          const fileId = outcome === "reserved" ? result!.fileId : body.fileId;
          if (!fileAction || result!.bucket !== "msrc-competition-files" || typeof fileId !== "string" || !competitionUuid.test(fileId) || result!.path !== config.editionKey + "/" + body.entryId + "/" + fileId) return reply({ state: "unavailable" }, 503);
          const url = await (dependencies.storage ?? createCompetitionStorage)(config).sign(String(result!.path), outcome === "reserved");
          fileTransfer = { fileId, url, operation: outcome === "reserved" ? "upload" : "download" };
        }
        const saved = competitionRecord(result?.entry);
        if (saved && typeof saved.id === "string" && competitionUuid.test(saved.id)) entryId = saved.id;
        else if (typeof result?.entryId === "string" && competitionUuid.test(result.entryId)) entryId = result.entryId;
      }
      const raw = await backend.rpc("msrc_competitions_me", args), refused = gate(raw); if (refused) return refused;
      const data = competitionRecord(raw), settings = competitionRecord(data?.settings);
      if (!data || !exactKeys(data, ["state", "settings", "entries"]) || data.state !== "ready" || !settings || !exactKeys(settings, ["hackathon", "three_minute_thesis"]) || !Array.isArray(data.entries)) return reply({ state: "unavailable" }, 503);
      const hackathon = competitionSettingsProjection(settings.hackathon), thesis = competitionSettingsProjection(settings.three_minute_thesis), entries = data.entries.map(competitionEntryProjection);
      if (!hackathon || !thesis || entries.some((entry) => !entry)) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", settings: { hackathon, three_minute_thesis: thesis }, entries: entries.filter((entry) => entry !== null),
        formToken: competitionFormToken(config, origin, session.actorId, session.sessionId, now), ...(outcome ? { outcome } : {}), ...(entryId ? { entryId } : {}), ...(fileTransfer ? { fileTransfer } : {}) }, outcome && !["saved", "submitted", "invited", "confirmed", "reserved", "available"].includes(outcome) ? 409 : 200);
    } catch (error) { return reply({ state: error instanceof CompetitionRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleCompetitions = createCompetitionHandler();
