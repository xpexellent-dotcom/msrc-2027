import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ABSTRACT_ANCHORS, ABSTRACT_RUBRIC, abstractWeightedTotal, provisionalAbstractBand, type DecisionBands } from "@/features/staff-portal/abstract-rubric";
import { decodeDecisionBands, decodeScreeningInput, decodeScreeningSettings } from "@/features/staff-portal/screening-contract";
import { researchCopy } from "@/features/staff-portal/research-copy";
import { screeningCopy } from "@/features/staff-portal/screening-copy";

const scores = (values: readonly number[]) => ABSTRACT_RUBRIC.map((r, i) => ({ criterionId: r.id, value: values[i] }));
const excellent = scores([4, 4, 4, 4, 4, 4, 4]);
const bands: DecisionBands = { oralMin: 85, posterMin: 60, borderlineMin: 55, acceptanceMin: 55 };
describe("ORG-069 fixed human rubric and SQL parity", () => {
  it("matches the DB's exact approved constants, with four English anchors per criterion", () => {
    const sql = readFileSync("supabase/migrations/20261031120000_abstract_screening_scoring.sql", "utf8");
    const json = sql.match(/select '(\[\{"id":"significance"[\s\S]*?\])'::jsonb/)![1];
    expect(JSON.parse(json)).toEqual(ABSTRACT_RUBRIC);
    expect(ABSTRACT_RUBRIC.reduce((n, c) => n + c.weight, 0)).toBe(100);
    for (const r of ABSTRACT_RUBRIC) expect(ABSTRACT_ANCHORS[r.id]).toHaveLength(4);
  });
  const vectors: [string, string, string][] = [...readFileSync("supabase/tests/support/abstract-scoring-vectors.psql", "utf8").matchAll(/\('([^']+)',array\[([\d,]+)\]::int\[\],([\d.]+)::numeric\)/g)].map((match) => [match[1], match[2], match[3]]);
  it.each(vectors)("shares pgTAP parity vector %s", (_name, values, total) => {
    expect(abstractWeightedTotal(scores(values.split(",").map(Number)))).toBe(Number(total));
  });
  it("rounds the integer numerator once across all 16,384 valid score combinations", () => {
    for (let combination = 0; combination < 4 ** 7; combination++) {
      const values = Array.from({ length: 7 }, (_, i) => (combination >> (2 * i) & 3) + 1);
      const numerator = values.reduce((n, v, i) => n + ABSTRACT_RUBRIC[i].weight * (v - 1), 0);
      expect(abstractWeightedTotal(scores(values))).toBe(Number((numerator / 3).toFixed(2)));
    }
  });
  it("rejects missing, duplicate, unknown, fractional and out-of-range values", () => {
    for (const values of [[], excellent.slice(1), [...excellent, excellent[0]], excellent.map((s, i) => i ? s : { criterionId: "unknown", value: 4 }), excellent.map((s, i) => i ? s : { ...s, value: 2.5 }), scores([0, 4, 4, 4, 4, 4, 4]), scores([5, 4, 4, 4, 4, 4, 4]), scores([NaN, 4, 4, 4, 4, 4, 4])]) expect(abstractWeightedTotal(values)).toBeNull();
  });
});
describe("provisional recommendations stay independent from actual decisions", () => {
  it("preserves Arabic script and mathematical copy through the Windows edit path", () => {
    expect(researchCopy.ar.errors["screening-required"]).toMatch(/[\u0600-\u06ff]/);
    expect(researchCopy.ar.calculationHint).toMatch(/[\u0600-\u06ff]/);
    expect(JSON.stringify([researchCopy, screeningCopy])).not.toMatch(/\?{2,}/);
    expect(researchCopy.en.calculationHint).toContain("Σ weight × (score − 1) / 3");
  });
  it.each([[84.99, "poster"], [85, "oral_candidate"], [59.99, "borderline"], [60, "poster"], [54.99, "reject"], [55, "borderline"]] as const)("boundary %s recommends %s", (mean, band) => expect(provisionalAbstractBand(mean, [excellent, excellent], bands)).toBe(band));
  it("requires each reviewer's methodology and results >=3, even when the mean is high", () => {
    for (const id of ["methodology", "results"]) expect(provisionalAbstractBand(99, [excellent, excellent.map((s) => s.criterionId === id ? { ...s, value: 2 } : s)], bands)).toBe("poster");
  });
  it("leaves bands inactive, requires quorum and routes overflow to poster", () => {
    expect(provisionalAbstractBand(100, [excellent, excellent], null)).toBe("settings_unset");
    expect(provisionalAbstractBand(100, [excellent], bands)).toBe("reviews_incomplete");
    expect(provisionalAbstractBand(100, [excellent, excellent], bands, false)).toBe("poster");
    expect(provisionalAbstractBand(53, [excellent, excellent], { ...bands, acceptanceMin: 50 })).toBe("additional_review");
  });
  it("validates explicit settings without supplying threshold, capacity or acceptance defaults", () => {
    expect(decodeScreeningSettings({ version: 0, bands: null, similarityThreshold: null, oralCapacity: null })).toEqual({ version: 0, bands: null, similarityThreshold: null, oralCapacity: null });
    expect(decodeDecisionBands({ oralMin: 85, posterMin: 60, borderlineMin: 55 })).toBeNull();
    expect(decodeDecisionBands({ ...bands, oralMin: 50 })).toBeNull();
    expect(decodeScreeningSettings({ version: 1, bands, similarityThreshold: 101, oralCapacity: null })).toBeNull();
  });
  const input = { ethics: { passed: true, note: "Reviewed" }, relevance: { passed: true, note: "Relevant" }, externalChecked: true, externalReference: "SYNTHETIC-REPORT", similarityNote: "Reviewed", failureDisposition: null, note: "", investigation: false, investigationNote: "" };
  it("requires rationale, investigation notes and a report reference without accepting evidence extras", () => {
    expect(decodeScreeningInput(input)).toEqual(input);
    for (const patch of [{ externalReference: "" }, { ethics: { passed: true, note: "" } }, { investigation: true }, { failureDisposition: "final" }, { evidence: "PRIVATE" }]) expect(decodeScreeningInput({ ...input, ...patch })).toBeNull();
  });
});
