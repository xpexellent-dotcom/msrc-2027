import type { Locale } from "@/lib/i18n";
import { formatRegistrationOpeningDate, formatRegistrationOpeningTime } from "@/content/registration-opening";
export function formatSubmissionOpening(instant: string, locale: Locale): string {
  return `${locale === "ar" ? "يُفتح التقديم في" : "Submissions open on"} ${formatWindowInstant(instant, locale)}`;
}
export function formatWindowInstant(instant: string, locale: Locale): string {
  return `${formatRegistrationOpeningDate(instant, locale, false)}, ${formatRegistrationOpeningTime(instant, locale)} (${locale === "ar" ? "توقيت الرياض" : "Riyadh time"})`;
}
