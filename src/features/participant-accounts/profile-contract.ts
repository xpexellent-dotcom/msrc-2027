/** ENG-086: optional profile data is private to its owner and authorized organizers. */
export const PROFILE_STATUSES = ["medical_student", "intern", "resident", "faculty", "other"] as const;
export type ProfileStatus = typeof PROFILE_STATUSES[number];
export type ProfileSpecialty = { id: string; label: string };
export type OptionalParticipantProfile = {
  institution: string | null; status: ProfileStatus | null; year: number | null;
  interests: string[]; avatarUrl: string | null; version: number;
};
export type ProfileField = "institution" | "status" | "year" | "interests" | "avatar";
export type ParticipantProfileResponse = {
  state: "ready"; profile: OptionalParticipantProfile; specialties: ProfileSpecialty[]; formToken: string;
} | {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" | "conflict";
  formToken?: string; fieldErrors?: Partial<Record<ProfileField, "required" | "invalid" | "too_long">>;
};
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const safeText = (value: unknown, max: number): value is string => typeof value === "string" && Array.from(value).length <= max && !/[\x00-\x1f\x7f]/.test(value);
export function decodeOptionalParticipantProfile(value: unknown): OptionalParticipantProfile | null {
  const row = record(value);
  if (!row || !(row.institution === null || safeText(row.institution, 160))
    || !(row.status === null || PROFILE_STATUSES.includes(row.status as ProfileStatus))
    || !(row.status === "medical_student" ? Number.isInteger(row.year) && Number(row.year) >= 1 && Number(row.year) <= 6 : row.year === null)
    || !Array.isArray(row.interests) || row.interests.length > 5 || !row.interests.every((id) => safeText(id, 100) && id.length > 0)
    || new Set(row.interests).size !== row.interests.length
    || !(row.avatarUrl === null || typeof row.avatarUrl === "string" && /^\/api\/participant-accounts\/profile\/avatar(?:\?v=\d+)?$/.test(row.avatarUrl)
      || typeof row.avatarUrl === "string" && /^\/api\/staff-portal\/participant-detail\/avatar\?actorId=[a-f0-9-]{36}&v=\d+$/.test(row.avatarUrl)
      || safeText(row.avatarUrl, 3000) && /^https?:\/\//.test(row.avatarUrl))
    || !Number.isSafeInteger(row.version) || Number(row.version) < 0) return null;
  return { institution: row.institution as string | null, status: row.status as ProfileStatus | null, year: row.year as number | null,
    interests: [...row.interests], avatarUrl: row.avatarUrl as string | null, version: Number(row.version) };
}
export function decodeProfileResponse(value: unknown): ParticipantProfileResponse {
  const row = record(value);
  if (!row) return { state: "unavailable" };
  if (row.state === "ready") {
    const profile = decodeOptionalParticipantProfile(row.profile);
    if (!profile || typeof row.formToken !== "string" || row.formToken.length > 1200 || !Array.isArray(row.specialties) || row.specialties.length > 500
      || !row.specialties.every((item) => { const specialty = record(item); return specialty && safeText(specialty.id, 100) && specialty.id.length > 0 && safeText(specialty.label, 200) && specialty.label.length > 0; })) return { state: "unavailable" };
    return { state: "ready", profile, specialties: row.specialties.map((item) => ({ id: item.id, label: item.label })), formToken: row.formToken };
  }
  if (!["closed", "denied", "area-not-ready", "unavailable", "invalid_input", "limited", "conflict"].includes(String(row.state))) return { state: "unavailable" };
  const response: ParticipantProfileResponse = { state: row.state as Exclude<ParticipantProfileResponse["state"], "ready"> };
  if (typeof row.formToken === "string" && row.formToken.length <= 1200) response.formToken = row.formToken;
  const errors = record(row.fieldErrors);
  if (errors) {
    response.fieldErrors = {};
    for (const key of ["institution", "status", "year", "interests", "avatar"] as const) {
      if (["required", "invalid", "too_long"].includes(String(errors[key]))) response.fieldErrors[key] = errors[key] as "required" | "invalid" | "too_long";
    }
  }
  return response;
}
