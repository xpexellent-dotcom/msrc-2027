import "server-only";
import sharp from "sharp";
import { PROFILE_STATUSES, type ProfileStatus, type ProfileField, type ProfileSpecialty } from "./profile-contract";

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
  institution: string | null; status: ProfileStatus | null; year: number | null; interests: string[];
  avatar: File | null; removeAvatar: boolean; version: number; formToken: string;
};
export function validateProfileForm(form: FormData, specialties: ProfileSpecialty[]):
  { ok: true; value: ProfileSaveInput } | { ok: false; fieldErrors: Partial<Record<ProfileField, "required" | "invalid" | "too_long">> } {
  const errors: Partial<Record<ProfileField, "required" | "invalid" | "too_long">> = {};
  const allowed = ["action", "institution", "status", "year", "interests", "avatar", "removeAvatar", "version", "formToken", "website"];
  if (Array.from(form.keys()).some((key) => !allowed.includes(key) || form.getAll(key).length !== 1)
    || form.get("action") !== "save" || form.get("website") !== ""
    || typeof form.get("formToken") !== "string" || !/^\d{1,10}$/.test(String(form.get("version")))) return { ok: false, fieldErrors: errors };
  const institutionValue = form.get("institution"), statusValue = form.get("status"), yearValue = form.get("year");
  const institution = typeof institutionValue === "string" ? institutionValue.trim() : "";
  if (typeof institutionValue !== "string" || /[\x00-\x1f\x7f]/.test(institution)) errors.institution = "invalid";
  else if (Array.from(institution).length > 160) errors.institution = "too_long";
  const status = statusValue === "" ? null : statusValue as ProfileStatus;
  if (typeof statusValue !== "string" || status !== null && !PROFILE_STATUSES.includes(status)) errors.status = "invalid";
  const year = status === "medical_student" && typeof yearValue === "string" && /^[1-6]$/.test(yearValue) ? Number(yearValue) : null;
  if (status === "medical_student" && year === null) errors.year = yearValue === "" ? "required" : "invalid";
  if (status !== "medical_student" && yearValue !== "") errors.year = "invalid";
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
  return { ok: true, value: { institution: institution || null, status, year, interests, avatar: avatar instanceof File ? avatar : null,
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
