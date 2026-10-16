import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.REAL_USER_BASE_URL ?? "https://127.0.0.1:3220";
const remote = new URL(baseURL).hostname !== "127.0.0.1";
const mobileAgents = {
  instagram: "Instagram 403.0.0.0.0",
  whatsapp: "WhatsApp/2.26.20",
  snapchat: "Snapchat/13.60.0.0",
  x: "Twitter for iPhone/10.100",
  linkedin: "LinkedInApp/9.35.0",
};

// Engine/device emulation, including UA compatibility probes. These are not
// physical devices, shipping Safari, or the social apps' embedded webviews.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "real-user-*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 2,
  timeout: 45_000,
  outputDir: "test-results/real-user",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/real-user", open: "never" }]],
  use: { baseURL, ignoreHTTPSErrors: !remote, timezoneId: "Asia/Riyadh", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chrome-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "android-chromium", use: { ...devices["Pixel 7"] } },
    { name: "safari-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
    { name: "ipad-webkit", use: { ...devices["iPad (gen 7)"] } },
    ...Object.entries(mobileAgents).flatMap(([app, suffix]) => [
      { name: `${app}-ios-ua`, testMatch: "real-user-discovery.spec.ts", use: { ...devices["iPhone 13"], userAgent: `${devices["iPhone 13"].userAgent} ${suffix}` } },
      { name: `${app}-android-ua`, testMatch: "real-user-discovery.spec.ts", use: { ...devices["Pixel 7"], userAgent: `${devices["Pixel 7"].userAgent} ${suffix.replace("iPhone", "Android")}` } },
    ]),
  ],
  webServer: remote ? undefined : {
    command: "node scripts/real-user-test-server.ts",
    url: `${baseURL}/en`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: process.env.REAL_USER_REUSE_SERVER === "1",
    timeout: 60_000,
    env: { DESIGN_PREVIEW_ENABLED: "true", LOCAL_MEDIA_PREVIEW_ENABLED: "true", VERCEL_ENV: "preview" },
  },
});
