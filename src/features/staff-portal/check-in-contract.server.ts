import "server-only";
import { staffUuid } from "./security.server";
import type { StaffCheckInResult, StaffCheckInStatus, StaffCheckInView } from "./ui-contract";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).sort().join(",") === keys.sort().join(",");
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function checkInDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01"
    && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
}

/** Reject unexpected identity/credential fields before the private scanner projection. */
export function checkInSummaryProjection(value: unknown, requestedDay: string | null): StaffCheckInView | null {
  const row = record(value), counts = record(row?.counts);
  if (!row || !exact(row, ["state", "conferenceDays", "day", "counts"]) || row.state !== "ready"
    || row.day !== requestedDay || !counts || !exact(counts, ["checkedIn", "scan", "manualCode"])
    || !count(counts.checkedIn) || !count(counts.scan) || !count(counts.manualCode)
    || counts.scan + counts.manualCode !== counts.checkedIn) return null;
  if (row.conferenceDays !== null && (!Array.isArray(row.conferenceDays) || row.conferenceDays.length > 31
    || row.conferenceDays.some((day, index, days) => !checkInDay(day) || index > 0 && day <= days[index - 1]))) return null;
  const conferenceDays = row.conferenceDays as string[] | null;
  if (requestedDay && !conferenceDays?.includes(requestedDay) || !requestedDay && counts.checkedIn !== 0) return null;
  return { conferenceDays, summary: { day: requestedDay, checkedIn: counts.checkedIn, scan: counts.scan, manualCode: counts.manualCode } };
}

export function checkInResultProjection(value: unknown, requestedDay: string): StaffCheckInResult | null {
  const row = record(value);
  if (!row || typeof row.state !== "string") return null;
  if (["revoked", "not_found", "wrong_day", "not_approved"].includes(row.state)) {
    return exact(row, ["state"]) ? { status: row.state as StaffCheckInStatus } : null;
  }
  if (!["checked_in", "already_checked_in"].includes(row.state) || !exact(row, ["state", "attendance"])) return null;
  const item = record(row.attendance);
  if (!item || !exact(item, ["id", "conferenceDay", "checkedInAt", "performerId", "performerName", "entryPoint", "method"])
    || typeof item.id !== "string" || !staffUuid.test(item.id) || item.conferenceDay !== requestedDay
    || typeof item.checkedInAt !== "string" || item.checkedInAt.length > 64 || !Number.isFinite(Date.parse(item.checkedInAt))
    || item.performerId !== null && (typeof item.performerId !== "string" || !staffUuid.test(item.performerId))
    || item.performerName !== null && (typeof item.performerName !== "string" || !item.performerName.trim() || item.performerName.length > 200 || /[\x00-\x1f\x7f]/.test(item.performerName))
    || item.entryPoint !== null && (typeof item.entryPoint !== "string" || item.entryPoint.length > 120 || /[\x00-\x1f\x7f]/.test(item.entryPoint))
    || !["scan", "manual_code"].includes(String(item.method))) return null;
  return { status: row.state as StaffCheckInStatus, attendanceId: item.id, checkedInAt: item.checkedInAt,
    ...(item.performerName || item.performerId ? { performedBy: (item.performerName ?? item.performerId) as string } : {}) };
}

export function checkInUndoProjection(value: unknown): boolean {
  const row = record(value);
  return !!row && exact(row, ["state"]) && ["undone", "already_undone"].includes(String(row.state));
}
