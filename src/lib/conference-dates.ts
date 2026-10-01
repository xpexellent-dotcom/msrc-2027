import type { Locale } from "@/lib/i18n";

export type CalendarDate = `${number}-${number}-${number}`;
export type ConferenceDates = Readonly<{ day1: CalendarDate; day2: CalendarDate }>;
export type ConferenceCountdown =
  | { phase: "before"; days: number }
  | { phase: "day1" | "day2" | "after" };
export type ConferenceClockCountdown =
  | { phase: "before"; days: number; hours: number; minutes: number; seconds: number }
  | { phase: "day1" | "day2" | "after" };

const DAY_MS = 24 * 60 * 60 * 1000;
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const riyadhDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh", calendar: "gregory", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit",
});

/** Dates have no event start/end time. UTC is used only to compare calendar days. */
function calendarEpoch(date: CalendarDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError("Expected a Gregorian calendar date.");
  const [, year, month, day] = match;
  const epoch = Date.UTC(Number(year), Number(month) - 1, Number(day));
  if (new Date(epoch).toISOString().slice(0, 10) !== date) {
    throw new RangeError("Expected a valid Gregorian calendar date.");
  }
  return epoch;
}

function dateFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    calendar: "gregory", numberingSystem: locale === "ar" ? "arab" : "latn",
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
  });
}

export function formatConferenceDate(date: CalendarDate, locale: Locale): string {
  return dateFormatter(locale).format(calendarEpoch(date));
}

export function formatConferenceDateRange(dates: ConferenceDates, locale: Locale): string {
  return dateFormatter(locale).formatRange(calendarEpoch(dates.day1), calendarEpoch(dates.day2));
}

export function getRiyadhCalendarDate(now: Date): CalendarDate {
  const parts = riyadhDateFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}` as CalendarDate;
}

/** Display only. It cannot open a workflow or imply the time doors or sessions open. */
export function getConferenceCountdown(dates: ConferenceDates, today: CalendarDate): ConferenceCountdown {
  const current = calendarEpoch(today);
  const first = calendarEpoch(dates.day1);
  const second = calendarEpoch(dates.day2);
  if (second < first) throw new RangeError("Conference days must be in chronological order.");
  if (current < first) return { phase: "before", days: (first - current) / DAY_MS };
  if (current === first) return { phase: "day1" };
  if (current === second) return { phase: "day2" };
  return { phase: "after" };
}

/**
 * Counts to the start of the confirmed calendar date, not doors or session time.
 * Riyadh midnight is a display convention; it must never open an operational gate.
 */
export function getConferenceClockCountdown(dates: ConferenceDates, now: Date): ConferenceClockCountdown {
  const phase = getConferenceCountdown(dates, getRiyadhCalendarDate(now)).phase;
  if (phase !== "before") return { phase };
  const dateBoundary = calendarEpoch(dates.day1) - RIYADH_OFFSET_MS;
  // Retain the final displayed second until the date actually changes.
  const remainingSeconds = Math.ceil((dateBoundary - now.getTime()) / 1000);
  return {
    phase: "before",
    days: Math.floor(remainingSeconds / 86_400),
    hours: Math.floor((remainingSeconds % 86_400) / 3_600),
    minutes: Math.floor((remainingSeconds % 3_600) / 60),
    seconds: remainingSeconds % 60,
  };
}

/** Asia/Riyadh is UTC+03:00. This is a display refresh boundary, not an event time. */
export function millisecondsToNextRiyadhDay(now: Date): number {
  const today = calendarEpoch(getRiyadhCalendarDate(now));
  return today + DAY_MS - RIYADH_OFFSET_MS - now.getTime();
}

export type DayClockEnvironment = {
  now: () => Date;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
  onFocus: (callback: () => void) => () => void;
  onVisibilityChange: (callback: () => void) => () => void;
};

export type CountdownClockEnvironment = DayClockEnvironment & {
  isVisible: () => boolean;
};

/** Visible tabs tick on second boundaries; suspended tabs recalculate from the clock. */
export function subscribeToConferenceClock(
  onChange: () => void, clock: CountdownClockEnvironment, dates: ConferenceDates,
): () => void {
  let timer: number | undefined;
  let active = true;
  const schedule = () => {
    if (timer !== undefined) clock.cancel(timer);
    timer = undefined;
    if (!clock.isVisible()) return;
    const now = clock.now();
    const delay = getConferenceClockCountdown(dates, now).phase === "before"
      ? 1000 - (now.getTime() % 1000)
      : millisecondsToNextRiyadhDay(now);
    timer = clock.schedule(refresh, delay);
  };
  const refresh = () => {
    if (!active) return;
    onChange();
    schedule();
  };
  const removeFocus = clock.onFocus(refresh);
  const removeVisibility = clock.onVisibilityChange(refresh);
  schedule();
  return () => {
    active = false;
    if (timer !== undefined) clock.cancel(timer);
    removeFocus();
    removeVisibility();
  };
}

/** One timer per Riyadh day; focus/visibility refresh catches background-tab suspension. */
export function subscribeToRiyadhDayChange(onChange: () => void, clock: DayClockEnvironment): () => void {
  let timer: number | undefined;
  let active = true;
  const refresh = () => {
    if (!active) return;
    onChange();
    schedule();
  };
  const schedule = () => {
    if (timer !== undefined) clock.cancel(timer);
    timer = clock.schedule(refresh, millisecondsToNextRiyadhDay(clock.now()));
  };
  const removeFocus = clock.onFocus(refresh);
  const removeVisibility = clock.onVisibilityChange(refresh);
  schedule();
  return () => {
    active = false;
    if (timer !== undefined) clock.cancel(timer);
    removeFocus();
    removeVisibility();
  };
}
