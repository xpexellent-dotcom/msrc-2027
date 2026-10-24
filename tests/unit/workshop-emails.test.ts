import { describe, expect, it, vi } from "vitest";
import { renderOutboxMessage, isDraftParticipantTemplate, type OutboxMessage } from "@/lib/email/outbox.server";
import { workshopNoticeEvents } from "@/lib/email/workshop-message.server";
import { drainOutbox } from "@/lib/jobs/outbox.server";

const message: OutboxMessage = { id: "ed000000-0000-4000-8000-000000000001", template_key: "workshop_notice", template_version: 1,
  locale: "en", recipient_email: "synthetic@example.invalid", payload: { event: "offered", workshop_title: "Synthetic workshop <script>plain text</script>",
    booking_id: "ed000000-0000-4000-8000-000000000002", deadline: "2030-01-27T07:00:00Z" }, attempt_count: 1,
  lease_token: "ed000000-0000-4000-8000-000000000003", lease_expires_at: "2030-01-27T06:02:00Z", provider_idempotency_key: "synthetic-workshop-only",
  provider_request: null, first_attempt_at: "2030-01-27T06:00:00Z" };
describe("English workshop transactional DRAFT notices", () => {
  it.each(workshopNoticeEvents)("renders %s with escaped supplied content and no private booking ID", (event) => {
    const result = renderOutboxMessage({ ...message, payload: { ...message.payload, event } });
    expect(result.to).toEqual([message.recipient_email]); expect(result.text).toContain("My Bookings");
    expect(result.text).toContain("Asia/Riyadh"); expect(result.html).toContain('&lt;script&gt;'); expect(result.html).not.toContain("<script>");
    expect(result.html).toContain('lang="en"'); expect(result.text).not.toContain(String(message.payload.booking_id));
    expect(isDraftParticipantTemplate("workshop_notice")).toBe(true);
  });
  it.each([{ ...message.payload, event: "unknown" }, { ...message.payload, deadline: "tomorrow" }, { ...message.payload, booking_id: "private" },
    { ...message.payload, unexpected: "private" }, { ...message.payload, workshop_title: "" }])("rejects an unreviewed payload %#", (payload) => {
    expect(() => renderOutboxMessage({ ...message, payload })).toThrow();
  });
  it("rejects unsupported template versions, locales and destinations", () => {
    for (const change of [{ template_version: 2 }, { locale: "ar" }, { recipient_email: "invalid" }]) {
      expect(() => renderOutboxMessage({ ...message, ...change })).toThrow();
    }
    expect(renderOutboxMessage({ ...message, payload: { ...message.payload, deadline: null } }).text).not.toContain("Deadline:");
  });
  it("never prepares or sends a DRAFT, even with a frozen provider snapshot", async () => {
    const sender = { send: vi.fn() }, prepare = vi.fn(), finish = vi.fn().mockResolvedValue("failed_permanent");
    const claimed = { ...message, provider_request: renderOutboxMessage(message) };
    const claim = vi.fn().mockResolvedValueOnce([claimed]).mockResolvedValue([]);
    expect(await drainOutbox({ store: { claim, prepare, finish }, sender, dailyCap: 1 })).toMatchObject({ claimed: 1, sent: 0, permanent: 1 });
    expect(sender.send).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(claimed, expect.any(String), { state: "permanent", errorClass: "template_invalid" });
  });
});
