import type { Locale } from "@/lib/i18n";

/**
 * ORG-056 opening announcement; ORG-057 closing date. Public display only.
 * Database registration settings remain authoritative for actual access;
 * these dates are not defaults, seeds or inputs to registration logic.
 */
export const registrationOpeningDates = {
  earlyAccess: "2026-11-15T20:00:00+03:00",
  general: "2026-11-18T20:00:00+03:00",
  closing: "2027-01-26T23:59:00+03:00",
} as const;

export const registrationOpeningCopy = {
  en: {
    title: "Registration opens",
    timezone: "All times are Riyadh time.",
    earlyAccess: "Early access",
    earlyAccessEligibility: "For people on the organizers’ early-access list.",
    general: "For everyone",
    closing: "Registration closes",
    attendance: "Free attendance. Seats require organizer approval.",
    summary: "General registration opens",
    summarySuffix: "Riyadh time · Free attendance",
  },
  ar: {
    title: "مواعيد فتح التسجيل",
    timezone: "جميع المواعيد بتوقيت الرياض.",
    earlyAccess: "التسجيل المبكر",
    earlyAccessEligibility: "للمدرجين في قائمة التسجيل المبكر لدى المنظّمين.",
    general: "التسجيل للجميع",
    closing: "يُغلق التسجيل",
    attendance: "الحضور مجاني. تأكيد المقاعد يتطلب موافقة المنظّمين.",
    summary: "يُفتح التسجيل للجميع",
    summarySuffix: "بتوقيت الرياض · الحضور مجاني",
  },
} as const;

export function formatRegistrationOpeningDate(instant: string, locale: Locale, weekday = true): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    calendar: "gregory", numberingSystem: locale === "ar" ? "arab" : "latn",
    timeZone: "Asia/Riyadh", weekday: weekday ? "long" : undefined,
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(instant));
}

export function formatRegistrationOpeningTime(instant: string, locale: Locale): string {
  const date = new Date(instant);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    calendar: "gregory", numberingSystem: locale === "ar" ? "arab" : "latn",
    timeZone: "Asia/Riyadh", hour: "numeric", hour12: true,
    minute: date.getUTCMinutes() === 0 ? undefined : "2-digit",
  }).format(date);
}
