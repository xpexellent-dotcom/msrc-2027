import "server-only";

import { validOutboxSecret } from "@/lib/jobs/outbox-route.server";

type Environment = Readonly<Record<string, string | undefined>>;
type DatabaseConfig = { url: string; key: string };
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const states = ["queued", "sending", "sent", "failed_retryable", "failed_permanent", "cancelled"] as const;
export type OutboxHealth = { counts: Record<(typeof states)[number], number>; oldestPendingAgeSeconds: number };

function databaseConfig(env: Environment, prefix: "HEALTH" | "OUTBOX"): DatabaseConfig | null {
  const url = env[`${prefix}_SUPABASE_URL`];
  const key = env[`${prefix}_SUPABASE_SECRET_KEY`];
  if (!url || !key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return null;
  const hosted = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url);
  const local = /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(url) && !env.VERCEL && !env.VERCEL_ENV;
  return hosted || local ? { url, key } : null;
}

class MonitoringUnavailable extends Error {
  constructor(readonly missing: boolean) { super("Monitoring unavailable."); }
}

/** Fixed read-only RPC names only; no caller URL, query, credential or error is reflected. */
async function readRpc(config: DatabaseConfig, name: "msrc_health_check" | "msrc_outbox_monitor", fetcher: typeof fetch): Promise<unknown> {
  try {
    const response = await fetcher(config.url + "/rest/v1/rpc/" + name, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3_000),
      headers: { apikey: config.key, "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      let missing = false;
      if (response.status === 404) {
        const value: unknown = await response.json().catch(() => null);
        missing = !!value && typeof value === "object" && "code" in value && value.code === "PGRST202";
      } else await response.body?.cancel();
      throw new MonitoringUnavailable(missing);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof MonitoringUnavailable) throw error;
    throw new MonitoringUnavailable(false);
  }
}

export function createHealthHandler({ env, fetcher = fetch }: { env: Environment; fetcher?: typeof fetch }) {
  return async (): Promise<Response> => {
    const config = databaseConfig(env, "HEALTH");
    let reachable = false;
    if (config) {
      try { reachable = await readRpc(config, "msrc_health_check", fetcher) === true; } catch { /* Deliberately sanitized. */ }
    }
    // Reachability alone is not authentication, schema, readiness or delivery evidence.
    return Response.json({ status: reachable ? "ok" : "unavailable", scope: "runtime-health",
      database: reachable ? "reachable" : "unavailable" }, { status: reachable ? 200 : 503, headers });
  };
}

function parseOutboxHealth(value: unknown): OutboxHealth {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MonitoringUnavailable(false);
  const result = value as Record<string, unknown>;
  const counts = result.counts;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) throw new MonitoringUnavailable(false);
  const rows = counts as Record<string, unknown>;
  if (!states.every((state) => Number.isSafeInteger(rows[state]) && (rows[state] as number) >= 0)
    || !Number.isSafeInteger(result.oldestPendingAgeSeconds) || (result.oldestPendingAgeSeconds as number) < 0) {
    throw new MonitoringUnavailable(false);
  }
  // Select the documented projection even if a future RPC accidentally adds private fields.
  return { counts: Object.fromEntries(states.map((state) => [state, rows[state]])) as OutboxHealth["counts"],
    oldestPendingAgeSeconds: result.oldestPendingAgeSeconds as number };
}

export function createOutboxHealthHandler({ env, fetcher = fetch }: { env: Environment; fetcher?: typeof fetch }) {
  return async (request: Request): Promise<Response> => {
    if (!env.OUTBOX_MONITOR_SECRET) return new Response(null, { status: 404, headers });
    if (!validOutboxSecret(request.headers.get("authorization"), env.OUTBOX_MONITOR_SECRET)) {
      return new Response(null, { status: 401, headers });
    }
    const config = databaseConfig(env, "OUTBOX");
    if (!config) return Response.json({ status: "unavailable" }, { status: 503, headers });
    try {
      const snapshot = parseOutboxHealth(await readRpc(config, "msrc_outbox_monitor", fetcher));
      // This is a snapshot read, never a drain/claim/sweep/expiry operation.
      return Response.json({ status: "ok", ...snapshot }, { headers });
    } catch (error) {
      return Response.json({ status: error instanceof MonitoringUnavailable && error.missing ? "area-not-ready" : "unavailable" },
        { status: 503, headers });
    }
  };
}
