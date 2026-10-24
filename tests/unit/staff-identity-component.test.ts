import { describe, expect, it } from "vitest";
import { registrationDetailProjection, registrationProjection } from "@/features/staff-portal/registration-contract.server";
const id = "30000000-0000-4000-8000-000000000001";
const request = { id, actorId: id, name: "Synthetic", email: "synthetic@example.invalid", status: "pending_approval", priority: false,
  createdAt: "2026-10-24T00:00:00Z", decidedAt: null, offerExpiresAt: null, identityMasked: "••••••7890", ticketStatus: null };
const identity = { documentType: "national_id", documentNumber: "1234567890" };
describe("ordinary registration detail identity projection", () => {
  it("accepts a validated identity only on detail", () => {
    expect(registrationDetailProjection({ request, history: [], identity },id)?.identity).toEqual(identity);
  });
  it("retains missing legacy identity as null", () => {
    expect(registrationDetailProjection({ request, history: [], identity: null },id)?.identity).toBeNull();
    expect(registrationDetailProjection({ request, history: [] },id)).toBeNull();
  });
  it.each([{ ...identity, documentType: "iqama" }, { ...identity, documentNumber: "123" },
    { ...identity, documentNumber: "١٢٣٤٥٦٧٨٩٠" }, { ...identity, extra: "private" }, "1234567890"])("rejects malformed detail identity %#", identity => {
    expect(registrationDetailProjection({ request, history: [], identity },id)).toBeNull();
  });
  it("rejects identifier fields leaked into list rows", () => {
    expect(registrationProjection({ requests: [{ ...request, documentNumber: "1234567890" }],
      counts: { pending: 1, approved: 0, waitlisted: 0, capacity: null, remaining: null } })).toBeNull();
  });
});
