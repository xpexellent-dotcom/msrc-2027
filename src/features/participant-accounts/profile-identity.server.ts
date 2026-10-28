import "server-only";
import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import type { IdentityDocumentType } from "@/features/registration/identity-number";

export type ProfileIdentityEnvelope = { type: IdentityDocumentType; envelope: string; lookup: string; last4: string };

/** ORG-067: reuse the versioned ORG-039 keys. Plaintext never reaches an RPC. */
export function encryptProfileIdentity(actorId: string, edition: string, type: IdentityDocumentType, number: string,
  environment: Record<string, string | undefined> = process.env): ProfileIdentityEnvelope | null {
  try {
    const version = environment.REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION;
    const keys: unknown = JSON.parse(environment.REGISTRATION_IDENTITY_ENCRYPTION_KEYS ?? "null");
    const secret = environment.REGISTRATION_IDENTITY_HMAC_SECRET;
    if (!version || !/^[A-Za-z0-9_-]{1,40}$/.test(version) || !keys || typeof keys !== "object" || Array.isArray(keys)
      || !secret || !/^[a-fA-F0-9]{64}$/.test(secret)) return null;
    const key = (keys as Record<string, unknown>)[version];
    if (typeof key !== "string" || !/^[a-fA-F0-9]{64}$/.test(key) || key.toLowerCase() === secret.toLowerCase()) return null;
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
    // Binding prevents a copied envelope from decrypting for another owner/edition/type.
    cipher.setAAD(Buffer.from(JSON.stringify(["participant-profile", actorId, edition, type])));
    const ciphertext = Buffer.concat([cipher.update(number, "utf8"), cipher.final()]);
    return { type, envelope: ["v1", version, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(":"),
      lookup: createHmac("sha256", Buffer.from(secret, "hex")).update(JSON.stringify(["participant-profile", edition, type, number])).digest("hex"),
      last4: number.slice(-4) };
  } catch { return null; }
}
