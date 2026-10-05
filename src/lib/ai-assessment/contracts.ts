/** AI-01..06: advisory contracts; these do not grant access or publish outcomes. */
export interface RubricCriterion { readonly id: string; readonly label: string; readonly min: number; readonly max: number }
export interface Rubric { readonly version: string; readonly status: "UNAPPROVED" | "APPROVED"; readonly criteria: readonly RubricCriterion[] }
export interface ScientificPayload {
  readonly title: string; readonly specialty: string; readonly studyType: string;
  readonly completionStatus: "ongoing" | "completed"; readonly body: string;
}
export interface LockedSnapshot {
  readonly id: string; readonly version: string; readonly lockedAt: string; readonly locked: true;
  readonly scientific: unknown;
  /** Local matching context only. Never included in the provider request or audit. */
  readonly identity: { readonly authorNames: readonly string[]; readonly institutions: readonly string[] };
}
export type IdentityFlag = "email" | "phone" | "author_name" | "institution" | "licence_number" | "irb_number";
/** Non-identifying setting words are review warnings, never automatic dispatch blockers. */
export type SanitizationWarning = "generic_institution_mention";
export interface AssessmentOutput {
  readonly criteria: readonly { readonly criterionId: string; readonly score: number; readonly rationale: string }[];
  readonly overallComment: string;
}
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export interface RequestConfiguration { readonly model: string; readonly promptVersion: string; readonly effort: Effort; readonly maxTokens: number }
export type ApprovalKind = "provider" | "privacy" | "scientific_lead" | "rubric" | "budget" | "activation";
export interface ApprovalEvidence {
  readonly kind: ApprovalKind; readonly evidenceId: string; readonly approverId: string;
  readonly approvedAt: string; readonly expiresAt: string; readonly configurationDigest: string;
}
export interface AssessmentConfiguration extends RequestConfiguration {
  readonly provider: "anthropic"; readonly accountId: string; readonly apiKey: string;
  readonly servingModelIds: readonly string[];
  readonly rubric: Rubric;
  readonly budget: { readonly capUsd: number; readonly reservationUsdPerRequest: number; readonly ledgerId: string; readonly maxBatchItems: number };
  /** Immutable approved records loaded from trusted private storage, never client input. */
  readonly approvals: readonly ApprovalEvidence[];
}
export interface Provenance {
  readonly provider: "anthropic"; readonly requestedModel: string; readonly model: string;
  readonly promptVersion: string; readonly rubricVersion: string;
  readonly snapshotId: string; readonly snapshotVersion: string; readonly snapshotLockedAt: string; readonly assessedAt: string;
  readonly sanitizationWarnings: readonly SanitizationWarning[];
}
export type ManualReason = "disabled" | "invalid_configuration" | "unapproved_configuration" | "not_authorized"
  | "budget_exhausted" | "invalid_snapshot" | "identity_leak" | "provider_unavailable" | "refusal"
  | "incomplete_output" | "invalid_output" | "configuration_changed" | "batch_pending" | "batch_failed";
export type AssessmentResult =
  | { readonly state: "manual_review"; readonly manualReviewAllowed: true; readonly reason: ManualReason; readonly flags?: readonly IdentityFlag[] }
  | { readonly state: "advisory_complete"; readonly manualReviewAllowed: true; readonly output: AssessmentOutput; readonly provenance: Provenance };
export interface ProviderResponse { readonly stop_reason: unknown; readonly model: unknown; readonly content: unknown }
export type BatchAssessmentRequest = Omit<AssessmentRequest, "fallbacks" | "betas">;
export interface BatchRequest { readonly custom_id: string; readonly params: BatchAssessmentRequest }
export interface AssessmentRequest {
  readonly model: string; readonly max_tokens: number;
  readonly thinking: { readonly type: "adaptive" };
  readonly output_config: { readonly effort: Effort; readonly format: { readonly type: "json_schema"; readonly schema: Record<string, unknown> } };
  readonly fallbacks: "default"; readonly betas: ["server-side-fallback-2026-07-01"];
  readonly system: { type: "text"; text: string; cache_control: { type: "ephemeral"; ttl?: "5m" | "1h" } }[];
  readonly messages: { role: "user"; content: string }[];
}
export interface ProviderBatchResult { readonly custom_id: string; readonly result: { readonly type: unknown; readonly message?: ProviderResponse } }
export interface AssessmentProvider {
  assess(request: AssessmentRequest): Promise<ProviderResponse>;
  submitBatch(requests: readonly BatchRequest[]): Promise<{ readonly id: string }>;
  retrieveBatch(id: string): Promise<{ readonly processing_status: unknown }>;
  batchResults(id: string): AsyncIterable<ProviderBatchResult>;
}
export interface BatchReceipt {
  readonly batchId: string; readonly configurationDigest: string; readonly requestedAt: string;
  readonly items: readonly { readonly customId: string; readonly snapshot: Pick<LockedSnapshot, "id" | "version" | "lockedAt">; readonly sanitizationWarnings: readonly SanitizationWarning[] }[];
}
export type BatchSubmission = { readonly state: "queued"; readonly manualReviewAllowed: true; readonly receipt: BatchReceipt }
  | { readonly state: "manual_review"; readonly manualReviewAllowed: true; readonly reason: ManualReason };
