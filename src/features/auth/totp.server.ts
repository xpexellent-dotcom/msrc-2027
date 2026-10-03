import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD_SECONDS = 30;

export function createTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function encodeBase32(input: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let encoded = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) encoded += alphabet[(value << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(secret: string): Buffer {
  if (!/^[A-Z2-7]{16,128}$/.test(secret)) throw new Error("Invalid TOTP secret");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of secret) {
    value = (value << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** RFC 6238 SHA-1, six digits, thirty-second steps; only the server verifies. */
export function totpAt(secret: string, nowMs: number, digits: 6 | 8 = 6): string {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("Invalid TOTP time");
  return codeForCounter(secret, Math.floor(nowMs / (TOTP_PERIOD_SECONDS * 1000)), digits);
}

function codeForCounter(secret: string, counter: number, digits: 6 | 8): string {
  const movingFactor = Buffer.alloc(8);
  movingFactor.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", decodeBase32(secret)).update(movingFactor).digest();
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, "0");
}

/** One adjacent step of clock tolerance; a consumed step is never accepted again. */
export function verifyTotp(secret: string, code: string, nowMs: number, lastConsumedCounter: number | null): number | null {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !Number.isSafeInteger(nowMs) || nowMs < 0) return null;
  const current = Math.floor(nowMs / (TOTP_PERIOD_SECONDS * 1000));
  for (const counter of [current, current - 1, current + 1]) {
    if (counter < 0 || (lastConsumedCounter !== null && counter <= lastConsumedCounter)) continue;
    const expected = codeForCounter(secret, counter, 6);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return counter;
  }
  return null;
}

export function totpSetupUri(secret: string, identityLabel: string): string {
  const issuer = "MSRC synthetic preview";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${identityLabel}`)}?${new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: String(TOTP_PERIOD_SECONDS) })}`;
}
