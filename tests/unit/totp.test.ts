import { describe, expect, it } from "vitest";
import { createTotpSecret, encodeBase32, totpAt, totpSetupUri, verifyTotp } from "@/features/auth/totp.server";

const rfcSecret = encodeBase32(Buffer.from("12345678901234567890"));

describe("synthetic authenticator-app TOTP (AUTH-04)", () => {
  it.each([
    [59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"],
    [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"],
  ])("matches RFC 6238 SHA-1 vector at %s seconds", (seconds, expected) => {
    expect(totpAt(rfcSecret, Number(seconds) * 1000, 8)).toBe(expected);
  });

  it("generates independent 160-bit base32 secrets and safely encoded setup labels", () => {
    const first = createTotpSecret();
    const second = createTotpSecret();
    expect(/^[A-Z2-7]{32}$/.test(first) && /^[A-Z2-7]{32}$/.test(second) && first !== second).toBe(true);
    const uri = new URL(totpSetupUri(first, "Synthetic / عربي"));
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.host).toBe("totp");
    expect(uri.searchParams.get("secret") === first).toBe(true);
    expect(uri.searchParams.get("period")).toBe("30");
    expect(uri.searchParams.get("digits")).toBe("6");
  });

  it("accepts adjacent clock steps and rejects consumed or out-of-window steps", () => {
    const at = 90_000;
    const code = totpAt(rfcSecret, at);
    expect(verifyTotp(rfcSecret, code, at, null)).toBe(3);
    expect(verifyTotp(rfcSecret, code, 120_000, null)).toBe(3);
    expect(verifyTotp(rfcSecret, code, 150_000, null)).toBeNull();
    expect(verifyTotp(rfcSecret, code, at, 3)).toBeNull();
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, 60_000), at, 3)).toBeNull();
  });

  it.each(["", "12345", "1234567", "１２３４５６", "123 45", "abcdef", "123456\n", undefined, 123456])("rejects malformed code %j", (code) => {
    expect(verifyTotp(rfcSecret, code as string, 90_000, null)).toBeNull();
  });
  it.each([-1, Infinity, NaN, 1.5])("rejects invalid server time %s", (at) => {
    expect(verifyTotp(rfcSecret, "123456", at, null)).toBeNull();
    expect(() => totpAt(rfcSecret, at)).toThrow();
  });
});
