import type { Role } from "@/lib/permissions/contract";

export type ResearchCriterion = { id: string; label: string; min: number; max: number };
export type ResearchCategory = { id: string; label: string };
export type ResearchSettings = { rubric: ResearchCriterion[]; judgeCount: number | null; tieRule: string | null; categories: ResearchCategory[]; lockAt: string | null; supervisorDeadline: string | null; supervisorEvidence: string | null };
export type ResearchScorecard = { scores: { criterionId: string; value: number }[]; comments: string };
export type ResearchAssignment = { id: string; submissionId: string; title: string; version: number; status: string; categoryId: string; lockAt: string; rubric: ResearchCriterion[]; packet: { title: string; body: string }; scorecard: ResearchScorecard | null };
export type ResearchEntry = { id: string; version: number; reference: string; title: string; allocation: null | { id: string; format: "oral" | "poster"; published: boolean }; categoryId: string | null; assignments: { id: string; judgeId: string; version: number; status: string }[]; award: null | { id: string; categoryId: string; label: string; status: string; reason: string; tieResolution: string; supervisorReady: boolean; supervisor?: null | { name: string; affiliation: string; email: string; confirmed: boolean } }; judgingBasis: { assignmentId: string; judgeId: string; scorecard: ResearchScorecard; rubric: ResearchCriterion[] }[] };
export type ResearchResponse = { state: string; formToken?: string; settings?: ResearchSettings; version?: number; enabled?: boolean; ready?: boolean; entries?: ResearchEntry[]; assignments?: ResearchAssignment[] };
export const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const text = (value: unknown, max = 12000): value is string => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
export const integer = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= 2147483647;
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const identifier = (value: unknown): value is string => text(value, 60) && /^[A-Za-z0-9_-]+$/.test(value);
const date = (value: unknown): value is string => text(value, 100) && Number.isFinite(Date.parse(value));
export function decodeResearchRubric(value: unknown): ResearchCriterion[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const rows: ResearchCriterion[] = [];
  for (const raw of value) { const row = record(raw); if (!row || !exact(row, ["id", "label", "min", "max"]) || !identifier(row.id) || !text(row.label, 500) || !row.label.trim() || typeof row.min !== "number" || typeof row.max !== "number" || !Number.isFinite(row.min) || !Number.isFinite(row.max) || row.min >= row.max) return null; rows.push({ id: row.id, label: row.label, min: row.min, max: row.max }); }
  return new Set(rows.map((row) => row.id)).size === rows.length ? rows : null;
}
export function decodeResearchSettings(value: unknown): ResearchSettings | null {
  const row = record(value); if (!row || !exact(row, ["rubric", "judgeCount", "tieRule", "categories", "lockAt", "supervisorDeadline", "supervisorEvidence"])) return null;
  const rubric = decodeResearchRubric(row.rubric); if (!rubric || row.judgeCount !== null && (!integer(row.judgeCount, 1) || row.judgeCount > 100) || row.tieRule !== null && (!text(row.tieRule, 6000) || !row.tieRule.trim()) || row.lockAt !== null && !date(row.lockAt) || row.supervisorDeadline !== null && !date(row.supervisorDeadline) || row.supervisorEvidence !== null && (!text(row.supervisorEvidence, 6000) || !row.supervisorEvidence.trim()) || !Array.isArray(row.categories) || row.categories.length > 100) return null;
  const categories: ResearchCategory[] = [];
  for (const raw of row.categories) { const category = record(raw); if (!category || !exact(category, ["id", "label"]) || !identifier(category.id) || !text(category.label, 500) || !category.label.trim()) return null; categories.push({ id: category.id, label: category.label }); }
  if (new Set(categories.map((category) => category.id)).size !== categories.length) return null;
  return { rubric, categories, judgeCount: row.judgeCount as number | null, tieRule: row.tieRule as string | null, lockAt: row.lockAt as string | null, supervisorDeadline: row.supervisorDeadline as string | null, supervisorEvidence: row.supervisorEvidence as string | null };
}
export function decodeResearchScorecard(value: unknown): ResearchScorecard | null {
  const row = record(value); if (!row || !exact(row, ["scores", "comments"]) || !Array.isArray(row.scores) || row.scores.length > 100 || !text(row.comments)) return null;
  const scores: ResearchScorecard["scores"] = [];
  for (const raw of row.scores) { const score = record(raw); if (!score || !exact(score, ["criterionId", "value"]) || !identifier(score.criterionId) || typeof score.value !== "number" || !Number.isFinite(score.value)) return null; scores.push({ criterionId: score.criterionId, value: score.value }); }
  return new Set(scores.map((score) => score.criterionId)).size === scores.length ? { scores, comments: row.comments } : null;
}
function decodeAssignment(value: unknown): ResearchAssignment | null {
  const row = record(value), packet = record(row?.packet); if (!row || !uuid(row.id) || !uuid(row.submissionId) || !text(row.title, 6000) || !integer(row.version, 1) || !["assigned", "draft", "completed", "conflict", "withdrawn"].includes(String(row.status)) || !identifier(row.categoryId) || !date(row.lockAt) || !packet || !exact(packet, ["title", "body"]) || !text(packet.title, 6000) || !text(packet.body, 20000)) return null;
  const rubric = decodeResearchRubric(row.rubric), scorecard = row.scorecard === null ? null : decodeResearchScorecard(row.scorecard); if (!rubric || row.scorecard !== null && !scorecard) return null;
  return { id: row.id, submissionId: row.submissionId, title: row.title, version: row.version, status: String(row.status), categoryId: row.categoryId, lockAt: row.lockAt, rubric, packet: { title: packet.title, body: packet.body }, scorecard };
}
function decodeEntry(value: unknown, includeSupervisor: boolean): ResearchEntry | null {
  const row = record(value); if (!row || !uuid(row.id) || !integer(row.version, 1) || !text(row.reference, 200) || !text(row.title, 6000) || row.categoryId !== null && !identifier(row.categoryId) || !Array.isArray(row.assignments) || row.assignments.length > 100) return null;
  let allocation: ResearchEntry["allocation"] = null, award: ResearchEntry["award"] = null;
  if (row.allocation !== null) { const item = record(row.allocation); if (!item || !uuid(item.id) || !["oral", "poster"].includes(String(item.format)) || typeof item.published !== "boolean") return null; allocation = { id: item.id, format: item.format as "oral" | "poster", published: item.published }; }
  if (row.award !== null) { const item = record(row.award); if (!item || !uuid(item.id) || !identifier(item.categoryId) || !text(item.label, 500) || !text(item.status, 100) || !text(item.reason, 12000) || !text(item.tieResolution, 12000) || typeof item.supervisorReady !== "boolean") return null; award = { id: item.id, categoryId: item.categoryId, label: item.label, status: item.status, reason: item.reason, tieResolution: item.tieResolution, supervisorReady: item.supervisorReady }; if (includeSupervisor && item.supervisor !== undefined) { if (item.supervisor === null) award.supervisor = null; else { const supervisor = record(item.supervisor); if (!supervisor || !text(supervisor.name, 500) || !text(supervisor.affiliation, 1000) || !text(supervisor.email, 254) || typeof supervisor.confirmed !== "boolean") return null; award.supervisor = { name: supervisor.name, affiliation: supervisor.affiliation, email: supervisor.email, confirmed: supervisor.confirmed }; } } }
  const assignments: ResearchEntry["assignments"] = [];
  for (const raw of row.assignments) { const item = record(raw); if (!item || !uuid(item.id) || !uuid(item.judgeId) || !integer(item.version, 1) || !text(item.status, 100)) return null; assignments.push({ id: item.id, judgeId: item.judgeId, version: item.version, status: item.status }); }
  const judgingBasis: ResearchEntry["judgingBasis"] = [];
  if (row.judgingBasis !== undefined) { if (!Array.isArray(row.judgingBasis) || row.judgingBasis.length > 100) return null; for (const raw of row.judgingBasis) { const item = record(raw), scorecard = decodeResearchScorecard(item?.scorecard), rubric = decodeResearchRubric(item?.rubric); if (!item || !uuid(item.assignmentId) || !uuid(item.judgeId) || !scorecard || !rubric) return null; judgingBasis.push({ assignmentId: item.assignmentId, judgeId: item.judgeId, scorecard, rubric }); } }
  return { id: row.id, version: row.version, reference: row.reference, title: row.title, categoryId: row.categoryId as string | null, allocation, assignments, award, judgingBasis };
}
export const researchSuccess = (state: string) => ["ready", "updated", "saved", "allocated", "assigned", "prepared", "submitted", "confirmed", "published", "recorded", "reassigned", "withdrawn"].includes(state);
export function projectResearchResponse(view: string, value: unknown, includeSupervisor = false): ResearchResponse | null {
  const row = record(value); if (!row || !text(row.state, 100)) return null;
  if (["closed", "denied", "invalid", "conflict", "not_found", "limited", "settings_incomplete", "area_not_ready", "locked", "coi", "duplicate", "already_assigned", "judging_incomplete", "supervisor_required", "unavailable", "not_ready", "accepted_required", "operation_conflict", "confirmed_required", "full", "reviews_incomplete", "confirmation_required"].includes(row.state)) return { state: row.state.replaceAll("_", "-") };
  if (!researchSuccess(row.state)) return null; const result: ResearchResponse = { state: row.state };
  if (view === "settings") { const settings = decodeResearchSettings(row.settings); if (!settings || !integer(row.version) || typeof row.enabled !== "boolean" || typeof row.ready !== "boolean") return null; Object.assign(result, { settings, version: row.version, enabled: row.enabled, ready: row.ready }); }
  if (view === "list") { if (!Array.isArray(row.entries) || row.entries.length > 5000) return null; const entries = row.entries.map((entry) => decodeEntry(entry, includeSupervisor)); if (entries.some((entry) => !entry)) return null; result.entries = entries as ResearchEntry[]; }
  if (view === "judge_queue") { if (!Array.isArray(row.assignments) || row.assignments.length > 5000) return null; const assignments = row.assignments.map(decodeAssignment); if (assignments.some((assignment) => !assignment)) return null; result.assignments = assignments as ResearchAssignment[]; }
  return result;
}
export function researchActionAllowed(action: string, roles: readonly Role[]): boolean {
  const admin = roles.includes("superAdmin"), science = roles.includes("scientificAdministrator"), committee = roles.includes("judgingCommittee");
  if (["judge", "conflict"].includes(action)) return roles.includes("facultyJudge");
  if (["settings", "allocate", "publish_allocation", "confirm_award", "publish_award"].includes(action)) return admin || science;
  return ["assign", "reassign", "prepare_award", "withdraw_award"].includes(action) && (admin || science || committee);
}
export function validateResearchPayload(action: string, value: unknown): Record<string, unknown> | null {
  const row = record(value); if (!row) return null;
  if (action === "settings") { const settings = decodeResearchSettings(row.settings); return exact(row, ["expectedVersion", "settings"]) && integer(row.expectedVersion) && settings ? { expectedVersion: row.expectedVersion, settings } : null; }
  if (["judge", "conflict"].includes(action)) { if (!uuid(row.assignmentId) || !integer(row.expectedVersion, 1)) return null; if (action === "conflict") return exact(row, ["assignmentId", "expectedVersion", "reason"]) && text(row.reason, 3000) && row.reason.trim() ? row : null; const card = decodeResearchScorecard(row.scorecard); return exact(row, ["assignmentId", "expectedVersion", "scorecard", "submit"]) && card && typeof row.submit === "boolean" ? { ...row, scorecard: card } : null; }
  if (!uuid(row.submissionId) || !integer(row.expectedVersion, 1)) return null;
  const base = ["submissionId", "expectedVersion"];
  if (action === "allocate") return exact(row, [...base, "format"]) && ["oral", "poster"].includes(String(row.format)) ? row : null;
  if (action === "publish_allocation") return exact(row, [...base, "allocationId"]) && uuid(row.allocationId) ? row : null;
  if (action === "confirm_award") return exact(row, [...base, "awardId", "validationReason"]) && uuid(row.awardId) && text(row.validationReason, 3000) && row.validationReason.trim() ? row : null;
  if (action === "publish_award") return exact(row, [...base, "awardId"]) && uuid(row.awardId) ? row : null;
  if (action === "withdraw_award") return exact(row, [...base, "awardId", "reason"]) && uuid(row.awardId) && text(row.reason, 3000) && row.reason.trim() ? row : null;
  if (action === "assign") return exact(row, [...base, "categoryId", "judgeId"]) && identifier(row.categoryId) && uuid(row.judgeId) ? row : null;
  if (action === "reassign") return exact(row, [...base, "assignmentId", "judgeId"]) && uuid(row.assignmentId) && uuid(row.judgeId) ? row : null;
  if (action === "prepare_award") return exact(row, [...base, "categoryId", "reason", "tieResolution"]) && identifier(row.categoryId) && text(row.reason, 6000) && row.reason.trim() && text(row.tieResolution, 6000) && row.tieResolution.trim() ? row : null;
  return null;
}

