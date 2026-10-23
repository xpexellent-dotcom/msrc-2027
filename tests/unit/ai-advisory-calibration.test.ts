import { describe, expect, it } from "vitest";
import { summarizeCalibration, type CalibrationPair } from "../../src/lib/ai-assessment/calibration.ts";
const pair = (id: string, aiScore: number, humanScore: number, overrides: Partial<CalibrationPair> = {}): CalibrationPair => ({ submissionId: id, submissionVersion: 1, rubricVersion: 2, criterionId: "methods", min: 0, max: 10, aiScore, humanScore, ...overrides });

describe("descriptive advisory calibration", () => {
  it("reports no invented results for an empty comparison", () => {
    expect(summarizeCalibration([])).toEqual({ pairCount: 0, abstractCount: 0, pearsonCorrelation: null, meanAbsoluteDifference: null, meanSignedDifference: null, exactAgreementRate: null, criteria: [] });
  });
  it("computes range-normalized difference, signed bias, exact agreement and Pearson", () => {
    const result = summarizeCalibration([pair("a", 2, 1), pair("b", 5, 5), pair("c", 8, 9)]);
    expect(result.pairCount).toBe(3); expect(result.abstractCount).toBe(3);
    expect(result.pearsonCorrelation).toBeCloseTo(1); expect(result.meanAbsoluteDifference).toBeCloseTo(1 / 15);
    expect(result.meanSignedDifference).toBeCloseTo(0); expect(result.exactAgreementRate).toBeCloseTo(1 / 3);
    expect(result).not.toHaveProperty("approved"); expect(result).not.toHaveProperty("threshold");
  });
  it("distinguishes correlation from agreement", () => {
    const result = summarizeCalibration([pair("a", 3, 1), pair("b", 5, 3), pair("c", 8, 6)]);
    expect(result.pearsonCorrelation).toBeCloseTo(1); expect(result.exactAgreementRate).toBe(0);
    expect(result.meanAbsoluteDifference).toBeCloseTo(0.2); expect(result.meanSignedDifference).toBeCloseTo(0.2);
  });
  it("supports anticorrelation", () => { expect(summarizeCalibration([pair("a", 0, 10), pair("b", 5, 5), pair("c", 10, 0)]).pearsonCorrelation).toBeCloseTo(-1); });
  it.each([{ pairs: [pair("a", 3, 2)] }, { pairs: [pair("a", 3, 2), pair("b", 3, 8)] }, { pairs: [pair("a", 3, 2), pair("b", 8, 2)] }])("uses undefined correlation for one pair or constant scores", ({ pairs }) => {
    expect(summarizeCalibration(pairs).pearsonCorrelation).toBeNull();
  });
  it("does not mistake floating-point summation noise for constant-score variation", () => {
    expect(summarizeCalibration(Array.from({ length: 10 }, (_, index) => pair(String(index), 3, index))).pearsonCorrelation).toBeNull();
  });
  it("normalizes different scales and groups criteria by rubric version", () => {
    const result = summarizeCalibration([pair("a", 5, 4), pair("a", 3, 2.5, { criterionId: "evidence", min: 1, max: 6 }), pair("b", 50, 40, { rubricVersion: 3, max: 100 })]);
    expect(result.meanAbsoluteDifference).toBeCloseTo(0.1); expect(result.pairCount).toBe(3); expect(result.abstractCount).toBe(2); expect(result.criteria).toHaveLength(3);
  });
  it("uses mean human criterion scores without converting missing data to zero", () => {
    const result = summarizeCalibration([pair("a", 6, 5.5)]); expect(result.meanAbsoluteDifference).toBeCloseTo(0.05); expect(result.exactAgreementRate).toBe(0);
  });
  it.each([{ aiScore: NaN }, { humanScore: Infinity }, { min: 10, max: 10 }, { aiScore: 11 }, { humanScore: -1 }, { submissionVersion: 0 }, { rubricVersion: 0 }, { submissionId: "" }, { criterionId: "" }])("rejects invalid pairs rather than corrupting metrics", change => {
    expect(() => summarizeCalibration([pair("a", 5, 5, change)])).toThrow("INVALID_CALIBRATION_PAIR");
  });
  it("rejects duplicate pair identity so a repeated join cannot inflate agreement", () => { expect(() => summarizeCalibration([pair("a", 5, 5), pair("a", 7, 5)])).toThrow("DUPLICATE_CALIBRATION_PAIR"); });
  it("rejects inconsistent same-version rubric scales", () => { expect(() => summarizeCalibration([pair("a", 5, 5), pair("b", 7, 5, { max: 100 })])).toThrow("INCONSISTENT_CALIBRATION_SCALE"); });
});
