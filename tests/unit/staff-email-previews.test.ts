import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { brandLogo } from "@/content/brand-identity";
import { renderRegistrationEmailPreviews } from "@/features/staff-portal/email-previews.server";
import { EmailPreviewsPanel } from "@/features/staff-portal/email-previews-panel";
import { emailPreviewsCopy } from "@/features/staff-portal/email-previews-copy";
import { abstractDecisionTemplate, registrationEmailTemplates, renderOutboxMessage, renderParticipantEmailPreview, type OutboxMessage, type ParticipantEmailTranslations } from "@/lib/email/outbox.server";
import { participantEmailBanner } from "@/lib/email/participant-message.server";
import browserPreviews from "../staff-e2e/fixtures/email-previews.json" with { type: "json" };

describe("fixed synthetic bilingual participant email previews", () => {
  it("shows the entire draft catalogue in the new design while keeping the existing delivery output", () => {
    const previews = renderRegistrationEmailPreviews();
    expect(previews.map((preview) => preview.templateKey)).toEqual([...registrationEmailTemplates, ...Array(3).fill(abstractDecisionTemplate.key)]);
    expect(new Set(previews.map((preview) => preview.previewKey)).size).toBe(previews.length);
    for (const preview of previews) {
      const message: OutboxMessage = { id: "synthetic", template_key: preview.templateKey, template_version: 1,
        locale: "en", recipient_email: "sample@example.invalid", payload: preview.templateKey === "registration_offered"
          ? { offer_expires_at: "2026-11-19T17:00:00+00:00" }
          : preview.templateKey === "registration_confirm_seat"
            ? { confirm_expires_at: "2027-01-24T17:00:00+00:00", nonresponse_policy: "release_unconfirmed" }
            : preview.templateKey === "abstract_decision" ? { reference: "SYNTHETIC-ABSTRACT-001", outcome: preview.previewKey.replace("abstract_decision_", ""),
              instructions: preview.previewKey === "abstract_decision_revise" ? "Please clarify the methods in the abstract." : "",
              revision_deadline: preview.previewKey === "abstract_decision_revise" ? "2026-11-19T17:00:00+00:00" : null } : {}, attempt_count: 0, lease_token: "synthetic",
        lease_expires_at: "2026-11-18T17:02:00Z", provider_idempotency_key: "synthetic", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z" };
      const translations: ParticipantEmailTranslations | undefined = preview.previewKey === "abstract_decision_revise"
        ? { abstractInstructions: { english: "Please clarify the methods in the abstract.", arabic: "يُرجى توضيح المنهجية في الملخص." } } : undefined;
      const delivery = renderOutboxMessage(message, translations);
      const design = renderParticipantEmailPreview(message, translations);
      const [englishText, arabicText] = delivery.text.split("\n\n---\n\n");
      expect(preview).toEqual({ previewKey: preview.previewKey, templateKey: preview.templateKey, templateVersion: 1,
        wordingStatus: "draft", recipient: "sample@example.invalid", subject: delivery.subject, text: delivery.text,
        html: design.html, englishText, arabicText });
      expect(preview.arabicText).toMatch(/[\u0600-\u06ff]/);
      expect(preview.html).toContain('dir="rtl" lang="ar"');
      expect(preview.html).toContain(`src="https://www.msrc2027.com${brandLogo.onPurple}" alt="MSRC seal" width="52" height="52"`);
      expect(preview.html).toContain(">MSRC’27</td>");
      expect(preview.html).not.toContain(participantEmailBanner.src);
      expect(delivery.html).toContain(participantEmailBanner.src);
      expect(delivery.html).not.toContain(brandLogo.onPurple);
    }
    expect(previews.find((preview) => preview.templateKey === "registration_offered")?.text).toContain("19 November 2026 at 20:00 (Asia/Riyadh)");
    expect(renderRegistrationEmailPreviews()).toEqual(previews);
    expect(browserPreviews).toEqual(previews);
  });
  it.each(["en", "ar"] as const)("shows bilingual message and escapes untrusted text and HTML within %s chrome", (locale) => {
    const preview = { ...renderRegistrationEmailPreviews()[0], subject: '<script>alert("subject")</script>',
      englishText: '<script>alert("english")</script>', arabicText: '<script>alert("arabic")</script>',
      text: '<img src=x onerror="alert(1)">\n\n---\n\nنص تجريبي', html: '<script>alert("html")</script>' };
    const markup = renderToStaticMarkup(createElement(EmailPreviewsPanel, { locale, previews: [preview] }));
    expect(markup).not.toMatch(/<script| onerror="/);
    expect(markup.match(/<img /g)).toHaveLength(1);
    expect(markup).toContain(`src="${brandLogo.onPurple}"`);
    expect(markup).toContain('alt=""');
    expect(markup).toContain(">MSRC’27</span>");
    expect(markup).toContain("&lt;script&gt;"); expect(markup).toContain("&lt;img");
    expect(markup).toContain(emailPreviewsCopy[locale].draft);
    expect(markup).toContain('lang="en" dir="ltr"');
    expect(markup).toContain('lang="ar" dir="rtl"');
    expect(markup).not.toContain('src="https://');
  });
});
