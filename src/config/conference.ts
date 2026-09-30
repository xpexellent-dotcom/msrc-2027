import type { CalendarDate } from "@/lib/conference-dates";

/** S1 CFG-01/02/07/10 and TIM-01: confirmed days are dates, not invented opening instants. */
export interface ConferenceConfig {
  readonly edition: number;
  readonly timeZone: "Asia/Riyadh";
  readonly dates: Readonly<{ day1: CalendarDate; day2: CalendarDate }> | null;
  readonly venue: string | null;
  readonly registrationPrice: Readonly<{ amountMinor: number; currency: string }> | null;
  readonly conferenceCapacity: number | null;
  readonly workshopCapacity: number | null;
  readonly production: Readonly<{ vercelRegion: string | null; supabaseRegion: string | null }>;
}

export const conferenceConfig: ConferenceConfig = Object.freeze({
  edition: 2027,
  timeZone: "Asia/Riyadh",
  dates: Object.freeze({ day1: "2027-01-27", day2: "2027-01-28" }),
  venue: null,
  registrationPrice: null,
  conferenceCapacity: null,
  workshopCapacity: null,
  production: Object.freeze({ vercelRegion: null, supabaseRegion: null }),
});
