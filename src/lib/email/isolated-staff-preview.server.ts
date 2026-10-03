import "server-only";

import { spawn } from "node:child_process";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";

export type IsolatedStaffCode = Readonly<{ code: string; expiresAt: number }>;
const TIMEOUT_MS = 25_000;
const MAX_OUTPUT_BYTES = 256;

/** Any nonempty opt-in selects external delivery; an invalid setting never falls back to a visible code. */
export function staffPreviewEmailMode(): "synthetic" | "isolated" {
  return process.env.MSRC_AUTH_PREVIEW_EMAIL ? "isolated" : "synthetic";
}

/** A local Windows test dependency, never a production mail provider or managed identity adapter. */
export async function deliverIsolatedStaffPreview(message: IsolatedStaffCode): Promise<boolean> {
  const blockedEnvironment = ["CI", "GITHUB_ACTIONS", "VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV", "VERCEL_URL", "NEXT_PUBLIC_VERCEL_ENV"];
  const recipient = process.env.MSRC_ISOLATED_EMAIL_SELF_RECIPIENT;
  if (!isAuthPreviewAllowed() || process.env.MSRC_AUTH_PREVIEW_EMAIL !== "isolated"
    || blockedEnvironment.some((name) => Boolean(process.env[name])) || process.platform !== "win32"
    || !recipient || recipient.length > 254 || /\s/.test(recipient)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    || typeof message.code !== "string" || message.code.length !== 6 || !/^\d{6}$/.test(message.code) || !Number.isSafeInteger(message.expiresAt)
    || message.expiresAt <= Date.now() || message.expiresAt > Date.now() + 300_000) return false;
  const helper = path.join(process.cwd(), ".tools", "Send-IsolatedStaffCode.ps1");
  try {
    const file = await lstat(helper);
    if (!file.isFile() || file.isSymbolicLink()) return false;
  } catch { return false; }

  return new Promise<boolean>((resolve) => {
    let finished = false;
    let output = "";
    const child = spawn("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-File", helper],
      { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const finish = (delivered: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(delivered);
    };
    const timer = setTimeout(() => { child.kill(); finish(false); }, TIMEOUT_MS);
    child.on("error", () => finish(false));
    child.stdin.on("error", () => { child.kill(); finish(false); });
    child.stdout.on("data", (chunk: Buffer) => {
      if (finished) return;
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) { child.kill(); finish(false); }
    });
    // Consume diagnostics without persisting or exposing provider responses, destinations or codes.
    child.stderr.resume();
    child.on("close", (exitCode: number | null) => {
      if (finished) return;
      try {
        const result: unknown = JSON.parse(output);
        finish(exitCode === 0 && typeof result === "object" && result !== null && !Array.isArray(result)
          && Object.keys(result).length === 1 && "delivered" in result && result.delivered === true);
      } catch { finish(false); }
    });
    child.stdin.end(JSON.stringify({ code: message.code, expiresAt: message.expiresAt }) + "\n");
  }).catch(() => false);
}
