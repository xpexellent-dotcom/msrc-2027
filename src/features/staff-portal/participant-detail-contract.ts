/** ENG-083: one participant's full record for staff who can list participants. */
export type ParticipantDetail = {
  actorId: string; name: string; email: string; status: "verified" | "unverified" | "suspended";
  createdAt: string; verifiedAt: string | null; lastSignInAt: string | null; privacyVersion: string | null; ageConfirmedAt: string | null;
  registration: { status: string; createdAt: string; decidedAt: string | null; identityMasked: string | null;
    ticket: { reference: string; status: string; issuedAt: string | null } | null;
    attendance: { day: string; checkedInAt: string; method: string }[] } | null;
  workshops: { title: string; titleAr: string | null; startAt: string | null; status: string; requestedAt: string | null; checkedInAt: string | null; completedAt: string | null }[];
  submissions: { reference: string | null; title: string | null; status: string; createdAt: string }[];
  competitions: { kind: string; title: string | null; status: string; isLead: boolean; confirmed: boolean; createdAt: string }[];
  hackathonProfile: { university: string; fieldOfStudy: string; phone: string; enrolled: boolean } | null;
  certificates: { kind: string; activity: string | null; status: string; issuedAt: string | null }[];
};
export type ParticipantDetailResponse = { state: "ready"; participant: ParticipantDetail } | { state: "denied" | "not_found" | "invalid" | "unavailable" | "area-not-ready" | "closed" };

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown, max = 500) => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const optional = (value: unknown, max = 500) => value === null || text(value, max);
const list = (value: unknown, check: (item: Record<string, unknown>) => boolean) => Array.isArray(value) && value.length <= 500 && value.every((item) => { const row = record(item); return !!row && check(row); });

/** Accept only the documented shape; anything else is treated as unavailable. */
export function decodeParticipantDetail(value: unknown): ParticipantDetail | null {
  const row = record(value);
  if (!row || !text(row.actorId, 36) || !text(row.name, 200) || !text(row.email, 254) || !["verified", "unverified", "suspended"].includes(String(row.status))
    || !text(row.createdAt, 64) || !optional(row.verifiedAt, 64) || !optional(row.lastSignInAt, 64) || !optional(row.privacyVersion, 40) || !optional(row.ageConfirmedAt, 64)) return null;
  const registration = row.registration === null ? null : record(row.registration);
  if (row.registration !== null && (!registration || !text(registration.status, 60) || !text(registration.createdAt, 64) || !optional(registration.decidedAt, 64) || !optional(registration.identityMasked, 80)
    || !(registration.ticket === null || (record(registration.ticket) && text(record(registration.ticket)!.reference, 12) && text(record(registration.ticket)!.status, 40)))
    || !list(registration.attendance, (item) => text(item.day, 10) && text(item.checkedInAt, 64) && text(item.method, 20)))) return null;
  if (!list(row.workshops, (item) => text(item.title, 500) && text(item.status, 40))
    || !list(row.submissions, (item) => optional(item.reference, 60) && optional(item.title, 2000) && text(item.status, 40))
    || !list(row.competitions, (item) => text(item.kind, 40) && optional(item.title, 2000) && text(item.status, 40) && typeof item.isLead === "boolean" && typeof item.confirmed === "boolean")
    || !list(row.certificates, (item) => text(item.kind, 40) && optional(item.activity, 500) && text(item.status, 40))) return null;
  const hackathon = row.hackathonProfile === null ? null : record(row.hackathonProfile);
  if (row.hackathonProfile !== null && (!hackathon || !text(hackathon.university) || !text(hackathon.fieldOfStudy) || !text(hackathon.phone, 40) || typeof hackathon.enrolled !== "boolean")) return null;
  return row as unknown as ParticipantDetail;
}
