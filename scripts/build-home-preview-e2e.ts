// ORG-072 / ENG-094: opt-in illustrative homepage build, isolated from the default build.
// Usage: node scripts/build-home-preview-e2e.ts
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const tracked = ["tsconfig.json", "next-env.d.ts"].map((path) => ({ path, text: readFileSync(path, "utf8") }));
try {
  const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    stdio: "inherit",
    env: { ...process.env, MSRC_PREVIEW_PLACEHOLDERS: "true", VERCEL: "", VERCEL_ENV: "", MSRC_HOME_PREVIEW_DIST_DIR: ".next/home-preview" },
  });
  process.exitCode = build.status ?? 1;
} finally {
  for (const { path, text } of tracked) writeFileSync(path, text);
}
