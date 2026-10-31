/** ABS-01..15, REV-01..09: staff projections never forward provider JSON. */
import { ABSTRACT_BODY_KEYS, type AbstractDocument } from "../submissions/contracts.ts";
import type { RecommendedBand } from "./abstract-rubric";
import type { ScreeningInput, ScreeningReview, ScreeningSettings, ScreeningStatus } from "./screening-contract";
export type ResearchCriterion = { id: string; label: string; weight: number; min: number; max: number };
export type ResearchSettings = {
  opensAt: string | null; closesAt: string | null; reviewDeadline: string | null;
  specialties: { id: string; label: string }[]; studyTypes: { id: string; label: string; template: "research" | "case_report" }[];
  rubric: ResearchCriterion[]; reviewersPerAbstract: number | null; keywordCount: number | null;
  blindingPolicy: string | null; correspondingAuthorPolicy: string | null; ongoingPolicy: string | null;
  aggregationPolicy: string | null; acceptanceThreshold: number | null; notApplicablePolicy: string | null;
};
export type ResearchPacket = Pick<AbstractDocument, "title" | "body" | "specialtyId" | "studyTypeId" | "studyTypeOther" | "analysisComplete">;
export type ResearchScorecard = { scores: { criterionId: string; value: number }[]; comments: string; recommendation: "accept" | "reject" | "revise" | null };
export type ResearchDecision = { id: string; outcome: "accept" | "reject" | "revise"; reason: string; instructions: string; revisionDeadline: string | null; state: string };
export type ResearchSubmission = { id: string; reference: string; status: string; version: number; title: string; wordCount: number; packetReady: boolean; assignedCount: number; completedCount: number; decision: ResearchDecision | null; screeningStatus?: ScreeningStatus; recommendedBand?: RecommendedBand };
export type ResearchAssignment = { id: string; reference: string; status: string; version: number; title: string };
export type ResearchReviewer = { id: string; name: string; affiliations: string[]; activeAssignments: number };
export type ResearchReviewSummary = { requiredReviews: number | null; completedReviews: number; meanScore: number | null; reviews: { assignmentId: string; submissionVersion: number; rubricVersion: number; total: number; scorecard: ResearchScorecard & { recommendation: "accept" | "reject" | "revise" }; rubric: ResearchCriterion[] }[] };
export type ResearchDetail = { id: string; reference: string; version: number; status: string; wordCount: number; document: ResearchPacket; supervisor?: AbstractDocument["supervisor"] };
export type ResearchResponse = {
  state: string; formToken?: string; version?: number; settings?: ResearchSettings; evidenceReady?: boolean; enabled?: boolean; complete?: boolean;
  submissions?: ResearchSubmission[]; reviewers?: ResearchReviewer[]; assignments?: ResearchAssignment[]; oversight?: boolean; ownAffiliations?: string[];
  submission?: ResearchDetail; packet?: ResearchPacket | null; packetVersion?: number;
  assignment?: { id: string; version: number; status: string; submissionVersion: number; rubricVersion: number };
  rubric?: ResearchCriterion[]; scorecard?: ResearchScorecard | null; assigned?: number; queued?: number; decision?: ResearchDecision;
  studyTemplate?: "research" | "case_report";
  reviewPolicy?: { deadline: string; ongoingPolicy: string; requiredReviews: number; aggregationPolicy: string; notApplicablePolicy: string };
  reviewSummary?: ResearchReviewSummary;
  screening?: ScreeningReview; screeningSettings?: ScreeningSettings; recommendedBand?: RecommendedBand;
  batchId?: string; count?: number; emailState?: "draft_held"; decisions?: { id: string; reference: string; outcome: "accept" | "reject" | "revise"; instructions: string; revisionDeadline: string | null }[];
};
export type ResearchPayload = (
  | { action: "save-settings"; version: number; settings: ResearchSettings }
  | { action: "save-screening-settings"; settings: ScreeningSettings }
  | { action: "confirm-screening"; submissionId: string; version: number; sequence: number; operationId: string; screening: ScreeningInput }
  | { action: "request-additional-review"; submissionId: string; expectedRequired: number; requiredReviews: number; note: string; operationId: string }
  | { action: "prepare-packet"; submissionId: string; version: number; packet: ResearchPacket; attestation: true }
  | { action: "assign"; submissionId: string; reviewerId: string }
  | { action: "auto-assign"; submissionId: string }
  | { action: "scorecard"; assignmentId: string; version: number; scorecard: ResearchScorecard; submit: boolean }
  | { action: "review-response"; assignmentId: string; response: "decline" | "conflict"; reason: string }
  | { action: "declare-affiliations"; affiliations: string[] }
  | { action: "decision"; submissionId: string; version: number; outcome: "accept" | "reject" | "revise"; reason: string; instructions: string; revisionDeadline: string | null }
  | { action: "batch"; decisionIds: string[]; operationId: string; stage: "prepare" | "publish"; confirmed: true }
) & { formToken?: string };
export const researchRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const researchUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const researchInteger = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= 2_147_483_647;
export const researchText = (value: unknown, max = 6000): value is string => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const date = (value: unknown): value is string | null => value === null || typeof value === "string" && Number.isFinite(Date.parse(value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1_000_000;
const exact = (data: Record<string, unknown>, keys: readonly string[]) => Object.keys(data).length === keys.length && keys.every((key) => Object.hasOwn(data, key));
export function emptyResearchSettings(): ResearchSettings { return { opensAt: null, closesAt: null, reviewDeadline: null, specialties: [], studyTypes: [], rubric: [], reviewersPerAbstract: null, keywordCount: null, blindingPolicy: null, correspondingAuthorPolicy: null, ongoingPolicy: null, aggregationPolicy: null, acceptanceThreshold: null, notApplicablePolicy: null }; }
export function decodeResearchRubric(value: unknown): ResearchCriterion[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const result: ResearchCriterion[] = [];
  for (const raw of value) { const row = researchRecord(raw); if (!row || !exact(row, ["id", "label", "weight", "min", "max"]) || !researchText(row.id, 60) || !/^[A-Za-z0-9_-]+$/.test(row.id) || !researchText(row.label, 300) || !row.label.trim() || !finite(row.weight) || row.weight <= 0 || !finite(row.min) || !finite(row.max) || row.min >= row.max) return null; result.push({ id: row.id, label: row.label, weight: row.weight, min: row.min, max: row.max }); }
  return new Set(result.map((row) => row.id)).size === result.length ? result : null;
}
export function decodeResearchSettings(value: unknown): ResearchSettings | null {
  const row = researchRecord(value), base = emptyResearchSettings(); if (!row || !exact(row, Object.keys(base))) return null;
  const rubric = decodeResearchRubric(row.rubric); if (!rubric) return null;
  for (const key of ["opensAt", "closesAt", "reviewDeadline"] as const) if (!date(row[key])) return null;
  for (const key of ["blindingPolicy", "correspondingAuthorPolicy", "ongoingPolicy", "aggregationPolicy", "notApplicablePolicy"] as const) if (row[key] !== null && (!researchText(row[key], 3000) || !String(row[key]).trim())) return null;
  if (row.reviewersPerAbstract !== null && (!researchInteger(row.reviewersPerAbstract, 1) || row.reviewersPerAbstract > 5) || row.keywordCount !== null && (!researchInteger(row.keywordCount) || row.keywordCount > 999) || row.acceptanceThreshold !== null && (!finite(row.acceptanceThreshold) || row.acceptanceThreshold < 0 || row.acceptanceThreshold > 100)) return null;
  if (row.opensAt && row.closesAt && Date.parse(String(row.opensAt)) >= Date.parse(String(row.closesAt)) || row.reviewDeadline && row.closesAt && Date.parse(String(row.reviewDeadline)) <= Date.parse(String(row.closesAt))) return null;
  for (const key of ["specialties", "studyTypes"] as const) {
    if (!Array.isArray(row[key]) || row[key].length > 1000) return null;
    const ids = new Set<string>();
    for (const raw of row[key]) { const option = researchRecord(raw); if (!option || !exact(option, key === "specialties" ? ["id", "label"] : ["id", "label", "template"]) || !researchText(option.id, 60) || !/^[A-Za-z0-9_-]+$/.test(option.id) || !researchText(option.label, 300) || !option.label.trim() || ids.has(option.id) || key === "studyTypes" && !["research", "case_report"].includes(String(option.template))) return null; ids.add(option.id); }
  }
  return { ...Object.fromEntries(Object.keys(base).map((key) => [key, row[key]])), rubric } as ResearchSettings;
}
/** Historical snapshots stay immutable. Read projection alone renames aim and adds limitations. */
export function decodeResearchBody(value: unknown): ResearchPacket["body"] | null {
  const body = researchRecord(value);
  if (!body) return null;
  const legacy = exact(body, ["background", "aim", "methods", "results", "conclusion"]);
  if (!legacy && !exact(body, ABSTRACT_BODY_KEYS) || !Object.values(body).every((part) => researchText(part, 12000))) return null;
  return { background: body.background as string, objectives: (legacy ? body.aim : body.objectives) as string,
    methods: body.methods as string, results: body.results as string, limitations: legacy ? "" : body.limitations as string, conclusion: body.conclusion as string };
}
/** Whitelist projection for internal jobs that carry private context alongside scientific fields. */
export function projectResearchBody(value: unknown): ResearchPacket["body"] | null {
  const body = researchRecord(value);
  if (!body) return null;
  const keys: readonly string[] = Object.hasOwn(body, "objectives") || Object.hasOwn(body, "limitations")
    ? ABSTRACT_BODY_KEYS : ["background", "aim", "methods", "results", "conclusion"];
  return decodeResearchBody(Object.fromEntries(keys.map((key) => [key, body[key]])));
}
/** Exact keys intentionally reject identity-bearing extras, including nested body keys. */
export function decodeResearchPacket(value: unknown): ResearchPacket | null {
  const row = researchRecord(value), body = decodeResearchBody(row?.body);
  if (!row || !body || !researchText(row.title, 6000) || !researchText(row.specialtyId, 100) || !researchText(row.studyTypeId, 100)) return null;
  const legacy = exact(row, ["title", "body", "specialtyId", "studyTypeId", "completionStatus", "keywords"]);
  if (legacy) {
    if (typeof row.completionStatus !== "string" || !["completed", "ongoing"].includes(row.completionStatus) || !Array.isArray(row.keywords)
      || row.keywords.length > 999 || !row.keywords.every((word) => researchText(word, 100))) return null;
  } else if (!exact(row, ["title", "body", "specialtyId", "studyTypeId", "studyTypeOther", "analysisComplete"])
    || !researchText(row.studyTypeOther, 80) || typeof row.analysisComplete !== "boolean") return null;
  return { title: row.title, body, specialtyId: row.specialtyId, studyTypeId: row.studyTypeId,
    studyTypeOther: legacy ? "" : row.studyTypeOther as string, analysisComplete: legacy ? false : row.analysisComplete as boolean };
}
export function decodeResearchScorecard(value: unknown): ResearchScorecard | null {
  const row = researchRecord(value); if (!row || !exact(row, ["scores", "comments", "recommendation"]) || !researchText(row.comments, 6000) || row.recommendation !== null && !["accept", "reject", "revise"].includes(String(row.recommendation)) || !Array.isArray(row.scores) || row.scores.length > 100) return null;
  const scores: ResearchScorecard["scores"] = []; for (const raw of row.scores) { const score = researchRecord(raw); if (!score || !exact(score, ["criterionId", "value"]) || !researchText(score.criterionId, 100) || !finite(score.value)) return null; scores.push({ criterionId: score.criterionId, value: score.value }); }
  return new Set(scores.map((score) => score.criterionId)).size === scores.length ? { scores, comments: row.comments, recommendation: row.recommendation as ResearchScorecard["recommendation"] } : null;
}
