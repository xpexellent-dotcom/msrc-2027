/** S1 CFG-01/02/07/10 and TIM-01: unknown business values stay unset. */
export interface ConferenceConfig {
  readonly edition: number;
  readonly timeZone: "Asia/Riyadh";
  readonly dates: Readonly<{ startsAt: string; endsAt: string }> | null;
  readonly venue: string | null;
  readonly registrationPrice: Readonly<{ amountMinor: number; currency: string }> | null;
  readonly conferenceCapacity: number | null;
  readonly workshopCapacity: number | null;
  readonly production: Readonly<{ vercelRegion: string | null; supabaseRegion: string | null }>;
}

export const conferenceConfig: ConferenceConfig = Object.freeze({
  edition: 2027,
  timeZone: "Asia/Riyadh",
  dates: null,
  venue: null,
  registrationPrice: null,
  conferenceCapacity: null,
  workshopCapacity: null,
  production: Object.freeze({ vercelRegion: null, supabaseRegion: null }),
});
