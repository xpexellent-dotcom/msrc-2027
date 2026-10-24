import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import { COMPETITION_PAYLOAD_BYTES } from "./validation";

const purpose = "competition-action-v1";
export function competitionFormToken(config: ParticipantConfig, origin: string, actor: string, session: string, now: number): string {
  const encoded = Buffer.from(JSON.stringify({ purpose, origin, issued: now, expires: now + 30 * 60_000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify([purpose, actor, session, encoded])).digest("base64url");
}
export function readCompetitionFormToken(config: ParticipantConfig, token: unknown, origin: string, actor: string, session: string, now: number): boolean {
  if (typeof token !== "string" || token.length > 1200) return false;
  const parts = token.split("."); if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify([purpose, actor, session, parts[0]])).digest(), received = Buffer.from(parts[1], "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try { const d = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return d && Object.keys(d).sort().join(",") === "expires,issued,nonce,origin,purpose" && d.purpose === purpose && d.origin === origin && config.origins.includes(origin)
      && Number.isSafeInteger(d.issued) && d.issued <= now && d.expires === d.issued + 30 * 60_000 && d.expires > now && /^[a-f0-9]{48}$/.test(d.nonce);
  } catch { return false; }
}
export async function readCompetitionJson(request: Request): Promise<unknown> {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json" || ![null, "identity"].includes(request.headers.get("content-encoding"))) throw new Error("Invalid input");
  const declared = request.headers.get("content-length"); if (declared && (!/^\d+$/.test(declared) || Number(declared) > COMPETITION_PAYLOAD_BYTES)) throw new Error("Payload too large");
  const reader = request.body?.getReader(); if (!reader) throw new Error("Invalid input");
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > COMPETITION_PAYLOAD_BYTES) { await reader.cancel(); throw new Error("Payload too large"); } chunks.push(value); }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
