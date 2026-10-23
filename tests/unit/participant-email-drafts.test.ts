import { describe, expect, it, vi } from "vitest";
import { registrationEmailTemplates, type EmailRequest, type OutboxMessage } from "@/lib/email/outbox.server";
import { drainOutbox, type OutboxStore } from "@/lib/jobs/outbox.server";

const historicalRequest: EmailRequest = Object.freeze({ from: "MSRC 2027 <no-reply@example.invalid>",
  to: ["participant@example.invalid"], subject: "Historical approved English subject",
  text: "Historical immutable English body", html: '<html lang="en"><body>Historical immutable English body</body></html>' });

function message(template: string, frozen = false): OutboxMessage {
  return { id: "synthetic", template_key: template, template_version: 1, locale: "en", recipient_email: "participant@example.invalid",
    payload: {}, attempt_count: 1, lease_token: "synthetic", lease_expires_at: "2026-10-23T12:00:00Z",
    provider_idempotency_key: "unchanged-key", provider_request: frozen ? historicalRequest : null, first_attempt_at: "2026-10-23T11:59:00Z" };
}

describe("ORG-059 participant wording approval gate", () => {
  it.each([...registrationEmailTemplates, "abstract_decision"].flatMap((key) => [false, true].map((frozen) => ({ key, frozen }))))(
    "blocks $key (frozen=$frozen) before preparing or sending, even with a positive cap", async ({ key, frozen }) => {
      const original = message(key, frozen);
      const snapshot = structuredClone(original);
      const store: OutboxStore = { claim: vi.fn().mockResolvedValueOnce([original]).mockResolvedValue([]),
        prepare: vi.fn(), finish: vi.fn().mockResolvedValue("failed_permanent") };
      const sender = { send: vi.fn() };
      const result = await drainOutbox({ store, sender, dailyCap: 10, now: () => 0 });
      expect(result).toEqual({ claimed: 1, sent: 0, permanent: 1, retryable: 0, stale: 0 });
      expect(store.prepare).not.toHaveBeenCalled();
      expect(sender.send).not.toHaveBeenCalled();
      expect(store.finish).toHaveBeenCalledWith(original, expect.any(String), { state: "permanent", errorClass: "template_invalid" });
      expect(original).toEqual(snapshot);
    });

  it("reports a rejected draft acknowledgement as stale without bypassing the lease", async () => {
    const store: OutboxStore = { claim: vi.fn().mockResolvedValueOnce([message("registration_received")]).mockResolvedValue([]),
      prepare: vi.fn(), finish: vi.fn().mockResolvedValue(false) };
    const sender = { send: vi.fn() };
    expect(await drainOutbox({ store, sender, dailyCap: 10, now: () => 0 })).toMatchObject({ sent: 0, permanent: 0, stale: 1 });
    expect(store.prepare).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });
});
