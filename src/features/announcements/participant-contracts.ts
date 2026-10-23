export interface ParticipantAnnouncement {
  id: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
  publishedAt: string;
  readAt: string | null;
}

export interface ParticipantAnnouncementsResponse {
  state: "ready" | "closed" | "denied" | "invalid_input" | "limited" | "area-not-ready" | "unavailable";
  announcements?: ParticipantAnnouncement[];
  formToken?: string;
}

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestamp = (value: unknown): value is string => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

/** Strict projection keeps recipient addresses, account IDs and outbox metadata private. */
export function participantAnnouncementProjection(value: unknown): ParticipantAnnouncement[] | null {
  const data = record(value);
  if (!data || Object.keys(data).sort().join(",") !== "announcements,state" || data.state !== "ready"
    || !Array.isArray(data.announcements) || data.announcements.length > 100) return null;
  const seen = new Set<string>(), rows: ParticipantAnnouncement[] = [];
  for (const entry of data.announcements) {
    const row = record(entry);
    if (!row || Object.keys(row).sort().join(",") !== "bodyAr,bodyEn,id,publishedAt,readAt,subjectAr,subjectEn"
      || typeof row.id !== "string" || !uuid.test(row.id) || seen.has(row.id)
      || !timestamp(row.publishedAt) || row.readAt !== null && !timestamp(row.readAt)
      || ["subjectEn", "subjectAr"].some((key) => typeof row[key] !== "string" || !String(row[key]).trim() || String(row[key]).length > 90)
      || ["bodyEn", "bodyAr"].some((key) => typeof row[key] !== "string" || !String(row[key]).trim() || String(row[key]).length > 3_500)
      || rows.length && Date.parse(row.publishedAt) > Date.parse(rows[rows.length - 1].publishedAt)) return null;
    seen.add(row.id);
    rows.push({ id: row.id, subjectEn: row.subjectEn as string, subjectAr: row.subjectAr as string,
      bodyEn: row.bodyEn as string, bodyAr: row.bodyAr as string, publishedAt: row.publishedAt, readAt: row.readAt as string | null });
  }
  return rows;
}
