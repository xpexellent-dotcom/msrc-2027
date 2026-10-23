import { describe, expect, it, vi } from "vitest";
import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { createConsoleOutboxSender, createResendOutboxSender, createTestOutboxSender, registrationEmailTemplates,
  renderOutboxMessage, type OutboxMessage, type RegistrationEmailTemplate } from "@/lib/email/outbox.server";
import { participantEmailBanner } from "@/lib/email/participant-message.server";
import originalEnglish from "./fixtures/registration-email-english.json" with { type: "json" };

function message(template: RegistrationEmailTemplate, locale = "en"): OutboxMessage {
  return { id: "b1000000-0000-4000-8000-000000000001", template_key: template, template_version: 1,
    recipient_email: "participant@example.invalid", locale,
    payload: template === "registration_offered" ? { offer_expires_at: "2026-11-19T17:00:00+00:00" }
      : template === "registration_confirm_seat"
        ? { confirm_expires_at: "2027-01-24T17:00:00+00:00", nonresponse_policy: "release_unconfirmed" } : {},
    attempt_count: 1, lease_token: "b2000000-0000-4000-8000-000000000001", lease_expires_at: "2026-11-18T17:02:00Z",
    provider_idempotency_key: "synthetic-registration-message", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z" };
}

describe("DRAFT bilingual registration email templates", () => {
  it.each(registrationEmailTemplates)("renders complete English and Arabic with the banner for %s", (template) => {
    const rendered = renderOutboxMessage(message(template));
    expect(rendered).toMatchSnapshot();
    expect(rendered.text).toContain(formatConferenceDateRange(conferenceConfig.dates!, "en"));
    expect(rendered.text).toContain(contactConfig.recipient);
    expect(rendered.html).toContain('<html lang="en">');
    expect(rendered.html).toContain('<div dir="rtl" lang="ar"');
    expect(rendered.html).toContain("font-family:'Noto Sans Arabic',Tahoma,Arial,sans-serif");
    expect(rendered.html).toContain(`<img src="${participantEmailBanner.src}" alt="${participantEmailBanner.alt}" width="600"`);
    expect(participantEmailBanner.src).toMatch(/^https:\/\//);
    expect(rendered.text.startsWith(`${participantEmailBanner.alt}: ${participantEmailBanner.src}`)).toBe(true);
    const [english, arabic] = rendered.text.replace(`${participantEmailBanner.alt}: ${participantEmailBanner.src}\n\n`, "").split("\n\n---\n\n");
    expect(english).toBe(originalEnglish[template].text);
    expect(rendered.subject.split(" | ")[0]).toBe(originalEnglish[template].subject);
    expect(rendered.subject.split(" | ")[1]).toMatch(/[\u0600-\u06ff]/);
    expect(rendered.subject.length).toBeLessThanOrEqual(200);
    expect(arabic).toContain("المؤتمر الخامس لأبحاث طلاب الطب");
    expect(arabic).toContain(formatConferenceDateRange(conferenceConfig.dates!, "ar"));
    expect(arabic).toContain(contactConfig.recipient);
    expect(arabic).toContain("/ar/registration");
    expect(rendered.html.indexOf("<img ")).toBeLessThan(rendered.html.indexOf('dir="ltr" lang="en"'));
    expect(rendered.html.indexOf('dir="ltr" lang="en"')).toBeLessThan(rendered.html.indexOf('<hr '));
    expect(rendered.html.indexOf('<hr ')).toBeLessThan(rendered.html.indexOf('dir="rtl" lang="ar"'));
    expect(rendered).not.toHaveProperty("attachments");
    expect(rendered.text).not.toContain("participant@example.invalid");
    expect(rendered.html).not.toMatch(/data:image|ticket_token|national_id|passport|@import|@font-face|<script/i);
    expect(JSON.stringify(rendered)).not.toMatch(/\{(?:locale|offer_deadline|confirmation_deadline|nonresponse_sentence)\}|undefined|\bTODO\b/);
    expect([...rendered.html.matchAll(/<img /g)]).toHaveLength(1);
  });

  it.each(registrationEmailTemplates)("keeps both languages for legacy %s Arabic page links", (template) => {
    const english = renderOutboxMessage(message(template));
    const arabic = renderOutboxMessage(message(template, "ar"));
    expect(arabic).toEqual({ ...english, text: english.text.replaceAll("/en/registration", "/ar/registration"),
      html: english.html.replaceAll("/en/registration", "/ar/registration") });
  });

  it("uses the persisted offer deadline converted to Riyadh, not a new 24-hour window at send time", () => {
    const rendered = renderOutboxMessage(message("registration_offered"));
    expect(rendered.text).toContain("19 November 2026 at 20:00 (Asia/Riyadh)");
    expect(rendered.text).toContain("١٩ نوفمبر ٢٠٢٦ في ٢٠:٠٠ (بتوقيت الرياض)");
    expect(rendered.subject.startsWith("A seat is offered to you: reply within 24 hours | ")).toBe(true);
  });

  it.each(["release_unconfirmed", "keep_unconfirmed"])("renders the persisted confirmation deadline and explicit %s policy", (policy) => {
    const input = message("registration_confirm_seat");
    const rendered = renderOutboxMessage({ ...input, payload: { ...input.payload, nonresponse_policy: policy } });
    expect(rendered.subject.startsWith("Please confirm your seat by 24 January 2027 at 20:00 (Asia/Riyadh) | ")).toBe(true);
    expect(rendered.subject).toContain("٢٤ يناير ٢٠٢٧ في ٢٠:٠٠ (بتوقيت الرياض)");
    expect(rendered.text).toContain(policy === "release_unconfirmed"
      ? "your seat will be released and your ticket will no longer be valid" : "your seat and ticket will be kept");
    expect(rendered.text).toContain(policy === "release_unconfirmed"
      ? "فسيُتاح مقعدك لغيرك ولن تعود تذكرتك صالحة" : "فسيُحتفظ بمقعدك وتذكرتك");
  });

  it.each([{}, { confirm_expires_at: "2027-01-24T17:00:00Z" },
    { confirm_expires_at: "tomorrow", nonresponse_policy: "keep_unconfirmed" },
    { confirm_expires_at: "2027-01-24T17:00:00Z", nonresponse_policy: "" },
    { confirm_expires_at: "2027-01-24T17:00:00Z", nonresponse_policy: "release_unconfirmed", name: "private" },
  ])("refuses confirmation payload without exact deadline and policy %j", (payload) => {
    expect(() => renderOutboxMessage({ ...message("registration_confirm_seat"), payload })).toThrow();
  });

  it.each([
    { template_version: 2 }, { locale: "fr" }, { recipient_email: "bad\n@example.invalid" },
    { recipient_email: "a@example.invalid,b@example.invalid" }, { payload: { name: "Unexpected participant data" } },
    { payload: { ticket_token: "must-never-render" } }, { payload: { url: "https://untrusted.example.invalid" } },
  ] satisfies Partial<OutboxMessage>[])("rejects extra variables or malformed envelopes %j", (change) => {
    expect(() => renderOutboxMessage({ ...message("registration_approved"), ...change })).toThrow("Outbox delivery failed.");
  });

  it.each([{}, { offer_expires_at: null }, { offer_expires_at: "tomorrow" }, { offer_expires_at: "2026-11-19" },
    { offer_expires_at: "<script>alert(1)</script>" }, { offer_expires_at: "2026-11-19T17:00:00Z", name: "Unexpected" }])(
    "rejects missing or invalid offer deadline %j", (payload) => {
      expect(() => renderOutboxMessage({ ...message("registration_offered"), payload })).toThrow();
    });

  it("routes each registration template through the existing immutable provider envelope", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ id: "synthetic-provider-id" }));
    const sender = createResendOutboxSender("re_synthetic_dummy", fetcher);
    for (const template of registrationEmailTemplates) {
      const envelope = renderOutboxMessage(message(template));
      await sender.send(envelope, template);
      expect(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body))).toEqual(envelope);
    }
    expect(fetcher).toHaveBeenCalledTimes(registrationEmailTemplates.length);
  });

  it("retains synthetic-only test and console senders for local registration fixtures", async () => {
    const envelope = renderOutboxMessage(message("registration_received"));
    const sender = createTestOutboxSender();
    await sender.send(envelope, "synthetic-fixture");
    expect(sender.captured.size).toBe(1);
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      await createConsoleOutboxSender().send(envelope, "synthetic-fixture");
      expect(log).toHaveBeenCalledWith({ event: "outbox.synthetic", accepted: 1 });
      expect(JSON.stringify(log.mock.calls)).not.toContain(envelope.to[0]);
    } finally { log.mockRestore(); }
  });
});
