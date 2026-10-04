import { defineConfig, devices } from "@playwright/test";

// The harness supplies isolated dummy configuration, local fake provider/RPCs,
// and enabled/closed Next processes. It never contacts a managed service.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "contact-delivery.spec.ts",
  outputDir: "test-contact-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-contact-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3212",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "contact-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "contact-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node scripts/contact-test-server.ts",
    url: "http://127.0.0.1:3212/en/contact",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
