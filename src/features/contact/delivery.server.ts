import "server-only";

import { contactTopics } from "@/config/contact";
import type { Locale } from "@/lib/i18n";
import type { ContactDeliveryConfig } from "./delivery-config.server";
import type { ContactValidation } from "./validation.server";

type ValidContact = Extract<ContactValidation, { ok: true }>;
export function escapeContactText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildContactEmail(contact: ValidContact, locale: Locale) {
  const topic = contactTopics.find((candidate) => candidate.id === contact.value.topic)!;
  return {
    from: "MSRC 2027 <no-reply@msrc2027.com>",
    to: ["contact@msrc2027.com"],
    reply_to: contact.envelope.replyTo,
    subject: contact.envelope.subject,
    // Labels are English (EML-01); visitor content and its EN/AR language are retained.
    text: ["MSRC 2027 Contact", "Language: " + (locale === "en" ? "English (en)" : "Arabic (ar)"),
      "Topic: " + escapeContactText(topic.label.en),
      "Name: " + escapeContactText(contact.value.name),
      "Email: " + escapeContactText(contact.value.email),
      "Related reference: " + escapeContactText(contact.value.relatedReference ?? "—"),
      "", "Message:", escapeContactText(contact.value.message)].join("\n"),
  };
}

export async function reserveContactAttempt(config: ContactDeliveryConfig, hashes: { ip: string; email: string; nonce: string }, expires: number):
  Promise<{ allowed: boolean; retryAfter: number; reason: "allowed" | "limited" | "replayed" } | null> {
  try {
    const response = await fetch(config.counterEndpoint, { method: "POST", cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(3_000),
      // Modern secret keys belong on apikey, never Authorization: Bearer.
      headers: { apikey: config.counterKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ p_ip_hash: hashes.ip, p_email_hash: hashes.email, p_nonce_hash: hashes.nonce,
        p_nonce_expires_at: new Date(expires).toISOString(), p_ip_hour_limit: config.ipHourLimit,
        p_ip_day_limit: config.ipDayLimit, p_email_hour_limit: config.emailHourLimit, p_email_day_limit: config.emailDayLimit }),
    });
    if (!response.ok) { await response.body?.cancel(); return null; }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || Array.isArray(result)) return null;
    const value = result as Record<string, unknown>;
    if (typeof value.allowed !== "boolean" || !Number.isInteger(value.retry_after_seconds)
      || (value.retry_after_seconds as number) < 0 || (value.retry_after_seconds as number) > 86_400
      || !["allowed", "limited", "replayed"].includes(String(value.reason))
      || value.allowed !== (value.reason === "allowed")) return null;
    return { allowed: value.allowed, retryAfter: value.retry_after_seconds as number,
      reason: value.reason as "allowed" | "limited" | "replayed" };
  } catch { return null; }
}

/** One request, no retry, no message/outbox/provider-response logging or persistence. */
export async function sendContactEmail(config: ContactDeliveryConfig, contact: ValidContact, locale: Locale, nonceHash: string): Promise<boolean> {
  try {
    const response = await fetch(config.resendEndpoint, { method: "POST", cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(6_000),
      headers: { Authorization: "Bearer " + config.resendKey, "Content-Type": "application/json", "Idempotency-Key": "contact/" + nonceHash },
      body: JSON.stringify(buildContactEmail(contact, locale)),
    });
    // Acceptance is enough for the UI; no delivery-to-inbox claim or stored email ID.
    const accepted = response.ok;
    await response.body?.cancel();
    return accepted;
  } catch { return false; }
}
