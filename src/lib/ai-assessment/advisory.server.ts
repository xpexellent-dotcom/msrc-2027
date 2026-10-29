import "server-only";
import { decodeResearchRubric, projectResearchBody } from "../../features/staff-portal/research-contract.ts";
import type { AssessmentRequest, LockedSnapshot, RequestConfiguration, Rubric } from "./contracts.ts";
import { DEEPSEEK_MODEL } from "./configuration.server.ts";
import { buildAssessmentRequest, parseAssessmentMessage } from "./request.server.ts";
import { checkIdentityLeaks, isRecord, validReference } from "./sanitizer.server.ts";

export interface AdvisoryCriterionScore { readonly criterionId: string; readonly value: number; readonly rationale: string }
export const ADVISORY_PROMPT_VERSION = "staff-advisory-v1";
const bodyKeys = ["background", "objectives", "methods", "results", "limitations", "conclusion"] as const;
const text = (value: unknown, limit: number): value is string => typeof value === "string" && value.length <= limit && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
export type AdvisoryIdentityScreen = LockedSnapshot["identity"];
/** Private screening context is consumed locally and never copied into the request or result. */
function validIdentity(value: unknown): value is AdvisoryIdentityScreen {
  return isRecord(value) && [value.authorNames, value.institutions].every(items => Array.isArray(items)
    && items.length > 0 && items.length <= 100 && items.every(item => text(item, 500) && item.trim().length > 0));
}

/** The worker independently requires a finalized, staff-attested sanitized packet. */
export function advisoryRubric(rubricVersion: number, input: unknown): Rubric | null {
  const criteria = decodeResearchRubric(input);
  if (!Number.isSafeInteger(rubricVersion) || rubricVersion < 1 || !criteria?.length) return null;
  return Object.freeze({ status: "APPROVED", version: String(rubricVersion), criteria: Object.freeze(criteria.map(criterion => Object.freeze({ ...criterion }))) });
}

/** Explicit projection: identity, supervisor contact details, metadata and attachments cannot reach the provider. */
export function prepareAdvisoryRequest(input: unknown, rubricVersion: number, criteria: unknown, config: RequestConfiguration, identity: AdvisoryIdentityScreen):
  | { readonly ok: true; readonly request: AssessmentRequest; readonly rubric: Rubric }
  | { readonly ok: false; readonly reason: "invalid_snapshot" | "identity_leak" | "invalid_configuration" } {
  const rubric = advisoryRubric(rubricVersion, criteria);
  if (!rubric || config.model !== DEEPSEEK_MODEL || config.thinking !== "disabled" || !validReference(config.promptVersion)
    || !Number.isSafeInteger(config.maxTokens) || config.maxTokens < 1 || config.maxTokens > 128_000) return { ok: false, reason: "invalid_configuration" };
  if (!validIdentity(identity) || !isRecord(input) || !text(input.title, 6000) || !input.title.trim()) return { ok: false, reason: "invalid_snapshot" };
  const projectedBody = projectResearchBody(input.body);
  if (!projectedBody) return { ok: false, reason: "invalid_snapshot" };
  const body = Object.freeze(projectedBody);
  const bodyText = bodyKeys.map(key => body[key]).join("\n");
  if (!bodyText.trim() || bodyText.length > 12_000) return { ok: false, reason: "invalid_snapshot" };
  const payload = Object.freeze({ title: input.title, body });
  // Canary screening supplements staff blinding; it does not prove free text is anonymous.
  if (checkIdentityLeaks([payload.title, bodyText, ...rubric.criteria.map(criterion => criterion.label)].join("\n"), identity).length) return { ok: false, reason: "identity_leak" };
  return { ok: true, request: buildAssessmentRequest(payload, rubric, config), rubric };
}

/** Invalid responses are discarded whole; even a valid subset must never be persisted. */
export function parseAdvisoryResponse(response: unknown, rubricVersion: number, criteria: unknown, identity: AdvisoryIdentityScreen):
  | { readonly ok: true; readonly scores: readonly AdvisoryCriterionScore[]; readonly model: string }
  | { readonly ok: false; readonly reason: "invalid_output" | "refusal" | "incomplete_output" } {
  const rubric = advisoryRubric(rubricVersion, criteria);
  if (!rubric || !validIdentity(identity)) return { ok: false, reason: "invalid_output" };
  const parsed = parseAssessmentMessage(response, rubric);
  if (!parsed.ok) return parsed;
  if (parsed.model !== DEEPSEEK_MODEL || checkIdentityLeaks([...parsed.output.criteria.map(criterion => criterion.rationale), parsed.output.overallComment].join("\n"), identity).length) return { ok: false, reason: "invalid_output" };
  return { ok: true, model: parsed.model, scores: Object.freeze(parsed.output.criteria.map(criterion => Object.freeze({ criterionId: criterion.criterionId, value: criterion.score, rationale: criterion.rationale }))) };
}
