import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3224";

// Exercise the real production-only SDK injection under CSP without telemetry.
// All provider script responses are replaced by local presentation fixtures.
export default defineConfig({
  testDir: "./tests/csp-observability-e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results/csp-observability",
  use: { baseURL, trace: "off", screenshot: "off" },
  projects: [{ name: "csp-production-observability", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3224",
    url: `${baseURL}/en/sign-in`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VERCEL_ENV: "production", PARTICIPANT_ACCOUNTS_ENABLED: "false", STAFF_PORTAL_ENABLED: "false" },
  },
});
