import type { DecisionBands, RecommendedBand } from "./abstract-rubric";
import { researchInteger, researchRecord, researchText, researchUuid } from "./research-contract";
export type ScreeningStatus = "pending" | "passed" | "failed_correctable" | "failed_final";
export type ScreeningGate = { gate: number; passed: boolean | null; note: string };
export type SimilarityMatch = { id: string; reference: string | null; title: string; edition: string; version: number; score: number };
export type ScreeningSettings = { version: number; bands: DecisionBands | null; similarityThreshold: number | null; oralCapacity: number | null };
export type ScreeningInput = {
  ethics: { passed: boolean | null; note: string }; relevance: { passed: boolean | null; note: string };
  externalChecked: boolean; externalReference: string; similarityNote: string;
  failureDisposition: "correctable" | "final" | null; note: string; investigation: boolean; investigationNote: string;
};
export type ScreeningReview = {
  sequence: number; status: ScreeningStatus; investigation: boolean; investigationNote: string; actorId: string | null; at: string | null;
  gates: ScreeningGate[]; automatic: ScreeningGate[]; externalChecked: boolean; externalReference: string;
  ethicsNote: string;
  similarityThreshold: number | null; matches: SimilarityMatch[]; current: boolean; specialty: string;
  history: { sequence: number; status: ScreeningStatus; investigation: boolean; actorId: string; at: string; note: string; gates: ScreeningGate[] }[];
};
const nullableNumber = (value: unknown, max = 100): value is number | null => value === null || typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
export function decodeDecisionBands(value: unknown): DecisionBands | null {
  const r = researchRecord(value); if (!r || Object.keys(r).sort().join() !== "acceptanceMin,borderlineMin,oralMin,posterMin" || !Object.values(r).every((v) => v !== null && nullableNumber(v))) return null;
  const b = r as DecisionBands; return b.oralMin > b.posterMin && b.posterMin > b.borderlineMin && b.acceptanceMin <= b.posterMin ? { oralMin: b.oralMin, posterMin: b.posterMin, borderlineMin: b.borderlineMin, acceptanceMin: b.acceptanceMin } : null;
}
export function decodeScreeningSettings(value: unknown): ScreeningSettings | null {
  const r = researchRecord(value), bands = r?.bands === null ? null : decodeDecisionBands(r?.bands);
  if (!r || !researchInteger(r.version) || !nullableNumber(r.similarityThreshold) || r.oralCapacity !== null && !researchInteger(r.oralCapacity) || r.bands !== null && !bands) return null;
  return { version: r.version, bands, similarityThreshold: r.similarityThreshold, oralCapacity: r.oralCapacity as number | null };
}
export function decodeScreeningInput(value: unknown): ScreeningInput | null {
  const r = researchRecord(value); if (!r || Object.keys(r).sort().join() !== "ethics,externalChecked,externalReference,failureDisposition,investigation,investigationNote,note,relevance,similarityNote") return null;
  const judgement = (v: unknown) => { const j = researchRecord(v); return j && Object.keys(j).sort().join() === "note,passed" && (j.passed === null || typeof j.passed === "boolean") && researchText(j.note, 3000) && (j.passed === null || !!j.note.trim()) ? { passed: j.passed as boolean | null, note: j.note } : null; };
  const ethics = judgement(r.ethics), relevance = judgement(r.relevance);
  if (!ethics || !relevance || typeof r.externalChecked !== "boolean" || typeof r.investigation !== "boolean" || !researchText(r.externalReference, 1000) || r.externalChecked && !r.externalReference.trim() || !researchText(r.similarityNote, 3000) || !researchText(r.note, 3000) || !researchText(r.investigationNote, 3000) || r.investigation && !r.investigationNote.trim() || ![null, "correctable", "final"].includes(r.failureDisposition as null) || r.failureDisposition !== null && !r.note.trim()) return null;
  return { ethics, relevance, externalChecked: r.externalChecked, externalReference: r.externalReference, similarityNote: r.similarityNote, failureDisposition: r.failureDisposition as ScreeningInput["failureDisposition"], note: r.note, investigation: r.investigation, investigationNote: r.investigationNote };
}
const statuses = ["pending", "passed", "failed_correctable", "failed_final"];
function gates(value: unknown): ScreeningGate[] | null {
  if (!Array.isArray(value) || value.length > 7) return null;
  const result: ScreeningGate[] = [];
  for (const v of value) { const r = researchRecord(v); if (!r || !researchInteger(r.gate, 1) || r.gate > 7 || r.passed !== null && typeof r.passed !== "boolean" || !researchText(r.note, 6000)) return null; result.push({ gate: r.gate, passed: r.passed as boolean | null, note: r.note }); }
  return new Set(result.map((g) => g.gate)).size === result.length ? result : null;
}
export function decodeScreeningReview(value: unknown): ScreeningReview | null {
  const r = researchRecord(value), automatic = gates(r?.automatic), outcomes = gates(r?.gates);
  if (!r || !automatic || automatic.length !== 5 || !outcomes || !researchInteger(r.sequence) || !statuses.includes(String(r.status)) || typeof r.investigation !== "boolean" || !researchText(r.investigationNote, 3000) || !researchText(r.ethicsNote, 3000) || r.actorId !== null && !researchUuid(r.actorId) || r.at !== null && (typeof r.at !== "string" || !Number.isFinite(Date.parse(r.at))) || typeof r.externalChecked !== "boolean" || !researchText(r.externalReference, 1000) || !nullableNumber(r.similarityThreshold) || typeof r.current !== "boolean" || !researchText(r.specialty, 100) || !Array.isArray(r.matches) || r.matches.length > 5 || !Array.isArray(r.history) || r.history.length > 1000) return null;
  const matches: SimilarityMatch[] = [], history: ScreeningReview["history"] = [];
  for (const raw of r.matches) { const m = researchRecord(raw); if (!m || !researchUuid(m.id) || m.reference !== null && !researchText(m.reference, 160) || !researchText(m.title, 6000) || !researchText(m.edition, 200) || !researchInteger(m.version, 1) || m.score === null || !nullableNumber(m.score)) return null; matches.push({ id: m.id, reference: m.reference as string | null, title: m.title, edition: m.edition, version: m.version, score: m.score }); }
  for (const raw of r.history) { const h = researchRecord(raw), rows = gates(h?.gates); if (!h || !rows || rows.length !== 7 || !researchInteger(h.sequence, 1) || !statuses.includes(String(h.status)) || typeof h.investigation !== "boolean" || !researchUuid(h.actorId) || typeof h.at !== "string" || !Number.isFinite(Date.parse(h.at)) || !researchText(h.note, 3000)) return null; history.push({ sequence: h.sequence, status: h.status as ScreeningStatus, investigation: h.investigation, actorId: h.actorId, at: h.at, note: h.note, gates: rows }); }
  return { sequence: r.sequence, status: r.status as ScreeningStatus, investigation: r.investigation, investigationNote: r.investigationNote, ethicsNote: r.ethicsNote, actorId: r.actorId as string | null, at: r.at as string | null, gates: outcomes, automatic, externalChecked: r.externalChecked, externalReference: r.externalReference, similarityThreshold: r.similarityThreshold, matches, current: r.current, specialty: r.specialty, history };
}
export const RECOMMENDED_BANDS: readonly RecommendedBand[] = ["settings_unset", "screening_required", "investigation", "reviews_incomplete", "oral_candidate", "poster", "borderline", "additional_review", "reject"];
