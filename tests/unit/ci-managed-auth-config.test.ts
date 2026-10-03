import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderCiManagedAuthConfig } from "../../scripts/prepare-ci-managed-auth";

const configuration = readFileSync("supabase/config.toml", "utf8");
const runner = { GITHUB_ACTIONS: "true", RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_REPOSITORY: "xpexellent-dotcom/msrc-2027" };

describe("disposable managed Auth configuration boundary", () => {
  it("keeps global signup closed while configuring only no-delivery private test hooks", () => {
    const generated = renderCiManagedAuthConfig(configuration, runner);
    expect(generated.split("[auth]")[1].split("[auth.email]")[0]).toContain("enable_signup = false");
    expect(generated).toContain("pg-functions://postgres/msrc_ci_auth/capture_sms");
    expect(generated).toContain("pg-functions://postgres/msrc_ci_auth/reject_email");
    expect(generated.match(/\[auth\.sms\.(twilio|twilio_verify|messagebird|vonage|textlocal)\]/g)).toEqual(["[auth.sms.vonage]"]);
    expect(generated).toContain('api_key = "synthetic-unusable-api-key"');
    expect(generated).toContain('api_secret = "synthetic-unusable-api-secret"');
    expect(generated).toContain('from = "CI NO DELIVERY"');
    expect(generated).toMatch(/\[auth\.hook\.send_sms\]\r?\nenabled = true/);
    expect(generated).toMatch(/\[auth\.hook\.send_email\]\r?\nenabled = true/);
  });
  for (const [name, value] of [
    ["GITHUB_ACTIONS", "false"], ["RUNNER_ENVIRONMENT", "self-hosted"],
    ["GITHUB_REPOSITORY", "other/repository"], ["SUPABASE_PROJECT_REF", "ecemjggwlzqpjcwmchrl"],
    ["SUPABASE_PROJECT_ID", "unexpected"], ["NEXT_PUBLIC_SUPABASE_TARGET", "hosted"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://ecemjggwlzqpjcwmchrl.supabase.co"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:9999"],
    ["SUPABASE_AUTH_SMS_VONAGE_API_KEY", "unapproved-override"],
    ["GOTRUE_SMS_PROVIDER", "unapproved-override"],
    ["GOTRUE_HOOK_SEND_SMS_ENABLED", "false"],
  ]) it(`rejects ${name} outside the disposable runner boundary (${value})`, () => {
    expect(() => renderCiManagedAuthConfig(configuration, { ...runner, [name]: value })).toThrow();
  });
  it("rejects unexpected stack identity, open global signup and pre-existing provider/hook configuration", () => {
    expect(() => renderCiManagedAuthConfig(configuration.replace('project_id = "msrc2027-local"', 'project_id = "other"'), runner)).toThrow();
    expect(() => renderCiManagedAuthConfig(configuration.replace("enable_signup = false", "enable_signup = true"), runner)).toThrow();
    expect(() => renderCiManagedAuthConfig(configuration + "\n[auth.sms.twilio]\nenabled = true", runner)).toThrow();
    expect(() => renderCiManagedAuthConfig(renderCiManagedAuthConfig(configuration, runner), runner)).toThrow();
  });
});
