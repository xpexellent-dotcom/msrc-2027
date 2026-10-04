import { CORPUS_VERSION, SYNTHETIC_CORPUS } from "./corpus.ts";
import { SYNTHETIC_MODEL, SYNTHETIC_PROMPT_VERSION } from "./rubric.ts";

export type ReportRubric = Readonly<{ version: string; status: "UNAPPROVED" | "APPROVED"; criteria: readonly Readonly<{ id: string; label: string; min: number; max: number }>[] }>;
export type ValidatedScores = Readonly<{ criteria: readonly Readonly<{ criterionId: string; score: number; rationale: string }>[]; overallComment: string }>;
export type EvaluationOutcome = Readonly<{
  caseId: string; status: "completed" | "manual_review"; reason: string | null;
  output: ValidatedScores | null;
  provenance: Readonly<{ provider: string; requestedModel: string; model: string | null; promptVersion: string; rubricVersion: string; snapshotId: string; snapshotVersion: string; timestamp: string }>;
}>;
export type HumanAssessment = Readonly<{
  caseId: string; snapshotVersion: string; rubricVersion: string;
  /** A test fixture must never be presented as a scientific-lead assessment. */
  source: "scientific_lead" | "synthetic_test_fixture";
  evidenceReference: string;
  criteria: readonly Readonly<{ criterionId: string; independentScore: number; finalScore: number; overrideReason: string | null }>[];
}>;

function validateHuman(records: readonly HumanAssessment[], rubric: ReportRubric) {
  const seen = new Set<string>();
  for (const record of records) {
    const example = SYNTHETIC_CORPUS.find((entry) => entry.id === record.caseId);
    if (!example || seen.has(record.caseId) || record.snapshotVersion !== example.snapshot.version || record.rubricVersion !== rubric.version ||
      !["scientific_lead", "synthetic_test_fixture"].includes(record.source) || !/^[a-zA-Z0-9_-]{1,100}$/.test(record.evidenceReference) ||
      record.criteria.length !== rubric.criteria.length) throw new Error("invalid_human_evaluation_record");
    seen.add(record.caseId);
    const criteria = new Set<string>();
    for (const score of record.criteria) {
      const allowed = rubric.criteria.find((criterion) => criterion.id === score.criterionId);
      if (!allowed || criteria.has(score.criterionId) || !Number.isFinite(score.independentScore) || !Number.isFinite(score.finalScore) ||
        score.independentScore < allowed.min || score.independentScore > allowed.max || score.finalScore < allowed.min || score.finalScore > allowed.max ||
        (score.independentScore !== score.finalScore && (!score.overrideReason?.trim() || score.overrideReason.length > 500))) throw new Error("invalid_human_evaluation_record");
      criteria.add(score.criterionId);
    }
  }
}

function validTimestamp(value: string) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
const FAILURE_CATEGORIES = new Set(["invalid_snapshot", "identity_leak", "provider_unavailable", "refusal", "incomplete_output", "invalid_output", "unexpected_model", "batch_errored", "batch_canceled", "batch_expired", "batch_missing_result"]);

function validateOutcomes(outcomes: readonly EvaluationOutcome[], rubric: ReportRubric, execution: "mock" | "live_synthetic_batch") {
  for (const outcome of outcomes) {
    const example = SYNTHETIC_CORPUS.find((entry) => entry.id === outcome.caseId);
    const provenance = outcome.provenance;
    if (!example || provenance.snapshotId !== example.snapshot.id || provenance.snapshotVersion !== example.snapshot.version ||
      provenance.rubricVersion !== rubric.version || provenance.promptVersion !== SYNTHETIC_PROMPT_VERSION || provenance.requestedModel !== SYNTHETIC_MODEL ||
      provenance.provider !== (execution === "mock" ? "mock_anthropic" : "anthropic") || !validTimestamp(provenance.timestamp) ||
      (provenance.model !== null && !/^claude-[a-z0-9-]{1,100}$/.test(provenance.model))) throw new Error("invalid_evaluation_provenance");
    if (outcome.status === "manual_review") {
      if (outcome.output !== null || !outcome.reason || !FAILURE_CATEGORIES.has(outcome.reason)) throw new Error("invalid_evaluation_outcome");
      continue;
    }
    if (outcome.status !== "completed" || provenance.model !== SYNTHETIC_MODEL || outcome.reason !== null || !outcome.output || !Array.isArray(outcome.output.criteria) ||
      outcome.output.criteria.length !== rubric.criteria.length || typeof outcome.output.overallComment !== "string" ||
      !outcome.output.overallComment.trim() || outcome.output.overallComment.length > 2000) throw new Error("invalid_evaluation_outcome");
    const seen = new Set<string>();
    for (const score of outcome.output.criteria) {
      const criterion = rubric.criteria.find((item) => item.id === score.criterionId);
      if (!criterion || seen.has(score.criterionId) || !Number.isFinite(score.score) || score.score < criterion.min || score.score > criterion.max ||
        typeof score.rationale !== "string" || !score.rationale.trim() || score.rationale.length > 1000 ||
        Object.keys(score).some((key) => !["criterionId", "score", "rationale"].includes(key))) throw new Error("invalid_evaluation_outcome");
      seen.add(score.criterionId);
    }
    if (Object.keys(outcome.output).some((key) => !["criteria", "overallComment"].includes(key))) throw new Error("invalid_evaluation_outcome");
  }
}

/** Pure comparison artifact. It neither publishes decisions nor activates assessment. */
export function createEvaluationReport(outcomes: readonly EvaluationOutcome[], rubric: ReportRubric, options: {
  generatedAt: string;
  execution: "mock" | "live_synthetic_batch";
  humanAssessments?: readonly HumanAssessment[];
}) {
  const human = options.humanAssessments ?? [];
  validateHuman(human, rubric);
  if (!validTimestamp(options.generatedAt)) throw new Error("invalid_evaluation_timestamp");
  if (outcomes.length !== SYNTHETIC_CORPUS.length || new Set(outcomes.map((item) => item.caseId)).size !== SYNTHETIC_CORPUS.length ||
    outcomes.some((item) => !SYNTHETIC_CORPUS.some((entry) => entry.id === item.caseId))) throw new Error("incomplete_evaluation_report");
  validateOutcomes(outcomes, rubric, options.execution);
  const rows = SYNTHETIC_CORPUS.map((example) => {
    const result = outcomes.find((outcome) => outcome.caseId === example.id)!;
    const assessment = human.find((item) => item.caseId === example.id);
    return {
      caseId: example.id, tags: example.tags, synthetic: true,
      inputExpectation: example.expectedInput,
      status: result.status, failureCategory: result.reason,
      manualReviewAvailable: true, provenance: result.provenance,
      humanAssessmentSource: assessment?.source ?? "UNASSESSED",
      humanEvidenceReference: assessment?.evidenceReference ?? null,
      comparison: rubric.criteria.map((criterion) => {
        const model = result.output?.criteria.find((item) => item.criterionId === criterion.id);
        const independent = assessment?.criteria.find((item) => item.criterionId === criterion.id);
        return {
          criterionId: criterion.id, range: { min: criterion.min, max: criterion.max },
          modelScore: model?.score ?? null, modelRationale: model?.rationale ?? null,
          humanIndependentScore: independent?.independentScore ?? null,
          humanFinalScore: independent?.finalScore ?? null,
          modelMinusHuman: model && independent ? model.score - independent.independentScore : null,
          overrideReason: independent?.overrideReason ?? null,
        };
      }),
      modelOverallComment: result.output?.overallComment ?? null,
    };
  });
  // Do not pool scientific-lead scores with artificial comparison fixtures.
  const disagreementBySource = (["scientific_lead", "synthetic_test_fixture"] as const).map((source) => {
    const compared = rows.filter((row) => row.humanAssessmentSource === source).flatMap((row) => row.comparison)
      .filter((item) => item.modelMinusHuman !== null);
    return {
      source, comparedCriteria: compared.length,
      differentScores: compared.filter((item) => item.modelMinusHuman !== 0).length,
      meanAbsoluteDifference: compared.length ? compared.reduce((sum, item) => sum + Math.abs(item.modelMinusHuman!), 0) / compared.length : null,
      overrides: rows.filter((row) => row.humanAssessmentSource === source).flatMap((row) => row.comparison)
        .filter((item) => item.humanIndependentScore !== item.humanFinalScore).length,
    };
  });
  return {
    reportVersion: "synthetic-evaluation-report-v1", corpusVersion: CORPUS_VERSION,
    generatedAt: options.generatedAt, execution: options.execution,
    syntheticOnly: true, rubricVersion: rubric.version, rubricStatus: rubric.status,
    publicationAuthority: "human_committee", activationApproval: "NOT_GRANTED",
    acceptanceThreshold: null,
    limitations: [
      rubric.status === "UNAPPROVED" ? "UNAPPROVED placeholder rubric; synthetic technical exercise only." : "Synthetic technical exercise; committee approval remains separate.",
      "Mock outputs prove plumbing and failure handling; they do not measure real-model scientific accuracy or injection resistance.",
      "Human scores remain null until separately supplied with matching case, snapshot and rubric versions.",
      "Batch API has no server-side refusal fallback; refusals require manual review.",
      "No real manuscripts, committee decision, automatic rejection or activation evidence are created.",
    ],
    summary: {
      total: rows.length,
      completed: rows.filter((row) => row.status === "completed").length,
      manualReview: rows.filter((row) => row.status === "manual_review").length,
      unassessedByHuman: rows.filter((row) => row.humanAssessmentSource === "UNASSESSED").length,
      disagreementBySource,
    }, rows,
  };
}
