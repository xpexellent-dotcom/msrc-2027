import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantFormToken, readParticipantFormToken } from "@/features/participant-accounts/security.server";

function signature(config: ParticipantConfig, actorId: string, sessionId: string, token: string) {
  return createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update(JSON.stringify(["registration-form-v1", actorId, sessionId, token])).digest();
}
/** Reusable CSRF evidence supports idempotent retries; the DB separately rate-limits each HTTP attempt. */
export function registrationFormToken(config: ParticipantConfig, origin: string, actorId: string, sessionId: string, now: number) {
  const token = participantFormToken(config, origin, now);
  return token + "." + signature(config, actorId, sessionId, token).toString("base64url");
}
export function readRegistrationFormToken(config: ParticipantConfig, supplied: unknown, origin: string, actorId: string, sessionId: string, now: number): boolean {
  if (typeof supplied !== "string" || supplied.length > 1200) return false;
  const parts = supplied.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return false;
  const token = parts[0] + "." + parts[1], received = Buffer.from(parts[2], "base64url");
  const expected = signature(config, actorId, sessionId, token);
  return received.length === expected.length && timingSafeEqual(received, expected)
    && readParticipantFormToken(config, token, origin, now) !== null;
}

/** Lifecycle CSRF evidence is reusable for operation-id retries. Unlike collection
 * forms, accepting an already issued offer has no anti-bot minimum reading time. */
export function registrationActionToken(config: ParticipantConfig, origin: string, actorId: string, sessionId: string, now: number): string {
  const encoded = Buffer.from(JSON.stringify({ purpose: "registration-action-v1", origin,
    issued: now, expires: now + 30 * 60 * 1000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update(JSON.stringify(["registration-action-v1", actorId, sessionId, encoded])).digest("base64url");
}
export function readRegistrationActionToken(config: ParticipantConfig, supplied: unknown, origin: string, actorId: string, sessionId: string, now: number): boolean {
  if (typeof supplied !== "string" || supplied.length > 1200) return false;
  const parts = supplied.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update(JSON.stringify(["registration-action-v1", actorId, sessionId, parts[0]])).digest();
  const received = Buffer.from(parts[1], "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && Object.keys(value).sort().join(",") === "expires,issued,nonce,origin,purpose"
      && value.purpose === "registration-action-v1" && value.origin === origin && config.origins.includes(origin)
      && Number.isSafeInteger(value.issued) && Number.isSafeInteger(value.expires) && value.issued <= now
      && value.expires === value.issued + 30 * 60 * 1000 && value.expires > now
      && typeof value.nonce === "string" && /^[a-f0-9]{48}$/.test(value.nonce);
  } catch { return false; }
}
