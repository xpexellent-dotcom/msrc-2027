import { defineConfig, devices } from "@playwright/test";

// Synthetic credentials/codes belong only to test memory, never failure snapshots.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./tests/participant-e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"]],
  outputDir: "test-results/participant-accounts",
  use: { baseURL: "http://127.0.0.1:3216", trace: "off", screenshot: "off" },
  projects: [
    { name: "participant-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "participant-tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 791, height: 1000 } } },
    { name: "participant-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3216",
    url: "http://127.0.0.1:3216/en/sign-up",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true",
      PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40",
      PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
      PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only", VERCEL: "", VERCEL_ENV: "",
    },
  },
});
