import { describe, expect, it, vi } from "vitest";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";

describe("local synthetic authentication gate", () => {
  it.each(["production", "preview", "development"])("denies deployment environment %s even with opt-in", (environment) => {
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    vi.stubEnv("VERCEL_ENV", environment);
    expect(isAuthPreviewAllowed(new Headers({ host: "127.0.0.1:3000" }))).toBe(false);
  });
  it("requires exact server opt-in", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "true");
    expect(isAuthPreviewAllowed(new Headers({ host: "localhost:3000" }))).toBe(false);
  });
  it.each(["localhost:3000", "127.0.0.1:3210"])("accepts explicitly enabled local build on %s", (host) => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    expect(isAuthPreviewAllowed(new Headers({ host }))).toBe(true);
  });
  it.each(["evil.test", "localhost.evil.test", "127.0.0.1.evil.test", ""])("rejects non-loopback host %s", (host) => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    expect(isAuthPreviewAllowed(new Headers({ host }))).toBe(false);
  });
  it.each(["x-forwarded-host", "x-forwarded-for"])("rejects proxy header %s", (name) => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic");
    expect(isAuthPreviewAllowed(new Headers({ host: "localhost:3000", [name]: "evil.test" }))).toBe(false);
  });
});
