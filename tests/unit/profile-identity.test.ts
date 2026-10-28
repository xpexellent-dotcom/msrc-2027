import { createDecipheriv } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptProfileIdentity } from "@/features/participant-accounts/profile-identity.server";

const actor = "39000000-0000-4000-8000-000000000001", edition = "synthetic-profile-ci";
const environment = { REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "synthetic-v1",
  REGISTRATION_IDENTITY_ENCRYPTION_KEYS: JSON.stringify({ "synthetic-v1": "b".repeat(64) }), REGISTRATION_IDENTITY_HMAC_SECRET: "c".repeat(64) };
function decrypt(envelope: string, owner = actor) {
  const [, , iv, tag, ciphertext] = envelope.split(":");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from("b".repeat(64), "hex"), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(JSON.stringify(["participant-profile", owner, edition, "national_id"])));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
describe("ORG-067 profile identity encryption", () => {
  it("uses fresh authenticated encryption and stable keyed lookup without returning plaintext", () => {
    const number = "1000000123", first = encryptProfileIdentity(actor, edition, "national_id", number, environment)!;
    const second = encryptProfileIdentity(actor, edition, "national_id", number, environment)!;
    expect(first.envelope).not.toBe(second.envelope); expect(first.lookup).toBe(second.lookup);
    expect(first.lookup).toMatch(/^[a-f0-9]{64}$/); expect(first.last4).toBe("0123");
    expect(JSON.stringify(first)).not.toContain(number); expect(decrypt(first.envelope)).toBe(number);
    expect(() => decrypt(first.envelope, "another-owner")).toThrow();
    expect(encryptProfileIdentity(actor, "other-edition", "national_id", number, environment)!.lookup).not.toBe(first.lookup);
  });
  it.each([
    {}, { ...environment, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: "malformed" },
    { ...environment, REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "missing" },
    { ...environment, REGISTRATION_IDENTITY_HMAC_SECRET: "bad" },
    { ...environment, REGISTRATION_IDENTITY_HMAC_SECRET: "b".repeat(64) },
  ])("fails closed for missing or invalid private key configuration %#", (env) => {
    expect(encryptProfileIdentity(actor, edition, "national_id", "1000000123", env)).toBeNull();
  });
});
