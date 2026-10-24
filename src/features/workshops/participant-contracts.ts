export type Workshop = {
  id: string; version: number; titleEn: string | null; titleAr: string | null;
  descriptionEn: string | null; descriptionAr: string | null; instructor: string | null; room: string | null;
  startAt: string | null; endAt: string | null; capacity: number | null; remaining: number | null;
  eligibilityEn: string | null; eligibilityAr: string | null; eligibilityRule: "confirmed_registration" | "priority" | null;
  priceMinor: number | null; currency: string | null; bookingDeadline: string | null; transferBufferMinutes: number | null;
  removed: boolean; published: boolean; ready: boolean;
};
export type WorkshopBookingStatus = "held" | "approved" | "confirmed" | "waitlisted" | "offered" | "declined" | "cancelled" | "expired";
export type WorkshopBooking = { id: string; workshopId: string; status: WorkshopBookingStatus; requestedAt: string;
  expiresAt: string | null; approvedAt: string | null; checkedInAt: string | null; completedAt: string | null; conflict: boolean; fullDiscount: boolean };
export type WorkshopParticipantAction = "request" | "waitlist" | "accept_offer" | "decline_offer" | "cancel" | "mock_pay" | "redeem_discount";
export type WorkshopParticipantResponse = { state: "ready" | "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited";
  workshops?: Workshop[]; bookings?: WorkshopBooking[]; serverNow?: string; formToken?: string; mockPaymentEnabled?: boolean;
  outcome?: "updated" | "conflict" | "full" | "expired" | "not_found" };

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number) => value === null || typeof value === "string" && value.length <= max;
const integer = (value: unknown) => value === null || Number.isSafeInteger(value) && Number(value) >= 0;
export const workshopTimestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const date = (value: unknown) => value === null || workshopTimestamp(value);
const workshopKeys = "bookingDeadline,capacity,currency,descriptionAr,descriptionEn,eligibilityAr,eligibilityEn,eligibilityRule,endAt,id,instructor,priceMinor,published,ready,remaining,removed,room,startAt,titleAr,titleEn,transferBufferMinutes,version";

/** The public/own-account contract is an allowlist. Never forward private rows. */
export function workshopProjection(value: unknown): Workshop[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const result: Workshop[] = [];
  for (const raw of value) {
    const row = record(raw);
    if (!row || Object.keys(row).sort().join(",") !== workshopKeys || typeof row.id !== "string" || !uuid.test(row.id)
      || !Number.isSafeInteger(row.version) || Number(row.version) < 1 || ![row.titleEn, row.titleAr].every((v) => text(v, 500))
      || ![row.descriptionEn, row.descriptionAr, row.eligibilityEn, row.eligibilityAr].every((v) => text(v, 10000))
      || ![row.instructor, row.room].every((v) => text(v, 500)) || ![row.startAt, row.endAt, row.bookingDeadline].every(date)
      || ![row.capacity, row.remaining, row.priceMinor, row.transferBufferMinutes].every(integer)
      || row.currency !== null && (typeof row.currency !== "string" || !/^[A-Z]{3}$/.test(row.currency))
      || ![null, "confirmed_registration", "priority"].includes(row.eligibilityRule as string | null)
      || typeof row.removed !== "boolean" || typeof row.published !== "boolean" || typeof row.ready !== "boolean" || result.some((entry) => entry.id === row.id)) return null;
    if (row.capacity === 0 || row.capacity === null && row.remaining !== null || row.capacity !== null && Number(row.remaining) > Number(row.capacity)
      || row.startAt && row.endAt && Date.parse(String(row.startAt)) >= Date.parse(String(row.endAt))) return null;
    if (row.ready && (row.removed || !row.published || [row.titleEn, row.titleAr, row.descriptionEn, row.descriptionAr, row.instructor, row.room, row.eligibilityEn, row.eligibilityAr]
      .some((value) => typeof value !== "string" || !value.trim()) || [row.startAt, row.endAt, row.capacity, row.remaining, row.priceMinor, row.currency, row.eligibilityRule, row.bookingDeadline, row.transferBufferMinutes].some((value) => value === null))) return null;
    result.push(row as Workshop);
  }
  return result;
}

export function workshopParticipantProjection(value: unknown): { workshops: Workshop[]; bookings: WorkshopBooking[]; serverNow: string; mockPaymentEnabled: boolean } | null {
  const data = record(value);
  if (!data || Object.keys(data).sort().join(",") !== "bookings,mockPaymentEnabled,serverNow,state,workshops" || data.state !== "ready" || !workshopTimestamp(data.serverNow) || typeof data.mockPaymentEnabled !== "boolean") return null;
  const workshops = workshopProjection(data.workshops);
  if (!workshops || !Array.isArray(data.bookings) || data.bookings.length > 1000) return null;
  const bookings: WorkshopBooking[] = [];
  for (const raw of data.bookings) {
    const row = record(raw);
    if (!row || Object.keys(row).sort().join(",") !== "approvedAt,checkedInAt,completedAt,conflict,expiresAt,fullDiscount,id,requestedAt,status,workshopId"
      || typeof row.id !== "string" || !uuid.test(row.id) || typeof row.workshopId !== "string" || !workshops.some((w) => w.id === row.workshopId)
      || !["held", "approved", "confirmed", "waitlisted", "offered", "declined", "cancelled", "expired"].includes(String(row.status))
      || !workshopTimestamp(row.requestedAt) || ![row.expiresAt, row.approvedAt, row.checkedInAt, row.completedAt].every(date)
      || typeof row.conflict !== "boolean" || typeof row.fullDiscount !== "boolean" || bookings.some((booking) => booking.id === row.id)) return null;
    bookings.push(row as WorkshopBooking);
  }
  return { workshops, bookings, serverNow: data.serverNow, mockPaymentEnabled: data.mockPaymentEnabled };
}
