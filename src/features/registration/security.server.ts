import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
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
