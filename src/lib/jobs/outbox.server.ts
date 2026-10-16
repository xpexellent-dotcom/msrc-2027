import "server-only";

import { randomUUID } from "node:crypto";
import { OutboxSendError, renderOutboxMessage, type EmailRequest, type OutboxMessage, type OutboxSender } from "@/lib/email/outbox.server";

export type { OutboxMessage, EmailRequest } from "@/lib/email/outbox.server";
export type OutboxOutcome = { state: "sent" | "retryable" | "permanent"; providerMessageId?: string; errorClass?: string };
export type OutboxCompletion = false | "sent" | "failed_retryable" | "failed_permanent";
export type OutboxStore = {
  claim(workerId: string, batchSize: number, dailyCap: number): Promise<OutboxMessage[]>;
  prepare(message: OutboxMessage, workerId: string, request: EmailRequest): Promise<EmailRequest>;
  finish(message: OutboxMessage, workerId: string, outcome: OutboxOutcome): Promise<OutboxCompletion>;
};
export type OutboxSummary = { claimed: number; sent: number; retryable: number; permanent: number; stale: number };

/** One claim at a time avoids holding an unprocessed batch across the bounded run budget. */
export async function drainOutbox({ store, sender, batchSize = 10, timeBudgetMs = 20_000, dailyCap = 0,
  now = Date.now, workerId = randomUUID() }: { store: OutboxStore; sender: OutboxSender; batchSize?: number;
    timeBudgetMs?: number; dailyCap?: number; now?: () => number; workerId?: string }): Promise<OutboxSummary> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10 || !Number.isInteger(timeBudgetMs)
    || timeBudgetMs < 15_000 || timeBudgetMs > 20_000 || !Number.isInteger(dailyCap) || dailyCap < 0) {
    throw new Error("Invalid outbox run limits.");
  }
  const result: OutboxSummary = { claimed: 0, sent: 0, retryable: 0, permanent: 0, stale: 0 };
  const deadline = now() + timeBudgetMs;
  if (dailyCap === 0) return result;
  while (result.claimed < batchSize && deadline - now() >= 15_000) {
    // Claim/prepare/finish each time out after 3s; provider after 6s (15s total).
    const [message] = await store.claim(workerId, 1, dailyCap);
    if (!message) break;
    result.claimed++;
    let request: EmailRequest;
    try { request = renderOutboxMessage(message); }
    catch {
      if (await store.finish(message, workerId, { state: "permanent", errorClass: "template_invalid" })) result.permanent++;
      else result.stale++;
      continue;
    }
    // Persist the exact request before the first send. Storage errors leave the lease intact.
    // Re-rendered historic versions cannot silently mutate an existing provider snapshot.
    request = await store.prepare(message, workerId, request);
    let outcome: OutboxOutcome;
    if (!Number.isFinite(Date.parse(message.first_attempt_at))
      || now() - Date.parse(message.first_attempt_at) >= 23 * 60 * 60 * 1_000) {
      outcome = { state: "permanent", errorClass: "idempotency_window_expired" };
    } else {
      try {
        const accepted = await sender.send(request, message.provider_idempotency_key);
        outcome = { state: "sent", providerMessageId: accepted.providerMessageId };
      } catch (error) {
        outcome = error instanceof OutboxSendError
          ? { state: error.retryable ? "retryable" : "permanent", errorClass: error.errorClass }
          : { state: "retryable", errorClass: "transport" };
      }
    }
    // Deliberately outside the send catch: a crash after acceptance must retain the same key.
    const completion = await store.finish(message, workerId, outcome);
    if (completion) {
      // The database may exhaust the final retry or safety window while persisting it.
      if (completion === "sent") result.sent++;
      else if (completion === "failed_retryable") result.retryable++;
      else result.permanent++;
    } else result.stale++;
  }
  return result;
}
