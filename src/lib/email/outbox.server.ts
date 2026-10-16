import "server-only";

import { createHash } from "node:crypto";

export type EmailRequest = Readonly<{
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}>;

export type OutboxMessage = Readonly<{
  id: string;
  template_key: string;
  template_version: number;
  locale: string;
  recipient_email: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  lease_token: string;
  lease_expires_at: string;
  provider_idempotency_key: string;
  provider_request: EmailRequest | null;
  first_attempt_at: string;
}>;

export class OutboxSendError extends Error {
  constructor(public readonly errorClass: string, public readonly retryable: boolean) {
    super("Outbox delivery failed.");
    this.name = "OutboxSendError";
  }
}

export type OutboxSender = {
  send(request: EmailRequest, idempotencyKey: string): Promise<{ providerMessageId: string }>;
};

export function syntheticRecipient(value: string): boolean {
  return /^[A-Za-z0-9._%+-]{1,64}@example\.invalid$/.test(value);
}

/** Immutable v1 fixture. Add new versions rather than editing a rendered request in flight. */
export function renderOutboxMessage(message: OutboxMessage): EmailRequest {
  const reference = message.payload.reference;
  if (message.template_key !== "synthetic_notice" || message.template_version !== 1
    || !["en", "ar"].includes(message.locale) || !syntheticRecipient(message.recipient_email)
    || Object.keys(message.payload).length !== 1 || typeof reference !== "string"
    || !/^[A-Za-z0-9_-]{1,80}$/.test(reference)) throw new OutboxSendError("template_invalid", false);
  // Transactional mail is English-only (EML-01 / ORG-016); locale is reserved for UI links.
  return Object.freeze({ from: "MSRC 2027 <no-reply@msrc2027.com>", to: [message.recipient_email],
    subject: "MSRC 2027 synthetic outbox check",
    text: `Synthetic development notice. Reference: ${reference}. This is not a registration or ticket.`,
    html: `<html lang="en"><body><p>Synthetic development notice.</p><p>Reference: ${reference}.</p><p>This is not a registration or ticket.</p></body></html>` });
}

/** Test provider models a provider idempotency cache, including accepted-but-unacknowledged sends. */
export function createTestOutboxSender(): OutboxSender & { captured: Map<string, EmailRequest> } {
  const captured = new Map<string, EmailRequest>();
  return { captured, async send(request, key) {
    if (!request.to.every(syntheticRecipient)) throw new OutboxSendError("template_invalid", false);
    const previous = captured.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(request)) throw new OutboxSendError("idempotency_conflict", false);
    captured.set(key, structuredClone(request));
    return { providerMessageId: "test_" + createHash("sha256").update(key).digest("hex") };
  } };
}

/** No content, recipient, idempotency key or other personal data enters logs. */
export function createConsoleOutboxSender(): OutboxSender {
  return { async send(request) {
    if (!request.to.every(syntheticRecipient)) throw new OutboxSendError("template_invalid", false);
    console.info({ event: "outbox.synthetic", accepted: 1 });
    return { providerMessageId: "console_synthetic" };
  } };
}

/** Direct HTTP follows the incumbent Contact adapter; one bounded attempt, no internal retry. */
export function createResendOutboxSender(key: string, fetcher: typeof fetch = fetch): OutboxSender {
  return { async send(request, idempotencyKey) {
    if (!request.to.every(syntheticRecipient) || idempotencyKey.length > 256 || !idempotencyKey) {
      throw new OutboxSendError("template_invalid", false);
    }
    let response: Response;
    try {
      response = await fetcher("https://api.resend.com/emails", { method: "POST", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(6_000),
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(request) });
    } catch (error) {
      throw new OutboxSendError(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "transport", true);
    }
    // Read bounded provider metadata only. Never persist/throw/log a raw response or message.
    let metadata: Record<string, unknown> = {};
    try {
      const reader = response.body?.getReader();
      if (reader) {
        let size = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 2_048) break;
            chunks.push(value);
          }
          if (size <= 2_048) {
            const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
          }
        } finally { await reader.cancel().catch(() => {}); }
      }
    } catch { /* Unknown provider metadata is classified by status without copying diagnostics. */ }
    if (response.ok) {
      if (typeof metadata.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(metadata.id)) {
        throw new OutboxSendError("provider_response", true);
      }
      return { providerMessageId: metadata.id };
    }
    if (response.status === 409) {
      throw new OutboxSendError("idempotency_conflict", metadata.name === "concurrent_idempotent_requests");
    }
    if (response.status === 429) throw new OutboxSendError("rate_limited", true);
    if (response.status >= 500 || response.status === 408) throw new OutboxSendError("provider_unavailable", true);
    throw new OutboxSendError("provider_validation", false);
  } };
}
