import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { prepareSyntheticCases, runMockedEvaluation, type SyntheticSettings } from "../evaluation/ai-assessment/harness.ts";

const RUN_DIRECTORY = resolve(process.cwd(), "deliverables", "ai-assessment");
const LIVE_ENV = ["CI", "GITHUB_ACTIONS", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "NETLIFY", "RENDER"];
const TRANSPORT_OVERRIDE_ENV = ["DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE", "DEEPSEEK_CUSTOM_HEADERS", "DEEPSEEK_HEADERS", "OPENAI_BASE_URL", "OPENAI_CUSTOM_HEADERS", "OPENAI_HEADERS", "ANTHROPIC_BASE_URL", "ANTHROPIC_CUSTOM_HEADERS"];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
type Environment = Readonly<Record<string, string | undefined>>;
type Budget = { budgetUsd: number; inputPriceCeiling: number; outputPriceCeiling: number };

/** Retained local consent guards grant neither production approval nor batch support. */
export function assertLocalSyntheticConsent(args: readonly string[], environment: Environment) {
  if (LIVE_ENV.some((key) => Boolean(environment[key])) || environment.NODE_ENV === "production") throw new Error("live_synthetic_forbidden_environment");
  if (TRANSPORT_OVERRIDE_ENV.some((key) => Boolean(environment[key]))) throw new Error("live_synthetic_transport_override_forbidden");
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
  const values = flags(args, ["--live-synthetic", "--budget-usd", "--input-price-ceiling", "--output-price-ceiling", "--max-tokens", "--thinking"]);
  const maxTokens = positiveNumber(values.get("--max-tokens"), 4096);
  if (!Number.isInteger(maxTokens) || maxTokens < 512 || values.get("--thinking") !== "disabled") throw new Error("invalid_synthetic_token_settings");
  return {
    settings: { maxTokens, thinking: "disabled" as const },
    budget: { budgetUsd: positiveNumber(values.get("--budget-usd"), 100), inputPriceCeiling: positiveNumber(values.get("--input-price-ceiling"), 1000), outputPriceCeiling: positiveNumber(values.get("--output-price-ceiling"), 1000) },
  };
}

/** Local cost preview only. This never queues or dispatches a batch or synchronous calls. */
export function syntheticEvaluationPlan(settings: SyntheticSettings, budget: Budget) {
  const prepared = prepareSyntheticCases(settings);
  const requests = prepared.flatMap((item) => item.request ? [item.request] : []);
  // Preserve the conservative upper estimate without assuming cache hits or discounts.
  const inputReservation = requests.reduce((sum, request) => sum + 2 * (Buffer.byteLength(JSON.stringify(request), "utf8") + 8192), 0);
  const outputReservation = requests.length * settings.maxTokens;
  const reservedUsd = (inputReservation * budget.inputPriceCeiling + outputReservation * budget.outputPriceCeiling) / 1_000_000;
  if (reservedUsd > budget.budgetUsd) throw new Error("synthetic_budget_reservation_exceeded");
  return { requests, prepared, reservedUsd, inputReservation, outputReservation };
}

/** Only mock execution is supported. Unsupported commands cannot construct a provider. */
export async function runEvaluationCli(args: readonly string[], environment: Environment = process.env, dependencies: {
  directory?: string; now?: () => string;
} = {}) {
  const [command, ...options] = args;
  if (command === "mock") {
    if (options.length) throw new Error("invalid_synthetic_cli_arguments");
    const directory = dependencies.directory ?? RUN_DIRECTORY;
    const report = await runMockedEvaluation(undefined, { now: dependencies.now });
    await mkdir(directory, { recursive: true });
    const outputPath = resolve(directory, "mock-report.json");
    await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    return { status: "mock_report_written", outputPath, total: report.summary.total };
  }
  if (!["submit", "collect"].includes(command)) throw new Error("invalid_synthetic_cli_command");
  assertLocalSyntheticConsent(options, environment);
  if (command === "submit") {
    const { settings, budget } = submitSettings(options);
    syntheticEvaluationPlan(settings, budget);
  } else {
    const parsed = flags(options, ["--live-synthetic", "--run-id"]);
    if (!UUID.test(parsed.get("--run-id") ?? "")) throw new Error("invalid_synthetic_run_id");
  }
  // No batch IDs, receipts, intents, result downloads, provider construction or fetch.
  // Never replace this with a loop of synchronous requests to simulate batch support.
  return { status: "manual_review", manualReviewAllowed: true, reason: "batch_unsupported", provider: "deepseek" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--help")) {
    console.info("Synthetic only: mock. submit/collect return manual_review: batch_unsupported and make no provider call. Dedicated local consent/key/spend/argument guards remain in force. See evaluation/ai-assessment/README.md. No arbitrary corpus files. Never run live in CI.");
  } else {
    try { console.info(JSON.stringify(await runEvaluationCli(process.argv.slice(2)))); }
    catch { console.error("Synthetic evaluation failed safely. Check local consent, dedicated key, spend-limit acknowledgement and argument/budget settings. No provider details logged; no automatic retry. Human review remains available."); process.exitCode = 1; }
  }
}
