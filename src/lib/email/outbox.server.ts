import "server-only";

import { createHash } from "node:crypto";
import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { homepageCopy } from "@/content/public-site";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { siteOrigin } from "@/lib/metadata";
import { renderParticipantBody } from "./participant-message.server";
import { announcementTemplate, renderAnnouncementEmail, validAnnouncementPayload } from "./announcement.server";
import { workshopNoticeTemplate, renderWorkshopNotice, validWorkshopNoticePayload } from "./workshop-message.server";

export type EmailRequest = Readonly<{
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}>;

/** Server-supplied, human-reviewed translation context; never an outbox payload mutation. */
export type ParticipantEmailTranslations = Readonly<{
  abstractInstructions?: Readonly<{ english: string; arabic: string }>;
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
  /** Immutable database release proof; absent on older databases and other templates. */
  announcement_delivery?: "approved" | "self_test" | null;
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

/** ORG-059: registration and abstract wording approvals remain independent of ORG-063. */
export function isDraftParticipantTemplate(key: string): boolean {
  return key === workshopNoticeTemplate.key || key === abstractDecisionTemplate.key || registrationEmailTemplates.includes(key as RegistrationEmailTemplate);
}

/** Destinations come only from the current verified Auth identity in the business transaction. */
export function validOutboxRecipient(value: string): boolean {
  return value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value);
}

/** ORG-057 English wording is preserved; the bilingual compositions are all DRAFT under ORG-059.
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
  const arabicRegistrationUrl = `${siteOrigin}/ar/registration`;
  let subject: string;
  let arabicSubject: string;
  let paragraphs: string[];
  let arabicParagraphs: string[];
  switch (message.template_key as RegistrationEmailTemplate) {
    case "registration_received":
      subject = "Seat request received";
      arabicSubject = "تم استلام طلب حجز مقعد";
      paragraphs = ["We have received your seat request. Your request is awaiting review. This email does not confirm a seat.",
        `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["لقد استلمنا طلبك لحجز مقعد. طلبك بانتظار المراجعة. لا تُعد هذه الرسالة تأكيدًا لحجز مقعد.",
        `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    case "registration_approved":
      subject = "You have a seat";
      arabicSubject = "لديك مقعد في المؤتمر";
      paragraphs = ["You have a seat at the conference.", `Sign in to view your ticket: ${registrationUrl}/ticket`];
      arabicParagraphs = ["لديك مقعد في المؤتمر.", `سجّل الدخول لعرض تذكرتك: ${arabicRegistrationUrl}/ticket`];
      break;
    case "registration_offered": {
      const deadline = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
        dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(expiresAt as string));
      subject = "A seat is offered to you: reply within 24 hours";
      arabicSubject = "عُرض عليك مقعد: يُرجى الرد خلال ٢٤ ساعة";
      paragraphs = ["A seat is offered to you. Accept the offer on My registration before the deadline below.",
        `Offer deadline: ${deadline} (${conferenceConfig.timeZone}).`, `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["عُرض عليك مقعد. اقبل العرض من صفحة تسجيلي قبل الموعد النهائي الموضح أدناه.",
        `الموعد النهائي لقبول العرض: ${arabicDeadline(expiresAt as string)}.`, `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    }
    case "registration_waitlisted":
      subject = "You are on the waitlist";
      arabicSubject = "أنت على قائمة الانتظار";
      paragraphs = ["You are on the conference waitlist. This email does not confirm a seat.",
        `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["أنت على قائمة انتظار المؤتمر. لا تُعد هذه الرسالة تأكيدًا لحجز مقعد.",
        `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    case "registration_expired":
      subject = "Your offer expired";
      arabicSubject = "انتهت صلاحية عرض المقعد";
      paragraphs = ["Your seat offer has expired.", `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["انتهت صلاحية عرض المقعد المقدم لك.", `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    case "registration_cancelled":
      subject = "Your registration was cancelled";
      arabicSubject = "تم إلغاء تسجيلك";
      paragraphs = ["Your conference registration was cancelled. Any ticket for this registration is no longer valid.",
        `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["تم إلغاء تسجيلك في المؤتمر. لم تعد أي تذكرة مرتبطة بهذا التسجيل صالحة.",
        `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    case "registration_confirm_seat": {
      const deadline = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
        dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(expiresAt as string));
      subject = `Please confirm your seat by ${deadline} (${conferenceConfig.timeZone})`;
      arabicSubject = `يُرجى تأكيد مقعدك بحلول ${arabicDeadline(expiresAt as string)}`;
      paragraphs = ["Please confirm that you can attend on My registration. If you cannot attend, you can release your seat there.",
        `Confirmation deadline: ${deadline} (${conferenceConfig.timeZone}).`,
        message.payload.nonresponse_policy === "release_unconfirmed"
          ? "If you do not respond by this deadline, your seat will be released and your ticket will no longer be valid."
          : "If you do not respond by this deadline, your seat and ticket will be kept.",
        `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["يُرجى تأكيد قدرتك على الحضور من صفحة تسجيلي. إذا تعذّر عليك الحضور، فيمكنك إتاحة مقعدك لغيرك من الصفحة نفسها.",
        `الموعد النهائي للتأكيد: ${arabicDeadline(expiresAt as string)}.`,
        message.payload.nonresponse_policy === "release_unconfirmed"
          ? "إذا لم ترد بحلول هذا الموعد، فسيُتاح مقعدك لغيرك ولن تعود تذكرتك صالحة."
          : "إذا لم ترد بحلول هذا الموعد، فسيُحتفظ بمقعدك وتذكرتك.",
        `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
    }
    case "registration_seat_released":
      subject = "Your seat was released";
      arabicSubject = "تمت إتاحة مقعدك لغيرك";
      paragraphs = ["Your conference seat was released. Your registration is cancelled and your ticket is no longer valid.",
        `Sign in to My registration: ${registrationUrl}`];
      arabicParagraphs = ["تمت إتاحة مقعدك في المؤتمر لغيرك. تم إلغاء تسجيلك ولم تعد تذكرتك صالحة.",
        `سجّل الدخول إلى صفحة تسجيلي: ${arabicRegistrationUrl}`];
      break;
  }
  const body = renderParticipantBody([homepageCopy.en.kicker, `Conference dates: ${formatConferenceDateRange(conferenceConfig.dates, "en")}.`,
    ...paragraphs, `Support: ${contactConfig.recipient}`],
  [homepageCopy.ar.kicker, `موعد المؤتمر: ${formatConferenceDateRange(conferenceConfig.dates, "ar")}.`,
    ...arabicParagraphs, `للدعم: ${contactConfig.recipient}`],
  [registrationUrl + "/ticket", registrationUrl, arabicRegistrationUrl + "/ticket", arabicRegistrationUrl]);
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`,
    to: [message.recipient_email], subject: `${subject} | ${arabicSubject}`, ...body });
}

/** Match the site's Gregorian calendar, Arabic month names/numerals and Riyadh timezone. */
function arabicDeadline(value: string): string {
  return new Intl.DateTimeFormat("ar-SA", { calendar: "gregory", numberingSystem: "arab", timeZone: conferenceConfig.timeZone,
    dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(value)) + " (بتوقيت الرياض)";
}

/** Preview participant wording. Existing provider snapshots must never be rewritten. */
export function renderOutboxMessage(message: OutboxMessage, translations?: ParticipantEmailTranslations): EmailRequest {
  if (message.template_key === workshopNoticeTemplate.key) {
    if (message.template_version !== workshopNoticeTemplate.version || message.locale !== "en"
      || !validOutboxRecipient(message.recipient_email) || !validWorkshopNoticePayload(message.payload)) {
      throw new OutboxSendError("template_invalid", false);
    }
    return renderWorkshopNotice(message.payload, message.recipient_email);
  }
  if (message.template_key === announcementTemplate.key) {
    if (message.template_version !== announcementTemplate.version || message.locale !== "en"
      || !validOutboxRecipient(message.recipient_email) || !validAnnouncementPayload(message.payload)) {
      throw new OutboxSendError("template_invalid", false);
    }
    return renderAnnouncementEmail(message.payload, message.recipient_email);
  }
  if (message.template_key === abstractDecisionTemplate.key) return renderAbstractDecision(message, translations);
  if (message.template_key !== "synthetic_notice") return renderRegistrationMessage(message);
  const reference = message.payload.reference;
  if (message.template_key !== "synthetic_notice" || message.template_version !== 1
    || !["en", "ar"].includes(message.locale) || !syntheticRecipient(message.recipient_email)
    || Object.keys(message.payload).length !== 1 || typeof reference !== "string"
    || !/^[A-Za-z0-9_-]{1,80}$/.test(reference)) throw new OutboxSendError("template_invalid", false);
  // This synthetic infrastructure notice is not participant-facing (ORG-059).
  return Object.freeze({ from: "MSRC 2027 <no-reply@msrc2027.com>", to: [message.recipient_email],
    subject: "MSRC 2027 synthetic outbox check",
    text: `Synthetic development notice. Reference: ${reference}. This is not a registration or ticket.`,
    html: `<html lang="en"><body><p>Synthetic development notice.</p><p>Reference: ${reference}.</p><p>This is not a registration or ticket.</p></body></html>` });
}

/** Bilingual DRAFT; the payload contains no reviewer identity, score or private note. */
function renderAbstractDecision(message: OutboxMessage, translations?: ParticipantEmailTranslations): EmailRequest {
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
  const arabicOutcome = outcome === "accept" ? "مقبول" : outcome === "reject" ? "غير مقبول" : "أُعيد للتعديل";
  const paragraphs = [`The scientific committee has recorded the following outcome for abstract ${reference}: ${outcomeText}.`];
  const arabicParagraphs = [`سجّلت اللجنة العلمية النتيجة التالية للملخص ${reference}: ${arabicOutcome}.`];
  if (instructions.trim()) {
    const translated = translations?.abstractInstructions;
    // No runtime machine translation or untranslated copy presented as an Arabic translation.
    // Collecting/persisting reviewed translations is a separate activation gate for authored decisions.
    if (!translated || translated.english !== instructions.trim() || typeof translated.arabic !== "string"
      || !translated.arabic.trim() || translated.arabic.length > 4_000 || !/[\u0600-\u06ff]/.test(translated.arabic)) {
      throw new OutboxSendError("template_invalid", false);
    }
    paragraphs.push(instructions.trim());
    arabicParagraphs.push(translated.arabic.trim());
  } else if (translations?.abstractInstructions) {
    throw new OutboxSendError("template_invalid", false);
  }
  if (outcome === "revise") {
    const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: conferenceConfig.timeZone,
      dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(deadline as string));
    paragraphs.push(`Submit the revised abstract in your account by ${formatted} (${conferenceConfig.timeZone}). An email reply does not submit a revision.`);
    arabicParagraphs.push(`قدّم الملخص المعدّل من حسابك بحلول ${arabicDeadline(deadline as string)}. الرد على هذه الرسالة لا يُعد تقديمًا للتعديل.`);
  }
  paragraphs.push(`Sign in to view your abstract: ${siteOrigin}/en/abstracts`, `Support: ${contactConfig.recipient}`);
  arabicParagraphs.push(`سجّل الدخول لعرض ملخصك: ${siteOrigin}/ar/abstracts`, `للدعم: ${contactConfig.recipient}`);
  const body = renderParticipantBody(paragraphs, arabicParagraphs, [`${siteOrigin}/en/abstracts`, `${siteOrigin}/ar/abstracts`]);
  // Keep the full reference in both bodies. Bound subject length for the incumbent SQL 200-character limit.
  const subjectReference = reference.length > 100 ? reference.slice(0, 100) + "…" : reference;
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`, to: [message.recipient_email],
    subject: `Abstract ${subjectReference}: ${outcomeText} | الملخص: ${arabicOutcome}`, ...body });
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
