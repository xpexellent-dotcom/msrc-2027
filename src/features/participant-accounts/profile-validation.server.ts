import "server-only";
import sharp from "sharp";
import { PROFILE_STATUSES, PROFILE_IDENTITY_TYPES, safeProfileText, isAdultProfileDate, isArabicProfileName, isProfileIdentityNumber, isProfilePhone, type ProfileStatus, type ProfileIdentityType, type ProfileErrors, type OptionalParticipantProfile, type ProfileSpecialty } from "./profile-contract";
import { isCountryCode } from "@/content/countries";
import { SAUDI_UNIVERSITIES } from "@/content/saudi-universities";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_AVATAR_BYTES + 16_384;
/** Bound the stream before multipart parsing, including requests without Content-Length. */
export async function readProfileForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)
    || ![null, "identity"].includes(request.headers.get("content-encoding"))) throw new Error("Invalid profile input");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) throw new Error("Invalid profile input");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid profile input");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Invalid profile input"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": contentType } }).formData();
}
export type ProfileSaveInput = {
  institutionId: string | null; institutionOther: string | null; status: ProfileStatus | null;
  arabicName: string | null; nationality: string | null; gender: "male" | "female" | null;
  dateOfBirth: string | null; city: string | null; phone: string | null;
  identityType: ProfileIdentityType | null; identityNumber: string | null; removeIdentity: boolean; interests: string[];
  avatar: File | null; removeAvatar: boolean; version: number; formToken: string;
};
export function validateProfileForm(form: FormData, specialties: ProfileSpecialty[], existing?: OptionalParticipantProfile, now = new Date()):
  { ok: true; value: ProfileSaveInput } | { ok: false; fieldErrors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const scalarKeys = ["institutionId", "institutionOther", "status", "arabicName", "nationality", "gender", "dateOfBirth", "city", "phone", "identityType", "identityNumber"] as const;
  const allowed = ["action", ...scalarKeys, "interests", "avatar", "removeAvatar", "removeIdentity", "version", "formToken", "website"];
  if (Array.from(form.keys()).some((key) => !allowed.includes(key) || form.getAll(key).length !== 1)
    || scalarKeys.some((key) => typeof form.get(key) !== "string")
    || form.get("action") !== "save" || form.get("website") !== ""
    || typeof form.get("formToken") !== "string" || !/^\d{1,10}$/.test(String(form.get("version")))) return { ok: false, fieldErrors: errors };
  const text = (key: typeof scalarKeys[number]) => String(form.get(key)).trim();
  const institutionId = text("institutionId") || null, institutionOther = text("institutionOther") || null;
  if (institutionId !== null && !SAUDI_UNIVERSITIES.some((item) => item.id === institutionId)) errors.institution = "invalid";
  if (institutionOther !== null && !safeProfileText(institutionOther, 160)) errors.institutionOther = Array.from(institutionOther).length > 160 ? "too_long" : "invalid";
  if (institutionId !== null && institutionOther !== null) errors.institution = "invalid";
  const status = text("status") as ProfileStatus || null;
  if (status !== null && !PROFILE_STATUSES.includes(status)) errors.status = "invalid";
  const arabicName = text("arabicName") || null, nationality = text("nationality") || null;
  if (arabicName !== null && !isArabicProfileName(arabicName)) errors.arabicName = Array.from(arabicName).length > 160 ? "too_long" : "invalid";
  if (nationality !== null && !isCountryCode(nationality)) errors.nationality = "invalid";
  const gender = text("gender") as "male" | "female" || null;
  if (gender !== null && !["male", "female"].includes(gender)) errors.gender = "invalid";
  const dateOfBirth = text("dateOfBirth") || null, city = text("city") || null, phone = text("phone") || null;
  if (dateOfBirth !== null && !isAdultProfileDate(dateOfBirth, now)) errors.dateOfBirth = "invalid";
  if (city !== null && !safeProfileText(city, 80)) errors.city = Array.from(city).length > 80 ? "too_long" : "invalid";
  if (phone !== null && !isProfilePhone(phone)) errors.phone = "invalid";
  const identityType = text("identityType") as ProfileIdentityType || null, identityNumber = text("identityNumber").toUpperCase() || null;
  if (identityType !== null && !PROFILE_IDENTITY_TYPES.includes(identityType)) errors.identityType = "invalid";
  const removeIdentity = form.get("removeIdentity") === "true";
  if (form.get("removeIdentity") !== null && !["true", "false"].includes(String(form.get("removeIdentity")))) errors.identityNumber = "invalid";
  if (identityNumber !== null && (!identityType || !PROFILE_IDENTITY_TYPES.includes(identityType) || !isProfileIdentityNumber(identityType, identityNumber))) errors.identityNumber = "invalid";
  if (identityType && !identityNumber && (removeIdentity || existing?.identityType !== identityType || !existing.identityLast4)) errors.identityNumber = "required";
  if (existing?.identityType && identityType !== existing.identityType && !identityNumber && !removeIdentity) errors.identityType = "invalid";
  if (removeIdentity && (identityType || identityNumber)) errors.identityNumber = "invalid";
  let interests: string[] = [];
  try {
    const parsed: unknown = JSON.parse(String(form.get("interests")));
    if (!Array.isArray(parsed) || parsed.length > 5 || !parsed.every((id) => typeof id === "string" && specialties.some((specialty) => specialty.id === id))
      || new Set(parsed).size !== parsed.length) errors.interests = "invalid";
    else interests = parsed;
  } catch { errors.interests = "invalid"; }
  const avatar = form.get("avatar"), remove = form.get("removeAvatar");
  if (remove !== null && remove !== "true" && remove !== "false") errors.avatar = "invalid";
  if (avatar !== null && (!(avatar instanceof File) || avatar.size > MAX_AVATAR_BYTES || avatar.size === 0
    || !["image/jpeg", "image/png", "image/webp"].includes(avatar.type))) errors.avatar = "invalid";
  if (avatar && remove === "true") errors.avatar = "invalid";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { institutionId, institutionOther, status, arabicName, nationality, gender, dateOfBirth, city, phone,
    identityType, identityNumber, removeIdentity, interests, avatar: avatar instanceof File ? avatar : null,
    removeAvatar: remove === "true", version: Number(form.get("version")), formToken: String(form.get("formToken")) } };
}
/** Decode the actual bytes, reject MIME mismatches/animation, rotate and re-encode.
 * sharp removes all metadata by default; never call keepMetadata/withMetadata. */
export async function reencodeProfileAvatar(file: File): Promise<Uint8Array | null> {
  try {
    if (file.size === 0 || file.size > MAX_AVATAR_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return null;
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 16_777_216, failOn: "warning" });
    const meta = await image.metadata();
    const mimeTypes: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (mimeTypes[meta.format ?? ""] !== file.type || (meta.pages ?? 1) !== 1) return null;
    const output = await image.rotate().resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return output.byteLength <= MAX_AVATAR_BYTES ? output : null;
  } catch { return null; }
}
