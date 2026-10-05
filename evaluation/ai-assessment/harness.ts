import "server-only";
import { buildAssessmentRequest, parseAssessmentMessage } from "../../src/lib/ai-assessment/request.server.ts";
import { sanitizeSnapshot } from "../../src/lib/ai-assessment/sanitizer.server.ts";
import type { SanitizationWarning } from "../../src/lib/ai-assessment/contracts.ts";
import { SYNTHETIC_CORPUS, type SyntheticCase } from "./corpus.ts";
import { SYNTHETIC_MODEL, SYNTHETIC_PROMPT_VERSION, SYNTHETIC_RUBRIC } from "./rubric.ts";
import { createEvaluationReport, type EvaluationOutcome, type HumanAssessment } from "./report.ts";

export type SyntheticRequest = ReturnType<typeof buildAssessmentRequest>;
export type SyntheticProvider = Readonly<{ assess: (request: SyntheticRequest, example: SyntheticCase) => Promise<unknown> }>;
export type SyntheticSettings = Readonly<{ maxTokens: number; effort: "low" | "medium" | "high" | "max" }>;

/** Sandbox request builder cannot be used to grant approval to the application adapter. */
export function prepareSyntheticCases(settings: SyntheticSettings) {
  return SYNTHETIC_CORPUS.map((example) => {
    const sanitized = sanitizeSnapshot(example.snapshot);
    if (!sanitized.ok) return { example, inputFailure: sanitized.reason, request: null, sanitizationWarnings: [] as readonly SanitizationWarning[] };
    const request = buildAssessmentRequest(sanitized.payload, SYNTHETIC_RUBRIC, {
      model: SYNTHETIC_MODEL, promptVersion: SYNTHETIC_PROMPT_VERSION,
      effort: settings.effort, maxTokens: settings.maxTokens,
    });
    return { example, inputFailure: null, request, sanitizationWarnings: sanitized.warnings };
  });
}

function snapshotWarnings(example: SyntheticCase): readonly SanitizationWarning[] {
  const sanitized = sanitizeSnapshot(example.snapshot);
  return sanitized.ok ? sanitized.warnings : [];
}

export function evaluationOutcome(example: SyntheticCase, message: unknown, timestamp: string, provider: "mock_anthropic" | "anthropic", sanitizationWarnings = snapshotWarnings(example)): EvaluationOutcome {
  const parsed = parseAssessmentMessage(message, SYNTHETIC_RUBRIC);
  const model = message && typeof message === "object" && "model" in message && typeof message.model === "string" && /^claude-[a-z0-9-]{1,100}$/.test(message.model) ? message.model : null;
  if (parsed.ok && model !== SYNTHETIC_MODEL) return { ...manualOutcome(example, "unexpected_model", timestamp, provider, sanitizationWarnings), provenance: {
    ...manualOutcome(example, "unexpected_model", timestamp, provider, sanitizationWarnings).provenance, model: model,
  } };
  return {
    caseId: example.id, status: parsed.ok ? "completed" : "manual_review",
    reason: parsed.ok ? null : parsed.reason, output: parsed.ok ? parsed.output : null,
    provenance: {
      provider, requestedModel: SYNTHETIC_MODEL, model, promptVersion: SYNTHETIC_PROMPT_VERSION,
      rubricVersion: SYNTHETIC_RUBRIC.version, snapshotId: example.snapshot.id,
      snapshotVersion: example.snapshot.version, timestamp, sanitizationWarnings,
    },
  };
}

export function manualOutcome(example: SyntheticCase, reason: string, timestamp: string, provider: "mock_anthropic" | "anthropic", sanitizationWarnings = snapshotWarnings(example)): EvaluationOutcome {
  return {
    caseId: example.id, status: "manual_review", reason, output: null,
    provenance: { provider, requestedModel: SYNTHETIC_MODEL, model: null, promptVersion: SYNTHETIC_PROMPT_VERSION,
      rubricVersion: SYNTHETIC_RUBRIC.version, snapshotId: example.snapshot.id, snapshotVersion: example.snapshot.version, timestamp, sanitizationWarnings },
  };
}

export async function runMockedEvaluation(provider: SyntheticProvider = createMockedProvider(), options: {
  now?: () => string; humanAssessments?: readonly HumanAssessment[];
} = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const outcomes: EvaluationOutcome[] = [];
  for (const prepared of prepareSyntheticCases({ effort: "medium", maxTokens: 1024 })) {
    if (!prepared.request) {
      outcomes.push(manualOutcome(prepared.example, prepared.inputFailure!, now(), "mock_anthropic", prepared.sanitizationWarnings));
      continue;
    }
    try {
      outcomes.push(evaluationOutcome(prepared.example, await provider.assess(prepared.request, prepared.example), now(), "mock_anthropic", prepared.sanitizationWarnings));
    } catch {
      // Raw SDK errors may contain credentials or manuscript data. Record category only.
      outcomes.push(manualOutcome(prepared.example, "provider_unavailable", now(), "mock_anthropic", prepared.sanitizationWarnings));
    }
  }
  return createEvaluationReport(outcomes, SYNTHETIC_RUBRIC, {
    generatedAt: now(), execution: "mock", humanAssessments: options.humanAssessments,
  });
}

export function createMockedProvider(): SyntheticProvider {
  return {
    async assess(_request, example) {
      if (example.mockOutcome === "outage") throw new Error("synthetic_provider_outage");
      if (example.mockOutcome === "refusal") return { model: SYNTHETIC_MODEL, stop_reason: "refusal", content: [{ type: "text", text: "not_scored" }] };
      if (example.mockOutcome === "truncated") return { model: SYNTHETIC_MODEL, stop_reason: "max_tokens", content: [{ type: "text", text: "{}" }] };
      const score = example.tags.includes("strong") ? 3 : example.tags.includes("ongoing") ? 2 : 1;
      const criteria = SYNTHETIC_RUBRIC.criteria.map((criterion) => ({ criterionId: criterion.id, score, rationale: "Synthetic deterministic fixture; no scientific judgment asserted." }));
      if (example.mockOutcome === "out_of_range") criteria[0].score = 99;
      if (example.mockOutcome === "missing_criterion") criteria.pop();
      return { model: SYNTHETIC_MODEL, stop_reason: "end_turn", content: [{ type: "text", text: example.mockOutcome === "invalid_json" ? "{broken" : JSON.stringify({ criteria, overallComment: "Mock advisory plumbing only; a human may continue review." }) }] };
    },
  };
}
