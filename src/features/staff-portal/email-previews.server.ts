import "server-only";

import { registrationEmailTemplates, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";
import type { StaffEmailPreview } from "./ui-contract";

/** Fixed SYNTHETIC examples only. No recipient, deadline or payload comes from a request. */
export function renderRegistrationEmailPreviews(): StaffEmailPreview[] {
  return registrationEmailTemplates.map((templateKey) => {
    const message: OutboxMessage = {
      id: "e1000000-0000-4000-8000-000000000001", template_key: templateKey, template_version: 1,
      locale: "en", recipient_email: "sample@example.invalid",
      payload: templateKey === "registration_offered" ? { offer_expires_at: "2026-11-19T17:00:00+00:00" } : {},
      attempt_count: 0, lease_token: "e2000000-0000-4000-8000-000000000001", lease_expires_at: "2026-11-18T17:02:00Z",
      provider_idempotency_key: "synthetic-preview-only", provider_request: null, first_attempt_at: "2026-11-18T17:00:00Z",
    };
    const rendered = renderOutboxMessage(message);
    return { templateKey, templateVersion: message.template_version, recipient: rendered.to[0],
      subject: rendered.subject, text: rendered.text, html: rendered.html };
  });
}
