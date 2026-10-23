import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { renderRegistrationEmailPreviews } from "@/features/staff-portal/email-previews.server";
import { EmailPreviewsPanel } from "@/features/staff-portal/email-previews-panel";
import { emailPreviewsCopy } from "@/features/staff-portal/email-previews-copy";
import { registrationEmailTemplates, renderOutboxMessage } from "@/lib/email/outbox.server";
import browserPreviews from "../staff-e2e/fixtures/email-previews.json" with { type: "json" };

describe("fixed synthetic registration email previews", () => {
  it("uses the complete outbox registry and identical renderer without personal data or provider access", () => {
    const previews = renderRegistrationEmailPreviews();
    expect(previews.map((preview) => preview.templateKey)).toEqual(registrationEmailTemplates);
    for (const preview of previews) {
      const expected = renderOutboxMessage({ id: "synthetic", template_key: preview.templateKey, template_version: 1,
        locale: "en", recipient_email: "sample@example.invalid", payload: preview.templateKey === "registration_offered"
          ? { offer_expires_at: "2026-11-19T17:00:00+00:00" }
          : preview.templateKey === "registration_confirm_seat"
            ? { confirm_expires_at: "2027-01-24T17:00:00+00:00", nonresponse_policy: "release_unconfirmed" } : {}, attempt_count: 0, lease_token: "synthetic",
        lease_expires_at: "2026-11-18T17:02:00Z", provider_idempotency_key: "synthetic", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z" });
      expect(preview).toEqual({ templateKey: preview.templateKey, templateVersion: 1,
        wordingStatus: ["registration_confirm_seat", "registration_seat_released"].includes(preview.templateKey) ? "draft" : "approved",
        recipient: "sample@example.invalid", subject: expected.subject, text: expected.text, html: expected.html });
    }
    expect(previews.find((preview) => preview.templateKey === "registration_offered")?.text).toContain("19 November 2026 at 20:00 (Asia/Riyadh)");
    expect(renderRegistrationEmailPreviews()).toEqual(previews);
    expect(browserPreviews).toEqual(previews);
  });
  it.each(["en", "ar"] as const)("escapes all email representations within %s chrome", (locale) => {
    const preview = { ...renderRegistrationEmailPreviews()[0], subject: '<script>alert("subject")</script>',
      text: '<img src=x onerror="alert(1)">', html: '<script>alert("html")</script>' };
    const markup = renderToStaticMarkup(createElement(EmailPreviewsPanel, { locale, previews: [preview] }));
    expect(markup).not.toMatch(/<script|<img/);
    expect(markup).toContain("&lt;script&gt;"); expect(markup).toContain("&lt;img");
    expect(markup).toContain(emailPreviewsCopy[locale].approved);
    expect(markup).toContain('lang="en" dir="ltr"');
  });
});
