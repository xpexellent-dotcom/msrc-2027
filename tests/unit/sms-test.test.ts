import { describe, expect, it } from "vitest";
import { createSyntheticCodeKey, issueSyntheticCode, matchesSyntheticCode, syntheticCodeHash } from "@/features/auth/sms-test.server";

describe("synthetic SMS/email code foundation", () => {
  it("returns a random six-digit test code and stores a keyed hash only", () => {
    const key = createSyntheticCodeKey();
    const challenge = issueSyntheticCode(key, []);
    expect(Boolean(/^\d{6}$/.test(challenge.code))).toBe(true);
    expect(challenge.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(matchesSyntheticCode(key, challenge.hash, challenge.code)).toBe(true);
    expect(matchesSyntheticCode(createSyntheticCodeKey(), challenge.hash, challenge.code)).toBe(false);
  });
  it("reissues a different code and cannot match a replaced challenge", () => {
    const key = createSyntheticCodeKey();
    const first = issueSyntheticCode(key, []);
    const second = issueSyntheticCode(key, [first.hash]);
    expect(Boolean(first.code !== second.code)).toBe(true);
    expect(matchesSyntheticCode(key, second.hash, first.code)).toBe(false);
    expect(matchesSyntheticCode(key, first.hash, second.code)).toBe(false);
    expect(syntheticCodeHash(key, first.code)).toBe(first.hash);
  });
  it.each(["", "12345", "1234567", "１２３４５６", "١٢٣٤٥٦", "abcdef", undefined, 123456])("rejects malformed code %j", (code) => {
    const key = createSyntheticCodeKey();
    const challenge = issueSyntheticCode(key, []);
    expect(matchesSyntheticCode(key, challenge.hash, code as string)).toBe(false);
  });
  it("rejects an exhausted local challenge budget before issuing further code values", () => {
    expect(() => issueSyntheticCode(createSyntheticCodeKey(), Array<string>(1024).fill("synthetic-hash"))).toThrow("Synthetic challenge quota exhausted");
  });
});
