import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { SESSION_POLICY } from "@/config/session-policy";
import type { ParticipantConfig } from "./config.server";

export const participantUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function participantHash(config: ParticipantConfig, purpose: "email" | "ip" | "code" | "nonce", value: string) {
  return createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update("msrc-participant-v1:" + purpose + ":" + value).digest("hex");
}
export function participantOrigin(config: ParticipantConfig, request: Request): string | null {
  const host = request.headers.get("host");
  return config.origins.find((origin) => host !== null ? new URL(origin).host === host : origin === new URL(request.url).origin) ?? null;
}
export function participantIp(config: ParticipantConfig, request: Request): string | null {
  if (config.testMode) return "127.0.0.1";
  const value = request.headers.get("x-vercel-forwarded-for");
  if (!value || value.trim() !== value || !isIP(value)) return null;
  if (isIP(value) === 4) return value;
  try { return new URL("http://[" + value + "]").hostname.slice(1, -1).toLowerCase(); } catch { return null; }
}
export function participantFormToken(config: ParticipantConfig, origin: string, now = Date.now()): string {
  const encoded = Buffer.from(JSON.stringify({ purpose: "participant-form-v1", origin, issued: now,
    expires: now + 30 * 60 * 1000, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return encoded + "." + createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(encoded).digest("base64url");
}
export function readParticipantFormToken(config: ParticipantConfig, supplied: unknown, origin: string, now = Date.now()): string | null {
  if (typeof supplied !== "string" || supplied.length > 1024) return null;
  const parts = supplied.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(parts[0]).digest();
  const signature = Buffer.from(parts[1], "base64url");
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!value || Object.keys(value).sort().join(",") !== "expires,issued,nonce,origin,purpose"
      || value.purpose !== "participant-form-v1" || value.origin !== origin || !config.origins.includes(origin)
      || !Number.isSafeInteger(value.issued) || !Number.isSafeInteger(value.expires)
      || value.expires !== value.issued + 30 * 60 * 1000 || value.expires <= now || value.issued > now - 2000
      || typeof value.nonce !== "string" || !/^[a-f0-9]{48}$/.test(value.nonce)) return null;
    return value.nonce;
  } catch { return null; }
}

export interface ParticipantSessionCookie { actorId: string; sessionId: string; accessToken: string; refreshToken: string; deadline: number; origin: string }
function validSession(value: unknown): value is ParticipantSessionCookie {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join(",") === "accessToken,actorId,deadline,origin,refreshToken,sessionId"
    && typeof record.actorId === "string" && participantUuid.test(record.actorId)
    && typeof record.sessionId === "string" && participantUuid.test(record.sessionId)
    && typeof record.accessToken === "string" && record.accessToken.length > 0 && record.accessToken.length <= 16384 && !/\s/.test(record.accessToken)
    && typeof record.refreshToken === "string" && record.refreshToken.length > 0 && record.refreshToken.length <= 2048 && !/\s/.test(record.refreshToken)
    && typeof record.origin === "string" && typeof record.deadline === "number" && Number.isSafeInteger(record.deadline);
}
export function sealParticipantSession(config: ParticipantConfig, value: ParticipantSessionCookie): string {
  if (!validSession(value) || !config.origins.includes(value.origin)) throw new Error("Invalid private session shape");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.securitySecret, "hex"), iv);
  cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function participantCookieName(config: ParticipantConfig): string { return config.testMode ? "msrc-participant-test" : "__Host-msrc-participant"; }
export function readParticipantSession(config: ParticipantConfig, request: Request, now = Date.now()): ParticipantSessionCookie | null {
  const values = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(participantCookieName(config) + "="));
  if (values.length !== 1) return null;
  const encoded = values[0].slice(participantCookieName(config).length + 1);
  if (!/^[A-Za-z0-9_-]{40,32768}$/.test(encoded)) return null;
  try {
    const bytes = Buffer.from(encoded, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(config.securitySecret, "hex"), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const value: unknown = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    return validSession(value) && value.origin === participantOrigin(config, request) && value.deadline > now
      && value.deadline <= now + SESSION_POLICY.participantAbsoluteSeconds * 1000 ? value : null;
  } catch { return null; }
}
export function participantCookie(config: ParticipantConfig, value: ParticipantSessionCookie | null, now = Date.now()): string {
  const encoded = value ? sealParticipantSession(config, value) : "";
  const seconds = value ? Math.max(0, Math.floor((value.deadline - now) / 1000)) : 0;
  return `${participantCookieName(config)}=${encoded}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${config.testMode ? "" : "; Secure"}`;
}
export function nativeSessionId(accessToken: string): string | null {
  try { const value = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    return typeof value.session_id === "string" && participantUuid.test(value.session_id) ? value.session_id : null;
  } catch { return null; }
}
export function nativeTokenNeedsRefresh(token: string, now = Date.now()): boolean {
  try { const value = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return !Number.isSafeInteger(value.exp) || value.exp * 1000 <= now + 60_000;
  } catch { return true; }
}
export async function readParticipantJson(request: Request): Promise<unknown> {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("content-encoding"))) throw new Error("Invalid input");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 8192)) throw new Error("Invalid input");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 8192) { await reader.cancel(); throw new Error("Invalid input"); } chunks.push(value); }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
