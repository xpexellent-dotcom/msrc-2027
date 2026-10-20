import { createConsoleOutboxSender, createResendOutboxSender } from "@/lib/email/outbox.server";
import { createOutboxDrainHandler } from "@/lib/jobs/outbox-route.server";
import { createRpcOutboxStore } from "@/lib/jobs/outbox-store.server";
import { drainOutbox } from "@/lib/jobs/outbox.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function run(request: Request): Promise<Response> {
  return createOutboxDrainHandler({ env: process.env, run: (config) => drainOutbox({
    store: createRpcOutboxStore(config),
    sender: config.sender === "resend" ? createResendOutboxSender(config.resendKey!) : createConsoleOutboxSender(),
    dailyCap: config.dailyCap, batchSize: config.batchSize, timeBudgetMs: config.timeBudgetMs,
  }) })(request);
}

// Vercel sends Authorization: Bearer ${CRON_SECRET}; both methods use the same
// fail-closed, timing-safe boundary and never put a credential in a URL.
export const GET = run;
export const POST = run;
// HEAD probes must not drain the queue (Next otherwise delegates HEAD to GET).
export function HEAD(): Response { return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } }); }
