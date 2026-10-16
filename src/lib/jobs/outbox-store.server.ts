import "server-only";

import type { EmailRequest, OutboxMessage } from "@/lib/email/outbox.server";
import { syntheticRecipient } from "@/lib/email/outbox.server";
import type { OutboxOutcome, OutboxStore } from "./outbox.server";

export type OutboxDatabaseConfig = { databaseUrl: string; databaseKey: string };
export type OutboxEnqueueInput = { idempotencyKey: string; templateKey: "synthetic_notice"; templateVersion: 1;
  locale: "en" | "ar"; recipientEmail: string; payload: { reference: string } };

/** Internal calls made by this module only. Never pass a caller-controlled RPC name. */
async function rpc(config: OutboxDatabaseConfig, name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    const response = await fetch(config.databaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3_000),
      headers: { apikey: config.databaseKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(args),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(); }
    return await response.json();
  } catch { throw new Error("Outbox storage unavailable."); }
}

/** A future registration RPC must call msrc_outbox.enqueue inside its own SQL transaction.
 * This standalone service RPC cannot make a separate business HTTP request atomic. */
export async function enqueueOutbox(config: OutboxDatabaseConfig, input: OutboxEnqueueInput):
  Promise<{ id: string; status: string; created: boolean }> {
  if (!/^[A-Za-z0-9/_.:-]{1,200}$/.test(input.idempotencyKey) || input.templateKey !== "synthetic_notice"
    || input.templateVersion !== 1 || !["en", "ar"].includes(input.locale) || !syntheticRecipient(input.recipientEmail)
    || Object.keys(input.payload).length !== 1 || !/^[A-Za-z0-9_-]{1,80}$/.test(input.payload.reference)) {
    throw new Error("Invalid outbox event.");
  }
  const value = await rpc(config, "msrc_outbox_enqueue", { p_idempotency_key: input.idempotencyKey,
    p_template_key: input.templateKey, p_template_version: input.templateVersion, p_locale: input.locale,
    p_recipient_email: input.recipientEmail, p_payload: input.payload });
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string"
    || !("status" in value) || typeof value.status !== "string" || !("created" in value) || typeof value.created !== "boolean") {
    throw new Error("Invalid outbox storage result.");
  }
  return { id: value.id, status: value.status, created: value.created };
}

function claimedMessage(value: unknown): value is OutboxMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return ["id", "template_key", "locale", "recipient_email", "lease_token", "lease_expires_at", "provider_idempotency_key", "first_attempt_at"]
    .every((key) => typeof row[key] === "string") && Number.isInteger(row.template_version) && Number.isInteger(row.attempt_count)
    && !!row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    && (row.provider_request === null || typeof row.provider_request === "object");
}

function leaseArgs(message: OutboxMessage, workerId: string) {
  return { p_id: message.id, p_worker_id: workerId, p_lease_token: message.lease_token };
}

export function createRpcOutboxStore(config: OutboxDatabaseConfig): OutboxStore {
  return {
    async claim(workerId, batchSize, dailyCap) {
      const value = await rpc(config, "msrc_outbox_claim", { p_worker_id: workerId, p_batch_size: batchSize, p_daily_cap: dailyCap });
      if (!Array.isArray(value) || value.length > batchSize || !value.every(claimedMessage)) throw new Error("Invalid outbox storage result.");
      return value;
    },
    async prepare(message, workerId, request) {
      const value = await rpc(config, "msrc_outbox_prepare", { ...leaseArgs(message, workerId), p_provider_request: request });
      // Exact snapshot is returned by the fenced SQL function, never provider/caller data.
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid outbox storage result.");
      const result = value as EmailRequest;
      if (result.from !== request.from || result.subject !== request.subject || result.text !== request.text || result.html !== request.html
        || !Array.isArray(result.to) || result.to.length !== 1 || result.to[0] !== request.to[0]
        || Object.keys(result).length !== 5) throw new Error("Outbox request snapshot mismatch.");
      return result;
    },
    async finish(message, workerId, outcome: OutboxOutcome) {
      const value = await rpc(config, "msrc_outbox_finish", { ...leaseArgs(message, workerId), p_outcome: outcome.state,
        p_provider_message_id: outcome.providerMessageId ?? null, p_error_class: outcome.errorClass ?? null });
      if (!value || typeof value !== "object" || Array.isArray(value)
        || !("acknowledged" in value) || typeof value.acknowledged !== "boolean" || !("status" in value)) {
        throw new Error("Invalid outbox storage result.");
      }
      if (!value.acknowledged && value.status === null) return false;
      if (value.acknowledged && (value.status === "sent" || value.status === "failed_retryable" || value.status === "failed_permanent")) {
        return value.status;
      }
      throw new Error("Invalid outbox storage result.");
    },
  };
}
