import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";

function signature(config: ParticipantConfig, actor: string, session: string, payload: string) {
  return createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify(["certificate-form-v1", actor, session, payload])).digest();
}
/** CSRF only: never persisted or passed into survey completion/answer storage. */
export function certificateFormToken(config: ParticipantConfig, origin: string, actor: string, session: string, now: number) {
  const payload = Buffer.from(JSON.stringify({ origin, issued: now, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return payload + "." + signature(config, actor, session, payload).toString("base64url");
}
export function validCertificateFormToken(config: ParticipantConfig, token: unknown, origin: string, actor: string, session: string, now: number) {
  if (typeof token !== "string" || token.length > 1200) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = signature(config, actor, session, parts[0]), supplied = Buffer.from(parts[1], "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === "issued,nonce,origin"
      && value.origin === origin && config.origins.includes(origin) && Number.isSafeInteger(value.issued)
      && value.issued <= now && value.issued + 30 * 60_000 > now && /^[a-f0-9]{48}$/.test(value.nonce);
  } catch { return false; }
}

/** Forty bounded short-text answers can exceed the authentication form's 8 KiB limit. */
export async function readCertificateJson(request: Request): Promise<unknown> {
  const limit = 131072, declared = request.headers.get("content-length");
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("content-encoding"))
    || declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error("Invalid certificate input");
  const reader = request.body?.getReader(); if (!reader) throw new Error("Invalid certificate input");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("Invalid certificate input"); } chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
