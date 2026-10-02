import { describe, expect, it, vi } from "vitest";
import { verifyHostedAuthorization } from "../../scripts/verify-hosted-authorization.mjs";

const input = {
  target: "hosted",
  url: "https://abcdefghijklmnopqrst.supabase.co",
  publishableKey: "sb_publishable_synthetic_test_key",
};
const privateDiagnostic = "synthetic-private-response-do-not-log";

describe("Dockerless hosted anonymous own-context verification (SEC-01/02/06)", () => {
  it.each([401, 403])("accepts only an explicit anonymous SQL permission denial at HTTP %s", async (status) => {
    const response = new Response(JSON.stringify({ code: "42501", message: privateDiagnostic }), { status });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const result = await verifyHostedAuthorization(input, fetcher);
    expect(result).toEqual({ origin: input.url, status, anonymousContextDenied: true });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(privateDiagnostic);
    expect(JSON.stringify(result)).not.toContain(input.publishableKey);
    expect(response.bodyUsed).toBe(true);
  });

  it("makes one bounded, uncached RPC request using only the publishable key without bearer credentials", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_synthetic_do_not_use");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"code":"42501"}', { status: 403 }));
    await verifyHostedAuthorization(input, fetcher);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(`${input.url}/rest/v1/rpc/msrc_access_context`, {
      method: "POST",
      headers: { apikey: input.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: "msrc-2027" }),
      redirect: "error", signal: expect.any(AbortSignal), cache: "no-store",
    });
    expect(timeout).toHaveBeenCalledExactlyOnceWith(10_000);
    const options = fetcher.mock.calls[0][1]!;
    expect(options.headers).not.toHaveProperty("Authorization");
    expect(JSON.stringify(options)).not.toContain("sb_secret_synthetic_do_not_use");
  });

  it.each([
    {},
    { ...input, target: undefined },
    { ...input, target: "local", url: "http://127.0.0.1:54321" },
    { ...input, url: "https://abcdefghijklmnopqrst.supabase.co.attacker.example" },
    { ...input, publishableKey: "sb_secret_synthetic_do_not_use" },
  ])("rejects missing, local or unsafe configuration before any network request", async (config) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(verifyHostedAuthorization(config, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { status: 404, payload: { code: "PGRST202", message: privateDiagnostic } },
    { status: 401, payload: { code: "PGRST301", message: privateDiagnostic } },
    { status: 403, payload: { code: "invalid", message: privateDiagnostic } },
    { status: 403, payload: { code: 42501, message: privateDiagnostic } },
    { status: 200, payload: { code: "42501", message: privateDiagnostic } },
    { status: 200, payload: { principal: { userId: privateDiagnostic }, grants: ["superAdmin"] } },
    { status: 500, payload: { code: "42501", message: privateDiagnostic } },
  ])("does not mistake HTTP $status / $payload for verified anonymous permission denial", async ({ status, payload }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload), { status }));
    const failure = await verifyHostedAuthorization(input, fetcher).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    const message = (failure as Error).message;
    expect(message).toContain(`HTTP ${status}`);
    expect(message).toContain("response details withheld");
    expect(message).not.toContain(privateDiagnostic);
    expect(message).not.toContain(input.publishableKey);
    expect(message).not.toContain("superAdmin");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("sanitizes malformed JSON without exposing the response body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(privateDiagnostic, { status: 403 }));
    await expect(verifyHostedAuthorization(input, fetcher)).rejects.toThrow(
      "Hosted authorization verification could not complete; response details withheld.",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("sanitizes network/timeout failures without exposing keys or retrying", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(`${privateDiagnostic} ${input.publishableKey}`));
    await expect(verifyHostedAuthorization(input, fetcher)).rejects.toThrow(
      "Hosted authorization verification could not complete; response details withheld.",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
