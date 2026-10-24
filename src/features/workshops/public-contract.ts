import type { PublicWorkshop } from "@/content/conference-experiences";
import type { Locale } from "@/lib/i18n";
import { workshopProjection } from "./participant-contracts";

export function publicWorkshopProjection(value: unknown): PublicWorkshop[] | null {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!row || Object.keys(row).sort().join(",") !== "state,workshops" || row.state !== "ready") return null;
  const workshops = workshopProjection(row.workshops);
  if (!workshops || workshops.some((workshop) => workshop.removed || !workshop.published)) return null;
  const price = (amount: number | null, currency: string | null, locale: Locale) => amount !== null && currency
    ? new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { style: "currency", currency }).format(amount / 100) : null;
  return workshops.map((workshop) => ({ slug: workshop.id, publication: "approved", title: { en: workshop.titleEn ?? "Workshop details pending", ar: workshop.titleAr ?? "تفاصيل الورشة قيد الإعداد" },
    description: { en: workshop.descriptionEn ?? "", ar: workshop.descriptionAr ?? "" }, instructorSlugs: [], instructor: workshop.instructor,
    startAt: workshop.startAt, endAt: workshop.endAt, room: workshop.room, eligibility: workshop.eligibilityEn || workshop.eligibilityAr ? { en: workshop.eligibilityEn ?? "", ar: workshop.eligibilityAr ?? "" } : null,
    priceLabel: workshop.priceMinor !== null && workshop.currency ? { en: price(workshop.priceMinor, workshop.currency, "en")!, ar: price(workshop.priceMinor, workshop.currency, "ar")! } : null,
    capacity: workshop.capacity, remainingSeats: workshop.remaining, bookingDeadline: workshop.bookingDeadline, transferBufferMinutes: workshop.transferBufferMinutes,
    bookingAvailable: workshop.ready,
  }));
}
