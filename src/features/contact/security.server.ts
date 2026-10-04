import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Locale } from "@/lib/i18n";
import { getContactDeliveryConfig, type ContactDeliveryConfig } from "./delivery-config.server";

const lifetimeMs = 30 * 60 * 1_000;
type ContactToken = { purpose: "contact-v1"; locale: Locale; origin: string; issued: number; expires: number; nonce: string };

export function contactRequestOrigin(config: ContactDeliveryConfig, request: Request): string | undefined {
  // Next's internal URL may use the bound hostname instead of the browser's Host.
  // Match an exact configured authority; never trust forwarded-host/proto values.
  const host = request.headers.get("host");
  return host !== null ? config.origins.find((origin) => new URL(origin).host === host)
    : config.origins.find((origin) => origin === new URL(request.url).origin);
}

export function contactHash(config: ContactDeliveryConfig, purpose: "email" | "ip" | "nonce", value: string): string {
  return createHmac("sha256", Buffer.from(config.securitySecret, "hex"))
    .update("msrc-contact-v1:" + purpose + ":" + value).digest("hex");
}

export function createContactToken(config: ContactDeliveryConfig, locale: Locale, origin: string, now = Date.now()): string {
  if (!config.origins.includes(origin)) throw new Error("Contact origin is not configured");
  const payload: ContactToken = { purpose: "contact-v1", locale, origin, issued: now, expires: now + lifetimeMs,
    nonce: randomBytes(24).toString("hex") };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

export function verifyContactToken(config: ContactDeliveryConfig, supplied: unknown, locale: Locale, origin: string, now = Date.now()):
  { ok: true; nonce: string; expires: number } | { ok: false; code: "CONTACT_INVALID_TOKEN" | "CONTACT_TOO_FAST" } {
  const invalid = { ok: false as const, code: "CONTACT_INVALID_TOKEN" as const };
  if (typeof supplied !== "string" || supplied.length > 1_024) return invalid;
  const parts = supplied.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return invalid;
  const [encoded, signature] = parts;
  const expected = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return invalid;
  try {
    const value: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid;
    const token = value as ContactToken;
    if (Object.keys(token).sort().join(",") !== "expires,issued,locale,nonce,origin,purpose"
      || token.purpose !== "contact-v1" || token.locale !== locale || token.origin !== origin
      || !config.origins.includes(origin) || !Number.isSafeInteger(token.issued) || !Number.isSafeInteger(token.expires)
      || token.expires !== token.issued + lifetimeMs || token.issued > now || token.expires <= now
      || typeof token.nonce !== "string" || !/^[a-f0-9]{48}$/.test(token.nonce)) return invalid;
    if (now - token.issued < config.minimumFillSeconds * 1_000) return { ok: false, code: "CONTACT_TOO_FAST" };
    return { ok: true, nonce: token.nonce, expires: token.expires };
  } catch { return invalid; }
}

export function getContactPageDelivery(locale: Locale, host: string | null): { token: string; testOnly: boolean } | undefined {
  const readiness = getContactDeliveryConfig();
  if (readiness.state !== "ready") return undefined;
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === host);
  return origin ? { token: createContactToken(readiness.config, locale, origin), testOnly: readiness.config.testMode } : undefined;
}

export function trustedContactIp(config: ContactDeliveryConfig, request: Request): string | null {
  // Local mocks inject a fixed trusted IP; caller headers never control it.
  if (config.testMode) return "127.0.0.1";
  const supplied = request.headers.get("x-vercel-forwarded-for");
  if (!supplied || supplied !== supplied.trim() || !isIP(supplied)) return null;
  if (isIP(supplied) === 4) return supplied;
  try { return new URL("http://[" + supplied + "]").hostname.slice(1, -1).toLowerCase(); }
  catch { return null; }
}

/** Read actual bytes, not a client-supplied Content-Length alone. */
export async function readContactJson(request: Request): Promise<unknown> {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("content-encoding"))) throw new Error("Invalid Contact input");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 24_000)) throw new Error("Invalid Contact input");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid Contact input");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 24_000) { await reader.cancel(); throw new Error("Invalid Contact input"); }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
