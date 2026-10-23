import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";
import { isCheckInPage, isMediaPage, isPrivatePage, mediaUploadOrigin, privateContentSecurityPolicy } from "@/lib/content-security-policy";

afterEach(() => vi.unstubAllEnvs());

describe("private CSP (SEC-01/06, ENG-045)", () => {
  it("adds the fixed test Storage origin only to exact bilingual media documents", () => {
    vi.stubEnv("STAFF_PORTAL_ENABLED", "true"); vi.stubEnv("STAFF_PORTAL_TEST_MODE", "true");
    vi.stubEnv("STAFF_SUPABASE_URL", "http://127.0.0.1:3220");
    for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_TARGET_ENV"]) vi.stubEnv(key, "");
    for (const path of ["/en/staff/content", "/ar/staff/content/", "/%65n/staff/content"]) {
      expect(isMediaPage(path)).toBe(true);
      const policy = proxy(new NextRequest("http://localhost" + path)).headers.get("content-security-policy")!;
      expect(policy).toContain("connect-src 'self' http://127.0.0.1:3220;");
      expect(policy).toContain("img-src 'self' data:;");
    }
    for (const path of ["/en/staff", "/ar/staff/people", "/en/staff/content-other", "/en/staff/content/extra", "/en/sign-in"]) {
      expect(isMediaPage(path)).toBe(false);
      expect(proxy(new NextRequest("http://localhost" + path)).headers.get("content-security-policy")).toContain("connect-src 'self';");
    }
  });
  it("keeps upload access closed outside the staff production or fixed local test boundary", () => {
    const production = { STAFF_PORTAL_ENABLED: "true", VERCEL: "1", VERCEL_ENV: "production", STAFF_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co" };
    expect(mediaUploadOrigin(production)).toBe(production.STAFF_SUPABASE_URL);
    for (const override of [{ STAFF_PORTAL_ENABLED: "false" }, { VERCEL_ENV: "preview" }, { VERCEL: "" }, { STAFF_PORTAL_TEST_MODE: "true" }, { STAFF_SUPABASE_URL: "https://another.supabase.co" }, { STAFF_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co.attacker.invalid" }]) {
      expect(mediaUploadOrigin({ ...production, ...override })).toBeUndefined();
    }
    const local = { STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_SUPABASE_URL: "http://127.0.0.1:3220" };
    expect(mediaUploadOrigin(local)).toBe(local.STAFF_SUPABASE_URL);
    for (const override of [{ VERCEL_URL: "preview.invalid" }, { VERCEL_TARGET_ENV: "preview" }, { STAFF_SUPABASE_URL: "http://localhost:3220" }, { STAFF_SUPABASE_URL: "http://127.0.0.1:3221" }]) expect(mediaUploadOrigin({ ...local, ...override })).toBeUndefined();
  });
  it.each(["https://allowed.supabase.co; script-src *", "https://allowed.supabase.co/path", "https://allowed.supabase.co.attacker.invalid", "http://allowed.supabase.co", "https://user@allowed.supabase.co", "https://allowed.supabase.co:444", "http://127.0.0.1:3221"])("does not interpolate an unsafe upload origin: %s", (origin) => {
    expect(privateContentSecurityPolicy("synthetic-nonce", false, origin)).toContain("connect-src 'self';");
  });
  it("allows same-origin camera and wake lock only on exact bilingual scanner documents", () => {
    for (const path of ["/en/staff/check-in", "/ar/staff/check-in/", "/%65n/staff/check-in"]) {
      expect(isCheckInPage(path)).toBe(true);
      expect(proxy(new NextRequest("http://localhost" + path)).headers.get("permissions-policy"))
        .toBe("camera=(self), microphone=(), geolocation=(), screen-wake-lock=(self)");
    }
    for (const path of ["/en", "/en/staff", "/en/staff/check-in-other", "/en/staff/check-in/extra", "/api/staff-portal"]) {
      expect(isCheckInPage(path)).toBe(false);
      expect(proxy(new NextRequest("http://localhost" + path)).headers.get("permissions-policy")).toBeNull();
    }
  });
  it.each(["staff", "staff/people", "staff/sign-in", "staff/future/route", "sign-in", "sign-up", "forgot-password", "reset-password", "verify-email", "my-msrc", "my-msrc/future", "registration", "staff-security-preview"])("protects EN/AR %s", (path) => {
    for (const locale of ["en", "ar"]) expect(isPrivatePage(`/${locale}/${path}`)).toBe(true);
  });
  it.each(["/en", "/ar/program", "/en/staffing", "/en/registration-information", "/en/media", "/api/staff-portal", "/en/sign-instructions", "/media/file.mp4", "/en/privacy"])("preserves public/API policy at %s", (path) => {
    expect(isPrivatePage(path)).toBe(false);
  });
  it.each(["/%65n/sign-in", "/%61r/registration", "/%65n/staff/people", "/%61r/my-msrc", "/%65n/staff/%invalid"])("protects encoded locale paths at %s", (path) => {
    expect(isPrivatePage(path)).toBe(true);
  });
  it("uses no production script exception or third-party origin", () => {
    const policy = privateContentSecurityPolicy("synthetic-nonce", false);
    expect(policy).toContain("script-src 'nonce-synthetic-nonce' 'strict-dynamic';");
    expect(policy).toContain("style-src 'self' 'nonce-synthetic-nonce';");
    expect(policy).not.toMatch(/script-src[^;]*unsafe/);
    expect(policy).not.toMatch(/https?:|wss?:|blob:/);
    for (const directive of ["connect-src 'self'", "img-src 'self' data:", "font-src 'self'", "media-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "upgrade-insecure-requests"]) expect(policy).toContain(directive);
  });
  it("relaxes eval/styles only in development and avoids upgrading loopback HTTP", () => {
    const policy = privateContentSecurityPolicy("synthetic-nonce", true);
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline';");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
  it("overwrites untrusted request headers and propagates a fresh nonce to Next and the response", () => {
    const request = new NextRequest("http://localhost/ar/sign-up", { headers: { "x-nonce": "forged", "content-security-policy": "script-src 'nonce-forged'", "x-msrc-locale": "en" } });
    const response = proxy(request);
    const policy = response.headers.get("content-security-policy")!;
    expect(policy).not.toContain("forged");
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    const nonce = response.headers.get("x-middleware-request-x-nonce")!;
    expect(Buffer.from(nonce, "base64").toString()).toMatch(/^[0-9a-f-]{36}$/);
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get("x-middleware-request-x-msrc-locale")).toBe("ar");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(proxy(request).headers.get("content-security-policy")).not.toBe(policy);
  });
  it("strips incoming CSP/nonces on public pages without adding a nonce policy", () => {
    const response = proxy(new NextRequest("http://localhost/en/program", { headers: { "x-nonce": "forged", "content-security-policy": "script-src 'nonce-forged'", "x-msrc-locale": "ar" } }));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-msrc-locale")).toBe("en");
  });
});
