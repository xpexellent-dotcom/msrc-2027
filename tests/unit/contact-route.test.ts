import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "@/app/api/contact/route";

const handlers = { GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD };

afterEach(() => vi.unstubAllGlobals());

describe("closed Contact transport (BL-PUB-06 / PRV-03 / SEC-01)", () => {
  it.each(Object.entries(handlers))("rejects %s before reading any body or address", async (method, handler) => {
    const read = vi.fn(() => { throw new Error("Must not read visitor content"); });
    const request = {
      get body() { return read(); },
      get headers() { return read(); },
      get url() { return read(); },
      json: read, formData: read, text: read, arrayBuffer: read,
    };
    const response: Response = Reflect.apply(handler, undefined, [request]);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    if (method === "HEAD") expect(await response.text()).toBe("");
    else expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect(read).not.toHaveBeenCalled();
  });

  it.each(["{broken", "private visitor content", "x".repeat(100_000), ""])(
    "does not parse, echo, log or send even a direct malformed/oversized POST",
    async (body) => {
      const request = new Request("https://msrc2027.com/api/contact", { method: "POST", body });
      const fetch = vi.fn(() => { throw new Error("No delivery/network permitted"); });
      vi.stubGlobal("fetch", fetch);
      const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
      const response: Response = Reflect.apply(POST, undefined, [request]);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
      expect(request.bodyUsed).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
      for (const log of logs) expect(log).not.toHaveBeenCalled();
    },
  );

  it("has no caller or environment switch that enables the Contact operation", async () => {
    vi.stubEnv("CONTACT_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CONTACT_ENABLED", "true");
    vi.stubEnv("EMAIL_PROVIDER", "untrusted");
    vi.stubEnv("VERCEL_ENV", "production");
    const request = new Request("https://msrc2027.com/api/contact?deliveryEnabled=true", {
      method: "POST", headers: { "content-type": "application/json", origin: "https://msrc2027.com" },
      body: JSON.stringify({ deliveryEnabled: true, topic: "general", to: "other@example.invalid" }),
    });
    const response: Response = Reflect.apply(POST, undefined, [request]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect(request.bodyUsed).toBe(false);
  });

  it("handles concurrent direct requests without collecting a body or invoking a provider", async () => {
    const read = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const requests = Array.from({ length: 30 }, () => ({ json: read, formData: read, text: read }));
    const responses = await Promise.all(requests.map(async (request) => {
      const response: Response = Reflect.apply(POST, undefined, [request]);
      return { status: response.status, result: await response.json() };
    }));
    expect(responses).toHaveLength(30);
    for (const response of responses) expect(response).toEqual({ status: 503, result: { state: "closed", code: "CONTACT_CLOSED" } });
    expect(read).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
