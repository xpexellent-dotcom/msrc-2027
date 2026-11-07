import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3240";
export default defineConfig({
  testDir: "./tests/home-preview-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-home-preview-report" }]],
  outputDir: "test-results/home-preview",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "home-preview-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "home-preview-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3240", url: `${baseURL}/en`, reuseExistingServer: false, timeout: 60_000,
    env: { MSRC_PREVIEW_PLACEHOLDERS: "true", VERCEL: "", VERCEL_ENV: "", MSRC_HOME_PREVIEW_DIST_DIR: ".next/home-preview" },
  },
});
