import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3210";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-tablet",
      testMatch: ["public-shell.spec.ts", "about.spec.ts", "dates-venue.spec.ts", "countdown.spec.ts"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 791, height: 1000 } },
    },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Launch Next directly so Windows teardown owns one Node process tree.
    command: "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3210",
    url: `${baseURL}/en`,
    reuseExistingServer: false,
    timeout: 60_000,
    // This local production-build process explicitly enables the synthetic
    // showcase. The deployment-production guard is covered separately.
    // Unpublished real-media routes must stay closed in a production build,
    // even when an operator mistakenly leaves the local-review flag enabled.
    env: { DESIGN_PREVIEW_ENABLED: "true", LOCAL_MEDIA_PREVIEW_ENABLED: "true", VERCEL_ENV: "preview" },
  },
});
