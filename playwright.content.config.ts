import { defineConfig, devices } from "@playwright/test";
import { contentE2eEnv, contentE2eStates } from "./scripts/content-e2e-env.ts";

// Run `node scripts/build-content-e2e.ts` first: each state serves its own prerendered build.
export default defineConfig({
  testDir: "./tests/content-e2e", fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-content-report" }]], outputDir: "test-results/content",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  projects: contentE2eStates.flatMap(({ state, port }) => [
    { name: `content-${state}-desktop`, metadata: { state }, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` } },
    { name: `content-${state}-mobile`, metadata: { state }, use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${port}` } },
  ]),
  webServer: [
    { command: "node scripts/public-content-ui-provider.mjs", url: "http://127.0.0.1:3230/health", reuseExistingServer: false },
    ...contentE2eStates.map(({ state, port }) => ({
      command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}/en/speakers`, reuseExistingServer: false, timeout: 60_000,
      env: contentE2eEnv(state),
    })),
  ],
});
