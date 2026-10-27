import { defineConfig, devices } from "@playwright/test";

/** ENG-086: isolated browser presentation fixtures; feature remains off by default. */
export default defineConfig({
  testDir: "./tests/profile-e2e", fullyParallel: true, retries: 0,
  forbidOnly: Boolean(process.env.CI), workers: process.env.CI ? 1 : 2, reporter: [["list"]],
  outputDir: "test-results/participant-profile",
  use: { baseURL: "http://127.0.0.1:3216", trace: "off", screenshot: "off", reducedMotion: "reduce" },
  projects: [
    { name: "profile-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "profile-mobile", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3216",
    url: "http://127.0.0.1:3216/en/my-msrc", reuseExistingServer: false, timeout: 60_000,
    env: {
      PARTICIPANT_PROFILE_ENABLED: "true", PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true",
      PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40",
      PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only",
      PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only", VERCEL: "", VERCEL_ENV: "",
    },
  },
});
