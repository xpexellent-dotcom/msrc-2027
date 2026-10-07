import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3219";
export default defineConfig({
  testDir: "./tests/staff-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-staff-report" }]],
  outputDir: "test-results/staff", use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "staff-desktop", use: { ...devices["Desktop Chrome"] } }, { name: "staff-mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    { command: "node scripts/staff-ui-provider.mjs", url: "http://127.0.0.1:3220/health", reuseExistingServer: false },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3219", url: `${baseURL}/en/staff/sign-in`, reuseExistingServer: false, timeout: 60_000,
      env: { VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
        STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" } },
  ],
});
