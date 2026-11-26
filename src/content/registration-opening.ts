import type { Locale } from "@/lib/i18n";

/** Public notice only. Revised opening and closing dates are awaiting confirmation. */
export const registrationOpeningCopy = {
  en: {
    title: "Registration dates",
    opening: "Registration opens",
    closing: "Registration closes",
    pending: "To be announced",
    attendance: "Free attendance",
  },
  ar: {
    title: "مواعيد التسجيل",
    opening: "فتح التسجيل",
    closing: "إغلاق التسجيل",
    pending: "سيُعلن لاحقًا",
    attendance: "الحضور مجاني",
  },
} as const;

// Hand-rolled rather than Intl: these strings render inside client components,
// and Node and WebKit ICU disagree on details such as "8 pm" vs "8 PM", which
// breaks hydration. Riyadh is UTC+3 with no daylight saving.
const riyadhOffsetMs = 3 * 60 * 60 * 1000;
const weekdays = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
} as const;
const months = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
} as const;

function riyadhParts(instant: string) {
  const d = new Date(new Date(instant).getTime() + riyadhOffsetMs);
  return { weekday: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function digits(value: number | string, locale: Locale): string {
  const text = String(value);
  return locale === "ar" ? text.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : text;
}

export function formatRegistrationOpeningDate(instant: string, locale: Locale, weekday = true): string {
  const p = riyadhParts(instant);
  const date = digits(p.day, locale) + " " + months[locale][p.month] + " " + digits(p.year, locale);
  if (!weekday) return date;
  return weekdays[locale][p.weekday] + (locale === "ar" ? "، " : ", ") + date;
}

export function formatRegistrationOpeningTime(instant: string, locale: Locale): string {
  const p = riyadhParts(instant);
  const hour = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const clock = p.minute === 0 ? String(hour) : hour + ":" + String(p.minute).padStart(2, "0");
  const period = p.hour < 12 ? (locale === "ar" ? "ص" : "am") : (locale === "ar" ? "م" : "pm");
  return digits(clock, locale) + " " + period;
}
