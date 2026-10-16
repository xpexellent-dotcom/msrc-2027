import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";
import { isPrivatePage, privateContentSecurityPolicy } from "@/lib/content-security-policy";

describe("private CSP (SEC-01/06, ENG-045)", () => {
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
