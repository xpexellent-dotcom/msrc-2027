import type { CalendarDate } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

export interface ConferenceVenue {
  readonly name: Readonly<Record<Locale, string>>;
  readonly address: Readonly<{
    streetAddress: Readonly<Record<Locale, string>>;
    addressLocality: "Jeddah";
    postalCode: "22254";
    addressCountry: "SA";
  }>;
  readonly directionsUrl: string;
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
  }),
  registrationPrice: null,
  conferenceCapacity: null,
  workshopCapacity: null,
  production: Object.freeze({ vercelRegion: null, supabaseRegion: null }),
});
