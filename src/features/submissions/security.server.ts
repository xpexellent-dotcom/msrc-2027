import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import { ABSTRACT_PAYLOAD_BYTES } from "./validation";

export function abstractFormToken(config: ParticipantConfig, origin: string, actor: string, session: string, now: number): string {
  const encoded = Buffer.from(JSON.stringify({ purpose: "abstract-action-v1", origin, issued: now, expires: now + 30 * 60_000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify(["abstract-action-v1", actor, session, encoded])).digest("base64url");
}
export function readAbstractFormToken(config: ParticipantConfig, supplied: unknown, origin: string, actor: string, session: string, now: number): boolean {
  if (typeof supplied !== "string" || supplied.length > 1200) return false;
  const parts = supplied.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify(["abstract-action-v1", actor, session, parts[0]])).digest();
  const received = Buffer.from(parts[1], "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return data && Object.keys(data).sort().join(",") === "expires,issued,nonce,origin,purpose" && data.purpose === "abstract-action-v1"
      && data.origin === origin && config.origins.includes(origin) && Number.isSafeInteger(data.issued) && data.issued <= now
      && data.expires === data.issued + 30 * 60_000 && data.expires > now && /^[a-f0-9]{48}$/.test(data.nonce);
  } catch { return false; }
}
/** An explicit transport budget, not an author-count cap. No files are accepted. */
export async function readAbstractJson(request: Request): Promise<unknown> {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("content-encoding"))) throw new Error("Invalid input");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > ABSTRACT_PAYLOAD_BYTES)) throw new Error("Abstract exceeds the technical payload budget");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid input");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > ABSTRACT_PAYLOAD_BYTES) { await reader.cancel(); throw new Error("Abstract exceeds the technical payload budget"); } chunks.push(value); }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
