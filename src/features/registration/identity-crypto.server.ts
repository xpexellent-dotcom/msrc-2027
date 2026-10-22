import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { normalizeIdentityNumber, type IdentityDocumentType } from "./identity-number";

export { normalizeIdentityNumber, type IdentityDocumentType } from "./identity-number";
export interface IdentityContext { editionKey: string; actorId: string; documentType: IdentityDocumentType }
export interface IdentityEnvelope { ciphertext: string; iv: string; authTag: string; keyVersion: string }
export interface IdentityCryptoConfig {
  readonly keys: Readonly<Record<string, string>>;
  readonly activeKeyVersion: string;
  readonly hmacSecret: string;
}
const versionPattern = /^[a-zA-Z0-9_-]{1,32}$/;
const secretPattern = /^[a-f0-9]{64}$/i;
const safeError = () => new Error("Identity protection unavailable");

/** Keys are deliberately independent of database backups and participant/staff cookie secrets. */
export function getIdentityCryptoConfig(env: Readonly<Record<string, string | undefined>> = process.env): IdentityCryptoConfig | null {
  const active = env.REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION;
  const hmac = env.REGISTRATION_IDENTITY_HMAC_SECRET;
  const encoded = env.REGISTRATION_IDENTITY_ENCRYPTION_KEYS;
  if (!active || !versionPattern.test(active) || !hmac || !secretPattern.test(hmac) || !encoded || encoded.length > 8192) return null;
  try {
    const keys: unknown = JSON.parse(encoded);
    if (!keys || typeof keys !== "object" || Array.isArray(keys)) return null;
    const entries = Object.entries(keys);
    if (!entries.length || entries.length > 32 || !Object.hasOwn(keys, active)
      || entries.some(([version, key]) => !versionPattern.test(version) || ["__proto__", "constructor", "prototype"].includes(version)
        || typeof key !== "string" || !secretPattern.test(key) || key.toLowerCase() === hmac.toLowerCase())) return null;
    return Object.freeze({ keys: Object.freeze(Object.fromEntries(entries)), activeKeyVersion: active, hmacSecret: hmac });
  } catch { return null; }
}

function normalized(context: IdentityContext, number: unknown): string {
  const value = normalizeIdentityNumber(context.documentType, number);
  if (!value) throw safeError();
  return value;
}
function aad(context: IdentityContext, version: string): Buffer {
  if (!/^[a-z0-9][a-z0-9_-]{0,127}$/.test(context.editionKey)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(context.actorId)
    || !["national_id", "iqama", "passport"].includes(context.documentType) || !versionPattern.test(version)) throw safeError();
  return Buffer.from(JSON.stringify(["msrc-registration-identity-v1", context.editionKey, context.actorId.toLowerCase(), context.documentType, version]));
}
export function maskIdentityNumber(type: IdentityDocumentType, number: unknown): string {
  const value = normalizeIdentityNumber(type, number);
  if (!value) throw safeError();
  return "••••••" + (value.length > 4 ? value.slice(-4) : "");
}
export function identityDocumentHash(config: IdentityCryptoConfig, context: IdentityContext, number: unknown): string {
  // Actor is excluded: the same document in one edition must deduplicate across accounts.
  aad(context, config.activeKeyVersion);
  return createHmac("sha256", Buffer.from(config.hmacSecret, "hex"))
    .update(JSON.stringify(["msrc-registration-dedupe-v1", context.editionKey, context.documentType, normalized(context, number)]))
    .digest("hex");
}
export function encryptIdentityDocument(config: IdentityCryptoConfig, context: IdentityContext, number: unknown): IdentityEnvelope {
  const value = normalized(context, number), keyVersion = config.activeKeyVersion;
  const key = config.keys[keyVersion];
  if (!key || !secretPattern.test(key)) throw safeError();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv, { authTagLength: 16 });
  cipher.setAAD(aad(context, keyVersion));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString("hex");
  return { ciphertext, iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex"), keyVersion };
}
/** Call only after the database has authorized and audited the explicit Super Admin reveal. */
export function decryptIdentityDocument(config: IdentityCryptoConfig, context: IdentityContext, input: unknown): string {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw safeError();
    const envelope = input as IdentityEnvelope;
    if (Object.keys(envelope).sort().join(",") !== "authTag,ciphertext,iv,keyVersion"
      || typeof envelope.keyVersion !== "string" || !versionPattern.test(envelope.keyVersion)
      || typeof envelope.ciphertext !== "string" || !/^(?:[a-f0-9]{2}){4,20}$/.test(envelope.ciphertext)
      || typeof envelope.iv !== "string" || !/^[a-f0-9]{24}$/.test(envelope.iv)
      || typeof envelope.authTag !== "string" || !/^[a-f0-9]{32}$/.test(envelope.authTag)) throw safeError();
    const key = Object.hasOwn(config.keys, envelope.keyVersion) ? config.keys[envelope.keyVersion] : null;
    if (!key || !secretPattern.test(key)) throw safeError();
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), Buffer.from(envelope.iv, "hex"), { authTagLength: 16 });
    decipher.setAAD(aad(context, envelope.keyVersion));
    decipher.setAuthTag(Buffer.from(envelope.authTag, "hex"));
    return normalized(context, Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "hex")), decipher.final()]).toString("utf8"));
  } catch { throw safeError(); }
}
