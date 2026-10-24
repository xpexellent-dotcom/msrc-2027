import { defineConfig, devices } from "@playwright/test";

/** CRT-01..06 UI composition only. Synthetic providers do not prove database authorization. */
export default defineConfig({
  testDir: "./tests/certificates-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 2,
  reporter: [["list"]], outputDir: "test-results/certificates",
  use: { baseURL: "http://127.0.0.1:3216", trace: "off", screenshot: "only-on-failure" },
  projects: [
    { name: "certificates-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "certificates-mobile-360", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } } },
  ],
  webServer: [
    { command: "node scripts/certificates-ui-provider.mjs", url: "http://127.0.0.1:3218/health", reuseExistingServer: false, env: { VERCEL: "", VERCEL_ENV: "" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3216", url: "http://127.0.0.1:3216/en", reuseExistingServer: false, timeout: 60_000,
      env: { VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", CERTIFICATES_ENABLED: "true",
        PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
        PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40",
        PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
        PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only" } },
    { command: "node scripts/staff-ui-provider.mjs", url: "http://127.0.0.1:3220/health", reuseExistingServer: false },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3219", url: "http://127.0.0.1:3219/en/staff/sign-in", reuseExistingServer: false, timeout: 60_000,
      env: { VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", CERTIFICATES_ENABLED: "true",
        STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
        STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
        STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" } },
  ],
});
