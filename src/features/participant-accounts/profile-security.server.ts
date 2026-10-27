import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "./config.server";

/** Session-bound, reusable CSRF evidence; optimistic versions make retries safe. */
export function profileFormToken(config: ParticipantConfig, origin: string, actorId: string, sessionId: string, now: number): string {
  const encoded = Buffer.from(JSON.stringify({ origin, issued: now, expires: now + 30 * 60_000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update(JSON.stringify(["participant-profile-v1", actorId, sessionId, encoded])).digest("base64url");
}
export function readProfileFormToken(config: ParticipantConfig, supplied: unknown, origin: string, actorId: string, sessionId: string, now: number): boolean {
  if (typeof supplied !== "string" || supplied.length > 1200) return false;
  const parts = supplied.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update(JSON.stringify(["participant-profile-v1", actorId, sessionId, parts[0]])).digest();
  const suppliedSignature = Buffer.from(parts[1], "base64url");
  if (suppliedSignature.length !== expected.length || !timingSafeEqual(suppliedSignature, expected)) return false;
  try {
    const row = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return row && Object.keys(row).sort().join(",") === "expires,issued,nonce,origin"
      && row.origin === origin && config.origins.includes(origin) && Number.isSafeInteger(row.issued)
      && row.issued <= now && row.expires === row.issued + 30 * 60_000 && row.expires > now
      && typeof row.nonce === "string" && /^[a-f0-9]{48}$/.test(row.nonce);
  } catch { return false; }
}
