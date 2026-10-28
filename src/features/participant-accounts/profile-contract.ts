import { isCountryCode } from "@/content/countries";
import { SAUDI_UNIVERSITIES } from "@/content/saudi-universities";

/** ENG-087 / ORG-067. Partial saves remain available; completion gates submissions. */
export const PROFILE_STATUSES = ["year_1", "year_2", "year_3", "year_4", "year_5", "year_6", "internship", "clinical_placement", "postgraduate", "residency", "faculty"] as const;
export type ProfileStatus = typeof PROFILE_STATUSES[number];
export const PROFILE_IDENTITY_TYPES = ["national_id", "iqama", "passport"] as const;
export type ProfileIdentityType = typeof PROFILE_IDENTITY_TYPES[number];
export type ProfileSpecialty = { id: string; label: string };
export type OptionalParticipantProfile = {
  institution: string | null; institutionId: string | null; institutionOther: string | null;
  status: ProfileStatus | null; year: null; arabicName: string | null; nationality: string | null;
  gender: "male" | "female" | null; dateOfBirth: string | null; city: string | null; phone: string | null;
  identityType: ProfileIdentityType | null; identityLast4: string | null;
  interests: string[]; avatarUrl: string | null; version: number;
};
export const PROFILE_FIELDS = ["avatar", "institution", "institutionOther", "status", "arabicName", "nationality", "gender", "dateOfBirth", "city", "phone", "identityType", "identityNumber", "interests"] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type ProfileErrors = Partial<Record<ProfileField, "required" | "invalid" | "too_long">>;
export type ParticipantProfileResponse = {
  state: "ready"; profile: OptionalParticipantProfile; specialties: ProfileSpecialty[]; formToken: string;
} | {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" | "conflict";
  formToken?: string; fieldErrors?: ProfileErrors;
};
export const EMPTY_PARTICIPANT_PROFILE: OptionalParticipantProfile = { institution: null, institutionId: null, institutionOther: null,
  status: null, year: null, arabicName: null, nationality: null, gender: null, dateOfBirth: null, city: null, phone: null,
  identityType: null, identityLast4: null, interests: [], avatarUrl: null, version: 0 };
export const safeProfileText = (value: unknown, max: number): value is string => typeof value === "string" && Array.from(value).length <= max && !/[\x00-\x1f\x7f]/.test(value);
export function isAdultProfileDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return false;
  const year = now.getUTCFullYear() - 18, month = now.getUTCMonth();
  const day = Math.min(now.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  const cutoff = new Date(Date.UTC(year, month, day));
  return date <= cutoff;
}
export function isProfilePhone(value: string) { return /^\+[1-9]\d{1,14}$/.test(value); }
export function isArabicProfileName(value: string) { return safeProfileText(value, 160) && /[\u0621-\u064a\u066e-\u06d3]/u.test(value) && !/[A-Za-z]/.test(value); }
export function isProfileIdentityNumber(type: ProfileIdentityType, value: string) {
  return type === "national_id" ? /^1\d{9}$/.test(value) : type === "iqama" ? /^2\d{9}$/.test(value) : /^[A-Z0-9]{6,20}$/i.test(value);
}
export function profileCompletion(profile: OptionalParticipantProfile, specialties: ProfileSpecialty[] = [], now = new Date()) {
  const items = [!!profile.avatarUrl, !!(profile.institutionId || profile.institutionOther?.trim()), !!profile.status,
    !!profile.arabicName && isArabicProfileName(profile.arabicName), !!profile.nationality && isCountryCode(profile.nationality),
    !!profile.gender, !!profile.dateOfBirth && isAdultProfileDate(profile.dateOfBirth, now), !!profile.city?.trim(),
    !!profile.phone && isProfilePhone(profile.phone), !!profile.identityType && !!profile.identityLast4];
  if (specialties.length) items.push(profile.interests.some((id) => specialties.some((specialty) => specialty.id === id)));
  return items.filter(Boolean).length;
}
export function profileComplete(profile: OptionalParticipantProfile, specialties: ProfileSpecialty[] = [], now = new Date()) {
  return profileCompletion(profile, specialties, now) === 10 + Number(specialties.length > 0);
}
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function decodeOptionalParticipantProfile(value: unknown): OptionalParticipantProfile | null {
  const row = record(value);
  if (!row || !(row.institution === null || safeProfileText(row.institution, 160))
    || !(row.institutionId === null || typeof row.institutionId === "string" && SAUDI_UNIVERSITIES.some((item) => item.id === row.institutionId))
    || !(row.institutionOther === null || safeProfileText(row.institutionOther, 160) && row.institutionOther.trim().length > 0)
    || row.institutionId !== null && row.institutionOther !== null
    || !(row.status === null || PROFILE_STATUSES.includes(row.status as ProfileStatus)) || row.year !== null
    || !(row.arabicName === null || safeProfileText(row.arabicName, 160))
    || !(row.nationality === null || typeof row.nationality === "string" && isCountryCode(row.nationality))
    || ![null, "male", "female"].includes(row.gender as null | string)
    || !(row.dateOfBirth === null || typeof row.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth))
    || !(row.city === null || safeProfileText(row.city, 80)) || !(row.phone === null || typeof row.phone === "string" && isProfilePhone(row.phone))
    || !(row.identityType === null || PROFILE_IDENTITY_TYPES.includes(row.identityType as ProfileIdentityType))
    || !(row.identityLast4 === null || typeof row.identityLast4 === "string" && /^[A-Z0-9]{4}$/i.test(row.identityLast4))
    || (row.identityType === null) !== (row.identityLast4 === null)
    || !Array.isArray(row.interests) || row.interests.length > 5 || !row.interests.every((id) => safeProfileText(id, 100) && id.length > 0)
    || new Set(row.interests).size !== row.interests.length
    || !(row.avatarUrl === null || typeof row.avatarUrl === "string" && /^\/api\/participant-accounts\/profile\/avatar(?:\?v=\d+)?$/.test(row.avatarUrl)
      || typeof row.avatarUrl === "string" && /^\/api\/staff-portal\/participant-detail\/avatar\?actorId=[a-f0-9-]{36}&v=\d+$/.test(row.avatarUrl)
      || safeProfileText(row.avatarUrl, 3000) && /^https?:\/\//.test(row.avatarUrl))
    || !Number.isSafeInteger(row.version) || Number(row.version) < 0) return null;
  return { institution: row.institution, institutionId: row.institutionId, institutionOther: row.institutionOther,
    status: row.status, year: null, arabicName: row.arabicName, nationality: row.nationality, gender: row.gender,
    dateOfBirth: row.dateOfBirth, city: row.city, phone: row.phone, identityType: row.identityType,
    identityLast4: row.identityLast4, interests: [...row.interests], avatarUrl: row.avatarUrl, version: row.version } as OptionalParticipantProfile;
}
export function decodeProfileResponse(value: unknown): ParticipantProfileResponse {
  const row = record(value);
  if (!row) return { state: "unavailable" };
  if (row.state === "ready") {
    const profile = decodeOptionalParticipantProfile(row.profile);
    if (!profile || typeof row.formToken !== "string" || row.formToken.length > 1200 || !Array.isArray(row.specialties) || row.specialties.length > 500
      || !row.specialties.every((item) => { const specialty = record(item); return specialty && safeProfileText(specialty.id, 100) && specialty.id.length > 0 && safeProfileText(specialty.label, 200) && specialty.label.length > 0; })) return { state: "unavailable" };
    return { state: "ready", profile, specialties: row.specialties.map((item) => ({ id: item.id, label: item.label })), formToken: row.formToken };
  }
  if (!["closed", "denied", "area-not-ready", "unavailable", "invalid_input", "limited", "conflict"].includes(String(row.state))) return { state: "unavailable" };
  const response: ParticipantProfileResponse = { state: row.state as Exclude<ParticipantProfileResponse["state"], "ready"> };
  if (typeof row.formToken === "string" && row.formToken.length <= 1200) response.formToken = row.formToken;
  const errors = record(row.fieldErrors);
  if (errors) {
    response.fieldErrors = {};
    for (const key of PROFILE_FIELDS) if (["required", "invalid", "too_long"].includes(String(errors[key]))) response.fieldErrors[key] = errors[key] as "required" | "invalid" | "too_long";
  }
  return response;
}
