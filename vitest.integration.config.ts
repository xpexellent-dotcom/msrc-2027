import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { resolveLocalSupabaseConfig } from "./src/lib/supabase/config";

// This explicit command is the only test suite that loads local database settings.
// The ordinary unit suite and public-page build remain database-independent.
const localEnvironment = fileURLToPath(new URL("./.env.local", import.meta.url));
if (existsSync(localEnvironment)) loadEnvFile(localEnvironment);

// This suite deliberately tests denied writes and must never contact hosted data.
// Validate independently of the application factories before collecting any tests.
const target = process.env.NEXT_PUBLIC_SUPABASE_TARGET;
if (target && target !== "local") {
  throw new Error("Local fixture tests refuse hosted configuration. Use db:verify-hosted for a read-only hosted connection check.");
}
if (!resolveLocalSupabaseConfig({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})) {
  throw new Error("Local fixture tests require a running local Supabase stack and its loopback settings.");
}

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
    globalSetup: ["tests/integration/managed-fixtures.global-setup.ts"],
    hookTimeout: 15_000,
    testTimeout: 15_000,
  },
});
