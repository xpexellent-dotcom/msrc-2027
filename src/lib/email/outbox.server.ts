import "server-only";

import { createHash } from "node:crypto";
import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { homepageCopy } from "@/content/public-site";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { siteOrigin } from "@/lib/metadata";

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

export const registrationEmailTemplates = ["registration_received", "registration_approved", "registration_offered",
  "registration_waitlisted", "registration_expired", "registration_cancelled", "registration_confirm_seat", "registration_seat_released"] as const;
export type RegistrationEmailTemplate = typeof registrationEmailTemplates[number];

/** ENG-065: previewable wording only. SQL holds these jobs and the worker denies delivery. */
export const abstractDecisionTemplate = { key: "abstract_decision", version: 1, approval: "DRAFT" } as const;

/** Destinations come only from the current verified Auth identity in the business transaction. */
export function validOutboxRecipient(value: string): boolean {
  return value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** First six templates have ORG-057 approval; confirm-seat/released templates are DRAFT.
 * Independent wording and delivery activation gates remain (EML-04).
 * No bearer token, participant name, identity number or caller-supplied URL is accepted. */
function renderRegistrationMessage(message: OutboxMessage): EmailRequest {
  if (!registrationEmailTemplates.includes(message.template_key as RegistrationEmailTemplate)
    || message.template_version !== 1 || !["en", "ar"].includes(message.locale)
    || !validOutboxRecipient(message.recipient_email) || !conferenceConfig.dates) {
    throw new OutboxSendError("template_invalid", false);
  }
  const offered = message.template_key === "registration_offered";
  const confirmation = message.template_key === "registration_confirm_seat";
  const expiresAt = confirmation ? message.payload.confirm_expires_at : message.payload.offer_expires_at;
  if (offered || confirmation ? Object.keys(message.payload).length !== (confirmation ? 2 : 1) || typeof expiresAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(expiresAt)
    || !Number.isFinite(Date.parse(expiresAt))
    || (confirmation && !["release_unconfirmed", "keep_unconfirmed"].includes(String(message.payload.nonresponse_policy)))
    : Object.keys(message.payload).length !== 0) {
    throw new OutboxSendError("template_invalid", false);
  }
  const registrationUrl = `${siteOrigin}/${message.locale}/registration`;
  let subject: string;
  let paragraphs: string[];
  switch (message.template_key as RegistrationEmailTemplate) {
    case "registration_received":
      subject = "Seat request received";
      paragraphs = ["We have received your seat request. Your request is awaiting review. This email does not confirm a seat.",
        `Sign in to My registration: ${registrationUrl}`];
      break;
    case "registration_approved":
      subject = "You have a seat";
      paragraphs = ["You have a seat at the conference.", `Sign in to view your ticket: ${registrationUrl}/ticket`];
      break;
    case "registration_offered": {
      const deadline = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
        dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(expiresAt as string));
      subject = "A seat is offered to you: reply within 24 hours";
      paragraphs = ["A seat is offered to you. Accept the offer on My registration before the deadline below.",
        `Offer deadline: ${deadline} (${conferenceConfig.timeZone}).`, `Sign in to My registration: ${registrationUrl}`];
      break;
    }
    case "registration_waitlisted":
      subject = "You are on the waitlist";
      paragraphs = ["You are on the conference waitlist. This email does not confirm a seat.",
        `Sign in to My registration: ${registrationUrl}`];
      break;
    case "registration_expired":
      subject = "Your offer expired";
      paragraphs = ["Your seat offer has expired.", `Sign in to My registration: ${registrationUrl}`];
      break;
    case "registration_cancelled":
      subject = "Your registration was cancelled";
      paragraphs = ["Your conference registration was cancelled. Any ticket for this registration is no longer valid.",
        `Sign in to My registration: ${registrationUrl}`];
      break;
    case "registration_confirm_seat": {
      const deadline = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
        dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(expiresAt as string));
      subject = `Please confirm your seat by ${deadline} (${conferenceConfig.timeZone})`;
      paragraphs = ["Please confirm that you can attend on My registration. If you cannot attend, you can release your seat there.",
        `Confirmation deadline: ${deadline} (${conferenceConfig.timeZone}).`,
        message.payload.nonresponse_policy === "release_unconfirmed"
          ? "If you do not respond by this deadline, your seat will be released and your ticket will no longer be valid."
          : "If you do not respond by this deadline, your seat and ticket will be kept.",
        `Sign in to My registration: ${registrationUrl}`];
      break;
    }
    case "registration_seat_released":
      subject = "Your seat was released";
      paragraphs = ["Your conference seat was released. Your registration is cancelled and your ticket is no longer valid.",
        `Sign in to My registration: ${registrationUrl}`];
      break;
  }
  const text = [homepageCopy.en.kicker, `Conference dates: ${formatConferenceDateRange(conferenceConfig.dates, "en")}.`,
    ...paragraphs, `Support: ${contactConfig.recipient}`].join("\n\n");
  const html = `<html lang="en"><body>${text.split("\n\n").map((paragraph) => {
    const link = [registrationUrl + "/ticket", registrationUrl].find((url) => paragraph.endsWith(url));
    const content = link ? escapeHtml(paragraph.slice(0, -link.length)) + `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`
      : escapeHtml(paragraph);
    return `<p>${content}</p>`;
  }).join("")}</body></html>`;
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`,
    to: [message.recipient_email], subject, text, html });
}

/** Immutable v1 fixture. Add new versions rather than editing a rendered request in flight. */
export function renderOutboxMessage(message: OutboxMessage): EmailRequest {
  if (message.template_key === abstractDecisionTemplate.key) return renderAbstractDecision(message);
  if (message.template_key !== "synthetic_notice") return renderRegistrationMessage(message);
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

/** English-only DRAFT; the payload contains no reviewer identity, score or private note. */
function renderAbstractDecision(message: OutboxMessage): EmailRequest {
  const { reference, outcome, instructions, revision_deadline: deadline } = message.payload;
  const fields = Object.keys(message.payload).sort().join(",");
  if (message.template_version !== 1 || message.locale !== "en" || !validOutboxRecipient(message.recipient_email)
    || fields !== "instructions,outcome,reference,revision_deadline"
    || typeof reference !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(reference)
    || !["accept", "reject", "revise"].includes(String(outcome))
    || typeof instructions !== "string" || instructions.length > 4_000
    || (outcome === "revise" ? !instructions.trim() || typeof deadline !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(deadline)
      || !Number.isFinite(Date.parse(deadline)) : deadline !== null)) {
    throw new OutboxSendError("template_invalid", false);
  }
  const outcomeText = outcome === "accept" ? "accepted" : outcome === "reject" ? "not accepted" : "returned for revision";
  const paragraphs = [`The scientific committee has recorded the following outcome for abstract ${reference}: ${outcomeText}.`];
  if (instructions.trim()) paragraphs.push(instructions.trim());
  if (outcome === "revise") {
    const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
      dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(deadline as string));
    paragraphs.push(`Submit the revised abstract in your account by ${formatted} (${conferenceConfig.timeZone}). An email reply does not submit a revision.`);
  }
  paragraphs.push(`Sign in to view your abstract: ${siteOrigin}/en/abstracts`, `Support: ${contactConfig.recipient}`);
  const text = paragraphs.join("\n\n");
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`, to: [message.recipient_email],
    subject: `Abstract ${reference}: ${outcomeText}`, text,
    html: `<html lang="en"><body>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</body></html>` });
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
    // The production route independently requires both delivery switches and bounded caps.
    // Console/test senders retain their synthetic-only boundary.
    if (request.to.length !== 1 || !request.to.every(validOutboxRecipient) || idempotencyKey.length > 256 || !idempotencyKey) {
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
