import { describe, expect, it } from "vitest";
import { decryptIdentityDocument, encryptIdentityDocument, getIdentityCryptoConfig, identityDocumentHash,
  maskIdentityNumber, normalizeIdentityNumber, type IdentityContext } from "@/features/registration/identity-crypto.server";

const env = { REGISTRATION_IDENTITY_ENCRYPTION_KEYS: JSON.stringify({ v1: "a".repeat(64) }),
  REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "v1", REGISTRATION_IDENTITY_HMAC_SECRET: "b".repeat(64) };
const config = getIdentityCryptoConfig(env)!;
const context: IdentityContext = { editionKey: "synthetic-registration-2027", actorId: "30000000-0000-4000-8000-000000000001", documentType: "passport" };
const number = "FAKE000001";

describe("registration identity protection (ORG-039; ENG-043)", () => {
  it.each([{}, { ...env, REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "missing" }, { ...env, REGISTRATION_IDENTITY_HMAC_SECRET: "a".repeat(64) },
    { ...env, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: "[]" }, { ...env, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: "null" },
    { ...env, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: '{"v1":"bad"}' }, { ...env, REGISTRATION_IDENTITY_HMAC_SECRET: "" },
    { ...env, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: '{"__proto__":"' + "c".repeat(64) + '","v1":"' + "a".repeat(64) + '"}' },
  ])("fails closed for absent or invalid key custody configuration %#", (input) => {
    expect(getIdentityCryptoConfig(input)).toBeNull();
  });
  it("keeps independent immutable key configuration", () => {
    expect(config).not.toBeNull(); expect(Object.isFrozen(config)).toBe(true); expect(Object.isFrozen(config.keys)).toBe(true);
  });
  it.each(["national_id", "iqama"] as const)("normalizes Arabic digits for %s without inventing document verification", (type) => {
    expect(normalizeIdentityNumber(type, "٠٠٠٠٠٠٠٠٠١")).toBe("0000000001");
    expect(normalizeIdentityNumber(type, "۰۰۰۰۰۰۰۰۰۱")).toBe("0000000001");
    expect(maskIdentityNumber(type, "0000000001")).toBe("••••••0001");
    expect(normalizeIdentityNumber(type, "123")).toBeNull();
  });
  it.each(["<script>", "FAKE 001", "FAKE\n001", "FAKE/001", "A".repeat(21), "", 12345, null])("rejects unsupported document input %#", (value) => {
    expect(normalizeIdentityNumber("passport", value)).toBeNull();
  });
  it("round-trips a fake passport with randomized authenticated ciphertext and a minimal mask", () => {
    const first = encryptIdentityDocument(config, context, number), second = encryptIdentityDocument(config, context, number);
    expect(first).not.toEqual(second); expect(first.iv).toHaveLength(24); expect(first.authTag).toHaveLength(32);
    expect(decryptIdentityDocument(config, context, first)).toBe(number);
    expect(JSON.stringify(first)).not.toContain(number); expect(maskIdentityNumber("passport", number)).toBe("••••••0001");
  });
  it("fully masks a short accepted passport so its suffix cannot reveal the complete number", () => {
    expect(normalizeIdentityNumber("passport", "FAKE")).toBe("FAKE");
    expect(maskIdentityNumber("passport", "FAKE")).toBe("••••••");
  });
  it("deduplicates normalized documents across accounts while isolating edition and type", () => {
    const hash = identityDocumentHash(config, context, number);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); expect(hash).not.toContain(number);
    expect(identityDocumentHash(config, context, " fake000001 ")).toBe(hash);
    expect(identityDocumentHash(config, { ...context, actorId: "30000000-0000-4000-8000-000000000002" }, number)).toBe(hash);
    expect(identityDocumentHash(config, { ...context, editionKey: "synthetic-other" }, number)).not.toBe(hash);
    expect(identityDocumentHash(config, { ...context, documentType: "national_id" }, "0000000001"))
      .not.toBe(identityDocumentHash(config, { ...context, documentType: "iqama" }, "0000000001"));
  });
  it("decrypts a restored older-version record after rotation while new writes use the new key", () => {
    const old = JSON.parse(JSON.stringify(encryptIdentityDocument(config, context, number)));
    const rotated = getIdentityCryptoConfig({ ...env, REGISTRATION_IDENTITY_ENCRYPTION_KEYS: JSON.stringify({ v1: "a".repeat(64), v2: "c".repeat(64) }),
      REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "v2" })!;
    expect(decryptIdentityDocument(rotated, context, old)).toBe(number);
    const next = encryptIdentityDocument(rotated, context, number); expect(next.keyVersion).toBe("v2");
    expect(decryptIdentityDocument(rotated, context, next)).toBe(number);
    expect(identityDocumentHash(rotated, context, number)).toBe(identityDocumentHash(config, context, number));
    expect(() => decryptIdentityDocument(config, context, next)).toThrow("Identity protection unavailable");
  });
  it.each(["ciphertext", "iv", "authTag", "keyVersion"] as const)("rejects tampering with %s without leaking input", (field) => {
    const envelope = encryptIdentityDocument(config, context, number);
    const value = field === "keyVersion" ? "missing" : (envelope[field][0] === "0" ? "1" : "0") + envelope[field].slice(1);
    expect(() => decryptIdentityDocument(config, context, { ...envelope, [field]: value })).toThrow(/^Identity protection unavailable$/);
  });
  it.each([{ editionKey: "synthetic-other" }, { actorId: "30000000-0000-4000-8000-000000000002" }, { documentType: "iqama" as const }])
    ("authenticates the edition/account/document context %#", (changed) => {
      expect(() => decryptIdentityDocument(config, { ...context, ...changed }, encryptIdentityDocument(config, context, number))).toThrow();
    });
  it("does not accept a ciphertext envelope containing an extra plaintext field", () => {
    expect(() => decryptIdentityDocument(config, context, { ...encryptIdentityDocument(config, context, number), number })).toThrow();
  });
});
