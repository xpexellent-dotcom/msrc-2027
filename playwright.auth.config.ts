import { defineConfig, devices } from "@playwright/test";

// Installed Playwright 1.63's _takePageSnapshot honors this switch. Synthetic
// inbox codes must not enter automatic failure aria snapshots/error-context files.
// It is scoped to this authentication runner; public-browser diagnostics are unchanged.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "staff-security.spec.ts",
  outputDir: "test-auth-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { outputFolder: "playwright-auth-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3211", trace: "off", screenshot: "off" },
  projects: [
    { name: "auth-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "auth-tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 791, height: 1000 } } },
    { name: "auth-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3211",
    url: "http://127.0.0.1:3211/en/staff-security-preview",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { MSRC_AUTH_PREVIEW: "synthetic", VERCEL_ENV: "", NEXT_PUBLIC_SUPABASE_TARGET: "", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
  },
});
