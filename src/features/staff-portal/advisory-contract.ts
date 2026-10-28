import { decodeResearchRubric, researchInteger, researchRecord, researchText, researchUuid, type ResearchCriterion } from "./research-contract";
import { summarizeCalibration, type CalibrationPair, type CalibrationSummary } from "@/lib/ai-assessment/calibration";

export type AdvisorySettings = {
  enabled: boolean; reviewerVisible: boolean;
  noticeReference: string | null; evaluationReference: string | null; operatingReference: string | null;
  model: string | null; maxPerRun: number | null; maxPerDay: number | null;
  estimatedCostPerAbstract: number | null; dailyCostCap: number | null; currency: string | null;
  maxAttempts: number | null; maxTokens: number | null;
};
export type AdvisoryScore = { criterionId: string; value: number; rationale: string };
export type AdvisoryCandidate = { id: string; reference: string; submissionVersion: number; rubricVersion: number; title: string };
export type AdvisoryRecord = { id: string; reference: string; submissionVersion: number; rubricVersion: number; model: string; promptVersion: string; createdAt: string; rubric: ResearchCriterion[]; scores: AdvisoryScore[] };
export type AdvisoryRun = { id: string; createdAt: string; count: number; completed: number; failed: number; pending: number; estimatedCost: number; currency: string; errors: { code: string; count: number }[] };
export type AdvisoryResponse = { state: string; formToken?: string; runtimeReady?: boolean; version?: number; settings?: AdvisorySettings; eligibleCount?: number; candidates?: AdvisoryCandidate[]; runs?: AdvisoryRun[]; records?: AdvisoryRecord[]; advisory?: AdvisoryRecord | null; calibration?: CalibrationSummary; runId?: string; count?: number };
export type AdvisoryPayload = ({ action: "save-settings"; version: number; settings: AdvisorySettings } | { action: "start"; operationId: string; submissionIds: string[] }) & { formToken?: string };
export const ADVISORY_ERROR_CODES = ["rate_limited", "provider_unavailable", "provider_configuration", "invalid_output", "invalid_snapshot", "identity_leak", "configuration_changed", "lease_expired", "disabled", "stale_snapshot", "budget_exceeded", "max_attempts"] as const;
export function emptyAdvisorySettings(): AdvisorySettings { return { enabled: false, reviewerVisible: false, noticeReference: null, evaluationReference: null, operatingReference: null, model: null, maxPerRun: null, maxPerDay: null, estimatedCostPerAbstract: null, dailyCostCap: null, currency: null, maxAttempts: null, maxTokens: null }; }
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const money = (value: unknown): value is number => finite(value) && value > 0 && value <= 1_000_000;
/** Compare the decimal values serialized to PostgreSQL numeric, without a rounding tolerance. */
export function advisoryEstimateWithinCap(unitCost: number, attempts: number, cap: number): boolean {
  if (!finite(unitCost) || unitCost < 0 || !finite(cap) || cap < 0 || !Number.isSafeInteger(attempts) || attempts < 0) return false;
  const decimal = (value: number) => {
    const [mantissa, exponent = "0"] = String(value).split("e"), [whole, fraction = ""] = mantissa.split(".");
    return { coefficient: BigInt(whole + fraction), exponent: Number(exponent) - fraction.length };
  };
  const cost = decimal(unitCost), limit = decimal(cap), exponent = Math.min(cost.exponent, limit.exponent);
  return cost.coefficient * BigInt(attempts) * BigInt(10) ** BigInt(cost.exponent - exponent)
    <= limit.coefficient * BigInt(10) ** BigInt(limit.exponent - exponent);
}
const date = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
export function decodeAdvisorySettings(value: unknown): AdvisorySettings | null {
  const row = researchRecord(value), base = emptyAdvisorySettings();
  if (!row || Object.keys(row).length !== Object.keys(base).length || !Object.keys(base).every(key => Object.hasOwn(row, key)) || typeof row.enabled !== "boolean" || typeof row.reviewerVisible !== "boolean") return null;
  for (const key of ["noticeReference", "evaluationReference", "operatingReference"] as const) if (row[key] !== null && (!researchText(row[key], 500) || !row[key].trim())) return null;
  if (row.model !== null && row.model !== "deepseek-flash" || row.currency !== null && (typeof row.currency !== "string" || !/^[A-Z]{3}$/.test(row.currency))) return null;
  for (const key of ["maxPerRun", "maxPerDay", "maxAttempts", "maxTokens"] as const) if (row[key] !== null && (!researchInteger(row[key], 1) || row[key] > ({ maxPerRun: 10000, maxPerDay: 100000, maxAttempts: 5, maxTokens: 16384 }[key]))) return null;
  if (row.maxPerRun !== null && row.maxPerDay !== null && Number(row.maxPerRun) > Number(row.maxPerDay)) return null;
  for (const key of ["estimatedCostPerAbstract", "dailyCostCap"] as const) if (row[key] !== null && !money(row[key])) return null;
  if (row.enabled && Object.values(row).some(item => item === null)) return null;
  if (row.enabled && !advisoryEstimateWithinCap(Number(row.estimatedCostPerAbstract), Number(row.maxAttempts), Number(row.dailyCostCap))) return null;
  return Object.fromEntries(Object.keys(base).map(key => [key, row[key]])) as AdvisorySettings;
}
export function decodeAdvisoryRecord(value: unknown): AdvisoryRecord | null {
  const row = researchRecord(value), rubric = decodeResearchRubric(row?.rubric);
  if (!row || !rubric?.length || !researchUuid(row.id) || !researchText(row.reference, 160) || !researchInteger(row.submissionVersion, 1) || !researchInteger(row.rubricVersion, 1) || row.model !== "deepseek-flash" || !researchText(row.promptVersion, 100) || !date(row.createdAt) || !Array.isArray(row.scores) || row.scores.length !== rubric.length) return null;
  const scores: AdvisoryScore[] = [];
  for (const raw of row.scores) { const score = researchRecord(raw), criterion = rubric.find(item => item.id === score?.criterionId); if (!score || !criterion || !finite(score.value) || score.value < criterion.min || score.value > criterion.max || !researchText(score.rationale, 1000) || !score.rationale.trim()) return null; scores.push({ criterionId: criterion.id, value: score.value, rationale: score.rationale }); }
  if (new Set(scores.map(score => score.criterionId)).size !== rubric.length) return null;
  return { id: row.id, reference: row.reference, submissionVersion: row.submissionVersion, rubricVersion: row.rubricVersion, model: row.model, promptVersion: row.promptVersion, createdAt: row.createdAt, rubric, scores };
}
/** Each RPC has its own allowlist. Never reflect raw provider, database or cross-area data. */
export function decodeAdvisoryResponse(area: string, value: unknown): AdvisoryResponse | null {
  const row = researchRecord(value); if (!row || typeof row.state !== "string") return null;
  if (["denied", "invalid", "conflict", "not_found", "disabled", "closed", "budget_exceeded", "unavailable", "area_not_ready", "settings_incomplete", "packet_required", "stale_snapshot", "limited"].includes(row.state)) return { state: row.state.replaceAll("_", "-") };
  if (!["ready", "updated", "queued"].includes(row.state)) return null;
  const result: AdvisoryResponse = { state: row.state };
  if (area === "save_settings") { if (!researchInteger(row.version)) return null; return { ...result, version: row.version }; }
  if (area === "start") { if (!researchUuid(row.runId) || !researchInteger(row.count, 1)) return null; return { ...result, runId: row.runId, count: row.count }; }
  if (area === "reviewer") { const advisory = row.advisory === null ? null : decodeAdvisoryRecord(row.advisory); return row.advisory !== null && !advisory ? null : { ...result, advisory }; }
  if (area === "calibration") {
    if (!Array.isArray(row.pairs) || row.pairs.length > 500000) return null;
    const pairs: CalibrationPair[] = [];
    for (const raw of row.pairs) { const pair = researchRecord(raw); if (!pair || !researchUuid(pair.submissionId) || !researchInteger(pair.submissionVersion, 1) || !researchInteger(pair.rubricVersion, 1) || !researchText(pair.criterionId, 60) || !finite(pair.min) || !finite(pair.max) || !finite(pair.aiScore) || !finite(pair.humanScore)) return null; pairs.push({ submissionId: pair.submissionId, submissionVersion: pair.submissionVersion, rubricVersion: pair.rubricVersion, criterionId: pair.criterionId, min: pair.min, max: pair.max, aiScore: pair.aiScore, humanScore: pair.humanScore }); }
    try { return { ...result, calibration: summarizeCalibration(pairs) }; } catch { return null; }
  }
  if (area !== "workspace") return null;
  const settings = decodeAdvisorySettings(row.settings);
  if (!settings || !researchInteger(row.version) || !researchInteger(row.eligibleCount) || !Array.isArray(row.candidates) || row.candidates.length > 5000 || !Array.isArray(row.runs) || row.runs.length > 1000 || !Array.isArray(row.records) || row.records.length > 5000) return null;
  Object.assign(result, { settings, version: row.version, eligibleCount: row.eligibleCount, candidates: [], runs: [], records: [] });
  for (const raw of row.candidates) { const item = researchRecord(raw); if (!item || !researchUuid(item.id) || !researchText(item.reference, 160) || !researchInteger(item.submissionVersion, 1) || !researchInteger(item.rubricVersion, 1) || !researchText(item.title, 6000)) return null; result.candidates!.push({ id: item.id, reference: item.reference, submissionVersion: item.submissionVersion, rubricVersion: item.rubricVersion, title: item.title }); }
  for (const raw of row.runs) {
    const run = researchRecord(raw); if (!run || !researchUuid(run.id) || !date(run.createdAt) || !researchInteger(run.count) || !researchInteger(run.completed) || !researchInteger(run.failed) || !researchInteger(run.pending) || run.count !== run.completed + run.failed + run.pending || !finite(run.estimatedCost) || run.estimatedCost < 0 || typeof run.currency !== "string" || !/^[A-Z]{3}$/.test(run.currency) || !Array.isArray(run.errors) || run.errors.length > 100) return null;
    const errors: AdvisoryRun["errors"] = []; for (const rawError of run.errors) { const error = researchRecord(rawError); if (!error || !ADVISORY_ERROR_CODES.includes(error.code as typeof ADVISORY_ERROR_CODES[number]) || !researchInteger(error.count, 1)) return null; errors.push({ code: String(error.code), count: error.count }); }
    result.runs!.push({ id: run.id, createdAt: run.createdAt, count: run.count, completed: run.completed, failed: run.failed, pending: run.pending, estimatedCost: run.estimatedCost, currency: run.currency, errors });
  }
  for (const raw of row.records) { const record = decodeAdvisoryRecord(raw); if (!record) return null; result.records!.push(record); }
  return result;
}
