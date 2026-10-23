import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";

function signature(config: ParticipantConfig, actor: string, session: string, payload: string) {
  return createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(JSON.stringify(["announcement-read-v1", actor, session, payload])).digest();
}
export function announcementReadToken(config: ParticipantConfig, origin: string, actor: string, session: string, now: number) {
  const payload = Buffer.from(JSON.stringify({ origin, issued: now, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return payload + "." + signature(config, actor, session, payload).toString("base64url");
}
export function validAnnouncementReadToken(config: ParticipantConfig, token: unknown, origin: string, actor: string, session: string, now: number) {
  if (typeof token !== "string" || token.length > 1200) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = signature(config, actor, session, parts[0]), supplied = Buffer.from(parts[1], "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === "issued,nonce,origin"
      && value.origin === origin && config.origins.includes(origin) && Number.isSafeInteger(value.issued) && value.issued <= now
      && value.issued + 30 * 60_000 > now && typeof value.nonce === "string" && /^[a-f0-9]{48}$/.test(value.nonce);
  } catch { return false; }
}
