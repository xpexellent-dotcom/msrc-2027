import { defineConfig, devices } from "@playwright/test";

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
