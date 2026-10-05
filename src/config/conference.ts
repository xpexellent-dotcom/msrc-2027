import type { CalendarDate } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

export type LocalizedVenueText = Readonly<Record<Locale, string>>;
export type VenueTravelMode = "taxi" | "train" | "rental";
export type VenueVisitorInfoKey = "entryGate" | "ticket" | "parking" | "accessibility" | "onSite" | "wifi";

export interface ConferenceVenue {
  readonly name: LocalizedVenueText;
  readonly address: Readonly<{
    streetAddress: LocalizedVenueText;
    addressLocality: "Jeddah";
    postalCode: "22254";
    addressCountry: "SA";
  }>;
  readonly directionsUrl: string;
  /** Organizer-supplied guidance only; absent details stay out of the public interface. */
  readonly travelTimes?: Readonly<Partial<Record<VenueTravelMode, LocalizedVenueText>>>;
  readonly atVenue?: Readonly<Partial<Record<VenueVisitorInfoKey, LocalizedVenueText>>>;
}

/** S1 CFG-01/02/07/10 and TIM-01: confirmed days are dates, not invented opening instants. */
export interface ConferenceConfig {
  readonly edition: number;
  readonly timeZone: "Asia/Riyadh";
  readonly dates: Readonly<{ day1: CalendarDate; day2: CalendarDate }> | null;
  readonly venue: ConferenceVenue | null;
  readonly registrationPrice: Readonly<{ amountMinor: number; currency: string }> | null;
  readonly conferenceCapacity: number | null;
  readonly workshopCapacity: number | null;
  readonly production: Readonly<{ vercelRegion: string | null; supabaseRegion: string | null }>;
}

export const conferenceConfig: ConferenceConfig = Object.freeze({
  edition: 2027,
  timeZone: "Asia/Riyadh",
  dates: Object.freeze({ day1: "2027-01-27", day2: "2027-01-28" }),
  // ORG-031 / CFG-01: venue confirmed on 5 October 2026; rooms and times remain unset.
  venue: Object.freeze({
    name: Object.freeze({ en: "King Faisal Conference Center", ar: "مركز الملك فيصل للمؤتمرات" }),
    address: Object.freeze({
      streetAddress: Object.freeze({ en: "Abdullah Sulayman St, King Abdulaziz University", ar: "شارع عبدالله سليمان، جامعة الملك عبدالعزيز" }),
      addressLocality: "Jeddah",
      postalCode: "22254",
      addressCountry: "SA",
    }),
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=King%20Faisal%20Conference%20Center%2C%20Abdullah%20Sulayman%20St%2C%20King%20Abdulaziz%20University%2C%20Jeddah%2022254",
    travelTimes: Object.freeze({
      taxi: Object.freeze({
        en: "About 35–40 minutes by car from King Abdulaziz International Airport",
        ar: "نحو ٣٥–٤٠ دقيقة بالسيارة من مطار الملك عبدالعزيز الدولي",
      }),
      rental: Object.freeze({
        en: "About 35–40 minutes by car from King Abdulaziz International Airport",
        ar: "نحو ٣٥–٤٠ دقيقة بالسيارة من مطار الملك عبدالعزيز الدولي",
      }),
    }),
    atVenue: Object.freeze({
      entryGate: Object.freeze({
        en: "Enter King Abdulaziz University through the Main Gate (Wing Gate). There are no checks at the university gate.",
        ar: "ادخل جامعة الملك عبدالعزيز من البوابة الرئيسية (بوابة الطير). لا يوجد تفتيش عند بوابة الجامعة.",
      }),
      ticket: Object.freeze({
        en: "Your QR ticket is checked at the conference entrance. Save it on your phone before you arrive.",
        ar: "يُتحقق من تذكرتك (رمز QR) عند مدخل المؤتمر. احفظها على هاتفك قبل وصولك.",
      }),
      parking: Object.freeze({
        en: "Parking is available, including accessible parking spaces.",
        ar: "تتوفر مواقف للسيارات، بما فيها مواقف مخصصة لذوي الإعاقة.",
      }),
      accessibility: Object.freeze({
        en: "Need accessibility support? Our organizers on site can help. You can also let us know before the event through the contact form.",
        ar: "تحتاج إلى مساعدة في الوصول؟ يسعد المنظمون في الموقع بمساعدتك. ويمكنك إبلاغنا مسبقًا عبر نموذج التواصل.",
      }),
      onSite: Object.freeze({
        en: "Prayer areas and food are available.",
        ar: "تتوفر مصليات وأماكن للطعام.",
      }),
      wifi: Object.freeze({
        en: "Wi-Fi is available but may be unreliable. Please use mobile data and save your ticket offline.",
        ar: "تتوفر شبكة Wi-Fi لكنها قد تكون غير مستقرة. يُنصح باستخدام بيانات الجوال وحفظ التذكرة مسبقًا.",
      }),
    }),
  }),
  registrationPrice: null,
  conferenceCapacity: null,
  workshopCapacity: null,
  production: Object.freeze({ vercelRegion: null, supabaseRegion: null }),
});
