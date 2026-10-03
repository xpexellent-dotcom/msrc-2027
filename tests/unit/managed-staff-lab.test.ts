import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createManagedStaffLab, isManagedStaffLabBoundary } from "@/features/auth/managed-staff-lab.server";
import { renderCiManagedAuthConfig } from "../../scripts/prepare-ci-managed-auth";

const runner = { GITHUB_ACTIONS: "true", RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_REPOSITORY: "xpexellent-dotcom/msrc-2027", NEXT_PUBLIC_SUPABASE_TARGET: "local",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_local" };
const configuration = renderCiManagedAuthConfig(readFileSync("supabase/config.toml", "utf8"), runner);
const fixture = { environment: runner, platform: "linux", configuration, linked: false };

describe("managed staff HTTP lab isolation boundary", () => {
  it("accepts only the explicit unlinked loopback GitHub-hosted fixture", () => {
    expect(isManagedStaffLabBoundary(fixture)).toBe(true);
  });
  for (const [name, value] of [
    ["GITHUB_ACTIONS", "false"], ["RUNNER_ENVIRONMENT", "self-hosted"], ["GITHUB_REPOSITORY", "other/repository"],
    ["SUPABASE_PROJECT_REF", "production"], ["SUPABASE_PROJECT_ID", "linked"],
    ["NEXT_PUBLIC_SUPABASE_TARGET", "hosted"], ["NEXT_PUBLIC_SUPABASE_URL", "https://unapproved.supabase.co"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:9999"], ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "service-role-secret"],
    ["VERCEL", "1"], ["VERCEL_ENV", "preview"], ["VERCEL_TARGET_ENV", "production"], ["VERCEL_URL", "preview.example"],
    ["NEXT_PUBLIC_VERCEL_ENV", "preview"], ["VERCEL", ""], ["GOTRUE_SMTP_HOST", "unapproved.example"],
    ["SUPABASE_AUTH_EMAIL_SMTP_HOST", "unapproved.example"], ["GOTRUE_SMS_PROVIDER", "unapproved"],
    ["SUPABASE_AUTH_HOOK_SEND_EMAIL_URI", "https://unapproved.example"], ["GOTRUE_EXTERNAL_EMAIL_ENABLED", "true"],
  ]) it(`denies ${name}=${value} before any managed request`, () => {
    expect(isManagedStaffLabBoundary({ ...fixture, environment: { ...runner, [name]: value } })).toBe(false);
  });
  it("denies Windows/local hosts, linked state, global signup, delivery hooks and enabled Storage", () => {
    expect(isManagedStaffLabBoundary({ ...fixture, platform: "win32" })).toBe(false);
    expect(isManagedStaffLabBoundary({ ...fixture, linked: true })).toBe(false);
    for (const replacement of [
      configuration.replace('project_id = "msrc2027-local"', 'project_id = "other"'),
      configuration.replace("enable_signup = false", "enable_signup = true"),
      configuration.replace("pg-functions://postgres/msrc_ci_auth/reject_email", "https://unapproved.example"),
      configuration.replace(/\[storage\]\r?\nenabled = false/, "[storage]\nenabled = true"),
      configuration + "\n[auth.mfa.phone]\nenroll_enabled = true\n",
    ]) expect(isManagedStaffLabBoundary({ ...fixture, configuration: replacement })).toBe(false);
  });
  it("cannot instantiate a managed HTTP lab outside the real runner by injecting clients", () => {
    vi.stubEnv("GITHUB_ACTIONS", "false");
    const network = vi.fn(() => { throw new Error("No provider request may run."); });
    expect(() => createManagedStaffLab({ origin: "http://127.0.0.1:3000", editionKey: "synthetic-unit",
      allowedEmails: ["staff@example.invalid"], client: network,
      store: { begin: network, delivery: network, consume: network }, deliver: network, secret: "a".repeat(64) })).toThrow();
    expect(network).not.toHaveBeenCalled();
  });
});
