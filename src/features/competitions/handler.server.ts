import "server-only";
import { getParticipantConfig, type ParticipantConfig, type ParticipantReadiness } from "@/features/participant-accounts/config.server";
import { nativeTokenNeedsRefresh, participantCookie, participantOrigin, readParticipantSession } from "@/features/participant-accounts/security.server";
import { participantReady, verifiedClaims } from "@/features/registration/handler.server";
import { CompetitionRpcMissingError, createCompetitionBackend, type CompetitionBackend } from "./backend.server";
import type { CompetitionResponse } from "./contracts";
import { competitionEntryProjection, competitionRecord, competitionSettingsProjection, competitionUuid, exactKeys, hackathonProfileProjection, isCompetitionKind, validateCompetitionDocument, validateHackathonProfileInput } from "./validation";
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
      || request.method === "POST" && request.headers.get("origin") !== origin || Array.from(url.searchParams.keys()).some((key) => !["locale", "kind"].includes(key)) || ![null, "en", "ar"].includes(url.searchParams.get("locale")) || url.searchParams.has("kind") && !isCompetitionKind(url.searchParams.get("kind"))) return reply({ state: "invalid_input" }, 400);
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
        if (body?.action === "save") fields.push("document"); if (body?.action === "invite") fields.push("email"); if (body?.action === "profile") fields.push("profile");
        if (["file_reserve", "proof_reserve"].includes(String(body?.action))) fields.push("metadata"); if (["file_read", "proof_read"].includes(String(body?.action))) fields.push("fileId");
        const frameworkAction = ["profile", "finalist_confirm", "proof_reserve", "proof_read"].includes(String(body?.action));
        if (!body || !["save", "submit", "invite", "confirm", "file_reserve", "file_read", "profile", "finalist_confirm", "proof_reserve", "proof_read"].includes(String(body.action)) || !exactKeys(body, fields) || !isCompetitionKind(body.kind) || frameworkAction && body.kind !== "hackathon"
          || typeof body.operationId !== "string" || !competitionUuid.test(body.operationId) || !Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0
          || body.entryId !== null && (typeof body.entryId !== "string" || !competitionUuid.test(body.entryId)) || !["save", "profile"].includes(String(body.action)) && body.entryId === null
          || !readCompetitionFormToken(config, body.formToken, origin, session.actorId, session.sessionId, now)) return reply({ state: "invalid_input" }, 400);
        const document = body.action === "save" ? validateCompetitionDocument(body.kind, body.document) : null;
        if (body.kind === "hackathon") {
          const readinessSnapshot = await backend.rpc("msrc_competitions_me", args), refused = gate(readinessSnapshot); if (refused) return refused;
          if (!Object.hasOwn(competitionRecord(readinessSnapshot) ?? {}, "hackathonProfile")) return reply({ state: "area-not-ready" }, 503);
        }
        const profile = body.action === "profile" ? validateHackathonProfileInput(body.profile) : null;
        if (body.action === "profile" && !profile) return reply({ state: "invalid_input" }, 400);
        if (body.action === "save" && !document || body.action === "invite" && (body.kind !== "hackathon" || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) return reply({ state: "invalid_input" }, 400);
        const metadata = competitionRecord(body.metadata);
        if (body.action === "proof_reserve" && (!metadata || !exactKeys(metadata, ["name", "mime", "size"]) || typeof metadata.name !== "string" || metadata.name.length < 1 || metadata.name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(metadata.name) || !["application/pdf", "image/png", "image/jpeg"].includes(String(metadata.mime)) || !Number.isSafeInteger(metadata.size) || Number(metadata.size) < 1 || Number(metadata.size) > 26214400)) return reply({ state: "invalid_input" }, 400);
        if (body.action === "proof_read" && (typeof body.fileId !== "string" || !competitionUuid.test(body.fileId))) return reply({ state: "invalid_input" }, 400);
        if (body.action === "file_reserve" && (!metadata || !exactKeys(metadata, ["name", "mime", "size", "stage"]) || typeof metadata.name !== "string" || metadata.name.length < 1 || metadata.name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(metadata.name)
          || !["application/pdf", "image/png", "image/jpeg"].includes(String(metadata.mime)) || !Number.isSafeInteger(metadata.size) || Number(metadata.size) < 1 || Number(metadata.size) > 26214400 || !["supporting", "final"].includes(String(metadata.stage)))
          || body.action === "file_read" && (typeof body.fileId !== "string" || !competitionUuid.test(body.fileId))) return reply({ state: "invalid_input" }, 400);
        if (process.env.COMPETITIONS_ENABLED !== "true" || (dependencies.readiness ?? getParticipantConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        const mutationArgs = { ...args, competition_type: body.kind, entry_id: body.entryId, expected_version: body.expectedVersion, operation_id: body.operationId };
        const fileAction = ["file_reserve", "file_read", "proof_reserve", "proof_read"].includes(String(body.action));
        const raw = frameworkAction ? await backend.rpc("msrc_competitions_hackathon_action", { ...args, action: body.action, entry_id: body.entryId, expected_version: body.expectedVersion, operation_id: body.operationId,
          payload: body.action === "profile" ? profile : body.action === "proof_reserve" ? metadata : body.action === "proof_read" ? { fileId: body.fileId } : {} })
          : await backend.rpc(body.action === "save" ? "msrc_competitions_save_draft" : body.action === "submit" ? "msrc_competitions_submit" : fileAction ? "msrc_competitions_file_action" : "msrc_competitions_member_action",
          { ...mutationArgs, ...(document ? { document } : {}), ...(["invite", "confirm"].includes(String(body.action)) ? { action: body.action, email: body.action === "invite" ? body.email : null, member_id: null } : {}),
            ...(fileAction ? { action: body.action === "file_reserve" ? "reserve" : "read", file_id: body.action === "file_read" ? body.fileId : null, metadata: metadata ?? null } : {}) });
        const refused = gate(raw); if (refused) return refused;
        const result = competitionRecord(raw);
        if (!["saved", "submitted", "invited", "confirmed", "profile_saved", "finalist_confirmed", "reserved", "available", "full", "unavailable", "conflict", "locked", "invalid", "not_ready", "settings_incomplete", "roster_limit", "verified_account_required", "already_member", "evidence_gate", "membership_closed", "profile_required", "roster_incomplete"].includes(String(result?.state))) return reply({ state: "unavailable" }, 503);
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
      if (!data || !exactKeys(data, ["state", "settings", "entries", ...(Object.hasOwn(data, "hackathonProfile") ? ["hackathonProfile"] : [])]) || data.state !== "ready" || !settings || !exactKeys(settings, ["hackathon", "three_minute_thesis"]) || !Array.isArray(data.entries)) return reply({ state: "unavailable" }, 503);
      const profile = data.hackathonProfile === undefined || data.hackathonProfile === null ? null : hackathonProfileProjection(data.hackathonProfile);
      if (!Object.hasOwn(data, "hackathonProfile") && (url.searchParams.get("kind") ?? "hackathon") === "hackathon") return reply({ state: "area-not-ready" }, 503);
      if (data.hackathonProfile !== undefined && data.hackathonProfile !== null && !profile) return reply({ state: "unavailable" }, 503);
      const hackathon = competitionSettingsProjection(settings.hackathon), thesis = competitionSettingsProjection(settings.three_minute_thesis), entries = (Object.hasOwn(data, "hackathonProfile") ? data.entries : data.entries.filter((row) => competitionRecord(row)?.kind === "three_minute_thesis")).map(competitionEntryProjection);
      if (!hackathon || !thesis || entries.some((entry) => !entry)) return reply({ state: "unavailable" }, 503);
      return reply({ state: "ready", settings: { hackathon, three_minute_thesis: thesis }, entries: entries.filter((entry) => entry !== null),
        formToken: competitionFormToken(config, origin, session.actorId, session.sessionId, now), ...(Object.hasOwn(data, "hackathonProfile") ? { hackathonProfile: profile } : {}), ...(outcome ? { outcome } : {}), ...(entryId ? { entryId } : {}), ...(fileTransfer ? { fileTransfer } : {}) }, outcome && !["saved", "submitted", "invited", "confirmed", "profile_saved", "finalist_confirmed", "reserved", "available"].includes(outcome) ? 409 : 200);
    } catch (error) { return reply({ state: error instanceof CompetitionRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleCompetitions = createCompetitionHandler();
