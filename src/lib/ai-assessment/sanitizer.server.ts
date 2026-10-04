import "server-only";
import type { IdentityFlag, LockedSnapshot, ScientificPayload } from "./contracts.ts";

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const validReference = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value);
export const validTimestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const safeText = (value: unknown, limit: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= limit && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
const normalized = (text: string) => text.normalize("NFKC").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "").replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660))).toLocaleLowerCase("en").replace(/\s+/g, " ");

/** Conservative canaries, not proof of anonymity. Only category names leave this function. */
export function checkIdentityLeaks(text: string, identity: LockedSnapshot["identity"]): readonly IdentityFlag[] {
  const value = normalized(text);
  const flags: IdentityFlag[] = [];
  if (/[\w.!#$%&'*+/=?^`{|}~-]+\s*@\s*[\w.-]+\s*\.\s*[a-z]{2,}/i.test(value)) flags.push("email");
  // Phone-like 9..15 digits, accepting spaces, international prefixes and separators.
  if (/(?:^|[^\p{L}\p{N}])\+?(?:\d[\s().-]*){9,15}(?!\d)/u.test(value)) flags.push("phone");
  const contains = (candidate: string) => {
    const name = normalized(candidate).trim();
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return name.length >= 2 && new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u").test(value);
  };
  if (identity.authorNames.some(contains)) flags.push("author_name");
  if (identity.institutions.some(contains) || /\b(?:university|hospital|institution|medical college|research institute|college of medicine)\b/.test(value)
    || /جامعة|مستشفى|كلية الطب/.test(value)) flags.push("institution");
  if (/\b(?:licen[cs]e|licen[cs]ure|registration|scfhs)\s*(?:(?:number|no\.?|id|reference|#)\s*){0,3}[:#-]?\s*(?=[a-z0-9/.-]{0,80}\d)[a-z0-9/.-]+/i.test(value)) flags.push("licence_number");
  if (/\b(?:irb|ethics(?: approval)?|institutional review board)\s*(?:(?:number|no\.?|id|approval|reference|#)\s*){0,3}[:#-]?\s*(?=[a-z0-9/.-]{0,80}\d)[a-z0-9/.-]+/i.test(value)) flags.push("irb_number");
  return Object.freeze(flags);
}

export function sanitizeSnapshot(snapshot: unknown): { readonly ok: true; readonly payload: ScientificPayload }
  | { readonly ok: false; readonly reason: "invalid_snapshot" | "identity_leak"; readonly flags?: readonly IdentityFlag[] } {
  if (!isRecord(snapshot) || snapshot.locked !== true || !validReference(snapshot.id) || !validReference(snapshot.version)
    || !validTimestamp(snapshot.lockedAt) || !isRecord(snapshot.identity) || !isRecord(snapshot.scientific)) return { ok: false, reason: "invalid_snapshot" };
  const { authorNames, institutions } = snapshot.identity;
  if (!Array.isArray(authorNames) || !Array.isArray(institutions) || authorNames.length > 100 || institutions.length > 100
    || ![...authorNames, ...institutions].every(value => safeText(value, 300))) return { ok: false, reason: "invalid_snapshot" };
  const fields = snapshot.scientific;
  if (!safeText(fields.title, 500) || !safeText(fields.specialty, 200) || !safeText(fields.studyType, 200)
    || typeof fields.completionStatus !== "string" || !["ongoing", "completed"].includes(fields.completionStatus) || !safeText(fields.body, 12_000)) return { ok: false, reason: "invalid_snapshot" };
  const payload = Object.freeze({ title: fields.title, specialty: fields.specialty, studyType: fields.studyType,
    completionStatus: fields.completionStatus as ScientificPayload["completionStatus"], body: fields.body });
  // Check every transmitted text field as well as the body. Extra input fields are dropped.
  const flags = checkIdentityLeaks(Object.values(payload).join("\n"), { authorNames, institutions });
  return flags.length ? { ok: false, reason: "identity_leak", flags } : { ok: true, payload };
}
