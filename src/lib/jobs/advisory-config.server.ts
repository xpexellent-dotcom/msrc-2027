import "server-only";
import type { OutboxDatabaseConfig } from "./outbox-store.server";
export type AdvisoryEnvironment = Readonly<Record<string, string | undefined>>;
export type AdvisoryWorkerConfig = OutboxDatabaseConfig & { apiKey: string };
export function advisoryRuntimeReady(env: AdvisoryEnvironment): boolean {
  return env.AI_ASSESSMENT_ENABLED === "true" && /^[^\s]{8,512}$/.test(env.DEEPSEEK_API_KEY ?? "");
}
/** Independent worker credentials; there is no implicit email delivery or participant activation. */
export function resolveAdvisoryWorkerConfig(env: AdvisoryEnvironment): AdvisoryWorkerConfig | null {
  if (!advisoryRuntimeReady(env)) return null;
  const databaseUrl = env.AI_ASSESSMENT_SUPABASE_URL, databaseKey = env.AI_ASSESSMENT_SUPABASE_SECRET_KEY;
  if (!databaseUrl || !databaseKey || !/^sb_secret_[A-Za-z0-9_-]+$/.test(databaseKey)) return null;
  const hosted = databaseUrl === "https://ecemjggwlzqpjcwmchrl.supabase.co" && env.VERCEL === "1" && env.VERCEL_ENV === "production";
  const local = /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(databaseUrl) && !env.VERCEL && !env.VERCEL_ENV;
  return hosted || local ? { databaseUrl, databaseKey, apiKey: env.DEEPSEEK_API_KEY! } : null;
}
