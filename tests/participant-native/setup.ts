import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isManagedStaffLabBoundary } from "@/features/auth/managed-staff-lab.server";

export function check(condition: unknown, description: string): asserts condition {
  if (!condition) throw new Error(`Participant native assertion failed: ${description}. Sensitive diagnostics withheld.`);
}

export function boundary() {
  check(isManagedStaffLabBoundary({ environment: process.env, platform: process.platform,
    configuration: readFileSync("supabase/config.toml", "utf8"), linked: existsSync("supabase/.temp/project-ref") }),
  "unlinked disposable Linux GitHub runner, signup closed and no delivery provider");
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! };
}

function execute(binary: string, argumentsList: string[], input?: string, environment = process.env): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn(binary, argumentsList, { env: environment, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Disposable participant command timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Disposable participant command could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Disposable participant command failed (SQLSTATE ${sqlState}); sensitive diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

export function query(sql: string): Promise<string> {
  return execute("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
    "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres", "-At"], sql);
}

export function client(key = boundary().publishableKey): SupabaseClient {
  const { url } = boundary();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      // Modern API keys are opaque. Preserve actual native user JWTs.
      if (headers.get("authorization") === `Bearer ${key}`) headers.delete("authorization");
      return fetch(input, { ...init, headers, signal: AbortSignal.timeout(8_000) });
    } },
  });
}

export async function nativeCredentials(): Promise<{ url: string; publishableKey: string; secretKey: string }> {
  const { url, publishableKey } = boundary();
  check(process.arch === "x64", "pinned hosted Linux runner architecture");
  const require = createRequire(import.meta.url);
  const cliPackage = require.resolve("supabase/package.json");
  const cli = JSON.parse(readFileSync(cliPackage, "utf8"));
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  check(cli.version === manifest.devDependencies.supabase, "installed CLI matches the lockfile");
  const cliRequire = createRequire(cliPackage);
  const platformPackage = cliRequire.resolve("@supabase/cli-linux-x64/package.json");
  check(JSON.parse(readFileSync(platformPackage, "utf8")).version === cli.version, "pinned CLI executable");
  const binary = realpathSync(join(dirname(platformPackage), "bin", "supabase"));
  const cliHome = join(process.cwd(), "supabase", ".temp", "participant-ci-cli-home");
  mkdirSync(cliHome, { recursive: true, mode: 0o700 });
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) if (name.toUpperCase().startsWith("SUPABASE_")) delete environment[name];
  Object.assign(environment, { SUPABASE_HOME: cliHome, SUPABASE_TELEMETRY_DISABLED: "true", DO_NOT_TRACK: "1" });
  // Generated local credentials remain in process memory; never files or logs.
  const captured = await execute(binary, ["status", "--workdir", process.cwd(), "--output", "json"], undefined, environment);
  let status: Record<string, unknown>;
  try { status = JSON.parse(captured); } catch { throw new Error("Disposable participant status was unreadable; diagnostics withheld."); }
  check(status.API_URL === url && status.PUBLISHABLE_KEY === publishableKey && typeof status.SECRET_KEY === "string"
    && /^sb_secret_[A-Za-z0-9_-]+$/.test(status.SECRET_KEY) && !status.LINKED_PROJECT_REF,
  "generated local Admin key belongs to the exact disposable stack");
  return { url, publishableKey, secretKey: status.SECRET_KEY };
}

export async function nativeAdmin(): Promise<SupabaseClient> {
  return client((await nativeCredentials()).secretKey);
}

export default async function setup() {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  // Dedicated participant workers only: prepare the neutral no-delivery hook
  // before any native users exist. Never change hosted settings or staff fixtures.
  await query(`begin;
    create schema msrc_ci_auth;
    revoke all on schema msrc_ci_auth from public,anon,authenticated,service_role;
    grant usage on schema msrc_ci_auth to supabase_auth_admin;
    create function msrc_ci_auth.reject_email(event jsonb) returns jsonb
      language sql security invoker set search_path='' as $$ select msrc_participant.suppress_native_email(event); $$;
    revoke all on all functions in schema msrc_ci_auth from public,anon,authenticated,service_role;
    grant execute on all functions in schema msrc_ci_auth to supabase_auth_admin;
    commit;`);
  return async () => { await query("drop schema if exists msrc_ci_auth cascade;"); };
}
