import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "@/features/staff-portal/backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "@/features/staff-portal/config.server";
import { readStaffToolAuthority } from "@/features/staff-portal/handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "@/features/staff-portal/security.server";
import { decodeAdministrativeDeclarations, decodeEligibilityProfile, decodeFrameworkStatus, decodeTrackSettings, whatsappGroupUrl } from "./framework-staff-contract";
import { COMPETITION_KINDS, type CompetitionKind } from "./contracts";
import { validHackathonLink } from "./validation";
import { createCompetitionStorage, type CompetitionStorage } from "./storage.server";
import { COMPETITION_SETTING_KEYS, decodeCompetitionAssignment, decodeCompetitionPacket, decodeCompetitionRubric, decodeCompetitionScorecard, integer, record, text, uuid, type SettingValue, type StaffCompetitionEntry, type StaffCompetitionResponse } from "./staff-contract";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const successes = ["ready", "updated", "saved", "assigned", "prepared", "submitted", "selected", "recorded", "published"];
const failures = ["closed", "denied", "invalid", "conflict", "not_found", "limited", "settings_incomplete", "area_not_ready", "locked", "full", "coi", "duplicate", "already_assigned", "reviews_incomplete", "packet_required", "blinding_required", "unavailable", "not_ready", "ineligible", "evidence_gate", "committee_required", "third_review_required", "not_next_reserve", "roster_incomplete", "profile_required", "deadline_passed", "tie_required", "committee_review_required"];
export function decodeStaffCompetitionSettings(value: unknown): Record<string, SettingValue> | null {
  const data = record(value); if (!data || Object.keys(data).sort().join(",") !== [...COMPETITION_SETTING_KEYS].sort().join(",")) return null;
  const result: Record<string, SettingValue> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === null) { result[key] = null; continue; }
    if (["selectionCriteria", "finalRubric"].includes(key)) { const rubric = decodeCompetitionRubric(val); if (!rubric || !rubric.length) return null; result[key] = rubric; continue; }
    if (key === "requiredActivities") { if (!Array.isArray(val) || !val.length || val.length > 100 || !val.every((row) => text(row, 3000) && row.trim()) || new Set(val).size !== val.length) return null; result[key] = val as string[]; continue; }
    if (key === "soloConsumesFinalistQuota") { if (typeof val !== "boolean") return null; result[key] = val; continue; }
    if (["finalistCapPerTrack", "minimumReviews", "judgeCount"].includes(key)) { if (!integer(val, 1) || val > 9999) return null; result[key] = val; continue; }
    if (["trackLabels", "trackDescriptions"].includes(key)) { const tracks = decodeTrackSettings(val); if (!tracks) return null; result[key] = tracks; continue; }
    if (key === "whatsappSupportUrl") { if (!whatsappGroupUrl(val)) return null; result[key] = val; continue; }
    if (key === "thirdReviewDifference") { if (typeof val !== "number" || !Number.isFinite(val) || val <= 0 || val > 20) return null; result[key] = val; continue; }
    if (["selectionScoreMin", "selectionScoreMax"].includes(key)) { if (typeof val !== "number" || !Number.isFinite(val)) return null; result[key] = val; continue; }
    if (!text(val, 20000) || !val.trim() || ["opensAt", "closesAt", "reviewDeadline", "finalDeckLockAt", "rosterConfirmationDeadline"].includes(key) && !Number.isFinite(Date.parse(val))) return null;
    result[key] = val;
  }
  return result;
}
function decodeEntry(value: unknown, identities = false): StaffCompetitionEntry | null {
  const row = record(value); if (!row || !uuid(row.id) || !COMPETITION_KINDS.includes(row.kind as CompetitionKind) || !integer(row.version, 1) || !text(row.status, 100) || !text(row.title, 2000) || row.track !== null && !text(row.track, 100) || !text(row.eligibility, 100) || row.assignedCount !== null && !integer(row.assignedCount) || row.completedCount !== null && !integer(row.completedCount) || !Array.isArray(row.roster) || row.roster.length > 5 || !Array.isArray(row.files) || row.files.length > 100 || row.outcome !== null && !text(row.outcome, 2000)) return null;
  const roster: StaffCompetitionEntry["roster"] = [], files: StaffCompetitionEntry["files"] = [];
  for (const raw of row.roster) { const member = record(raw); if (!member || !uuid(member.id) || !text(member.email, 254) || typeof member.isLead !== "boolean" || typeof member.confirmed !== "boolean") return null; const profile = identities && member.profile != null ? decodeEligibilityProfile(member.profile) : null; if (identities && member.profile != null && !profile || member.memberId !== undefined && !uuid(member.memberId)) return null; roster.push({ id: member.id, email: member.email, isLead: member.isLead, confirmed: member.confirmed, ...(member.memberId ? { memberId: member.memberId as string } : {}), ...(identities ? { profile } : {}) }); }
  for (const raw of row.files) { const file = record(raw); if (!file || !uuid(file.id) || !text(file.name, 500) || !text(file.stage, 100)) return null; files.push({ id: file.id, name: file.name, stage: file.stage }); }
  const doc = record(row.document), administrativeDeclarations = row.kind === "hackathon" && doc?.declarations !== undefined ? decodeAdministrativeDeclarations(doc.declarations) : null, sourceText = doc?.[row.kind === "hackathon" ? "pitch" : "narrative"];
  if (sourceText !== undefined && !text(sourceText, 100000)) return null;
  const application = administrativeDeclarations && doc && text(doc.references, 200000) && Array.isArray(doc.links) && doc.links.length <= 10 && doc.links.every(validHackathonLink) ? { references: doc.references, links: doc.links as string[], declarations: administrativeDeclarations } : undefined;
  let decision: StaffCompetitionEntry["decision"] = null;
  if (row.decision !== undefined && row.decision !== null) { const item = record(row.decision); if (!item || !uuid(item.id) || !text(item.outcome, 100) || item.rank !== null && !integer(item.rank, 1) || item.tieResolution !== null && !text(item.tieResolution, 3000) || !text(item.reason, 3000) || typeof item.published !== "boolean") return null; decision = { id: item.id, outcome: item.outcome, rank: item.rank as number | null, tieResolution: item.tieResolution as string | null, reason: item.reason, published: item.published }; }
  const framework = row.framework == null ? undefined : decodeFrameworkStatus(row.framework); if (row.framework != null && !framework) return null;
  let reviewBasis: StaffCompetitionEntry["reviewBasis"];
  if (row.reviewBasis !== undefined) { if (!Array.isArray(row.reviewBasis) || row.reviewBasis.length > 100) return null; reviewBasis = []; for (const raw of row.reviewBasis) { const item = record(raw), scorecard = decodeCompetitionScorecard(item?.scorecard), rubric = decodeCompetitionRubric(item?.rubric); if (!item || !uuid(item.assignmentId) || !integer(item.version, 1) || !integer(item.settingsVersion, 1) || !scorecard || !rubric) return null; reviewBasis.push({ assignmentId: item.assignmentId, version: item.version, settingsVersion: item.settingsVersion, scorecard, rubric }); } }
  return { id: row.id, kind: row.kind as CompetitionKind, version: row.version, status: row.status, title: row.title, track: row.track as string | null, eligibility: row.eligibility, assignedCount: row.assignedCount, completedCount: row.completedCount, sourceText: typeof sourceText === "string" ? sourceText : "", ...(application ? { application } : {}), roster, files, outcome: row.outcome as string | null, decision, ...(framework ? { framework } : {}), ...(reviewBasis ? { reviewBasis } : {}) };
}
/** Different views have independent allowlists. Judges never receive pre-event cards. */
export function projectStaffCompetitionResponse(view: string, value: unknown): StaffCompetitionResponse | null {
  const data = record(value); if (!data || typeof data.state !== "string") return null;
  if (failures.includes(data.state)) return { state: data.state.replaceAll("_", "-") };
  if (!successes.includes(data.state)) return null;
  const out: StaffCompetitionResponse = { state: data.state };
  if (view === "settings") {
    const settings = decodeStaffCompetitionSettings(data.settings), stages = record(data.stageStates);
    if (!settings || !integer(data.version) || typeof data.enabled !== "boolean" || typeof data.evidenceReady !== "boolean" || !stages || Object.entries(stages).some(([key, val]) => !["entry", "selection", "judging", "final_material", "membership"].includes(key) || !["open", "closed", "not_ready"].includes(String(val)))) return null;
    Object.assign(out, { settings, version: data.version, enabled: data.enabled, evidenceReady: data.evidenceReady, stageStates: stages });
  }
  if (["list", "export", "eligibility"].includes(view)) { if (!Array.isArray(data.entries) || data.entries.length > 5000) return null; const entries = data.entries.map((entry) => decodeEntry(entry, view === "eligibility")); if (entries.some((row) => !row)) return null; out.entries = entries as StaffCompetitionEntry[]; }
  if (["queue", "judge_queue"].includes(view)) { if (!Array.isArray(data.assignments) || data.assignments.length > 5000) return null; const assignments = data.assignments.map(decodeCompetitionAssignment); if (assignments.some((row) => !row)) return null; out.assignments = assignments.filter((row) => row !== null); }
  if (["packet", "judge_packet"].includes(view)) { if (!Array.isArray(data.assignments) || data.assignments.length > 1) return null; const assignments = data.assignments.map(decodeCompetitionAssignment); if (assignments.some((row) => !row)) return null; out.assignments = assignments.filter((row) => row !== null); }
  if (data.version !== undefined) { if (!integer(data.version)) return null; out.version = data.version; }
  if (data.count !== undefined) { if (!integer(data.count)) return null; out.count = data.count; }
  return out;
}
function validatePayload(action: string, value: unknown): Record<string, unknown> | null {
  const row = record(value); if (!row) return null;
  const keys = (...allowed: string[]) => Object.keys(row).every((key) => allowed.includes(key));
  if (action === "settings") { const settings = decodeStaffCompetitionSettings(row.settings); return keys("settings", "expectedVersion") && integer(row.expectedVersion) && settings ? { expectedVersion: row.expectedVersion, settings } : null; }
  if (["review", "judge"].includes(action)) { const scorecard = decodeCompetitionScorecard(row.scorecard); return keys("assignmentId", "expectedVersion", "scorecard", "submit") && uuid(row.assignmentId) && integer(row.expectedVersion, 1) && scorecard && typeof row.submit === "boolean" ? { assignmentId: row.assignmentId, expectedVersion: row.expectedVersion, scorecard, submit: row.submit } : null; }
  if (["conflict", "judge_conflict", "judge_flag"].includes(action)) return keys("assignmentId", "expectedVersion", "reason") && uuid(row.assignmentId) && integer(row.expectedVersion, 1) && text(row.reason, 3000) && row.reason.trim() ? { assignmentId: row.assignmentId, expectedVersion: row.expectedVersion, reason: row.reason } : null;
  if (action === "judge_concern") return keys("assignmentId", "expectedVersion", "category", "reason") && uuid(row.assignmentId) && integer(row.expectedVersion, 1) && ["originality", "ethics", "privacy", "safety"].includes(String(row.category)) && text(row.reason, 3000) && row.reason.trim() ? row : null;
  if (action === "affiliations") return keys("affiliations") && Array.isArray(row.affiliations) && row.affiliations.length > 0 && row.affiliations.length <= 100 && row.affiliations.every((value) => text(value, 500) && value.trim()) ? row : null;
  if (action === "file_read") return keys("entryId", "fileId") && uuid(row.entryId) && uuid(row.fileId) ? row : null;
  if (!uuid(row.entryId) || !integer(row.expectedVersion, 1)) return null;
  if (["third_review", "reserve_offer", "withdraw", "eligibility_flag"].includes(action)) return keys("entryId", "expectedVersion", "reason") && text(row.reason, 3000) && row.reason.trim() ? row : null;
  if (action === "committee_review") return keys("entryId", "expectedVersion", "reason", "resolution", "integrityFlag") && ["clear", "hold"].includes(String(row.resolution)) && typeof row.integrityFlag === "boolean" && text(row.reason, 3000) && row.reason.trim() ? row : null;
  if (action === "roster_change") return keys("entryId", "expectedVersion", "reason", "change", "memberId", "email") && text(row.reason, 3000) && row.reason.trim() && (row.change === "remove" && uuid(row.memberId) && row.email === undefined || row.change === "add" && text(row.email, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) && row.memberId === undefined) ? row : null;
  if (action === "publish_selection") return keys("entryId", "expectedVersion", "decisionId") && uuid(row.decisionId) ? row : null;
  if (action === "eligibility") return keys("entryId", "expectedVersion", "eligible", "reason") && typeof row.eligible === "boolean" && text(row.reason, 3000) && row.reason.trim() ? { entryId: row.entryId, expectedVersion: row.expectedVersion, eligibility: row.eligible ? "eligible" : "ineligible", reason: row.reason } : null;
  if (action === "prepare_packet") { const packet = decodeCompetitionPacket(row.packet); return keys("entryId", "expectedVersion", "packet", "attestation") && packet && row.attestation === true ? { ...row, packet } : null; }
  if (action === "assign") return keys("entryId", "expectedVersion", "reviewerId") && uuid(row.reviewerId) ? row : null;
  if (action === "select") return keys("entryId", "expectedVersion", "outcome", "reason", "rank", "tieResolution") && ["accept", "reject", "reserve"].includes(String(row.outcome)) && text(row.reason, 3000) && row.reason.trim() && (row.rank === null || integer(row.rank, 1)) && (row.tieResolution === null || text(row.tieResolution, 3000) && row.tieResolution.trim()) && (row.outcome !== "accept" || row.rank !== null && row.tieResolution !== null) ? row : null;
  if (action === "panel") return keys("entryId", "expectedVersion", "judgeIds") && Array.isArray(row.judgeIds) && row.judgeIds.length > 0 && row.judgeIds.length <= 100 && row.judgeIds.every(uuid) && new Set(row.judgeIds).size === row.judgeIds.length ? row : null;
  if (action === "activity") return keys("entryId", "expectedVersion", "participantId", "activity", "evidence") && uuid(row.participantId) && text(row.activity, 200) && row.activity.trim() && text(row.evidence, 3000) && row.evidence.trim() ? row : null;
  if (action === "outcome") return keys("entryId", "expectedVersion", "outcome", "reason") && text(row.outcome, 2000) && row.outcome.trim() && text(row.reason, 3000) && row.reason.trim() ? row : null;
  return null;
}
export function createStaffCompetitionHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; storage?: (config: StaffConfig) => CompetitionStorage; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    if (process.env.COMPETITIONS_ENABLED !== "true") return Response.json({ state: "closed" }, { status: 503, headers: privateHeaders });
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers: privateHeaders });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: StaffCompetitionResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...privateHeaders, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = record(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const fresh = await backend.refresh(session.refreshToken); if (!fresh || fresh.actorId !== session.actorId || fresh.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...fresh }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now); if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, admin = roles.includes("superAdmin"), science = roles.includes("scientificAdministrator"), committee = roles.includes("judgingCommittee"), judge = roles.includes("facultyJudge"), eligibility = roles.includes("registrationWorkshopAdministrator");
      const query = new URL(request.url).searchParams;
      let input: Record<string, unknown> | null = null;
      if (request.method === "POST") { try { input = record(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); } }
      const kind = request.method === "GET" ? query.get("kind") : input?.kind;
      if (!COMPETITION_KINDS.includes(kind as CompetitionKind)) return reply({ state: "invalid" }, 400);
      const reviewer = roles.includes(kind === "hackathon" ? "hackathonReviewer" : "threeMinuteThesisReviewer");
      const deliver = async (view: string, name: string, args: Record<string, unknown>) => {
        let raw = await backend.rpc(name, { edition_key: config.editionKey, competition_type: kind, ...args }, session.accessToken);
        // Committee readiness never acquires the scientific review projection,
        // even if a provider accidentally adds another area's fields.
        if (view === "list" && committee && !science && !admin) { const value = record(raw); if (value && Array.isArray(value.entries)) raw = { ...value, entries: value.entries.filter((entry) => kind === "hackathon" || record(entry)?.status === "accepted").map((entry) => { const item = record(entry)!; return { ...Object.fromEntries(Object.entries(item).filter(([key]) => !["reviewBasis", "decision"].includes(key))), assignedCount: 0, completedCount: 0 }; }) }; }
        const decoded = projectStaffCompetitionResponse(view, raw); if (!decoded) return reply({ state: "unavailable" }, 503);
        return reply(decoded, successes.includes(decoded.state) ? 200 : decoded.state === "denied" ? 403 : decoded.state === "limited" ? 429 : ["closed", "unavailable", "area-not-ready"].includes(decoded.state) ? 503 : 409);
      };
      if (request.method === "GET") {
        const view = query.get("view"), entryId = query.get("entryId");
        if (!view || !["settings", "list", "queue", "packet", "judge_queue", "judge_packet", "export", "eligibility"].includes(view) || query.size !== (["packet", "judge_packet"].includes(view) ? 3 : 2) || ["packet", "judge_packet"].includes(view) && !uuid(entryId)) return reply({ state: "invalid" }, 400);
        const permitted = view === "eligibility" ? kind === "hackathon" && (eligibility || admin) : view === "export" ? science || admin : ["settings", "list"].includes(view) ? science || committee || admin : view.startsWith("judge_") ? judge || admin : reviewer || admin;
        if (!permitted) return reply({ state: "denied" }, 403);
        return await deliver(view, "msrc_staff_competitions_data", { view, entry_id: entryId });
      }
      if (!input || query.size || Object.keys(input).some((key) => !["action", "kind", "payload", "operationId", "formToken"].includes(key)) || !text(input.action, 50) || !uuid(input.operationId)) return reply({ state: "invalid" }, 400);
      const action = input.action, allowed = action === "settings" ? admin : action === "file_read" ? science || committee || judge || eligibility || admin : action === "eligibility_flag" ? kind === "hackathon" && (eligibility || admin) : ["eligibility", "eligibility_flag"].includes(action) ? admin || (kind === "hackathon" ? eligibility : science) : ["prepare_packet", "assign", "select", "publish_selection", "third_review", "reserve_offer"].includes(action) ? science || admin : ["panel", "activity", "outcome", "committee_review", "roster_change", "withdraw"].includes(action) ? committee || admin : ["review", "conflict", "affiliations"].includes(action) ? reviewer : ["judge", "judge_conflict", "judge_flag", "judge_concern"].includes(action) ? judge : false;
      if (!allowed) return reply({ state: "denied" }, 403);
      const payload = validatePayload(action, input.payload), nonce = readStaffFormToken(config, input.formToken, origin, now), ip = staffIp(config, request); if (!payload || !nonce || !ip) return reply({ state: "invalid" }, 400);
      if (record(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }))?.state !== "claimed") return reply({ state: "limited" }, 429);
      if (action === "file_read") {
        const raw = record(await backend.rpc("msrc_staff_competitions_mutate", { edition_key: config.editionKey, competition_type: kind, action, payload, operation_id: input.operationId }, session.accessToken));
        if (raw?.state !== "ready") { const refused = projectStaffCompetitionResponse("mutation", raw); return reply(refused ?? { state: "unavailable" }, refused?.state === "denied" ? 403 : 503); }
        if (raw.bucket !== "msrc-competition-files" || raw.fileId !== payload.fileId || raw.path !== config.editionKey + "/" + payload.entryId + "/" + payload.fileId) return reply({ state: "unavailable" }, 503);
        if (process.env.COMPETITIONS_ENABLED !== "true" || (dependencies.readiness ?? getStaffConfig)().state !== "ready") return reply({ state: "closed" }, 503);
        const url = await (dependencies.storage ?? createCompetitionStorage)(config).sign(String(raw.path), false);
        return reply({ state: "ready", fileTransfer: { fileId: String(payload.fileId), url } });
      }
      return await deliver("mutation", "msrc_staff_competitions_mutate", { action, payload, operation_id: input.operationId });
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleStaffCompetitions = createStaffCompetitionHandler();
