import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { BatchCreateParams } from "@anthropic-ai/sdk/resources/messages/batches";
import { CORPUS_VERSION, SYNTHETIC_CORPUS } from "../evaluation/ai-assessment/corpus.ts";
import { evaluationOutcome, manualOutcome, prepareSyntheticCases, runMockedEvaluation, type SyntheticSettings } from "../evaluation/ai-assessment/harness.ts";
import { createEvaluationReport, type EvaluationOutcome } from "../evaluation/ai-assessment/report.ts";
import { SYNTHETIC_MODEL, SYNTHETIC_PROMPT_VERSION, SYNTHETIC_RUBRIC } from "../evaluation/ai-assessment/rubric.ts";
import { buildBatchRequest } from "../src/lib/ai-assessment/request.server.ts";
import { sanitizeSnapshot } from "../src/lib/ai-assessment/sanitizer.server.ts";

const RUN_DIRECTORY = resolve(process.cwd(), "deliverables", "ai-assessment");
const LIVE_ENV = ["CI", "GITHUB_ACTIONS", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "NETLIFY", "RENDER"];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Environment = Readonly<Record<string, string | undefined>>;
type BatchRequest = BatchCreateParams.Request;
type BatchResult = { custom_id: string; result: { type: string; message?: unknown } };
export type SyntheticBatchClient = Readonly<{
  create: (requests: BatchRequest[]) => Promise<{ id: string }>;
  retrieve: (id: string) => Promise<{ id: string; processing_status: string }>;
  results: (id: string) => Promise<AsyncIterable<BatchResult>>;
}>;
type Budget = { budgetUsd: number; inputPriceCeiling: number; outputPriceCeiling: number };
type Receipt = {
  version: "synthetic-batch-receipt-v1"; syntheticOnly: true; runId: string; batchId: string;
  corpusVersion: string; corpusHash: string; requestsHash: string; model: string; promptVersion: string;
  rubricVersion: string; createdAt: string; settings: SyntheticSettings; budget: Budget; reservedUsd: number;
};

export function assertLocalSyntheticConsent(args: readonly string[], environment: Environment) {
  if (LIVE_ENV.some((key) => Boolean(environment[key])) || environment.NODE_ENV === "production") throw new Error("live_synthetic_forbidden_environment");
  if (environment.ANTHROPIC_CUSTOM_HEADERS) throw new Error("live_synthetic_custom_headers_forbidden");
  if (!args.includes("--live-synthetic")) throw new Error("live_synthetic_explicit_consent_required");
  if (!environment.AI_SYNTHETIC_API_KEY?.trim()) throw new Error("live_synthetic_dedicated_key_required");
  if (environment.AI_SYNTHETIC_SPEND_LIMIT_CONFIGURED !== "yes") throw new Error("live_synthetic_console_spend_limit_required");
}

function flags(args: readonly string[], allowed: readonly string[]) {
  const parsed = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (!allowed.includes(name) || parsed.has(name)) throw new Error("invalid_synthetic_cli_arguments");
    if (name === "--live-synthetic") { parsed.set(name, "true"); continue; }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error("invalid_synthetic_cli_arguments");
    parsed.set(name, value);
  }
  return parsed;
}

function positiveNumber(value: string | undefined, max: number) {
  if (!value || !/^(?:\d+\.?\d*|\.\d+)$/.test(value)) throw new Error("invalid_synthetic_budget");
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) throw new Error("invalid_synthetic_budget");
  return number;
}

function submitSettings(args: readonly string[]) {
  const values = flags(args, ["--live-synthetic", "--budget-usd", "--input-price-ceiling", "--output-price-ceiling", "--max-tokens", "--effort"]);
  const maxTokens = positiveNumber(values.get("--max-tokens"), 4096);
  const effort = values.get("--effort");
  if (!Number.isInteger(maxTokens) || maxTokens < 512 || !["low", "medium", "high", "max"].includes(effort ?? "")) throw new Error("invalid_synthetic_token_settings");
  return {
    settings: { maxTokens, effort: effort as SyntheticSettings["effort"] },
    budget: { budgetUsd: positiveNumber(values.get("--budget-usd"), 100), inputPriceCeiling: positiveNumber(values.get("--input-price-ceiling"), 1000), outputPriceCeiling: positiveNumber(values.get("--output-price-ceiling"), 1000) },
  };
}

export function syntheticBatchPlan(settings: SyntheticSettings, budget: Budget) {
  const prepared = prepareSyntheticCases(settings);
  const requests: BatchRequest[] = prepared.filter((item) => item.request).map((item) => {
    const sanitized = sanitizeSnapshot(item.example.snapshot);
    if (!sanitized.ok) throw new Error("invalid_synthetic_batch_input");
    const params = buildBatchRequest(sanitized.payload, SYNTHETIC_RUBRIC, { model: SYNTHETIC_MODEL,
      promptVersion: SYNTHETIC_PROMPT_VERSION, maxTokens: settings.maxTokens, effort: settings.effort });
    return { custom_id: item.example.id, params } satisfies BatchRequest;
  });
  // A deliberately conservative byte-based input reservation, including serialized schema,
  // fixed system/rubric and extra provider framing reserve. Price ceilings have no defaults.
  // Reserve 2x input to cover a one-hour cache write rather than assume cache hits/discounts.
  const inputReservation = requests.reduce((sum, request) => sum + 2 * (Buffer.byteLength(JSON.stringify(request.params), "utf8") + 8192), 0);
  const outputReservation = requests.length * settings.maxTokens;
  const reservedUsd = (inputReservation * budget.inputPriceCeiling + outputReservation * budget.outputPriceCeiling) / 1_000_000;
  if (reservedUsd > budget.budgetUsd) throw new Error("synthetic_budget_reservation_exceeded");
  return { requests, prepared, reservedUsd, inputReservation, outputReservation };
}

async function defaultClient(apiKey: string): Promise<SyntheticBatchClient> {
  // The official SDK reads the actual host environment. A caller-supplied environment
  // must not bypass CI/hosting/custom-header guards or substitute implicit credentials.
  assertLocalSyntheticConsent(["--live-synthetic"], process.env);
  if (apiKey !== process.env.AI_SYNTHETIC_API_KEY) throw new Error("live_synthetic_host_key_mismatch");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, authToken: null, baseURL: "https://api.anthropic.com", logLevel: "off", maxRetries: 0, timeout: 30_000 });
  return {
    create: (requests) => client.messages.batches.create({ requests }),
    retrieve: (id) => client.messages.batches.retrieve(id),
    results: (id) => client.messages.batches.results(id),
  };
}

function validateReceipt(value: unknown, runId: string): Receipt {
  if (!value || typeof value !== "object") throw new Error("invalid_synthetic_receipt");
  const record = value as Receipt;
  if (record.version !== "synthetic-batch-receipt-v1" || record.syntheticOnly !== true || record.runId !== runId || !/^msgbatch_[a-zA-Z0-9]{1,100}$/.test(record.batchId) ||
    record.corpusVersion !== CORPUS_VERSION || record.corpusHash !== hash(SYNTHETIC_CORPUS) || record.model !== SYNTHETIC_MODEL ||
    record.promptVersion !== SYNTHETIC_PROMPT_VERSION || record.rubricVersion !== SYNTHETIC_RUBRIC.version ||
    !record.settings || !record.budget || !Number.isFinite(Date.parse(record.createdAt))) throw new Error("invalid_synthetic_receipt");
  const settings = submitSettings(["--live-synthetic", "--budget-usd", String(record.budget.budgetUsd), "--input-price-ceiling", String(record.budget.inputPriceCeiling),
    "--output-price-ceiling", String(record.budget.outputPriceCeiling), "--max-tokens", String(record.settings.maxTokens), "--effort", record.settings.effort]);
  const plan = syntheticBatchPlan(settings.settings, settings.budget);
  if (record.requestsHash !== hash(plan.requests) || record.reservedUsd !== plan.reservedUsd) throw new Error("invalid_synthetic_receipt");
  return record;
}

/** Injected client in tests; the official SDK is constructed only after all local guards. */
export async function runEvaluationCli(args: readonly string[], environment: Environment = process.env, dependencies: {
  createClient?: (key: string) => Promise<SyntheticBatchClient>; directory?: string; now?: () => string;
} = {}) {
  const [command, ...options] = args;
  const directory = dependencies.directory ?? RUN_DIRECTORY;
  const now = dependencies.now ?? (() => new Date().toISOString());
  if (command === "mock") {
    if (options.length) throw new Error("invalid_synthetic_cli_arguments");
    const report = await runMockedEvaluation(undefined, { now });
    await mkdir(directory, { recursive: true });
    const outputPath = resolve(directory, "mock-report.json");
    await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    return { status: "mock_report_written", outputPath, total: report.summary.total };
  }
  if (!["submit", "collect"].includes(command)) throw new Error("invalid_synthetic_cli_command");
  assertLocalSyntheticConsent(options, environment);
  const createClient = dependencies.createClient ?? defaultClient;
  if (command === "submit") {
    const { settings, budget } = submitSettings(options);
    const plan = syntheticBatchPlan(settings, budget);
    const runId = randomUUID();
    await mkdir(directory, { recursive: true });
    // Persist the local reservation before dispatch. Interrupted/ambiguous submit is never
    // automatically retried; its intent must be reconciled in Console before another run.
    const intentPath = resolve(directory, `${runId}.intent.json`);
    await writeFile(intentPath, JSON.stringify({ runId, syntheticOnly: true, state: "reserved_before_dispatch", reservedUsd: plan.reservedUsd, createdAt: now() }) + "\n", { flag: "wx", mode: 0o600 });
    const client = await createClient(environment.AI_SYNTHETIC_API_KEY!);
    const batch = await client.create(plan.requests);
    if (!/^msgbatch_[a-zA-Z0-9]{1,100}$/.test(batch.id)) throw new Error("invalid_synthetic_batch_response");
    const receipt: Receipt = { version: "synthetic-batch-receipt-v1", syntheticOnly: true, runId, batchId: batch.id,
      corpusVersion: CORPUS_VERSION, corpusHash: hash(SYNTHETIC_CORPUS), requestsHash: hash(plan.requests), model: SYNTHETIC_MODEL,
      promptVersion: SYNTHETIC_PROMPT_VERSION, rubricVersion: SYNTHETIC_RUBRIC.version, createdAt: now(), settings, budget, reservedUsd: plan.reservedUsd };
    const receiptPath = resolve(directory, `${runId}.receipt.json`);
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return { status: "synthetic_batch_submitted", runId, receiptPath, requested: plan.requests.length, blockedBeforeDispatch: plan.prepared.length - plan.requests.length, reservedUsd: plan.reservedUsd };
  }
  const parsed = flags(options, ["--live-synthetic", "--run-id"]);
  const runId = parsed.get("--run-id") ?? "";
  if (!UUID.test(runId)) throw new Error("invalid_synthetic_run_id");
  const receiptText = await readFile(resolve(directory, `${runId}.receipt.json`), "utf8");
  if (receiptText.length > 16_384) throw new Error("invalid_synthetic_receipt");
  let receipt: Receipt;
  try { receipt = validateReceipt(JSON.parse(receiptText), runId); } catch { throw new Error("invalid_synthetic_receipt"); }
  const plan = syntheticBatchPlan(receipt.settings, receipt.budget);
  const client = await createClient(environment.AI_SYNTHETIC_API_KEY!);
  const batch = await client.retrieve(receipt.batchId);
  if (batch.id !== receipt.batchId) throw new Error("invalid_synthetic_batch_response");
  if (batch.processing_status !== "ended") return { status: "synthetic_batch_pending", runId };
  const expected = new Map(plan.requests.map((request) => [request.custom_id, true]));
  const received = new Map<string, EvaluationOutcome>();
  for await (const item of await client.results(receipt.batchId)) {
    if (!expected.has(item.custom_id) || received.has(item.custom_id)) throw new Error("invalid_synthetic_batch_result_scope");
    const example = SYNTHETIC_CORPUS.find((entry) => entry.id === item.custom_id)!;
    const warnings = plan.prepared.find((entry) => entry.example.id === item.custom_id)!.sanitizationWarnings;
    if (item.result.type === "succeeded") received.set(example.id, evaluationOutcome(example, item.result.message, now(), "anthropic", warnings));
    else if (["errored", "canceled", "expired"].includes(item.result.type)) received.set(example.id, manualOutcome(example, `batch_${item.result.type}`, now(), "anthropic", warnings));
    else throw new Error("invalid_synthetic_batch_result");
  }
  const outcomes = plan.prepared.map((item) => item.request ? received.get(item.example.id) ?? manualOutcome(item.example, "batch_missing_result", now(), "anthropic", item.sanitizationWarnings) :
    manualOutcome(item.example, item.inputFailure!, now(), "anthropic", item.sanitizationWarnings));
  const report = createEvaluationReport(outcomes, SYNTHETIC_RUBRIC, { generatedAt: now(), execution: "live_synthetic_batch" });
  const outputPath = resolve(directory, `${runId}.report.json`);
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  return { status: "synthetic_batch_report_written", runId, outputPath, total: report.summary.total };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--help")) {
    console.info("Synthetic only: mock | submit --live-synthetic --budget-usd N --input-price-ceiling N --output-price-ceiling N --max-tokens N --effort medium | collect --live-synthetic --run-id UUID. See evaluation/ai-assessment/README.md. No arbitrary corpus files. Never run live in CI.");
  } else {
    try { console.info(JSON.stringify(await runEvaluationCli(process.argv.slice(2)))); }
    catch { console.error("Synthetic evaluation failed safely. Check local consent, dedicated key, spend-limit acknowledgement, argument/budget settings and receipt. No provider details logged; no automatic retry. Human review remains available."); process.exitCode = 1; }
  }
}
