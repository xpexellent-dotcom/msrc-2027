import { describe, expect, it } from "vitest";
import { renderAnnouncementEmail, validAnnouncementPayload } from "@/lib/email/announcement.server";
import { OutboxSendError, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";
import { participantEmailBanner } from "@/lib/email/participant-message.server";

const payload = { subject_en: "Conference update", subject_ar: "مستجدات المؤتمر",
  body_en: "First paragraph.\n\nSecond paragraph & more.", body_ar: "الفقرة الأولى.\n\nالفقرة الثانية." };
function message(change: Partial<OutboxMessage> = {}): OutboxMessage {
  return { id: "synthetic-announcement", template_key: "announcement", template_version: 1, locale: "en",
    recipient_email: "participant@example.invalid", payload, attempt_count: 0, lease_token: "synthetic",
    lease_expires_at: "2026-10-23T17:00:00Z", provider_idempotency_key: "synthetic-announcement",
    provider_request: null, first_attempt_at: "2026-10-23T16:00:00Z", ...change };
}

describe("bilingual announcement renderer governed by private layout approval", () => {
  it("uses the shared approved banner and complete English before Arabic", () => {
    const rendered = renderOutboxMessage(message());
    expect(rendered.subject).toBe("Conference update | مستجدات المؤتمر");
    expect(rendered.to).toEqual(["participant@example.invalid"]);
    expect(rendered.html).toContain(`src="${participantEmailBanner.src}"`);
    expect(rendered.html).toContain('dir="rtl" lang="ar"');
    expect(rendered.html.indexOf(payload.body_en.split("\n")[0])).toBeLessThan(rendered.html.indexOf(payload.body_ar.split("\n")[0]));
    expect(rendered.text.indexOf(payload.body_en)).toBeLessThan(rendered.text.indexOf(payload.body_ar));
    expect(rendered.html).toContain("Second paragraph &amp; more.");
    expect(rendered.html).not.toMatch(/unsubscribe|tracking|<script|<iframe|@font-face/i);
    expect(rendered).not.toHaveProperty("bcc");
    expect(rendered).not.toHaveProperty("attachments");
    expect(rendered.subject + rendered.text + rendered.html).not.toContain("DRAFT");
    expect(rendered).toEqual(renderAnnouncementEmail(payload, "participant@example.invalid"));
  });

  it("normalizes paragraphs and escapes symbols without interpreting links or replacement tokens", () => {
    const result = renderAnnouncementEmail({ ...payload, body_en: 'Research A < B & C > D.\r\n\r\n"Quoted" $$ https://example.invalid' });
    expect(result.html).toContain("Research A &lt; B &amp; C &gt; D.");
    expect(result.html).toContain("&quot;Quoted&quot; $$ https://example.invalid");
    expect(result.html).not.toContain("<a ");
    expect(result.text).toContain('Research A < B & C > D.\n\n"Quoted" $$');
  });

  it.each([
    null, [], {}, { ...payload, tracking: "forbidden" }, { ...payload, body_en: "" }, { ...payload, body_ar: "   " },
    { ...payload, subject_en: "x".repeat(91) }, { ...payload, subject_ar: "ع".repeat(91) },
    { ...payload, body_en: "x".repeat(3_501) }, { ...payload, body_ar: "ع".repeat(3_501) },
    { ...payload, subject_en: "Subject\nBcc: victim@example.invalid" }, { ...payload, subject_ar: "عنوان\tآخر" },
    { ...payload, body_en: "<script>alert(1)</script>" }, { ...payload, body_ar: "<b>عنوان</b>" },
    { ...payload, body_en: "<!-- hidden -->" }, { ...payload, body_en: "<?xml version='1.0'>" },
    { ...payload, body_en: "Control\u0000character" }, { ...payload, body_ar: 1 },
  ])("rejects missing, extra, oversized, markup or control fields %#", (value) => {
    expect(validAnnouncementPayload(value)).toBe(false);
    expect(() => renderOutboxMessage(message({ payload: value as Record<string, unknown> }))).toThrow(OutboxSendError);
  });

  it.each([{ locale: "ar" }, { template_version: 2 }, { recipient_email: "bad\r\n@example.invalid" }])(
    "rejects unsupported envelope metadata %j", (change) => {
      expect(() => renderOutboxMessage(message(change))).toThrow(OutboxSendError);
    });

  it.each(["&", '"', "ع", "\n"])("fits the existing 64 KiB provider snapshot at technical text bounds (%j)", (character) => {
    const result = renderAnnouncementEmail({ subject_en: '"'.repeat(90), subject_ar: '"'.repeat(90),
      body_en: "A" + character.repeat(3_499), body_ar: "ع" + character.repeat(3_499) });
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(65_536);
    expect(result.subject.length).toBeLessThanOrEqual(200);
  });
});
