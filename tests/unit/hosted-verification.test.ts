import { describe, expect, it, vi } from "vitest";
import { verifyHostedSupabase } from "../../scripts/verify-hosted-supabase.mjs";

const input = {
  target: "hosted",
  url: "https://abcdefghijklmnopqrst.supabase.co",
  publishableKey: "sb_publishable_synthetic_test_key",
};

describe("read-only hosted connection verification (INF-04, SEC-02/06)", () => {
  it("requests only public settings and discards the response body", async () => {
    const response = new Response('{"external":{}}', {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(verifyHostedSupabase(input, fetcher)).resolves.toEqual({ origin: input.url, status: 200 });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(`${input.url}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: input.publishableKey, Accept: "application/json" },
      redirect: "error",
      signal: expect.any(AbortSignal),
      cache: "no-store",
    });
    expect(response.bodyUsed).toBe(true);
  });

  it.each([
    {},
    { ...input, target: "local" },
    { ...input, target: undefined },
    { ...input, url: "https://abcdefghijklmnopqrst.supabase.co.attacker.example" },
    { ...input, publishableKey: "sb_secret_synthetic" },
  ])("rejects the wrong target or unsafe configuration before network access", async (values) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(verifyHostedSupabase(values, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503])("reports status %s without exposing response data or keys", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("private diagnostic", { status }));
    await expect(verifyHostedSupabase(input, fetcher)).rejects.toThrow(`HTTP ${status}`);
    try { await verifyHostedSupabase(input, fetcher); } catch (error) {
      expect(String(error)).not.toContain("private diagnostic");
      expect(String(error)).not.toContain(input.publishableKey);
    }
  });

  it("sanitizes network errors and refuses unexpected content", async () => {
    const unavailable = vi.fn<typeof fetch>().mockRejectedValue(new Error(`private diagnostic ${input.publishableKey}`));
    await expect(verifyHostedSupabase(input, unavailable)).rejects.toThrow(/details withheld/);
    const html = vi.fn<typeof fetch>().mockResolvedValue(new Response("login page", { headers: { "content-type": "text/html" } }));
    await expect(verifyHostedSupabase(input, html)).rejects.toThrow(/expected settings/);
  });

  it("sanitizes response-stream failures", async () => {
    const response = new Response(new ReadableStream({
      cancel() { throw new Error(`private diagnostic ${input.publishableKey}`); },
    }), { headers: { "content-type": "application/json" } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(verifyHostedSupabase(input, fetcher)).rejects.toThrow(
      "Hosted Supabase response could not be safely finalized; details withheld.",
    );
  });
});
