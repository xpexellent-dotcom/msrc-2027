import { describe, expect, it, vi } from "vitest";
import { abstractDecisionTemplate, renderOutboxMessage, type OutboxMessage } from "@/lib/email/outbox.server";
import { participantEmailBanner } from "@/lib/email/participant-message.server";
import { drainOutbox, type OutboxStore } from "@/lib/jobs/outbox.server";

function message(payload: Record<string, unknown> = {}): OutboxMessage {
  return { id: "synthetic", template_key: "abstract_decision", template_version: 1, locale: "en",
    recipient_email: "applicant@example.invalid", payload: { reference: "SYNTHETIC-001", outcome: "accept",
      instructions: "", revision_deadline: null, ...payload }, attempt_count: 1, lease_token: "synthetic",
    lease_expires_at: "2026-10-23T12:00:00Z", provider_idempotency_key: "synthetic", provider_request: null,
    first_attempt_at: "2026-10-23T11:59:00Z" };
}

describe("DRAFT abstract decision messages", () => {
  it.each(["accept", "reject", "revise"])("previews complete %s in English and Arabic without scientific or identity data", (outcome) => {
    const request = renderOutboxMessage(message({ outcome, instructions: outcome === "revise" ? "Clarify the methods." : "",
      revision_deadline: outcome === "revise" ? "2026-11-02T10:00:00Z" : null }), outcome === "revise"
      ? { abstractInstructions: { english: "Clarify the methods.", arabic: "يُرجى توضيح المنهجية." } } : undefined);
    expect(abstractDecisionTemplate.approval).toBe("DRAFT");
    expect(request.html).toContain('lang="en"');
    expect(request.html).toContain('dir="rtl" lang="ar"');
    expect(request.html).toContain("font-family:'Noto Sans Arabic',Tahoma,Arial,sans-serif");
    expect(request.html).toContain(`<img src="${participantEmailBanner.src}" alt="${participantEmailBanner.alt}" width="600"`);
    expect(participantEmailBanner.src).toMatch(/^https:\/\//);
    expect(request.subject).toContain(" | الملخص:");
    expect(request.subject).toContain(outcome === "accept" ? "مقبول" : outcome === "reject" ? "غير مقبول" : "أُعيد للتعديل");
    const [english, arabic] = request.text.split("\n\n---\n\n");
    expect(english).toContain("The scientific committee has recorded the following outcome");
    expect(arabic).toContain("سجّلت اللجنة العلمية النتيجة التالية للملخص SYNTHETIC-001");
    expect(arabic).toContain("/ar/abstracts");
    expect(request.html).not.toMatch(/<script|@import|@font-face|data:image|<svg/i);
    expect([...request.html.matchAll(/<img /g)]).toHaveLength(1);
    expect(JSON.stringify(request)).not.toMatch(/\{(?:reference|outcome|deadline)\}|undefined|\bTODO\b/);
    expect(request.text).toContain("SYNTHETIC-001");
    expect(request.to).toEqual(["applicant@example.invalid"]);
    expect(request).not.toHaveProperty("attachments");
    if (outcome === "revise") {
      expect(english).toContain("Clarify the methods.");
      expect(arabic).toContain("يُرجى توضيح المنهجية.");
      expect(english).toContain("2 November 2026 at 13:00 (Asia/Riyadh)");
      expect(arabic).toContain("٢ نوفمبر ٢٠٢٦ في ١٣:٠٠ (بتوقيت الرياض)");
      expect(english).toContain("An email reply does not submit a revision.");
      expect(arabic).toContain("الرد على هذه الرسالة لا يُعد تقديمًا للتعديل.");
    }
  });

  it("escapes applicant-facing instructions and rejects extra private fields", () => {
    expect(renderOutboxMessage(message({ instructions: "<script>unsafe</script> & text" }), {
      abstractInstructions: { english: "<script>unsafe</script> & text", arabic: "<script>نص غير آمن</script> & نص" },
    }).html)
      .toContain("&lt;script&gt;unsafe&lt;/script&gt; &amp; text");
    const escaped = renderOutboxMessage(message({ instructions: "English instruction" }), {
      abstractInstructions: { english: "English instruction", arabic: '<img src=x onerror="alert(1)"> تعليمات' },
    });
    expect(escaped.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escaped.html).not.toContain('<img src=x');
    expect(() => renderOutboxMessage(message({ reviewer: "private" }))).toThrow();
    expect(() => renderOutboxMessage(message({ scores: [1] }))).toThrow();
  });

  it.each([undefined, { abstractInstructions: { english: "Different source", arabic: "ترجمة" } },
    { abstractInstructions: { english: "Clarify", arabic: "" } },
    { abstractInstructions: { english: "Clarify", arabic: "Untranslated English" } },
    { abstractInstructions: { english: "Clarify", arabic: "ع".repeat(4_001) } },
  ])("refuses missing, stale or invalid authored translation %j", (translations) => {
    expect(() => renderOutboxMessage(message({ instructions: "Clarify" }), translations)).toThrow();
  });

  it("rejects an unexpected translation rather than inventing English instructions", () => {
    expect(() => renderOutboxMessage(message(), { abstractInstructions: { english: "", arabic: "تعليمات" } })).toThrow();
  });

  it.each(["accept", "reject", "revise"])("bounds the bilingual %s subject for a maximum reference without losing the body reference", (outcome) => {
    const reference = "A".repeat(160);
    const request = renderOutboxMessage(message({ reference, outcome, instructions: outcome === "revise" ? "Clarify" : "",
      revision_deadline: outcome === "revise" ? "2026-11-02T10:00:00Z" : null }), outcome === "revise"
      ? { abstractInstructions: { english: "Clarify", arabic: "يُرجى التوضيح" } } : undefined);
    expect(request.subject.length).toBeLessThanOrEqual(200);
    expect(request.subject).toContain("…");
    expect(request.text.split("\n\n---\n\n").every((block) => block.includes(reference))).toBe(true);
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
