import "server-only";
import { createHash } from "node:crypto";
import type { AssessmentConfiguration, ManualReason } from "./contracts.ts";
import { isRecord, validReference, validTimestamp } from "./sanitizer.server.ts";
import { validRubric } from "./request.server.ts";

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const ANTHROPIC_TRANSPORT_POLICY = Object.freeze({ sdkVersion: "0.131.0", baseURL: "https://api.anthropic.com",
  timeout: 60_000, maxRetries: 0, logLevel: "off" as const, fallbackPolicy: "anthropic-default-sync-only", syncCacheTtl: "5m", batchCacheTtl: "1h" });
function freeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Binds approval to every operating value and a non-reversible credential fingerprint; never return the key. */
export function configurationDigest(config: AssessmentConfiguration): string {
  return hash({ provider: config.provider, accountId: config.accountId, keyFingerprint: hash(config.apiKey), model: config.model,
    servingModelIds: [...config.servingModelIds].sort(), promptVersion: config.promptVersion, effort: config.effort,
    maxTokens: config.maxTokens, rubric: config.rubric, budget: config.budget, transport: ANTHROPIC_TRANSPORT_POLICY });
}

export function validateConfiguration(value: unknown, now: number): { readonly ok: true; readonly configuration: AssessmentConfiguration; readonly digest: string; readonly approvalDigest: string }
  | { readonly ok: false; readonly reason: Extract<ManualReason, "invalid_configuration" | "unapproved_configuration"> } {
  const invalid = { ok: false, reason: "invalid_configuration" } as const;
  if (!isRecord(value) || !exactKeys(value, ["provider", "accountId", "apiKey", "model", "servingModelIds", "promptVersion", "effort", "maxTokens", "rubric", "budget", "approvals"])
    || value.provider !== "anthropic" || !validReference(value.accountId) || typeof value.apiKey !== "string" || !/^[^\s]{8,512}$/.test(value.apiKey)
    || value.model !== "claude-opus-5-5" || !Array.isArray(value.servingModelIds) || value.servingModelIds.length === 0 || value.servingModelIds.length > 20
    || !value.servingModelIds.every(validReference) || new Set(value.servingModelIds).size !== value.servingModelIds.length
    || !value.servingModelIds.includes(value.model) || !validReference(value.promptVersion)
    || typeof value.effort !== "string" || !["low", "medium", "high", "xhigh", "max"].includes(value.effort)
    || !Number.isSafeInteger(value.maxTokens) || Number(value.maxTokens) <= 0 || Number(value.maxTokens) > 128_000
    || !isRecord(value.rubric) || !exactKeys(value.rubric, ["version", "status", "criteria"]) || !validRubric(value.rubric) || !isRecord(value.budget)
    || !exactKeys(value.budget, ["capUsd", "reservationUsdPerRequest", "ledgerId", "maxBatchItems"])
    || typeof value.budget.capUsd !== "number" || !Number.isFinite(value.budget.capUsd) || value.budget.capUsd <= 0
    || typeof value.budget.reservationUsdPerRequest !== "number" || !Number.isFinite(value.budget.reservationUsdPerRequest)
    || value.budget.reservationUsdPerRequest <= 0 || value.budget.reservationUsdPerRequest > value.budget.capUsd
    || !validReference(value.budget.ledgerId) || !Number.isSafeInteger(value.budget.maxBatchItems) || Number(value.budget.maxBatchItems) < 1 || Number(value.budget.maxBatchItems) > 10_000
    || !Array.isArray(value.approvals) || value.approvals.length !== 6) return invalid;
  // JSON-clone before any await. Mutating a caller object cannot change an approved request.
  const configuration = freeze(JSON.parse(JSON.stringify(value)) as AssessmentConfiguration);
  const digest = configurationDigest(configuration);
  if (configuration.rubric.status !== "APPROVED") return { ok: false, reason: "unapproved_configuration" };
  const needed = ["provider", "privacy", "scientific_lead", "rubric", "budget", "activation"];
  const seen = new Set<string>();
  for (const approval of configuration.approvals) {
    if (!isRecord(approval) || !exactKeys(approval, ["kind", "evidenceId", "approverId", "approvedAt", "expiresAt", "configurationDigest"])
      || typeof approval.kind !== "string" || !needed.includes(approval.kind) || seen.has(approval.kind)
      || !validReference(approval.evidenceId) || !validReference(approval.approverId) || !validTimestamp(approval.approvedAt) || !validTimestamp(approval.expiresAt)
      || Date.parse(approval.approvedAt) > now || Date.parse(approval.expiresAt) <= now || Date.parse(approval.expiresAt) <= Date.parse(approval.approvedAt)
      || approval.configurationDigest !== digest) return { ok: false, reason: "unapproved_configuration" };
    seen.add(approval.kind);
  }
  return { ok: true, configuration, digest, approvalDigest: hash(configuration.approvals) };
}
