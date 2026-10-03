import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** This is disposable runner configuration, never an approved live OTP policy. */
export function renderCiManagedAuthConfig(configuration: string, environment: Readonly<Record<string, string | undefined>>): string {
  if (environment.GITHUB_ACTIONS !== "true"
    || environment.RUNNER_ENVIRONMENT !== "github-hosted"
    || environment.GITHUB_REPOSITORY !== "xpexellent-dotcom/msrc-2027"
    || environment.SUPABASE_PROJECT_ID || environment.SUPABASE_PROJECT_REF
    || (environment.NEXT_PUBLIC_SUPABASE_TARGET && environment.NEXT_PUBLIC_SUPABASE_TARGET !== "local")
    || (environment.NEXT_PUBLIC_SUPABASE_URL && environment.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
    || Object.keys(environment).some((name) => /^(SUPABASE_AUTH_SMS_|GOTRUE_SMS_|GOTRUE_HOOK_SEND_)/.test(name) && environment[name])
    || !/^project_id = "msrc2027-local"$/m.test(configuration)
    || !/^enable_signup = false$/m.test(configuration.split("[auth]")[1]?.split("[auth.email]")[0] ?? "")
    || !/\[auth.email\]\r?\nenable_signup = false(?:\r?\n|$)/.test(configuration)
    || /\[auth\.(sms|mfa|hook)(?:\.|\])/.test(configuration)) {
    throw new Error("Managed Auth fixtures require the unlinked disposable MSRC GitHub runner stack.");
  }
  // The CLI calls these provider enable switches `enable_signup`; global signup
  // remains FALSE. Only SQL-created synthetic identities can sign in on the runner.
  return configuration.replace(/\[auth.email\]\r?\nenable_signup = false/, "[auth.email]\nenable_signup = true") + `

# CI ONLY: no live delivery credentials, real phone/email or hosted project.
# One-second resend spacing accelerates isolated tests; it is not live approval.
[auth.sms]
enable_signup = true
enable_confirmations = true
max_frequency = "1s"

[auth.sms.test_otp]
# Primary phone verification only; MFA still uses genuine generated hook codes.
"966500000911" = "123456"

# CLI v2.118.0 resolveAuthSms forces the phone flag FALSE without a named provider,
# even with test_otp and a SendSMS hook. These deliberately unusable values ONLY
# satisfy that resolver; they are not vendor approval or a provider connection.
# GoTrue v2.197.0 invokes the forced private hook with no provider fallback.
[auth.sms.vonage]
enabled = true
api_key = "synthetic-unusable-api-key"
api_secret = "synthetic-unusable-api-secret"
from = "CI NO DELIVERY"

[auth.mfa.phone]
enroll_enabled = true
verify_enabled = true
otp_length = 6
max_frequency = "1s"

[auth.hook.send_sms]
enabled = true
uri = "pg-functions://postgres/msrc_ci_auth/capture_sms"

[auth.hook.send_email]
enabled = true
uri = "pg-functions://postgres/msrc_ci_auth/reject_email"
`;
}

function run(): void {
  const directory = fileURLToPath(new URL("../", import.meta.url));
  if (process.platform !== "linux" || existsSync(resolve(directory, "supabase/.temp/project-ref"))) {
    throw new Error("Managed Auth fixtures refuse this host or a linked project.");
  }
  const path = resolve(directory, "supabase/config.toml");
  const updated = renderCiManagedAuthConfig(readFileSync(path, "utf8"), process.env);
  writeFileSync(path, updated);
  process.stdout.write("Prepared disposable loopback Auth hooks; no live provider or signup enabled.\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) run();
