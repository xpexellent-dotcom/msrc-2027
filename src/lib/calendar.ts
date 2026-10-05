import { conferenceConfig } from "@/config/conference";
import type { CalendarDate } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";
import { siteOrigin } from "@/lib/metadata";

/**
 * "Add to calendar" for the confirmed days (ORG-001): one all-day event over 27–28 January.
 * Date-only on purpose: no doors or session times exist yet (TIM-01). The venue is confirmed
 * by ORG-031. Both languages share one UID, so a calendar keeps a single event whichever
 * file is added.
 */
const copy: Record<Locale, { summary: string; location: string; description: string }> = {
  en: {
    summary: "MSRC 2027 | The 5th Medical Students Research Conference",
    location: "Jeddah, Saudi Arabia",
    description: "Confirmed conference days and venue. Session times, doors and rooms will be announced.",
  },
  ar: {
    summary: "MSRC 2027 | المؤتمر الخامس لأبحاث طلاب الطب",
    location: "جدة، المملكة العربية السعودية",
    description: "أيام المؤتمر ومقره مؤكدة. ستُعلن مواعيد الجلسات وفتح الأبواب والقاعات لاحقًا.",
  },
};

// RFC 5545 §3.3.11 text escaping.
const text = (value: string) => value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\r?\n/g, "\\n");
const icsDate = (date: CalendarDate) => date.replaceAll("-", "");

/** The day after a calendar date: an all-day DTEND is exclusive. */
function nextDay(date: CalendarDate): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10).replaceAll("-", "");
}

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const character of line) {
    const limit = parts.length ? 74 : 75;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = character;
    } else current += character;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function conferenceCalendar(locale: Locale): string | null {
  const dates = conferenceConfig.dates;
  if (!dates) return null;
  const event = copy[locale];
  const venue = conferenceConfig.venue;
  const location = venue ? `${venue.name[locale]}, ${venue.address.streetAddress[locale]}, ${locale === "ar" ? "جدة" : venue.address.addressLocality} ${venue.address.postalCode}, ${locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia"}` : event.location;
  const page = `${siteOrigin}/${locale}/dates-venue`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MSRC 2027//www.msrc2027.com//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:msrc-2027-conference@msrc2027.com",
    // The latest confirmed event revision (ORG-031), so every build produces the same file.
    "DTSTAMP:20261005T000000Z",
    `DTSTART;VALUE=DATE:${icsDate(dates.day1)}`,
    `DTEND;VALUE=DATE:${nextDay(dates.day2)}`,
    `SUMMARY:${text(event.summary)}`,
    `LOCATION:${text(location)}`,
    `DESCRIPTION:${text(`${event.description} ${page}`)}`,
    `URL:${page}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
