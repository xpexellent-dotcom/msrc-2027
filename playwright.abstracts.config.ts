import { defineConfig, devices } from "@playwright/test";
const baseURL = "http://127.0.0.1:3216";
export default defineConfig({
  testDir: "./tests/abstracts-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 2,
  reporter: [["list"]], outputDir: "test-results/abstract-submissions", use: { baseURL, trace: "off", screenshot: "off" },
  projects: [{ name: "abstracts-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "abstracts-mobile-360", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } } }],
  webServer: [
    { command: "node scripts/abstracts-ui-provider.mjs", url: "http://127.0.0.1:3218/health", reuseExistingServer: false, env: { VERCEL: "", VERCEL_ENV: "" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3216", url: baseURL + "/en/abstracts", reuseExistingServer: false, timeout: 60_000,
      env: { VERCEL: "", VERCEL_ENV: "", ABSTRACT_SUBMISSIONS_ENABLED: "true", PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true",
        PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40",
        PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only" } },
  ],
});
