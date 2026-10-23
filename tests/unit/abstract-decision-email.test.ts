import { describe, expect, it, vi } from "vitest";
import { abstractDecisionTemplate, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";
import { drainOutbox, type OutboxStore } from "@/lib/jobs/outbox.server";

function message(payload: Record<string, unknown> = {}): OutboxMessage {
  return { id: "synthetic", template_key: "abstract_decision", template_version: 1, locale: "en",
    recipient_email: "applicant@example.invalid", payload: { reference: "SYNTHETIC-001", outcome: "accept",
      instructions: "", revision_deadline: null, ...payload }, attempt_count: 1, lease_token: "synthetic",
    lease_expires_at: "2026-10-23T12:00:00Z", provider_idempotency_key: "synthetic", provider_request: null,
    first_attempt_at: "2026-10-23T11:59:00Z" };
}

describe("DRAFT abstract decision messages", () => {
  it.each(["accept", "reject", "revise"])("previews %s in English without scientific or identity data", (outcome) => {
    const request = renderOutboxMessage(message({ outcome, instructions: outcome === "revise" ? "Clarify the methods." : "",
      revision_deadline: outcome === "revise" ? "2026-11-02T10:00:00Z" : null }));
    expect(abstractDecisionTemplate.approval).toBe("DRAFT");
    expect(request.html).toContain('lang="en"');
    expect(request.text).toContain("SYNTHETIC-001");
    expect(request.to).toEqual(["applicant@example.invalid"]);
    expect(request).not.toHaveProperty("attachments");
    if (outcome === "revise") expect(request.text).toContain("An email reply does not submit a revision.");
  });

  it("escapes applicant-facing instructions and rejects extra private fields", () => {
    expect(renderOutboxMessage(message({ instructions: "<script>unsafe</script> & text" })).html)
      .toContain("&lt;script&gt;unsafe&lt;/script&gt; &amp; text");
    expect(() => renderOutboxMessage(message({ reviewer: "private" }))).toThrow();
    expect(() => renderOutboxMessage(message({ scores: [1] }))).toThrow();
  });

  it.each([
    { outcome: "revise" }, { outcome: "revise", instructions: "Clarify", revision_deadline: "tomorrow" },
    { outcome: "accept", revision_deadline: "2026-11-02T10:00:00Z" }, { outcome: "automatic_accept" },
    { reference: "<identity>" }, { instructions: "x".repeat(4_001) },
  ])("refuses malformed outcomes and revision instructions: %j", (payload) => {
    expect(() => renderOutboxMessage(message(payload))).toThrow();
  });

  it("refuses unsupported versions, locales and recipient injection", () => {
    for (const override of [{ template_version: 2 }, { locale: "ar" }, { recipient_email: "a@example.invalid\nb@example.invalid" }]) {
      expect(() => renderOutboxMessage({ ...message(), ...override })).toThrow();
    }
  });

  it("never prepares or sends a DRAFT even when a faulty store claims it", async () => {
    const store: OutboxStore = { claim: vi.fn().mockResolvedValueOnce([message()]).mockResolvedValue([]),
      prepare: vi.fn(), finish: vi.fn().mockResolvedValue("failed_permanent") };
    const sender = { send: vi.fn() };
    const result = await drainOutbox({ store, sender, dailyCap: 10, now: () => 0 });
    expect(result).toMatchObject({ claimed: 1, sent: 0, permanent: 1 });
    expect(store.prepare).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
    expect(store.finish).toHaveBeenCalledWith(expect.anything(), expect.any(String), { state: "permanent", errorClass: "template_invalid" });
  });
});
