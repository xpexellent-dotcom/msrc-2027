import "server-only";
import { validOutboxSecret } from "./outbox-route.server";
import { resolveAdvisoryWorkerConfig, type AdvisoryEnvironment, type AdvisoryWorkerConfig } from "./advisory-config.server";
import { runAdvisoryWorker, type AdvisorySummary } from "./advisory.server";

export function createAdvisoryDrainHandler({ env, run = runAdvisoryWorker }: { env: AdvisoryEnvironment; run?: (config: AdvisoryWorkerConfig, env: AdvisoryEnvironment) => Promise<AdvisorySummary> }) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    if (!["GET", "POST"].includes(request.method) || env.AI_ASSESSMENT_ENABLED !== "true") return new Response(null, { status: 404, headers });
    if (!validOutboxSecret(request.headers.get("authorization"), env.CRON_SECRET)) return new Response(null, { status: 401, headers });
    const config = resolveAdvisoryWorkerConfig(env); if (!config) return new Response(null, { status: 503, headers });
    try {
      const result = await run(config, env);
      return Response.json({ claimed: result.claimed, completed: result.completed, retry: result.retry, failed: result.failed, stale: result.stale }, { headers });
    } catch { return new Response(null, { status: 503, headers }); }
  };
}
