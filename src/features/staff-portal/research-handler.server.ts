import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "./security.server";
import { decodeResearchPacket, decodeResearchRubric, decodeResearchScorecard, decodeResearchSettings, researchInteger, researchRecord, researchText, researchUuid, type ResearchDecision, type ResearchResponse } from "./research-contract";
import { decodeScreeningInput, decodeScreeningReview, decodeScreeningSettings, RECOMMENDED_BANDS } from "./screening-contract";
import type { RecommendedBand } from "./abstract-rubric";
import type { ScreeningStatus } from "./screening-contract";
import { decodeSubmissionWindow, validWindow } from "../submissions/submission-window";
import { getParticipantConfig } from "../participant-accounts/config.server";
import { participantNotice } from "../participant-accounts/privacy.server";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const states = new Set(["denied", "invalid", "conflict", "not_found", "limited", "unavailable", "closed", "settings_incomplete", "evidence_gate", "conflict_of_interest", "affiliations_required", "packet_required", "blinding_required", "review_locked", "reviews_incomplete", "already_assigned", "no_eligible_reviewers", "batch_conflict", "locked", "coi", "full", "duplicate", "area_not_ready", "screening_required", "investigation_open"]);
const outcomes = ["accept", "reject", "revise"];
async function optionalRpc(backend: StaffBackend, name: string, args: Record<string, unknown>, token: string): Promise<unknown> {
  try { return await backend.rpc(name, args, token); } catch (error) { if (error instanceof StaffRpcMissingError) return { state: "area_not_ready" }; throw error; }
}
const validDate = (value: unknown) => value === null || typeof value === "string" && Number.isFinite(Date.parse(value));
function decision(value: unknown): ResearchDecision | null { const row = researchRecord(value); return row && researchUuid(row.id) && outcomes.includes(String(row.outcome)) && researchText(row.reason) && researchText(row.instructions) && validDate(row.revisionDeadline) && researchText(row.state, 80) ? { id: row.id, outcome: row.outcome as ResearchDecision["outcome"], reason: row.reason, instructions: row.instructions, revisionDeadline: row.revisionDeadline as string | null, state: row.state } : null; }
function decodeResponse(value: unknown): ResearchResponse | null {
  const data = researchRecord(value); if (!data || typeof data.state !== "string") return null;
  const aliases: Record<string, string> = { locked: "review-locked", coi: "conflict-of-interest", full: "assignment-full", duplicate: "already-assigned", preview_required: "batch-conflict" };
  if (states.has(data.state) || data.state === "preview_required") return { state: aliases[data.state] ?? data.state.replaceAll("_", "-") };
  if (!["ready", "updated", "created", "prepared", "published", "assigned"].includes(data.state)) return null;
  const result: ResearchResponse = { state: data.state };
  if (data.window !== undefined) { const window = decodeSubmissionWindow(data.window); if (!window) return null; result.window = window; }
  if (data.screening !== undefined) { const screening = decodeScreeningReview(data.screening); if (!screening) return null; result.screening = screening; }
  if (data.screeningSettings !== undefined) { const settings = decodeScreeningSettings(data.screeningSettings); if (!settings) return null; result.screeningSettings = settings; }
  if (data.recommendedBand !== undefined) { if (!RECOMMENDED_BANDS.includes(data.recommendedBand as RecommendedBand)) return null; result.recommendedBand = data.recommendedBand as RecommendedBand; }
  if (data.version !== undefined) { if (!researchInteger(data.version)) return null; result.version = data.version; }
  if (data.studyTemplate !== undefined) { if (data.studyTemplate !== "research" && data.studyTemplate !== "case_report") return null; result.studyTemplate = data.studyTemplate; }
  if (data.reviewPolicy !== undefined) { const policy = researchRecord(data.reviewPolicy); if (!policy || typeof policy.deadline !== "string" || !validDate(policy.deadline) || !researchText(policy.ongoingPolicy, 3000) || !researchInteger(policy.requiredReviews, 1) || policy.requiredReviews > 5 || !researchText(policy.aggregationPolicy, 3000) || !researchText(policy.notApplicablePolicy, 3000)) return null; result.reviewPolicy = { deadline: policy.deadline, ongoingPolicy: policy.ongoingPolicy, requiredReviews: policy.requiredReviews, aggregationPolicy: policy.aggregationPolicy, notApplicablePolicy: policy.notApplicablePolicy }; }
  if (data.reviewSummary !== undefined) {
    const summary = researchRecord(data.reviewSummary), scoreValue = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
    if (!summary || summary.requiredReviews !== null && (!researchInteger(summary.requiredReviews, 1) || summary.requiredReviews > 5) || !researchInteger(summary.completedReviews) || summary.meanScore !== null && !scoreValue(summary.meanScore) || !Array.isArray(summary.reviews) || summary.reviews.length > 100 || summary.completedReviews !== summary.reviews.length || summary.meanScore !== null && (summary.requiredReviews === null || summary.completedReviews < Number(summary.requiredReviews))) return null;
    result.reviewSummary = { requiredReviews: summary.requiredReviews as number | null, completedReviews: summary.completedReviews, meanScore: summary.meanScore as number | null, reviews: [] };
    for (const raw of summary.reviews) {
      const review = researchRecord(raw), rubric = decodeResearchRubric(review?.rubric), scorecard = decodeResearchScorecard(review?.scorecard);
      if (!review || !rubric || !scorecard || !scorecard.recommendation || !researchUuid(review.assignmentId) || !researchInteger(review.submissionVersion, 1) || !researchInteger(review.rubricVersion, 1) || !scoreValue(review.total) || scorecard.scores.length !== rubric.length || rubric.some((criterion) => { const score = scorecard.scores.find((entry) => entry.criterionId === criterion.id); return !score || score.value < criterion.min || score.value > criterion.max; })) return null;
      result.reviewSummary.reviews.push({ assignmentId: review.assignmentId, submissionVersion: review.submissionVersion, rubricVersion: review.rubricVersion, total: review.total, scorecard: { ...scorecard, recommendation: scorecard.recommendation }, rubric });
    }
  }
  if (data.settings !== undefined) {
    const settings = decodeResearchSettings(data.settings); if (!settings || !researchInteger(data.version) || typeof data.complete !== "boolean" || typeof data.enabled !== "boolean" || typeof data.evidenceReady !== "boolean") return null;
    Object.assign(result, { settings, version: data.version, complete: data.complete, enabled: data.enabled, evidenceReady: data.evidenceReady });
  }
  if (data.submissions !== undefined) {
    if (!Array.isArray(data.submissions) || data.submissions.length > 5000) return null;
    result.submissions = []; for (const raw of data.submissions) { const row = researchRecord(raw), item = row?.decision === null ? null : decision(row?.decision); if (!row || !researchUuid(row.id) || !researchText(row.reference, 160) || !researchText(row.status, 100) || !researchInteger(row.version, 1) || !researchText(row.title, 6000) || !researchInteger(row.wordCount) || typeof row.packetReady !== "boolean" || !researchInteger(row.assignedCount) || !researchInteger(row.completedCount) || row.decision !== null && !item) return null; result.submissions.push({ id: row.id, reference: row.reference, status: row.status, version: row.version, title: row.title, wordCount: row.wordCount, packetReady: row.packetReady, assignedCount: row.assignedCount, completedCount: row.completedCount, decision: item }); }
    for (const [index, raw] of data.submissions.entries()) {
      const row = researchRecord(raw)!;
      if (row.screeningStatus !== undefined) { if (!["pending", "passed", "failed_correctable", "failed_final"].includes(String(row.screeningStatus))) return null; result.submissions[index].screeningStatus = row.screeningStatus as ScreeningStatus; }
      if (row.recommendedBand !== undefined) { if (!RECOMMENDED_BANDS.includes(row.recommendedBand as RecommendedBand)) return null; result.submissions[index].recommendedBand = row.recommendedBand as RecommendedBand; }
    }
  }
  if (data.reviewers !== undefined) { if (!Array.isArray(data.reviewers) || data.reviewers.length > 5000) return null; result.reviewers = []; for (const raw of data.reviewers) { const row = researchRecord(raw); if (!row || !researchUuid(row.id) || !researchText(row.name, 500) || !Array.isArray(row.affiliations) || !row.affiliations.every((affiliation) => researchText(affiliation, 500)) || !researchInteger(row.activeAssignments)) return null; result.reviewers.push({ id: row.id, name: row.name, affiliations: row.affiliations as string[], activeAssignments: row.activeAssignments }); } }
  if (data.assignments !== undefined) {
    if (!Array.isArray(data.assignments) || data.assignments.length > 5000 || typeof data.oversight !== "boolean") return null;
    result.oversight = data.oversight; result.assignments = [];
    for (const raw of data.assignments) { const row = researchRecord(raw); if (!row || !researchUuid(row.id) || !researchText(row.reference, 160) || !researchText(row.status, 100) || !researchInteger(row.version, 1) || !researchText(row.title, 6000)) return null; result.assignments.push({ id: row.id, reference: row.reference, status: row.status, version: row.version, title: row.title }); }
    if (!Array.isArray(data.ownAffiliations) || !data.ownAffiliations.every((entry) => researchText(entry, 500))) return null; result.ownAffiliations = data.ownAffiliations as string[];
  }
  if (data.submission !== undefined) {
    const row = researchRecord(data.submission), doc = researchRecord(row?.document);
    const packet = doc ? decodeResearchPacket({ title: doc.title, body: doc.body, specialtyId: doc.specialtyId, studyTypeId: doc.studyTypeId,
      ...(Object.hasOwn(doc, "analysisComplete") ? { studyTypeOther: doc.studyTypeOther, analysisComplete: doc.analysisComplete }
        : { completionStatus: doc.completionStatus, keywords: doc.keywords }) }) : null;
    if (!row || !packet || !researchUuid(row.id) || !researchText(row.reference, 160) || !researchInteger(row.version, 1) || !researchText(row.status, 100) || !researchInteger(row.wordCount)) return null;
    result.submission = { id: row.id, reference: row.reference, version: row.version, status: row.status, wordCount: row.wordCount, document: packet };
    // This private science-detail response is separate from every reviewer/AI packet.
    if (doc?.supervisor !== undefined) {
      const supervisor = researchRecord(doc.supervisor);
      if (!supervisor || !researchText(supervisor.fullName, 500) || !researchText(supervisor.email, 500) || !researchText(supervisor.phone, 500)) return null;
      result.submission.supervisor = { fullName: supervisor.fullName, email: supervisor.email, phone: supervisor.phone };
    }
    if (!researchInteger(data.packetVersion)) return null; result.packetVersion = data.packetVersion;
  }
  if (data.packet !== undefined) { const packet = data.packet === null ? null : decodeResearchPacket(data.packet); if (data.packet !== null && !packet) return null; result.packet = packet; }
  if (data.assignment !== undefined) { const row = researchRecord(data.assignment); if (!row || !researchUuid(row.id) || !researchInteger(row.version, 1) || !researchInteger(row.submissionVersion, 1) || !researchInteger(row.rubricVersion, 1) || !researchText(row.status, 100)) return null; result.assignment = { id: row.id, version: row.version, status: row.status, submissionVersion: row.submissionVersion, rubricVersion: row.rubricVersion }; }
  if (data.rubric !== undefined) { const rubric = decodeResearchRubric(data.rubric); if (!rubric) return null; result.rubric = rubric; }
  if (data.scorecard !== undefined) { const scorecard = data.scorecard === null ? null : decodeResearchScorecard(data.scorecard); if (data.scorecard !== null && !scorecard) return null; result.scorecard = scorecard; }
  if (data.decision !== undefined) { const item = decision(data.decision); if (!item) return null; result.decision = item; }
  for (const key of ["assigned", "queued", "count"] as const) if (data[key] !== undefined) { if (!researchInteger(data[key])) return null; result[key] = data[key]; }
  if (data.batchId !== undefined) { if (!researchUuid(data.batchId)) return null; result.batchId = data.batchId; }
  if (data.emailState !== undefined) { if (data.emailState !== "draft_held") return null; result.emailState = "draft_held"; }
  if (data.decisions !== undefined) { if (!Array.isArray(data.decisions) || data.decisions.length > 5000) return null; result.decisions = []; for (const raw of data.decisions) { const row = researchRecord(raw); if (!row || !researchUuid(row.id) || !researchText(row.reference, 160) || !outcomes.includes(String(row.outcome)) || !researchText(row.instructions) || !validDate(row.revisionDeadline)) return null; result.decisions.push({ id: row.id, reference: row.reference, outcome: row.outcome as ResearchDecision["outcome"], instructions: row.instructions, revisionDeadline: row.revisionDeadline as string | null }); } }
  return result;
}

/** An RPC cannot widen a different area's projection, especially the blind queue. */
function projectRpc(name: string, value: unknown): ResearchResponse | null {
  const data = researchRecord(value); if (!data) return null;
  const fields: Record<string, readonly string[]> = {
    window: ["window"], save_window: ["window"],
    settings: ["version", "settings", "complete", "enabled", "evidenceReady"], save_settings: ["version", "settings", "complete", "enabled", "evidenceReady"],
    list: ["submissions"], reviewers: ["reviewers"], queue: ["assignments", "oversight", "ownAffiliations"],
    packet: ["assignment", "packet", "rubric", "scorecard", "studyTemplate", "reviewPolicy"],
    submission: ["submission", "packet", "packetVersion", "reviewSummary", "screening", "recommendedBand"], scorecard: ["version"], auto_assign: ["count"],
    screening_settings: ["screeningSettings"], save_screening_settings: ["screeningSettings"],
    batch: ["batchId", "count", "decisions", "emailState"],
  };
  return decodeResponse(Object.fromEntries(["state", ...(fields[name] ?? [])].filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]])));
}

export function createResearchHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; now?: () => number } = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)(); if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request); let rotated: string | undefined;
    const reply = (body: ResearchResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")) || request.headers.get("origin") && request.headers.get("origin") !== origin || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = researchRecord(await backend.rpc("msrc_staff_status")); if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now); if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) { const refreshed = await backend.refresh(session.refreshToken); if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403); session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now); }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline) return reply({ state: "denied" }, 403);
      const roles = authority.profile.roles, science = roles.includes("scientificAdministrator"), admin = roles.includes("superAdmin"), reviewer = roles.includes("abstractReviewer");
      if (!science && !admin && !reviewer) return reply({ state: "denied" }, 403);
      const rpc = async (name: string, args: Record<string, unknown> = {}) => {
        let raw = await optionalRpc(backend, "msrc_staff_research_" + name, { edition_key: config.editionKey, ...args }, session.accessToken);
        if (name === "window" || name === "save_window") {
          const data = researchRecord(raw), window = researchRecord(data?.window), participant = getParticipantConfig();
          if (window) raw = { ...data, window: { ...window,
            ...(participant.state === "ready" ? { privacyReady: window.privacyVersion === participantNotice("en", participant.config.testMode)?.version, emailReady: window.emailDailyLimit === participant.config.emailDailyLimit } : {}),
            deploymentReady: process.env.ABSTRACT_SUBMISSIONS_ENABLED === "true" && participant.state === "ready" && participant.config.editionKey === config.editionKey } };
        }
        const decoded = projectRpc(name, raw);
        if (!decoded) return reply({ state: "unavailable" }, 503);
        return reply(decoded, ["ready", "updated", "created", "prepared", "published", "assigned"].includes(decoded.state) ? 200 : decoded.state === "denied" ? 403 : decoded.state === "limited" ? 429 : ["unavailable", "area-not-ready"].includes(decoded.state) ? 503 : 409);
      };
      if (request.method === "GET") {
        const query = new URL(request.url).searchParams, area = query.get("area");
        if (query.size === 1 && ["window", "settings", "screening-settings", "list", "reviewers"].includes(String(area))) return science || admin ? await rpc(area!.replaceAll("-", "_")) : reply({ state: "denied" }, 403);
        if (query.size === 1 && area === "queue") return reviewer || admin ? await rpc("queue") : reply({ state: "denied" }, 403);
        if (query.size === 2 && area === "packet" && researchUuid(query.get("assignmentId"))) return reviewer || admin ? await rpc("packet", { assignment_id: query.get("assignmentId") }) : reply({ state: "denied" }, 403);
        if (query.size === 2 && area === "submission" && researchUuid(query.get("submissionId"))) return science || admin ? await rpc("submission", { submission_id: query.get("submissionId") }) : reply({ state: "denied" }, 403);
        return reply({ state: "invalid" }, 400);
      }
      let input: Record<string, unknown> | null; try { input = researchRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request); if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const keys = (...allowed: string[]) => Object.keys(input).every((key) => ["action", "formToken", ...allowed].includes(key));
      if (input.action === "save-window" && !admin) return reply({ state: "denied" }, 403);
      const scienceActions = ["prepare-packet", "assign", "auto-assign", "decision", "batch", "confirm-screening", "request-additional-review"], reviewerActions = ["scorecard", "review-response", "declare-affiliations"];
      if (scienceActions.includes(String(input.action)) && !science && !admin || reviewerActions.includes(String(input.action)) && !reviewer || input.action === "save-settings" && !science && !admin || input.action === "save-screening-settings" && !admin) return reply({ state: "denied" }, 403);
      const claimed = researchRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) })); if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      if (input.action === "save-window") return keys("version", "opensAt", "closesAt", "enabled") && researchInteger(input.version) && typeof input.enabled === "boolean" && validWindow(input.opensAt, input.closesAt) && (!input.enabled || input.opensAt !== null) ? await rpc("save_window", { expected_version: input.version, opens_at: input.opensAt, closes_at: input.closesAt, accept_submissions: input.enabled }) : reply({ state: "invalid" }, 400);
      if (input.action === "save-settings") { const settings = decodeResearchSettings(input.settings); return settings && researchInteger(input.version) && keys("version", "settings") ? await rpc("save_settings", { expected_version: input.version, settings }) : reply({ state: "invalid" }, 400); }
      if (input.action === "save-screening-settings") { const settings = decodeScreeningSettings(input.settings); return settings && keys("settings") ? await rpc("save_screening_settings", { expected_version: settings.version, bands: settings.bands, similarity_threshold: settings.similarityThreshold, oral_capacity: settings.oralCapacity }) : reply({ state: "invalid" }, 400); }
      if (input.action === "confirm-screening") { const screening = decodeScreeningInput(input.screening); return screening && keys("submissionId", "version", "sequence", "operationId", "screening") && researchUuid(input.submissionId) && researchUuid(input.operationId) && researchInteger(input.version, 1) && researchInteger(input.sequence) ? await rpc("confirm_screening", { submission_id: input.submissionId, expected_version: input.version, expected_sequence: input.sequence, operation_id: input.operationId, screening }) : reply({ state: "invalid" }, 400); }
      if (input.action === "request-additional-review") return keys("submissionId", "expectedRequired", "requiredReviews", "note", "operationId") && researchUuid(input.submissionId) && researchUuid(input.operationId) && researchInteger(input.expectedRequired, 2) && researchInteger(input.requiredReviews, 3) && input.requiredReviews <= 5 && input.requiredReviews > input.expectedRequired && researchText(input.note, 3000) && !!input.note.trim() ? await rpc("request_review", { submission_id: input.submissionId, expected_required: input.expectedRequired, required_reviews: input.requiredReviews, note: input.note, operation_id: input.operationId }) : reply({ state: "invalid" }, 400);
      if (input.action === "declare-affiliations") return keys("affiliations") && Array.isArray(input.affiliations) && input.affiliations.length > 0 && input.affiliations.length <= 100 && input.affiliations.every((entry) => researchText(entry, 500) && entry.trim()) ? await rpc("declare_affiliations", { affiliations: input.affiliations }) : reply({ state: "invalid" }, 400);
      if (input.action === "scorecard") { const scorecard = decodeResearchScorecard(input.scorecard); return keys("assignmentId", "version", "scorecard", "submit") && researchUuid(input.assignmentId) && researchInteger(input.version, 1) && scorecard && typeof input.submit === "boolean" && (!input.submit || scorecard.recommendation !== null) ? await rpc("scorecard", { assignment_id: input.assignmentId, expected_version: input.version, scorecard, submit: input.submit }) : reply({ state: "invalid" }, 400); }
      if (input.action === "review-response") return keys("assignmentId", "response", "reason") && researchUuid(input.assignmentId) && ["decline", "conflict"].includes(String(input.response)) && researchText(input.reason, 3000) && !!input.reason.trim() ? await rpc("review_response", { assignment_id: input.assignmentId, response: input.response, reason: input.reason }) : reply({ state: "invalid" }, 400);
      if (input.action === "batch") return keys("decisionIds", "operationId", "stage", "confirmed") && input.confirmed === true && ["prepare", "publish"].includes(String(input.stage)) && researchUuid(input.operationId) && Array.isArray(input.decisionIds) && input.decisionIds.length > 0 && input.decisionIds.length <= 200 && input.decisionIds.every(researchUuid) && new Set(input.decisionIds).size === input.decisionIds.length ? await rpc("batch", { decision_ids: input.decisionIds, operation_id: input.operationId, action: input.stage }) : reply({ state: "invalid" }, 400);
      if (!researchUuid(input.submissionId)) return reply({ state: "invalid" }, 400);
      if (input.action === "assign") return keys("submissionId", "reviewerId") && researchUuid(input.reviewerId) ? await rpc("assign", { submission_id: input.submissionId, reviewer_id: input.reviewerId }) : reply({ state: "invalid" }, 400);
      if (input.action === "auto-assign") return keys("submissionId") ? await rpc("auto_assign", { submission_id: input.submissionId }) : reply({ state: "invalid" }, 400);
      if (input.action === "prepare-packet") { const packet = decodeResearchPacket(input.packet); return keys("submissionId", "version", "packet", "attestation") && researchInteger(input.version, 1) && packet && input.attestation === true ? await rpc("prepare_packet", { submission_id: input.submissionId, expected_version: input.version, packet, attestation: true }) : reply({ state: "invalid" }, 400); }
      if (input.action === "decision") return keys("submissionId", "version", "outcome", "reason", "instructions", "revisionDeadline") && researchInteger(input.version, 1) && outcomes.includes(String(input.outcome)) && researchText(input.reason, 3000) && !!input.reason.trim() && researchText(input.instructions, 4000) && !!input.instructions.trim() && validDate(input.revisionDeadline) && (input.outcome !== "revise" || !!input.instructions.trim() && input.revisionDeadline !== null) ? await rpc("decision", { submission_id: input.submissionId, expected_version: input.version, outcome: input.outcome, reason: input.reason, instructions: input.instructions, revision_deadline: input.revisionDeadline }) : reply({ state: "invalid" }, 400);
      return reply({ state: "invalid" }, 400);
    } catch (error) { return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503); }
  };
}
export const handleResearchRequest = createResearchHandler();
