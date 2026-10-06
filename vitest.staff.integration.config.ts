import { defineConfig } from "vitest/config";
import base from "./vitest.integration.config";

/** Dedicated, unlinked disposable stack. Never reads a hosted key or sends email. */
export default defineConfig({
  ...base,
  test: { ...base.test, include: ["tests/staff-native/**/*.test.ts"], globalSetup: ["tests/participant-native/setup.ts"] },
});
