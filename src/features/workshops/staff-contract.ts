/** ENG-074 / WKS-01..07 / CHK-03: private workshop projections and bounded input. */
export const workshopUuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export const workshopRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const integer = (value: unknown, minimum = 0): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
const date = (value: unknown): value is string => typeof value === "string" && value.length <= 40 && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const text = (value: unknown, max = 4000): value is string => typeof value === "string" && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export const WORKSHOP_TEXT_FIELDS = ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "instructor", "room", "eligibilityEn", "eligibilityAr"] as const;
export const WORKSHOP_DATE_FIELDS = ["startAt", "endAt", "bookingDeadline"] as const;
export const WORKSHOP_NUMBER_FIELDS = ["capacity", "priceMinor", "transferBufferMinutes"] as const;
export type WorkshopFields = Record<typeof WORKSHOP_TEXT_FIELDS[number], string | null> & Record<typeof WORKSHOP_DATE_FIELDS[number], string | null> & Record<typeof WORKSHOP_NUMBER_FIELDS[number], number | null> & {
  id: string | null; version: number; instructorActorId: string | null; currency: string | null; eligibilityRule: "confirmed_registration" | "priority" | null; published: boolean;
};
export type StaffWorkshop = WorkshopFields & { id: string; remaining: number | null; removed: boolean; ready: boolean; canManage: boolean; canCheckin: boolean; canComplete: boolean };
export type WorkshopPolicy = { enabled: boolean; holdHours: number | null; offerHours: number | null; mockPaymentEnabled: boolean };
export const WORKSHOP_BOOKING_STATUSES = ["held", "pending_approval", "approved", "approved_awaiting_payment", "confirmed", "waitlisted", "offered", "cancelled", "declined", "expired"] as const;
export type WorkshopBooking = { id: string; workshopId: string; actorId: string; status: typeof WORKSHOP_BOOKING_STATUSES[number]; requestedAt: string; expiresAt: string | null; approvedAt: string | null; checkedInAt: string | null; completedAt: string | null; fullDiscount: boolean; conflict: boolean };
export type WorkshopReservation = { id: string; workshopId: string; seats: number; releaseAt: string; reason: string; releasedAt: string | null };
export type WorkshopConflict = { id: string; bookingId: string; otherBookingId: string; createdAt: string; resolvedAt: string | null };
export type WorkshopStaffView = { policy: WorkshopPolicy | null; workshops: StaffWorkshop[]; bookings: WorkshopBooking[]; reservations: WorkshopReservation[]; conflicts: WorkshopConflict[] };
export type WorkshopStaffPayload = { action: string; operationId: string; formToken?: string; workshop?: WorkshopFields; policy?: WorkshopPolicy; reason?: string; bookingId?: string; workshopId?: string; reservationId?: string; expiresAt?: string; releaseAt?: string; seats?: number };
export type WorkshopStaffResponse = Partial<WorkshopStaffView> & { state: string; formToken?: string };

export function emptyWorkshopFields(): WorkshopFields { return { id: null, version: 0, titleEn: null, titleAr: null, descriptionEn: null, descriptionAr: null, instructor: null, instructorActorId: null, room: null, startAt: null, endAt: null, capacity: null, eligibilityEn: null, eligibilityAr: null, eligibilityRule: null, priceMinor: null, currency: null, bookingDeadline: null, transferBufferMinutes: null, published: false }; }
export function decodeWorkshopFields(value: unknown): WorkshopFields | null {
  const row = workshopRecord(value); if (!row || typeof row.published !== "boolean" || row.id !== null && !workshopUuid(row.id) || !integer(row.version) || row.id === null && row.version !== 0 || row.id !== null && row.version < 1) return null;
  const result = emptyWorkshopFields(); result.id = row.id as string | null; result.version = row.version;
  for (const key of WORKSHOP_TEXT_FIELDS) { if (row[key] !== null && !text(row[key], key.startsWith("description") ? 5000 : key.startsWith("eligibility") ? 1000 : 200)) return null; result[key] = typeof row[key] === "string" ? row[key].trim() || null : null; }
  for (const key of WORKSHOP_DATE_FIELDS) { if (row[key] !== null && !date(row[key])) return null; result[key] = row[key] as string | null; }
  for (const key of WORKSHOP_NUMBER_FIELDS) { if (row[key] !== null && (!integer(row[key], key === "capacity" ? 1 : 0) || Number(row[key]) > (key === "transferBufferMinutes" ? 1440 : 2147483647))) return null; result[key] = row[key] as number | null; }
  if (row.instructorActorId !== null && !workshopUuid(row.instructorActorId) || row.currency !== null && (typeof row.currency !== "string" || !/^[A-Z]{3}$/.test(row.currency)) || ![null, "confirmed_registration", "priority"].includes(row.eligibilityRule as string | null)) return null;
  if (result.startAt && result.endAt && Date.parse(result.startAt) >= Date.parse(result.endAt)) return null;
  if (result.bookingDeadline && result.startAt && Date.parse(result.bookingDeadline) > Date.parse(result.startAt)) return null;
  result.instructorActorId = row.instructorActorId as string | null; result.currency = row.currency as string | null; result.eligibilityRule = row.eligibilityRule as WorkshopFields["eligibilityRule"]; result.published = row.published;
  return result;
}
export function decodeWorkshopPolicy(value: unknown): WorkshopPolicy | null {
  const row = workshopRecord(value); return row && typeof row.enabled === "boolean" && typeof row.mockPaymentEnabled === "boolean" && [row.holdHours, row.offerHours].every((item) => item === null || integer(item, 1) && item <= 8760) ? { enabled: row.enabled, mockPaymentEnabled: row.mockPaymentEnabled, holdHours: row.holdHours as number | null, offerHours: row.offerHours as number | null } : null;
}
export function decodeWorkshopStaffPayload(value: unknown): WorkshopStaffPayload | null {
  const row = workshopRecord(value); if (!row || !workshopUuid(row.operationId) || typeof row.action !== "string") return null;
  const result: WorkshopStaffPayload = { action: row.action, operationId: row.operationId };
  const allowed = (...keys: string[]) => Object.keys(row).every((key) => ["action", "operationId", "formToken", ...keys].includes(key));
  const reason = () => text(row.reason, 300) && !!row.reason.trim() && !/[\u0000-\u001f\u007f]/.test(row.reason);
  if (row.action === "save_workshop") { const workshop = decodeWorkshopFields(row.workshop); return allowed("workshop", "reason") && workshop && Object.keys(workshopRecord(row.workshop)!).every((key) => Object.hasOwn(workshop, key)) && reason() ? { ...result, workshop, reason: row.reason as string } : null; }
  if (row.action === "save_policy") { const policy = decodeWorkshopPolicy(row.policy); return allowed("policy", "reason") && policy && Object.keys(workshopRecord(row.policy)!).every((key) => Object.hasOwn(policy, key)) && reason() ? { ...result, policy, reason: row.reason as string } : null; }
  if (["approve", "decline", "cancel", "extend", "resolve_conflict", "validate_discount"].includes(row.action)) return allowed("bookingId", "reason", ...(row.action === "extend" ? ["expiresAt"] : [])) && workshopUuid(row.bookingId) && reason() && (row.action !== "extend" || date(row.expiresAt)) ? { ...result, bookingId: row.bookingId, reason: row.reason as string, ...(row.action === "extend" ? { expiresAt: row.expiresAt as string } : {}) } : null;
  if (["checkin", "complete"].includes(row.action)) return allowed("bookingId") && workshopUuid(row.bookingId) ? { ...result, bookingId: row.bookingId } : null;
  if (row.action === "reserve") return allowed("workshopId", "seats", "releaseAt", "reason") && workshopUuid(row.workshopId) && integer(row.seats, 1) && date(row.releaseAt) && reason() ? { ...result, workshopId: row.workshopId, seats: row.seats, releaseAt: row.releaseAt, reason: row.reason as string } : null;
  if (row.action === "release_reservation") return allowed("reservationId", "reason") && workshopUuid(row.reservationId) && reason() ? { ...result, reservationId: row.reservationId, reason: row.reason as string } : null;
  if (row.action === "remove") return allowed("workshopId", "reason") && workshopUuid(row.workshopId) && reason() ? { ...result, workshopId: row.workshopId, reason: row.reason as string } : null;
  if (row.action === "offer_next") return allowed("workshopId") && workshopUuid(row.workshopId) ? { ...result, workshopId: row.workshopId } : null;
  return null;
}
export function decodeWorkshopStaffView(value: unknown): WorkshopStaffView | null {
  const row = workshopRecord(value), policy = decodeWorkshopPolicy(row?.policy); if (!row || row.policy !== null && !policy || !["workshops", "bookings", "reservations", "conflicts"].every((key) => Array.isArray(row[key]) && row[key].length <= 5000)) return null;
  const result: WorkshopStaffView = { policy, workshops: [], bookings: [], reservations: [], conflicts: [] };
  for (const raw of row.workshops as unknown[]) { const item = workshopRecord(raw), fields = decodeWorkshopFields(raw); if (!item || !fields || !fields.id || typeof item.ready !== "boolean" || typeof item.removed !== "boolean" || ["canManage", "canCheckin", "canComplete"].some((key) => typeof item[key] !== "boolean") || item.remaining !== null && !integer(item.remaining)) return null; result.workshops.push({ ...fields, id: fields.id, ready: item.ready, removed: item.removed, remaining: item.remaining as number | null, canManage: item.canManage as boolean, canCheckin: item.canCheckin as boolean, canComplete: item.canComplete as boolean }); }
  for (const raw of row.bookings as unknown[]) { const item = workshopRecord(raw); if (!item || !workshopUuid(item.id) || !workshopUuid(item.workshopId) || !workshopUuid(item.actorId) || typeof item.fullDiscount !== "boolean" || typeof item.conflict !== "boolean" || !WORKSHOP_BOOKING_STATUSES.includes(item.status as WorkshopBooking["status"]) || !date(item.requestedAt)) return null; const nullable = ["expiresAt", "approvedAt", "checkedInAt", "completedAt"] as const; if (nullable.some((key) => item[key] !== null && !date(item[key]))) return null; result.bookings.push({ id: item.id, workshopId: item.workshopId, actorId: item.actorId, status: item.status as WorkshopBooking["status"], requestedAt: item.requestedAt, expiresAt: item.expiresAt as string | null, approvedAt: item.approvedAt as string | null, checkedInAt: item.checkedInAt as string | null, completedAt: item.completedAt as string | null, fullDiscount: item.fullDiscount, conflict: item.conflict }); }
  for (const raw of row.reservations as unknown[]) { const item = workshopRecord(raw); if (!item || !workshopUuid(item.id) || !workshopUuid(item.workshopId) || !integer(item.seats, 1) || !date(item.releaseAt) || !text(item.reason, 2000) || item.releasedAt !== null && !date(item.releasedAt)) return null; result.reservations.push({ id: item.id, workshopId: item.workshopId, seats: item.seats, releaseAt: item.releaseAt, reason: item.reason, releasedAt: item.releasedAt as string | null }); }
  for (const raw of row.conflicts as unknown[]) { const item = workshopRecord(raw); if (!item || !workshopUuid(item.id) || !workshopUuid(item.bookingId) || !workshopUuid(item.otherBookingId) || !date(item.createdAt) || item.resolvedAt !== null && !date(item.resolvedAt)) return null; result.conflicts.push({ id: item.id, bookingId: item.bookingId, otherBookingId: item.otherBookingId, createdAt: item.createdAt, resolvedAt: item.resolvedAt as string | null }); }
  if ([result.workshops, result.bookings, result.reservations, result.conflicts].some((items) => new Set(items.map((item) => item.id)).size !== items.length)) return null;
  return result;
}
