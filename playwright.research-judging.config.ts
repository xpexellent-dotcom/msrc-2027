import { defineConfig, devices } from "@playwright/test";
const baseURL = "http://127.0.0.1:3219";
const env = { VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", RESEARCH_JUDGING_ENABLED: "true", STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40", PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40", PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only" };
export default defineConfig({
  testDir: "./tests/research-judging-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 2,
  reporter: [["list"]], outputDir: "test-results/research-judging", use: { baseURL, trace: "off", screenshot: "only-on-failure" },
  projects: [{ name: "research-judging-desktop", use: { ...devices["Desktop Chrome"] } }, { name: "research-judging-mobile", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } } }],
  webServer: [
    { command: "node scripts/research-judging-ui-provider.mjs", url: "http://127.0.0.1:3220/health", reuseExistingServer: false, env: { VERCEL: "", VERCEL_ENV: "" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3219", url: baseURL + "/en/staff/sign-in", reuseExistingServer: false, timeout: 60_000, env },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3216", url: "http://127.0.0.1:3216/en/my-msrc/research", reuseExistingServer: false, timeout: 60_000, env: { ...env, RESEND_API_KEY: "re_participant_mock_only" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3188", url: "http://127.0.0.1:3188/en", reuseExistingServer: false, timeout: 60_000, env: { ...env, RESEARCH_JUDGING_ENABLED: "" } },
  ],
});
