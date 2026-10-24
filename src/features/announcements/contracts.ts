export const ANNOUNCEMENT_SEGMENTS = ["verified_participants", "registration_pending", "registration_approved", "registration_confirmed", "registration_waitlisted", "registration_offered", "abstract_submitters", "accepted_presenters", "reviewers", "checkin_staff", "active_staff"] as const;
export type AnnouncementSegment = typeof ANNOUNCEMENT_SEGMENTS[number];
export type AnnouncementFields = { subjectEn: string; subjectAr: string; bodyEn: string; bodyAr: string; segments: AnnouncementSegment[] };
export type Announcement = AnnouncementFields & {
  id: string; editionKey: string; state: "draft" | "scheduled" | "sending" | "sent" | "cancelled"; version: number;
  createdAt: string; updatedAt: string; scheduledAt: string | null; sentAt: string | null;
  recipientCount: number; sentCount: number; failedCount: number; lastError: string | null;
};
export type AnnouncementPreview = { previewToken: string; total: number; segments: { segment: AnnouncementSegment; count: number }[]; samples: string[] };
export type AnnouncementDelivery = { layoutApproved: boolean; deliveryEnabled: boolean; dailyCap: number; sweepsEnabled: boolean; runtimeReady: boolean };
export type AnnouncementState = "ready" | "updated" | "queued" | "closed" | "area-not-ready" | "unavailable" | "denied" | "invalid" | "conflict" | "limited" | "audience-changed" | "not-due";
export type AnnouncementResponse = { state: AnnouncementState; formToken?: string; announcements?: Announcement[]; announcement?: Announcement; segments?: AnnouncementSegment[]; preview?: AnnouncementPreview; delivery?: AnnouncementDelivery; messageId?: string; rendered?: { subject: string; text: string; html: string } };
export type AnnouncementPayload = ({ action: "save"; input: AnnouncementFields & { id?: string; expectedVersion: number } }
  | { action: "preview"; announcementId: string; version: number }
  | { action: "send"; announcementId: string; version: number; previewToken: string; operationId: string; scheduledAt: string | null; confirmed: true }
  | { action: "cancel"; announcementId: string; version: number; operationId: string; confirmed: true }
  | { action: "test-send"; announcementId: string; version: number; operationId: string }
  | { action: "layout-approval"; approved: boolean; operationId: string; confirmed: true }
  | { action: "render"; fields: AnnouncementFields }) & { formToken?: string };
export const announcementUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const announcementRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const announcementVersion = (value: unknown, min = 1): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= 2147483647;
export const isAnnouncementSegment = (value: unknown): value is AnnouncementSegment => typeof value === "string" && (ANNOUNCEMENT_SEGMENTS as readonly string[]).includes(value);
export function decodeAnnouncementSegments(value: unknown): AnnouncementSegment[] | null {
  return Array.isArray(value) && value.length <= ANNOUNCEMENT_SEGMENTS.length && value.every(isAnnouncementSegment) && new Set(value).size === value.length ? value : null;
}
export function decodeAnnouncementFields(value: unknown): AnnouncementFields | null {
  const row = announcementRecord(value), segments = decodeAnnouncementSegments(row?.segments);
  if (!row || !segments || !segments.length || !Object.keys(row).every((key) => ["subjectEn", "subjectAr", "bodyEn", "bodyAr", "segments"].includes(key))) return null;
  for (const key of ["subjectEn", "subjectAr", "bodyEn", "bodyAr"] as const) {
    const text = row[key];
    if (typeof text !== "string" || !text.trim() || text.length > (key.startsWith("subject") ? 90 : 3500)
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
      || key.startsWith("subject") && /[\r\n\t]/.test(text) || /<[!/?a-z][^>]*>/i.test(text)) return null;
  }
  return { subjectEn: row.subjectEn as string, subjectAr: row.subjectAr as string, bodyEn: row.bodyEn as string, bodyAr: row.bodyAr as string, segments };
}
const date = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export function decodeAnnouncementDelivery(value: unknown, runtimeReady: boolean): AnnouncementDelivery | null {
  const row = announcementRecord(value);
  return row && typeof row.layoutApproved === "boolean" && typeof row.deliveryEnabled === "boolean"
    && typeof row.sweepsEnabled === "boolean" && count(row.dailyCap) && row.dailyCap <= 100000
    ? { layoutApproved: row.layoutApproved, deliveryEnabled: row.deliveryEnabled, sweepsEnabled: row.sweepsEnabled, dailyCap: row.dailyCap, runtimeReady } : null;
}
export function announcementDeliveryReady(delivery: AnnouncementDelivery | undefined): boolean {
  return !!delivery && delivery.deliveryEnabled && delivery.sweepsEnabled && delivery.dailyCap > 0 && delivery.runtimeReady;
}
export function decodeAnnouncement(value: unknown): Announcement | null {
  const row = announcementRecord(value);
  if (!row) return null;
  const fields = decodeAnnouncementFields({ subjectEn: row.subjectEn, subjectAr: row.subjectAr, bodyEn: row.bodyEn, bodyAr: row.bodyAr, segments: row.segments });
  if (!fields || typeof row.id !== "string" || !announcementUuid.test(row.id) || typeof row.editionKey !== "string" || !row.editionKey || !announcementVersion(row.version)
    || !["draft", "scheduled", "sending", "sent", "cancelled"].includes(String(row.state)) || !date(row.createdAt) || !date(row.updatedAt)
    || row.scheduledAt !== null && !date(row.scheduledAt) || row.sentAt !== null && !date(row.sentAt)
    || !count(row.recipientCount) || !count(row.sentCount) || !count(row.failedCount)
    || row.lastError !== null && row.lastError !== undefined && row.lastError !== "audience_changed" && row.lastError !== "author_no_longer_authorized") return null;
  return { ...fields, id: row.id, editionKey: row.editionKey, state: row.state as Announcement["state"], version: row.version,
    createdAt: row.createdAt, updatedAt: row.updatedAt, scheduledAt: row.scheduledAt as string | null, sentAt: row.sentAt as string | null,
    recipientCount: row.recipientCount, sentCount: row.sentCount, failedCount: row.failedCount, lastError: row.lastError as string | null ?? null };
}
export function decodeAnnouncementPreview(value: unknown): AnnouncementPreview | null {
  const row = announcementRecord(value);
  if (!row || typeof row.previewToken !== "string" || !row.previewToken || row.previewToken.length > 2048 || !count(row.total)
    || !Array.isArray(row.segments) || row.segments.length > ANNOUNCEMENT_SEGMENTS.length || !Array.isArray(row.samples) || row.samples.length > 5) return null;
  const segments: AnnouncementPreview["segments"] = [];
  for (const value of row.segments) { const entry = announcementRecord(value); if (!entry || !isAnnouncementSegment(entry.segment) || !count(entry.count)) return null; segments.push({ segment: entry.segment, count: entry.count }); }
  if (new Set(segments.map((entry) => entry.segment)).size !== segments.length || !row.samples.every((sample) => typeof sample === "string" && sample.length <= 254 && /[*•]/.test(sample))) return null;
  return { previewToken: row.previewToken, total: row.total, segments, samples: row.samples as string[] };
}
