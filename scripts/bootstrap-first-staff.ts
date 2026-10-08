/** BL-AUTH-01/05/06 operator procedure. DEFAULT IS INERT; never run by application or CI.
 * See docs/features/STAFF_BOOTSTRAP.md. Input comes only from the operator environment.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertBootstrapOperatorIdentity, bootstrapOperatorStatement, bootstrapSqlEnvironment,
  validateBootstrapTarget } from "./bootstrap-staff-validation.ts";

const execute = process.argv.includes("--execute-bootstrap");
if (!execute) {
  process.stdout.write("Inert bootstrap procedure. Read docs/features/STAFF_BOOTSTRAP.md before deliberate operator execution.\n");
  process.exit(0);
}
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Operator input ${key} is required.`);
  return value;
}
const email = required("STAFF_BOOTSTRAP_EMAIL").trim().toLowerCase();
const name = required("STAFF_BOOTSTRAP_DISPLAY_NAME").trim();
const edition = required("STAFF_BOOTSTRAP_EDITION_KEY");
const password = required("STAFF_BOOTSTRAP_PASSWORD");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length < 1 || name.length > 200 || edition.length < 1 || edition.length > 128) throw new Error("Operator identity or edition input is invalid.");
if (Array.from(password).length < 10 || Buffer.byteLength(password, "utf8") > 72) throw new Error("Supply a privately generated password of at least ten characters and at most 72 UTF-8 bytes.");
function literal(value: string): string { return `'${value.replaceAll("'", "''")}'`; }
const approvedRef = required("STAFF_BOOTSTRAP_APPROVED_PROJECT_REF");
const key = required("SUPABASE_SECRET_KEY");
const target = validateBootstrapTarget({ approvedRef, secretKey: key, authUrl: required("SUPABASE_URL"),
  databaseUrl: required("STAFF_BOOTSTRAP_DATABASE_URL") });
const sqlEnvironment = bootstrapSqlEnvironment(target, process.env, process.env.PGSSLROOTCERT);
async function sql(statement: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Only the fixed operator identity receipt is consumed. No SQL output is printed.
    const command = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"], {
      // Next adds NODE_ENV to ProcessEnv; the native child deliberately uses only this allowlist.
      env: sqlEnvironment as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "ignore"],
    });
    let receipt = "";
    command.stdout.setEncoding("utf8");
    command.stdout.on("data", (value: string) => { receipt += value; });
    command.on("error", () => reject(new Error("Operator SQL could not start.")));
    command.on("close", (code) => {
      if (code !== 0) { reject(new Error("Operator SQL did not complete; inspect the private database audit before retrying.")); return; }
      try {
        const line = receipt.split(/\r?\n/).find((value) => value.startsWith("{"));
        assertBootstrapOperatorIdentity(line ? JSON.parse(line) : null);
        resolve();
      } catch { reject(new Error("Native postgres operator identity could not be verified.")); }
    });
    command.stdin.on("error", () => {});
    command.stdin.end(bootstrapOperatorStatement(statement));
  });
}
const actorId = randomUUID();
const sdk = createClient(target.authOrigin, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
  } },
});
try {
  await sql(`begin; select msrc_staff.bootstrap_reserve('${actorId}',${literal(email)}); commit;`);
  // GoTrue stores/hashes credentials. No direct password SQL or custom password hashing.
  const result = await sdk.auth.admin.createUser({ id: actorId, email, password, email_confirm: true });
  if (result.error || result.data.user?.id !== actorId) throw new Error("Managed Auth did not complete the reserved bootstrap. Inspect privately; do not retry blind.");
  await sql(`begin; select msrc_staff.bootstrap_first('${actorId}',${literal(edition)},${literal(name)}); commit;`);
  process.stdout.write("First-account bootstrap completed. The account requires authenticator enrollment on its first password sign-in. Invite the second Super Admin after enrollment.\n");
} catch {
  process.stderr.write("Bootstrap did not complete. Keep the portal closed and inspect the private operator records before retrying; provider diagnostics are withheld.\n");
  process.exitCode = 1;
} finally {
  // Remove values from this process; keep all external activity explicit above.
  delete process.env.STAFF_BOOTSTRAP_PASSWORD;
  delete process.env.STAFF_BOOTSTRAP_DATABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;

}
