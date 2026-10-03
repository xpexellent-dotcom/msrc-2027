import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/preview.server", () => ({ authPreview: { execute } }));
import { GET, POST } from "@/app/api/auth-preview/route";

function request(body: unknown = { action: "start", kind: "staff" }, headers: Record<string, string> = {}) {
  return new NextRequest("http://127.0.0.1:3211/api/auth-preview", {
    method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { host: "127.0.0.1:3211", origin: "http://127.0.0.1:3211", "content-type": "application/json", ...headers },
  });
}

beforeEach(() => {
  vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic"); vi.stubEnv("VERCEL_ENV", "");
  execute.mockReset(); execute.mockResolvedValue({ state: "ok", code: "started", token: "opaque-synthetic-cookie" });
});

describe("closed authentication transport", () => {
  it("keeps session token out of JSON and scopes its HttpOnly cookie", async () => {
    const output = await POST(request());
    expect(output.status).toBe(200); expect(await output.json()).toEqual({ state: "ok", code: "started" });
    const cookie = output.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=strict"); expect(cookie).toContain("Path=/api/auth-preview");
    expect(output.headers.get("cache-control")).toContain("no-store");
    expect(execute).toHaveBeenCalledWith(null, { type: "start", kind: "staff" });
  });
  it.each(["staff", "super_admin", "participant"] as const)("accepts the exact %s synthetic identity without role grants", async (kind) => {
    const output = await POST(request({ action: "start", kind }));
    expect(output.status).toBe(200);
    expect(execute).toHaveBeenCalledExactlyOnceWith(null, { type: "start", kind });
  });
  it.each(["production", "preview", "development"])("rejects %s without invoking synthetic or live provider", async (value) => {
    vi.stubEnv("VERCEL_ENV", value);
    expect((await POST(request())).status).toBe(404); expect(execute).not.toHaveBeenCalled();
    expect((await GET(new NextRequest("http://127.0.0.1:3211/api/auth-preview", { headers: { host: "127.0.0.1:3211" } }))).status).toBe(404);
  });
  const foreignOrigins: Record<string, string>[] = [{ origin: "http://evil.test" }, { origin: "http://localhost:3211" }, { origin: "https://127.0.0.1:3211" }, { origin: "" }, { "sec-fetch-site": "cross-site" }];
  it.each(foreignOrigins)("rejects foreign/missing Origin %j", async (headers) => {
    expect((await POST(request(undefined, headers))).status).toBe(403); expect(execute).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { action: "start", kind: "superAdmin" }, { action: "start", kind: ["staff"] }, { action: "status", actorId: "another" }, { action: "verify", code: "12345" }, { action: "verify-email", code: "123456", phone: "+15550000000" }, { action: "challenge-email", email: "caller@example.invalid" }, { action: "verify-email", code: "123456", staffEmailVerified: true }, { action: "verify-email", code: "123456", sessionId: "other-session" }, { action: "start", kind: "staff", password: "synthetic-untrusted" }, { action: "verify", code: "123456", timestamp: 0 }, "{broken", "x".repeat(513)])("rejects malformed or overposted action %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(execute).not.toHaveBeenCalled();
  });
  it.each(["verify", "verify-email"] as const)("accepts exact %s code action without caller identity, password or destination", async (action) => {
    await POST(request({ action, code: "123456" }));
    expect(execute).toHaveBeenCalledExactlyOnceWith(null, { type: action, code: "123456" });
  });
  it("accepts a synthetic email challenge through the same local-only boundary", async () => {
    await POST(request({ action: "challenge-email" }));
    expect(execute).toHaveBeenCalledExactlyOnceWith(null, { type: "challenge-email" });
  });
  it.each(["simulate-email-change", "simulate-role-revocation"] as const)("accepts the exact local %s control without a caller identity", async (action) => {
    await POST(request({ action }, { cookie: "msrc-synthetic-session=opaque" }));
    expect(execute).toHaveBeenCalledExactlyOnceWith("opaque", { type: action });
  });
  it("returns generic denied assurance without redirecting or mutating a cookie", async () => {
    execute.mockResolvedValue({ state: "denied", code: "staff_email_check_required" });
    const output = await POST(request({ action: "protected" }, { cookie: "msrc-synthetic-session=opaque" }));
    expect(output.status).toBe(403);
    expect(await output.json()).toEqual({ state: "denied", code: "staff_email_check_required" });
    expect(output.headers.get("set-cookie")).toBeNull();
    expect(output.headers.get("location")).toBeNull();
  });
  it("rejects non-JSON", async () => {
    expect((await POST(request({ action: "status" }, { "content-type": "text/plain" }))).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
  it("sanitizes exceptions without provider details", async () => {
    execute.mockRejectedValue(new Error("secret-provider-detail"));
    const output = await POST(request()); expect(output.status).toBe(503);
    expect(await output.json()).toEqual({ state: "unavailable", code: "unavailable" });
  });
  it("logout clears only the synthetic cookie", async () => {
    execute.mockResolvedValue({ state: "ok", code: "logged_out" });
    const output = await POST(request({ action: "logout" }, { cookie: "msrc-synthetic-session=opaque" }));
    expect(execute).toHaveBeenCalledWith("opaque", { type: "logout" });
    expect(output.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
