import "server-only";

import { abstractDecisionTemplate, registrationEmailTemplates, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";
import { participantEmailBanner } from "@/lib/email/participant-message.server";
import type { StaffEmailPreview } from "./ui-contract";

/** Fixed SYNTHETIC examples only. No recipient, deadline or payload comes from a request. */
export function renderRegistrationEmailPreviews(): StaffEmailPreview[] {
  const variants = [...registrationEmailTemplates.map((templateKey) => ({ templateKey, previewKey: templateKey, payload:
    templateKey === "registration_offered" ? { offer_expires_at: "2026-11-19T17:00:00+00:00" }
      : templateKey === "registration_confirm_seat"
        ? { confirm_expires_at: "2027-01-24T17:00:00+00:00", nonresponse_policy: "release_unconfirmed" } : {} })),
    ...(["accept", "reject", "revise"] as const).map((outcome) => ({ templateKey: abstractDecisionTemplate.key,
      previewKey: `abstract_decision_${outcome}`, payload: { reference: "SYNTHETIC-ABSTRACT-001", outcome,
        instructions: outcome === "revise" ? "Please clarify the methods in the abstract." : "",
        revision_deadline: outcome === "revise" ? "2026-11-19T17:00:00+00:00" : null } }))];
  return variants.map(({ templateKey, previewKey, payload }) => {
    const message: OutboxMessage = {
      id: "e1000000-0000-4000-8000-000000000001", template_key: templateKey, template_version: 1,
      locale: "en", recipient_email: "sample@example.invalid",
      payload,
      attempt_count: 0, lease_token: "e2000000-0000-4000-8000-000000000001", lease_expires_at: "2026-11-18T17:02:00Z",
      provider_idempotency_key: "synthetic-preview-only", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z",
    };
    const rendered = renderOutboxMessage(message, previewKey === "abstract_decision_revise"
      ? { abstractInstructions: { english: "Please clarify the methods in the abstract.", arabic: "يُرجى توضيح المنهجية في الملخص." } } : undefined);
    const [englishWithBanner, arabicText] = rendered.text.split("\n\n---\n\n");
    const englishText = englishWithBanner.replace(`${participantEmailBanner.alt}: ${participantEmailBanner.src}\n\n`, "");
    return { previewKey, templateKey, templateVersion: message.template_version, wordingStatus: "draft",
      recipient: rendered.to[0], subject: rendered.subject, text: rendered.text, html: rendered.html,
      englishText, arabicText, banner: participantEmailBanner };
  });
}
