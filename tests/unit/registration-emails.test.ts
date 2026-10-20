import { describe, expect, it, vi } from "vitest";
import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { createConsoleOutboxSender, createResendOutboxSender, createTestOutboxSender, registrationEmailTemplates,
  renderOutboxMessage, type OutboxMessage, type RegistrationEmailTemplate } from "@/lib/email/outbox.server";

function message(template: RegistrationEmailTemplate, locale = "en"): OutboxMessage {
  return { id: "b1000000-0000-4000-8000-000000000001", template_key: template, template_version: 1,
    recipient_email: "participant@example.invalid", locale,
    payload: template === "registration_offered" ? { offer_expires_at: "2026-11-19T17:00:00+00:00" } : {},
    attempt_count: 1, lease_token: "b2000000-0000-4000-8000-000000000001", lease_expires_at: "2026-11-18T17:02:00Z",
    provider_idempotency_key: "synthetic-registration-message", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z" };
}

describe("DRAFT English registration email templates", () => {
  it.each(registrationEmailTemplates)("renders reviewed plain text and simple HTML for %s", (template) => {
    const rendered = renderOutboxMessage(message(template));
    expect(rendered).toMatchSnapshot();
    expect(rendered.text).toContain(formatConferenceDateRange(conferenceConfig.dates!, "en"));
    expect(rendered.text).toContain(contactConfig.recipient);
    expect(rendered.html).toContain('<html lang="en">');
    expect(rendered).not.toHaveProperty("attachments");
    expect(rendered.text).not.toContain("participant@example.invalid");
    expect(rendered.html).not.toMatch(/<img|data:image|ticket_token|national_id|passport/i);
  });

  it.each(registrationEmailTemplates)("keeps %s English for Arabic page links", (template) => {
    const english = renderOutboxMessage(message(template));
    const arabic = renderOutboxMessage(message(template, "ar"));
    expect(arabic).toEqual({ ...english, text: english.text.replaceAll("/en/registration", "/ar/registration"),
      html: english.html.replaceAll("/en/registration", "/ar/registration") });
  });

  it("uses the persisted offer deadline converted to Riyadh, not a new 24-hour window at send time", () => {
    const rendered = renderOutboxMessage(message("registration_offered"));
    expect(rendered.text).toContain("19 November 2026 at 20:00 (Asia/Riyadh)");
    expect(rendered.subject).toBe("A seat is offered to you: reply within 24 hours");
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
    expect(fetcher).toHaveBeenCalledTimes(5);
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
