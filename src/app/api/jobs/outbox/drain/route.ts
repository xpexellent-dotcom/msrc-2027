import { createConsoleOutboxSender, createResendOutboxSender } from "@/lib/email/outbox.server";
import { createOutboxDrainHandler } from "@/lib/jobs/outbox-route.server";
import { createRpcOutboxStore } from "@/lib/jobs/outbox-store.server";
import { drainOutbox } from "@/lib/jobs/outbox.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return createOutboxDrainHandler({ env: process.env, run: (config) => drainOutbox({
    store: createRpcOutboxStore(config),
    sender: config.sender === "resend" ? createResendOutboxSender(config.resendKey!) : createConsoleOutboxSender(),
    dailyCap: config.dailyCap, batchSize: config.batchSize, timeBudgetMs: config.timeBudgetMs,
  }) })(request);
}

// Vercel Cron uses GET; any future bridge is an explicit O10 follow-up, not installed here.
export function GET(): Response { return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } }); }
export const HEAD = GET;
