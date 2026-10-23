import { defineConfig, devices } from "@playwright/test";

const states = [{ state: "published", port: 3231 }, { state: "empty", port: 3232 }, { state: "down", port: 3233 }] as const;
export default defineConfig({
  testDir: "./tests/content-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-content-report" }]], outputDir: "test-results/content",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  projects: states.flatMap(({ state, port }) => [
    { name: `content-${state}-desktop`, metadata: { state }, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` } },
    { name: `content-${state}-mobile`, metadata: { state }, use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${port}` } },
  ]),
  webServer: [
    { command: "node scripts/public-content-ui-provider.mjs", url: "http://127.0.0.1:3230/health", reuseExistingServer: false },
    ...states.map(({ state, port }) => ({
      command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}/en/speakers`, reuseExistingServer: false, timeout: 60_000,
      env: { VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", PUBLIC_CONTENT_TEST_MODE: "true", STAFF_PORTAL_ENABLED: "false",
        STAFF_SUPABASE_URL: "http://127.0.0.1:3230", STAFF_SUPABASE_SECRET_KEY: "sb_secret_public_content_mock_only", STAFF_EDITION_KEY: `synthetic-content-${state}` },
    })),
  ],
});
