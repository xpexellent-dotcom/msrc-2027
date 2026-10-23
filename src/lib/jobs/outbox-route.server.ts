import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { OutboxDatabaseConfig } from "./outbox-store.server";
import type { OutboxSummary } from "./outbox.server";
import type { ConfirmationMaintenanceResult } from "./registration-confirmation.server";

type Environment = Readonly<Record<string, string | undefined>>;
export type OutboxRunConfig = OutboxDatabaseConfig & { sender: "console" | "resend"; resendKey?: string;
  dailyCap: number; batchSize: number; timeBudgetMs: number };

function integer(value: string | undefined, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function resolveOutboxRunConfig(env: Environment): OutboxRunConfig | null {
  const sender = env.OUTBOX_SENDER ?? "console";
  const dailyCap = integer(env.OUTBOX_DAILY_CAP, 0, 0, 100_000);
  const batchSize = integer(env.OUTBOX_BATCH_SIZE, 10, 1, 10);
  const timeBudgetMs = integer(env.OUTBOX_TIME_BUDGET_MS, 20_000, 15_000, 20_000);
  const databaseUrl = env.OUTBOX_SUPABASE_URL;
  const databaseKey = env.OUTBOX_SUPABASE_SECRET_KEY;
  if (dailyCap === null || batchSize === null || timeBudgetMs === null || !databaseUrl
    || !databaseKey || !/^sb_secret_[A-Za-z0-9_-]+$/.test(databaseKey)) return null;
  const hosted = databaseUrl === "https://ecemjggwlzqpjcwmchrl.supabase.co";
  const local = /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(databaseUrl);
  if (!hosted && !(local && !env.VERCEL && !env.VERCEL_ENV)) return null;
  if (sender === "console") {
    // Synthetic console output is deliberately limited to development/disposable CI.
    if (env.VERCEL || env.VERCEL_ENV || !local) return null;
  } else if (sender === "resend") {
    if (env.OUTBOX_RESEND_ENABLED !== "true" || env.VERCEL !== "1" || env.VERCEL_ENV !== "production" || !hosted
      || !/^re_[A-Za-z0-9_-]+$/.test(env.RESEND_API_KEY ?? "")) return null;
  } else return null;
  return { databaseUrl, databaseKey, sender, resendKey: sender === "resend" ? env.RESEND_API_KEY : undefined,
    dailyCap, batchSize, timeBudgetMs };
}

/** Hashes have identical size for every input, including missing/malformed headers.
 * No value/length equality short circuit precedes timingSafeEqual. */
export function validOutboxSecret(authorization: string | null, secret: string | undefined): boolean {
  const expected = createHash("sha256").update("Bearer " + (secret ?? "")).digest();
  const supplied = createHash("sha256").update(authorization ?? "").digest();
  const matches = timingSafeEqual(expected, supplied);
  return matches && typeof secret === "string" && secret.length >= 32 && secret.length <= 256 && /^[A-Za-z0-9_-]+$/.test(secret);
}

export function createOutboxDrainHandler({ env, run, maintainConfirmations }: { env: Environment;
  run: (config: OutboxRunConfig) => Promise<OutboxSummary>;
  maintainConfirmations?: (config: OutboxRunConfig, editionKey: string) => Promise<ConfirmationMaintenanceResult> }) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    if (env.OUTBOX_ENABLED !== "true") return new Response(null, { status: 404, headers });
    if (!validOutboxSecret(request.headers.get("authorization"), env.CRON_SECRET)) return new Response(null, { status: 401, headers });
    const config = resolveOutboxRunConfig(env);
    if (!config) return new Response(null, { status: 503, headers });
    try {
      // No background registration work while any existing runtime gate/cap is closed.
      // SQL independently checks registration, account policy and sweeps_enabled.
      const confirmation = maintainConfirmations && config.dailyCap > 0
        && env.REGISTRATION_ENABLED === "true" && env.PARTICIPANT_ACCOUNTS_ENABLED === "true"
        ? await maintainConfirmations(config, env.PARTICIPANT_EDITION_KEY ?? "") : undefined;
      const result = await run(config);
      // Counts only; never reflect request, settings, payloads, destinations, keys or errors.
      return Response.json({ claimed: result.claimed, sent: result.sent, retryable: result.retryable,
        permanent: result.permanent, stale: result.stale, ...(confirmation ? { confirmation } : {}) }, { headers });
    } catch { return new Response(null, { status: 503, headers }); }
  };
}
