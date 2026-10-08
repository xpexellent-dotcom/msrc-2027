import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAccount } from "@/features/participant-accounts/participant-client";

function response(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
}
describe("participant eligibility error projection", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["required", "invalid", "too_long"] as const)("preserves the server's %s declaration error for the accessible form", async (error) => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ state: "invalid_input", fieldErrors: { ageConfirmed: error, dateOfBirth: "private-field" }, ageConfirmed: true })));
    expect((await requestAccount()).response).toEqual({ state: "invalid_input", fieldErrors: { ageConfirmed: error } });
  });
  it("does not expose an unsupported age error or treat returned declarations as assurance", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ state: "ready", fieldErrors: { ageConfirmed: "age_verified" }, ageConfirmed: true, dateOfBirth: "synthetic-hidden" })));
    expect((await requestAccount()).response).toEqual({ state: "ready", fieldErrors: {} });
  });
  it("sends an explicit boolean without transforming it to a string", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response({ state: "accepted" }));
    vi.stubGlobal("fetch", fetch);
    await requestAccount({ action: "signup", ageConfirmed: true });
    const body = JSON.parse(fetch.mock.calls[0][1]!.body as string) as Record<string, unknown>;
    expect(body.ageConfirmed).toBe(true);
  });
});
