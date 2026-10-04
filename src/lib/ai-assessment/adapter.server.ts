import "server-only";
import { randomUUID } from "node:crypto";
import { authorize } from "../permissions/authorize.server.ts";
import type { AuthorityReader, VerifiedPrincipal } from "../permissions/contract.ts";
import type { AssessmentConfiguration, AssessmentProvider, AssessmentResult, BatchReceipt, BatchSubmission, LockedSnapshot, ManualReason, ProviderResponse } from "./contracts.ts";
import { createAnthropicProvider } from "./anthropic.server.ts";
import { validateConfiguration } from "./configuration.server.ts";
import { buildAssessmentRequest, buildBatchRequest, parseAssessmentMessage } from "./request.server.ts";
import { isRecord, sanitizeSnapshot, validReference } from "./sanitizer.server.ts";

export interface BudgetReservation {
  readonly ledgerId: string; readonly capUsd: number; readonly amountUsd: number;
  readonly requestCount: number; readonly configurationDigest: string;
}
export interface AssessmentAudit {
  readonly event: "dispatch" | "complete" | "manual_review" | "batch_dispatch";
  readonly actorId: string; readonly configurationDigest: string; readonly reason?: ManualReason;
  readonly snapshotIds: readonly string[]; readonly timestamp: string;
}
export interface AdapterDependencies {
  /** Trusted private config/evidence source. There is intentionally no live implementation. */
  readConfiguration(): unknown | Promise<unknown>;
  principal(): VerifiedPrincipal | null | Promise<VerifiedPrincipal | null>;
  readonly authorityReader: AuthorityReader;
  readonly integrationResourceId: string;
  /** Must atomically reserve against cap, including worst-case fallback cost. No refunds on uncertain failure. */
  reserveBudget(request: BudgetReservation): Promise<{ readonly approved: boolean }>;
  audit(event: AssessmentAudit): Promise<void>;
  readonly providerFactory?: (config: AssessmentConfiguration) => AssessmentProvider;
  readonly now?: () => number;
}
const manual = (reason: ManualReason): AssessmentResult & { state: "manual_review" } => ({ state: "manual_review", manualReviewAllowed: true, reason });
type Ready = Extract<ReturnType<typeof validateConfiguration>, { ok: true }> & { readonly actorId: string };
const isReady = (value: Ready | ReturnType<typeof manual>): value is Ready => "ok" in value && value.ok === true;

/** No client routes, persistence, reveal, ranking, decisions or application mutation are exposed here. */
export function createAssessmentAdapter(dependencies: AdapterDependencies) {
  const now = dependencies.now ?? Date.now;
  const registeredBatches = new Map<string, BatchReceipt>();
  async function gate(expected?: Ready): Promise<Ready | ReturnType<typeof manual>> {
    if (process.env.AI_ASSESSMENT_ENABLED !== "true") return manual("disabled");
    try {
      const validated = validateConfiguration(await dependencies.readConfiguration(), now());
      if (!validated.ok) return manual(validated.reason);
      if (expected && (validated.digest !== expected.digest || validated.approvalDigest !== expected.approvalDigest)) return manual("configuration_changed");
      const principal = await dependencies.principal();
      const permission = await authorize(principal, { operation: "security.grant.manage", resourceId: dependencies.integrationResourceId }, dependencies.authorityReader);
      if (!permission.allowed || !principal) return manual("not_authorized");
      // Flag/approval could change while reading persisted authority.
      if (process.env.AI_ASSESSMENT_ENABLED !== "true") return manual("disabled");
      const afterAuthority = validateConfiguration(await dependencies.readConfiguration(), now());
      if (!afterAuthority.ok) return manual(afterAuthority.reason);
      if (validated.digest !== afterAuthority.digest || validated.approvalDigest !== afterAuthority.approvalDigest) return manual("configuration_changed");
      if (process.env.AI_ASSESSMENT_ENABLED !== "true") return manual("disabled");
      return { ...validated, actorId: principal.userId };
    } catch { return manual("invalid_configuration"); }
  }
  function completed(response: ProviderResponse, snapshot: Pick<LockedSnapshot, "id" | "version" | "lockedAt">, ready: Ready): AssessmentResult {
    const parsed = parseAssessmentMessage(response, ready.configuration.rubric);
    if (!parsed.ok) return manual(parsed.reason);
    if (!ready.configuration.servingModelIds.includes(parsed.model)) return manual("invalid_output");
    return { state: "advisory_complete", manualReviewAllowed: true, output: parsed.output,
      provenance: Object.freeze({ provider: "anthropic", requestedModel: ready.configuration.model, model: parsed.model,
        promptVersion: ready.configuration.promptVersion, rubricVersion: ready.configuration.rubric.version,
        snapshotId: snapshot.id, snapshotVersion: snapshot.version, snapshotLockedAt: snapshot.lockedAt, assessedAt: new Date(now()).toISOString() }) };
  }
  async function prepare(ready: Ready, count: number, snapshotIds: readonly string[], batch: boolean): Promise<Ready | ReturnType<typeof manual>> {
    try {
      if (!Number.isSafeInteger(count) || count < 1 || count > ready.configuration.budget.maxBatchItems) return manual("budget_exhausted");
      const budget = ready.configuration.budget;
      const amountUsd = budget.reservationUsdPerRequest * count;
      if (!Number.isFinite(amountUsd) || amountUsd > budget.capUsd) return manual("budget_exhausted");
      const reservation = await dependencies.reserveBudget(Object.freeze({ ledgerId: budget.ledgerId, capUsd: budget.capUsd, amountUsd, requestCount: count, configurationDigest: ready.digest }));
      if (!isRecord(reservation) || reservation.approved !== true) return manual("budget_exhausted");
      const current = await gate(ready);
      if (!isReady(current)) return current;
      await dependencies.audit({ event: batch ? "batch_dispatch" : "dispatch", actorId: current.actorId, configurationDigest: current.digest,
        snapshotIds, timestamp: new Date(now()).toISOString() });
      return gate(current);
    } catch { return manual("provider_unavailable"); }
  }
  async function assess(snapshot: unknown): Promise<AssessmentResult> {
    const ready = await gate();
    if (!isReady(ready)) return ready;
    const sanitized = sanitizeSnapshot(snapshot);
    if (!sanitized.ok) return { ...manual(sanitized.reason), ...(sanitized.flags ? { flags: sanitized.flags } : {}) };
    // Capture metadata and scientific content before any asynchronous budget/provider work.
    const locked = snapshot as LockedSnapshot;
    const metadata = Object.freeze({ id: locked.id, version: locked.version, lockedAt: locked.lockedAt });
    const request = buildAssessmentRequest(sanitized.payload, ready.configuration.rubric, ready.configuration);
    const prepared = await prepare(ready, 1, [metadata.id], false);
    if (!isReady(prepared)) return prepared;
    try {
      const provider = (dependencies.providerFactory ?? createAnthropicProvider)(prepared.configuration);
      const response = await provider.assess(request);
      const current = await gate(prepared);
      if (!isReady(current)) return current;
      const result = completed(response, metadata, current);
      await dependencies.audit({ event: result.state === "advisory_complete" ? "complete" : "manual_review", actorId: current.actorId,
        configurationDigest: current.digest, ...(result.state === "manual_review" ? { reason: result.reason } : {}), snapshotIds: [metadata.id], timestamp: new Date(now()).toISOString() });
      return result;
    } catch { return manual("provider_unavailable"); }
  }
  async function submitBatch(snapshots: readonly unknown[]): Promise<BatchSubmission> {
    const ready = await gate();
    if (!isReady(ready)) return ready;
    if (!Array.isArray(snapshots) || snapshots.length === 0 || snapshots.length > ready.configuration.budget.maxBatchItems) return manual("invalid_snapshot");
    const items: BatchReceipt["items"][number][] = [];
    const requests = [];
    const seen = new Set<string>();
    for (const snapshot of snapshots) {
      const sanitized = sanitizeSnapshot(snapshot);
      if (!sanitized.ok) return manual(sanitized.reason);
      const locked = snapshot as LockedSnapshot;
      if (seen.has(locked.id)) return manual("invalid_snapshot");
      seen.add(locked.id);
      const customId = randomUUID(); // Never send applicant/snapshot identifiers to the provider.
      items.push(Object.freeze({ customId, snapshot: Object.freeze({ id: locked.id, version: locked.version, lockedAt: locked.lockedAt }) }));
      requests.push({ custom_id: customId, params: buildBatchRequest(sanitized.payload, ready.configuration.rubric, ready.configuration) });
    }
    const prepared = await prepare(ready, requests.length, [...seen], true);
    if (!isReady(prepared)) return prepared;
    try {
      const provider = (dependencies.providerFactory ?? createAnthropicProvider)(prepared.configuration);
      const batch = await provider.submitBatch(requests);
      if (!validReference(batch.id)) return manual("batch_failed");
      const current = await gate(prepared);
      if (!isReady(current)) return current;
      const receipt: BatchReceipt = Object.freeze({ batchId: batch.id, configurationDigest: current.digest,
        requestedAt: new Date(now()).toISOString(), items: Object.freeze(items) });
      registeredBatches.set(receipt.batchId, receipt);
      return { state: "queued", manualReviewAllowed: true, receipt };
    } catch { return manual("provider_unavailable"); }
  }
  async function collectBatch(receipt: BatchReceipt): Promise<readonly AssessmentResult[]> {
    const ready = await gate();
    const registered = receipt && registeredBatches.get(receipt.batchId);
    if (!registered || registered !== receipt) return [manual("batch_failed")];
    const allManual = (reason: ManualReason) => registered.items.map(() => manual(reason));
    if (!isReady(ready)) return allManual(ready.reason);
    if (ready.digest !== registered.configurationDigest) return allManual("configuration_changed");
    try {
      const provider = (dependencies.providerFactory ?? createAnthropicProvider)(ready.configuration);
      const status = await provider.retrieveBatch(registered.batchId);
      if (status.processing_status !== "ended") return allManual(status.processing_status === "in_progress" || status.processing_status === "canceling" ? "batch_pending" : "batch_failed");
      const fresh = await gate(ready);
      if (!isReady(fresh)) return allManual(fresh.reason);
      const received = new Map<string, AssessmentResult>();
      for await (const item of provider.batchResults(registered.batchId)) {
        const match = registered.items.find(entry => entry.customId === item.custom_id);
        if (!match || received.has(item.custom_id)) return allManual("batch_failed");
        received.set(item.custom_id, item.result.type === "succeeded" && item.result.message
          ? completed(item.result.message, match.snapshot, fresh) : manual("batch_failed"));
      }
      const finalGate = await gate(fresh);
      if (!isReady(finalGate)) return allManual(finalGate.reason);
      return registered.items.map(item => received.get(item.customId) ?? manual("batch_failed"));
    } catch { return allManual("provider_unavailable"); }
  }
  return Object.freeze({ assess, submitBatch, collectBatch });
}
