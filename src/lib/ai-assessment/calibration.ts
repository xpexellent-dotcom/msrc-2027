/** Descriptive evaluation only. There is deliberately no acceptance threshold or activation verdict. */
export interface CalibrationPair {
  readonly submissionId: string; readonly submissionVersion: number; readonly rubricVersion: number;
  readonly criterionId: string; readonly min: number; readonly max: number;
  readonly aiScore: number; readonly humanScore: number;
}
export interface CalibrationMetrics {
  readonly pairCount: number; readonly abstractCount: number; readonly pearsonCorrelation: number | null;
  readonly meanAbsoluteDifference: number | null; readonly meanSignedDifference: number | null;
  readonly exactAgreementRate: number | null;
}
export interface CalibrationSummary extends CalibrationMetrics {
  readonly criteria: readonly (CalibrationMetrics & { readonly criterionId: string; readonly rubricVersion: number })[];
}

function metrics(pairs: readonly CalibrationPair[]): CalibrationMetrics {
  const count = pairs.length, abstractCount = new Set(pairs.map(pair => JSON.stringify([pair.submissionId, pair.submissionVersion, pair.rubricVersion]))).size;
  if (!count) return { pairCount: 0, abstractCount: 0, pearsonCorrelation: null, meanAbsoluteDifference: null, meanSignedDifference: null, exactAgreementRate: null };
  const normalized = pairs.map(pair => ({ ai: (pair.aiScore - pair.min) / (pair.max - pair.min), human: (pair.humanScore - pair.min) / (pair.max - pair.min) }));
  const meanAi = normalized.reduce((sum, pair) => sum + pair.ai, 0) / count;
  const meanHuman = normalized.reduce((sum, pair) => sum + pair.human, 0) / count;
  let cross = 0, varianceAi = 0, varianceHuman = 0;
  for (const pair of normalized) { const ai = pair.ai - meanAi, human = pair.human - meanHuman; cross += ai * human; varianceAi += ai * ai; varianceHuman += human * human; }
  const constantAi = normalized.every(pair => pair.ai === normalized[0].ai), constantHuman = normalized.every(pair => pair.human === normalized[0].human);
  const correlation = count < 2 || constantAi || constantHuman || varianceAi === 0 || varianceHuman === 0 ? null : Math.max(-1, Math.min(1, cross / Math.sqrt(varianceAi * varianceHuman)));
  return {
    pairCount: count, abstractCount, pearsonCorrelation: correlation,
    meanAbsoluteDifference: normalized.reduce((sum, pair) => sum + Math.abs(pair.ai - pair.human), 0) / count,
    meanSignedDifference: normalized.reduce((sum, pair) => sum + pair.ai - pair.human, 0) / count,
    exactAgreementRate: pairs.filter(pair => pair.aiScore === pair.humanScore).length / count,
  };
}

/** One pair per abstract/version/rubric/criterion; humanScore is the mean of eligible completed human reviews.
 * Differences use (score-min)/(max-min), so units are fractions of each criterion's range.
 * Pearson uses those paired normalized scores; exact agreement compares the original scores.
 * Missing pairs are excluded upstream, never represented as zero. */
export function summarizeCalibration(input: readonly CalibrationPair[]): CalibrationSummary {
  const seen = new Set<string>(), groups = new Map<string, CalibrationPair[]>();
  for (const pair of input) {
    if (!pair || typeof pair.submissionId !== "string" || !pair.submissionId || typeof pair.criterionId !== "string" || !pair.criterionId
      || !Number.isSafeInteger(pair.submissionVersion) || pair.submissionVersion < 1 || !Number.isSafeInteger(pair.rubricVersion) || pair.rubricVersion < 1
      || ![pair.min, pair.max, pair.aiScore, pair.humanScore].every(Number.isFinite) || pair.max <= pair.min
      || pair.aiScore < pair.min || pair.aiScore > pair.max || pair.humanScore < pair.min || pair.humanScore > pair.max) throw new Error("INVALID_CALIBRATION_PAIR");
    const key = JSON.stringify([pair.submissionId, pair.submissionVersion, pair.rubricVersion, pair.criterionId]);
    if (seen.has(key)) throw new Error("DUPLICATE_CALIBRATION_PAIR");
    seen.add(key);
    const groupKey = JSON.stringify([pair.rubricVersion, pair.criterionId]), group = groups.get(groupKey) ?? [];
    if (group.length && (group[0].min !== pair.min || group[0].max !== pair.max)) throw new Error("INCONSISTENT_CALIBRATION_SCALE");
    group.push(pair); groups.set(groupKey, group);
  }
  return { ...metrics(input), criteria: [...groups.values()].map(group => ({ criterionId: group[0].criterionId, rubricVersion: group[0].rubricVersion, ...metrics(group) })) };
}
