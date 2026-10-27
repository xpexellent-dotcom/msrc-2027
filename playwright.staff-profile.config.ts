import { defineConfig } from "@playwright/test";
import staffConfig from "./playwright.staff.config";

/** ENG-086: isolated synthetic presentation run; the incumbent suite stays default-off. */
const servers = Array.isArray(staffConfig.webServer) ? staffConfig.webServer : [staffConfig.webServer!];
export default defineConfig({
  ...staffConfig,
  testMatch: "participant-profile.spec.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-staff-profile-report" }]],
  outputDir: "test-results/staff-profile",
  webServer: servers.map((server) => ({ ...server, env: { ...server.env, PARTICIPANT_PROFILE_ENABLED: "true" } })),
});
