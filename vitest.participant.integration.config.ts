import { defineConfig } from "vitest/config";
import base from "./vitest.integration.config";

// Independent disposable stack/job: no shared staff fixture or PR37 CI changes.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["tests/participant-native/**/*.test.ts"],
    globalSetup: ["tests/participant-native/setup.ts"],
  },
});
