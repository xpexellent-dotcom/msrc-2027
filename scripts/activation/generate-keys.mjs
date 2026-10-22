#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const warning = "WARNING: Secret values follow. Run only in your own private terminal. Do not paste output into chat, logs, source control or screenshots. Preserve installed keys; this is not a rotation procedure.";

function inside(root, target) {
  const path = relative(root, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep));
}

async function main() {
  let destination;
  let includeExisting = false;
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--include-existing" && !includeExisting) includeExisting = true;
    else if (args[index] === "--out" && !destination && args[index + 1] && !args[index + 1].startsWith("--")) destination = args[++index];
    else throw new Error("Usage: node scripts/activation/generate-keys.mjs [--out <path outside repository>] [--include-existing]");
  }
  let output;
  if (destination) {
    const root = await realpath(repository);
    const requested = resolve(destination);
    // Resolve the existing parent to reject junction/symlink paths into the repo.
    const parent = await realpath(dirname(requested));
    const target = resolve(parent, relative(dirname(requested), requested));
    if (inside(root, requested) || inside(root, target)) throw new Error("Refusing --out inside the repository.");
    // Exclusive creation also refuses existing files and symlinks; never overwrite custody material.
    output = await open(target, "wx", 0o600);
  }
  try {
    const secret = () => randomBytes(32).toString("hex");
    const entries = {
      CRON_SECRET: secret(),
      OUTBOX_MONITOR_SECRET: secret(),
      PARTICIPANT_AUTH_SECURITY_SECRET: secret(),
      REGISTRATION_TICKET_SECRET: secret(),
      REGISTRATION_IDENTITY_ENCRYPTION_KEYS: JSON.stringify({ v1: secret() }),
      REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "v1",
      REGISTRATION_IDENTITY_HMAC_SECRET: secret(),
      ...(includeExisting ? { STAFF_AUTH_SECURITY_SECRET: secret(), CONTACT_SECURITY_SECRET: secret() } : {}),
    };
    const lines = Object.entries(entries).map(([name, value]) => `${name}=${value}`).join("\n") + "\n";
    process.stderr.write(warning + "\n");
    if (includeExisting) process.stderr.write("Existing staff/contact secrets included for initial installation only. Do not replace the Production values.\n");
    if (output) {
      await output.writeFile(lines, "utf8");
      process.stderr.write("An explicit private output file was created. Restrict its Windows ACL yourself; POSIX mode is not a Windows ACL.\n");
    }
    process.stdout.write(lines);
  } finally {
    await output?.close();
  }
}

main().catch(() => {
  // Do not reflect arbitrary arguments, paths, filesystem errors or secret values.
  process.stderr.write("Key generation failed. Use [--out <new file outside repository>] [--include-existing]; the parent must exist. In-repository output and existing files are refused.\n");
  process.exitCode = 1;
});
