import type { PublicSession } from "@/content/conference-experiences";
import type { ContentFields } from "@/features/staff-portal/content-contract";
import type { Locale } from "@/lib/i18n";

/** PRG-01: Riyadh is UTC+3 without daylight saving. No runtime ICU dependency. */
export function formatProgramTime(instant: string | null, locale: Locale): string | null {
  if (!instant || !/(Z|[+-]\d{2}:\d{2})$/.test(instant)) return null;
  const date = new Date(Date.parse(instant) + 3 * 60 * 60 * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  const clock = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return locale === "ar" ? clock.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : clock;
}

/** Exact start/end slots contain parallel rooms; slots always run chronologically. */
export function groupProgramSlots(sessions: readonly PublicSession[]) {
  const slots = new Map<string, PublicSession[]>();
  for (const session of sessions.filter((item) => item.publication === "approved")) {
    const key = `${session.day}/${session.startAt ?? ""}/${session.endAt ?? ""}`;
    slots.set(key, [...slots.get(key) ?? [], session]);
  }
  return [...slots.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key,
    sessions: rows.sort((a, b) => (a.room ?? "").localeCompare(b.room ?? "") || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.slug.localeCompare(b.slug)) }));
}

export function invalidSessionRange(fields: ContentFields) {
  return !!fields.startTime && !!fields.endTime && fields.endTime <= fields.startTime;
}
const roomKey = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
/** Advisory only: drafts may intentionally overlap. Publishing retains existing DB guards. */
export function sessionsOverlap(a: ContentFields, b: ContentFields) {
  return !!a.day && a.day === b.day && !invalidSessionRange(a) && !invalidSessionRange(b)
    && !!a.startTime && !!a.endTime && !!b.startTime && !!b.endTime
    && ((!!roomKey(a.roomEn) && roomKey(a.roomEn) === roomKey(b.roomEn)) || (!!roomKey(a.roomAr) && roomKey(a.roomAr) === roomKey(b.roomAr)))
    && a.startTime < b.endTime && b.startTime < a.endTime;
}
