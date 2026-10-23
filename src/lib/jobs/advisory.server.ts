import "server-only";
import { randomUUID } from "node:crypto";
import { decodeAdvisorySettings, type AdvisorySettings } from "@/features/staff-portal/advisory-contract";
import { decodeResearchRubric, researchInteger, researchRecord, researchText, researchUuid, type ResearchCriterion, type ResearchPacket } from "@/features/staff-portal/research-contract";
import { ADVISORY_PROMPT_VERSION, parseAdvisoryResponse, prepareAdvisoryRequest } from "@/lib/ai-assessment/advisory.server";
import { createDeepSeekProvider, DeepSeekProviderError } from "@/lib/ai-assessment/deepseek.server";
import type { AssessmentProvider, LockedSnapshot } from "@/lib/ai-assessment/contracts";
import { advisoryRuntimeReady, type AdvisoryEnvironment, type AdvisoryWorkerConfig } from "./advisory-config.server";

export type AdvisoryJob = { id: string; leaseToken: string; runId: string; submissionId: string; submissionVersion: number; rubricVersion: number; title: string; body: ResearchPacket["body"]; identity: LockedSnapshot["identity"]; rubric: ResearchCriterion[]; configuration: AdvisorySettings; attempt: number };
export type AdvisoryJobResult = { scores: readonly { criterionId: string; value: number; rationale: string }[]; model: string; promptVersion: string };
export type AdvisoryJobError = "rate_limited" | "provider_unavailable" | "provider_configuration" | "invalid_output" | "invalid_snapshot" | "identity_leak" | "disabled";
export type AdvisoryFinish = "completed" | "retry" | "failed" | "stale";
export interface AdvisoryStore {
  claim(workerId: string, batchSize: number): Promise<AdvisoryJob[]>;
  finish(workerId: string, job: AdvisoryJob, result: AdvisoryJobResult | null, error: AdvisoryJobError | null): Promise<AdvisoryFinish>;
}
export type AdvisorySummary = { claimed: number; completed: number; retry: number; failed: number; stale: number };
export function decodeAdvisoryJob(value: unknown): AdvisoryJob | null {
  const row = researchRecord(value), configuration = decodeAdvisorySettings(row?.configuration), rubric = decodeResearchRubric(row?.rubric), body = researchRecord(row?.body), identity = researchRecord(row?.identity);
  if (!row || !configuration?.enabled || !rubric?.length || !researchUuid(row.id) || !researchUuid(row.leaseToken) || !researchUuid(row.runId) || !researchUuid(row.submissionId) || !researchInteger(row.submissionVersion, 1) || !researchInteger(row.rubricVersion, 1) || !researchInteger(row.attempt, 1) || row.attempt > configuration.maxAttempts! || !researchText(row.title, 500) || !body || !identity) return null;
  const authorNames = identity.authorNames, institutions = identity.institutions;
  if (![authorNames, institutions].every(items => Array.isArray(items) && items.length > 0 && items.length <= 100 && items.every(item => researchText(item, 300) && item.trim()))) return null;
  const keys = ["background", "aim", "methods", "results", "conclusion"] as const;
  if (!keys.every(key => researchText(body[key], 12000))) return null;
  return { id: row.id, leaseToken: row.leaseToken, runId: row.runId, submissionId: row.submissionId, submissionVersion: row.submissionVersion, rubricVersion: row.rubricVersion, title: row.title, body: Object.fromEntries(keys.map(key => [key, body[key]])) as ResearchPacket["body"], identity: { authorNames: [...authorNames as string[]], institutions: [...institutions as string[]] }, rubric, configuration, attempt: row.attempt };
}
export function createAdvisoryStore(config: AdvisoryWorkerConfig): AdvisoryStore {
  async function rpc(name: "claim" | "finish", args: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch(config.databaseUrl + "/rest/v1/rpc/msrc_advisory_worker_" + name, { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000), headers: { apikey: config.databaseKey, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(args) });
      if (!response.ok) { await response.body?.cancel(); throw new Error(); }
      return await response.json();
    } catch { throw new Error("Advisory storage unavailable"); }
  }
  return {
    async claim(workerId, batchSize) {
      const value = await rpc("claim", { p_worker_id: workerId, p_batch_size: batchSize });
      if (!Array.isArray(value) || value.length > batchSize) throw new Error("Invalid advisory lease");
      const jobs = value.map(decodeAdvisoryJob); if (jobs.some(job => !job) || new Set(jobs.map(job => job!.id)).size !== jobs.length) throw new Error("Invalid advisory lease");
      return jobs as AdvisoryJob[];
    },
    async finish(workerId, job, result, error) {
      const response = researchRecord(await rpc("finish", { p_worker_id: workerId, p_job_id: job.id, p_lease_token: job.leaseToken, p_result: result, p_error_code: error }));
      if (!response || !["completed", "retry", "failed", "stale"].includes(String(response.state))) throw new Error("Invalid advisory acknowledgement");
      return response.state as AdvisoryFinish;
    },
  };
}

/** Two bounded concurrent calls per tick; durable SQL owns deduplication, budgets, leases and retries.
 * No console logs, prompts, raw provider errors or invalid responses leave this function. */
export async function drainAdvisory({ env, store, provider, workerId = randomUUID() }: { env: AdvisoryEnvironment; store: AdvisoryStore; provider: AssessmentProvider; workerId?: string }): Promise<AdvisorySummary> {
  const summary: AdvisorySummary = { claimed: 0, completed: 0, retry: 0, failed: 0, stale: 0 };
  if (!advisoryRuntimeReady(env)) return summary;
  const jobs = await store.claim(workerId, 2); summary.claimed = jobs.length;
  const outcomes = await Promise.allSettled(jobs.map(async job => {
    let result: AdvisoryJobResult | null = null, error: AdvisoryJobError | null = null;
    if (!advisoryRuntimeReady(env) || !job.configuration.enabled) error = "disabled";
    else {
      const prepared = prepareAdvisoryRequest({ title: job.title, body: job.body }, job.rubricVersion, job.rubric, { model: job.configuration.model!, promptVersion: ADVISORY_PROMPT_VERSION, thinking: "disabled", maxTokens: job.configuration.maxTokens! }, job.identity);
      if (!prepared.ok) error = prepared.reason === "invalid_configuration" ? "provider_configuration" : prepared.reason;
      else try {
        const response = await provider.assess(prepared.request);
        if (!advisoryRuntimeReady(env)) error = "disabled";
        else {
          const parsed = parseAdvisoryResponse(response, job.rubricVersion, job.rubric, job.identity);
          if (!parsed.ok) error = "invalid_output";
          else result = { scores: parsed.scores, model: parsed.model, promptVersion: ADVISORY_PROMPT_VERSION };
        }
      } catch (caught) { error = caught instanceof DeepSeekProviderError ? caught.code : "provider_unavailable"; }
    }
    const state = await store.finish(workerId, job, result, error); summary[state]++;
  }));
  if (outcomes.some(outcome => outcome.status === "rejected")) throw new Error("Advisory storage unavailable");
  return summary;
}
export function runAdvisoryWorker(config: AdvisoryWorkerConfig, env: AdvisoryEnvironment): Promise<AdvisorySummary> { return drainAdvisory({ env, store: createAdvisoryStore(config), provider: createDeepSeekProvider({ apiKey: config.apiKey }) }); }
