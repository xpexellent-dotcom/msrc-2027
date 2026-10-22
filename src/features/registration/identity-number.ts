export type IdentityDocumentType = "national_id" | "iqama" | "passport";

/** Format validation only; this does not assert that a document was independently verified. */
export function normalizeIdentityNumber(type: IdentityDocumentType, input: unknown): string | null {
  if (typeof input !== "string" || input.length > 64) return null;
  const number = input.trim().replace(/[\u0660-\u0669\u06f0-\u06f9]/g,
    (digit) => String(digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660))).toUpperCase();
  if (type === "national_id" || type === "iqama") return /^\d{10}$/.test(number) ? number : null;
  return type === "passport" && /^[A-Z0-9]{4,20}$/.test(number) ? number : null;
}
