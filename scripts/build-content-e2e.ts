// Builds one prerendered app per synthetic content state for playwright.content.config.ts.
// Usage: node scripts/build-content-e2e.ts   (then: pnpm exec playwright test --config playwright.content.config.ts)
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { contentE2eEnv, contentE2eStates } from "./content-e2e-env.ts";

// A custom distDir makes `next build` rewrite these two tracked files; restore them afterwards.
const tracked = ["tsconfig.json", "next-env.d.ts"].map((path) => ({ path, text: readFileSync(path, "utf8") }));
const provider = spawn(process.execPath, ["scripts/public-content-ui-provider.mjs"], { stdio: "inherit" });
let exitCode = 1;
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch("http://127.0.0.1:3230/health")).ok) break; } catch { /* not listening yet */ }
    if (attempt > 100) throw new Error("Synthetic content provider did not start.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Sequential: the builds share next-env.d.ts and tsconfig.json.
  for (const { state } of contentE2eStates) {
    console.log(`Building content e2e state: ${state}`);
    const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"],
      { stdio: "inherit", env: { ...process.env, ...contentE2eEnv(state) } });
    if (build.status !== 0) throw new Error(`Content e2e build failed for ${state}.`);
  }
  exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  provider.kill();
  for (const { path, text } of tracked) writeFileSync(path, text);
}
process.exitCode = exitCode;
