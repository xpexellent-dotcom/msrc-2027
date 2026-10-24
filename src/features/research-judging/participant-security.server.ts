import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";

const purpose = "research-winner-supervisor-v1";
export function researchParticipantFormToken(config: ParticipantConfig, origin: string, actor: string, session: string, now: number): string {
  const encoded = Buffer.from(JSON.stringify({ purpose, origin, issued: now, expires: now + 30 * 60_000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify([purpose, actor, session, encoded])).digest("base64url");
}
export function readResearchParticipantFormToken(config: ParticipantConfig, supplied: unknown, origin: string, actor: string, session: string, now: number): boolean {
  if (typeof supplied !== "string" || supplied.length > 1200) return false;
  const parts = supplied.split("."); if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify([purpose, actor, session, parts[0]])).digest();
  const received = Buffer.from(parts[1], "base64url"); if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const row = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return row && Object.keys(row).sort().join(",") === "expires,issued,nonce,origin,purpose" && row.purpose === purpose && row.origin === origin
      && config.origins.includes(origin) && Number.isSafeInteger(row.issued) && row.issued <= now && row.expires === row.issued + 30 * 60_000
      && row.expires > now && /^[a-f0-9]{48}$/.test(row.nonce);
  } catch { return false; }
}
