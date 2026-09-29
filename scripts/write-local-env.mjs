import { spawnSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveLocalSupabaseConfig } from "../src/lib/supabase/config.ts";

class LocalEnvironmentError extends Error {}

/** Only two validated public values may leave the captured CLI response. */
export function renderLocalEnvironment(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new LocalEnvironmentError("Local Supabase returned an invalid status object.");
  }
  if (status.linked_project_ref || status.LINKED_PROJECT_REF || status.linked_project) {
    throw new LocalEnvironmentError("M1 refuses linked hosted projects. Use an unlinked local checkout.");
  }
  if (typeof status.API_URL !== "string" || typeof status.PUBLISHABLE_KEY !== "string") {
    throw new LocalEnvironmentError(
      "Local API URL or publishable key is missing. Start the checked-in local stack, including its Auth infrastructure with signup disabled, then retry.",
    );
  }

  let config;
  try {
    config = resolveLocalSupabaseConfig({
      url: status.API_URL,
      publishableKey: status.PUBLISHABLE_KEY,
    });
  } catch {
    throw new LocalEnvironmentError(
      "M1 requires a loopback HTTP API origin and a local publishable key. Remote, decorated or privileged values were rejected.",
    );
  }
  if (!config) {
    throw new LocalEnvironmentError("The local Supabase URL and publishable key must not be empty.");
  }

  return [
    "# Generated from the running local Supabase stack; never commit this file.",
    "# These are public client settings, not secret/service-role credentials.",
    `NEXT_PUBLIC_SUPABASE_URL=${config.url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${config.publishableKey}`,
    "",
  ].join("\n");
}

/** Exclusive creation prevents both ordinary overwrite and symlink replacement. */
export function writeLocalEnvironmentFile(projectDirectory, status) {
  const content = renderLocalEnvironment(status);
  try {
    writeFileSync(join(projectDirectory, ".env.local"), content, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new LocalEnvironmentError(
        "Refusing to overwrite existing .env.local. Review and preserve its settings before creating a new file.",
      );
    }
    throw new LocalEnvironmentError("Could not create .env.local. Check local folder write permissions.");
  }
}

function resolvePinnedCli(projectDirectory) {
  const require = createRequire(join(projectDirectory, "package.json"));
  const project = JSON.parse(readFileSync(join(projectDirectory, "package.json"), "utf8"));
  const cliPackagePath = require.resolve("supabase/package.json");
  const cli = JSON.parse(readFileSync(cliPackagePath, "utf8"));
  if (cli.version !== project.devDependencies.supabase) {
    throw new LocalEnvironmentError("Installed Supabase CLI does not match the pinned version. Run pnpm install --frozen-lockfile.");
  }

  // Resolve through the installed package so pnpm's isolated dependency layout works.
  // Deliberately ignore SUPABASE_CLI_BINARY_OVERRIDE and shell PATH shims.
  const platformPackages = {
    win32: { x64: ["windows-x64"], arm64: ["windows-arm64"] },
    darwin: { x64: ["darwin-x64"], arm64: ["darwin-arm64"] },
    linux: { x64: ["linux-x64", "linux-x64-musl"], arm64: ["linux-arm64", "linux-arm64-musl"] },
  };
  const candidates = platformPackages[process.platform]?.[process.arch] ?? [];
  const cliRequire = createRequire(cliPackagePath);
  for (const candidate of candidates) {
    try {
      const packagePath = cliRequire.resolve(`@supabase/cli-${candidate}/package.json`);
      const platformPackage = JSON.parse(readFileSync(packagePath, "utf8"));
      if (platformPackage.version !== cli.version) continue;
      return realpathSync(join(dirname(packagePath), "bin", process.platform === "win32" ? "supabase.exe" : "supabase"));
    } catch {
      // Optional packages for other runtime variants may be absent.
    }
  }
  throw new LocalEnvironmentError("The pinned local Supabase executable is unavailable. Run pnpm install --frozen-lockfile on a supported platform.");
}

function run() {
  const projectDirectory = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
  if (lstatSync(join(projectDirectory, ".env.local"), { throwIfNoEntry: false })) {
    throw new LocalEnvironmentError("Refusing to overwrite existing .env.local. Review and preserve its settings before creating a new file.");
  }
  // The pinned CLI's linked-state resolver can contact the hosted API for branches.
  // Refuse its two input sources before starting the process, not only afterward.
  if (
    process.env.SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_REF ||
    lstatSync(join(projectDirectory, "supabase", ".temp", "project-ref"), { throwIfNoEntry: false })
  ) {
    throw new LocalEnvironmentError("M1 refuses a hosted project reference. Use an unlinked local checkout and terminal.");
  }

  const binary = resolvePinnedCli(projectDirectory);
  const cliHome = join(projectDirectory, "supabase", ".temp", "local-cli-home");
  mkdirSync(cliHome, { recursive: true, mode: 0o700 });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith("SUPABASE_")),
  );
  Object.assign(env, {
    SUPABASE_HOME: cliHome,
    SUPABASE_TELEMETRY_DISABLED: "true",
    DO_NOT_TRACK: "1",
  });
  const result = spawnSync(binary, ["status", "--workdir", projectDirectory, "--output", "json"], {
    cwd: projectDirectory,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
    env,
  });
  if (result.error || result.status !== 0) {
    throw new LocalEnvironmentError(
      "Local Supabase status is unavailable. Start Docker and run pnpm db:start, then retry. CLI output was withheld because it may contain credentials.",
    );
  }

  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    throw new LocalEnvironmentError("Local Supabase returned unreadable status. Check the pinned CLI installation; captured output was withheld.");
  }
  writeLocalEnvironmentFile(projectDirectory, status);
  process.stdout.write("Created .env.local with only the local API URL and publishable key. No credentials were printed.\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    run();
  } catch (error) {
    const message = error instanceof LocalEnvironmentError
      ? error.message
      : "Could not prepare local settings. Check the pinned installation and local folder permissions; diagnostic details were withheld.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
