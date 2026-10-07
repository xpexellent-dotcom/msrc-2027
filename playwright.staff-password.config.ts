import { defineConfig } from "@playwright/test";
import staffConfig from "./playwright.staff.config";

const gate = process.env.STAFF_PASSWORD_UI_GATE ?? "enabled";
if (!["enabled", "server-closed", "database-closed"].includes(gate)) throw new Error("Unknown synthetic password-change gate mode.");
const servers = Array.isArray(staffConfig.webServer) ? staffConfig.webServer : [staffConfig.webServer!];
export default defineConfig({
  ...staffConfig,
  testDir: "./tests/staff-password-e2e",
  testMatch: gate === "enabled" ? "password-change.spec.ts" : "password-change-closed.spec.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: `playwright-staff-password-report/${gate}` }]],
  outputDir: `test-results/staff-password/${gate}`,
  webServer: servers.map((server, index) => ({ ...server, env: { ...server.env,
    ...(index === 0 ? { STAFF_PASSWORD_UI_PROVIDER_ENABLED: gate !== "database-closed" ? "true" : "false" }
      : { STAFF_PASSWORD_CHANGE_ENABLED: gate !== "server-closed" ? "true" : "false" }) } })),
});
