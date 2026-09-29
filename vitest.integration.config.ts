import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// This explicit command is the only test suite that loads local database settings.
// The ordinary unit suite and public-page build remain database-independent.
const localEnvironment = fileURLToPath(new URL("./.env.local", import.meta.url));
if (existsSync(localEnvironment)) loadEnvFile(localEnvironment);

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next enforces these application-layer markers at build time. Both factory
      // implementations are exercised from this Node integration-test process.
      "server-only": fileURLToPath(new URL("./tests/integration/client-boundary.ts", import.meta.url)),
      "client-only": fileURLToPath(new URL("./tests/integration/client-boundary.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    hookTimeout: 15_000,
    testTimeout: 15_000,
  },
});
