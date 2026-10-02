import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Ephemeral synthetic OTPs only. No delivery, provider, database or diagnostic output. */
export function createSyntheticCodeKey(): string {
  return randomBytes(32).toString("hex");
}

export function syntheticCodeHash(key: string, code: string): string {
  return createHmac("sha256", key).update(code).digest("hex");
}

export function issueSyntheticCode(key: string, previouslyIssuedHashes: readonly string[]): Readonly<{ code: string; hash: string }> {
  if (previouslyIssuedHashes.length >= 1024) throw new Error("Synthetic challenge quota exhausted");
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = syntheticCodeHash(key, code);
    if (!previouslyIssuedHashes.includes(hash)) return { code, hash };
  }
  throw new Error("Synthetic challenge unavailable");
}

export function matchesSyntheticCode(key: string, expectedHash: string, code: string): boolean {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(syntheticCodeHash(key, code), "hex"));
}
