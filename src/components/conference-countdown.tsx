"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  formatConferenceDate, getConferenceClockCountdown, subscribeToConferenceClock, type ConferenceDates,
} from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

function subscribe(onChange: () => void, dates: ConferenceDates) {
  return subscribeToConferenceClock(onChange, {
    now: () => new Date(),
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancel: (timer) => window.clearTimeout(timer),
    onFocus: (callback) => {
      window.addEventListener("focus", callback);
      return () => window.removeEventListener("focus", callback);
    },
    onVisibilityChange: (callback) => {
      document.addEventListener("visibilitychange", callback);
      return () => document.removeEventListener("visibilitychange", callback);
    },
    isVisible: () => document.visibilityState === "visible",
  }, dates);
}

// A primitive, second-resolution snapshot stays stable between clock updates.
const getSnapshot = () => Math.floor(Date.now() / 1000);
// A cached HTML page must never contain a countdown number calculated at build time.
const getServerSnapshot = () => null;

/**
 * The counted noun CLDR uses after a numeral. Plural categories alone mislabel Arabic
 * zero and 100–102: «٠ يوم» and «١٠٠ يوم», not «يومًا». Others: «٣ أيام», «١١ يومًا».
 */
export function countdownDayUnit(days: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { style: "unit", unit: "day", unitDisplay: "long" })
    .formatToParts(days).filter((part) => part.type === "unit").map((part) => part.value).join("");
}

export function ConferenceCountdown({ dates, locale, dateRange }: { dates: ConferenceDates; locale: Locale; dateRange: string }) {
  const subscribeToClock = useCallback((onChange: () => void) => subscribe(onChange, dates), [dates]);
  const currentSecond = useSyncExternalStore(subscribeToClock, getSnapshot, getServerSnapshot);
  const countdown = currentSecond !== null ? getConferenceClockCountdown(dates, new Date(currentSecond * 1000)) : null;
  const label = countdown?.phase === "before"
    ? locale === "ar" ? "العدّ التنازلي" : "Until MSRC 2027"
    : countdown?.phase === "day1"
      ? locale === "ar" ? "اليوم هو اليوم الأول للمؤتمر" : "Day 1 is today"
      : countdown?.phase === "day2"
        ? locale === "ar" ? "اليوم هو اليوم الثاني للمؤتمر" : "Day 2 is today"
        : locale === "ar" ? "مواعيد المؤتمر المؤكدة" : "Confirmed conference dates";

  const number = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    numberingSystem: locale === "ar" ? "arab" : "latn", useGrouping: false,
  });
  const clockNumber = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    numberingSystem: locale === "ar" ? "arab" : "latn", useGrouping: false, minimumIntegerDigits: 2,
  });

  return (
    <div className="conference-countdown" data-countdown={countdown?.phase ?? "dates"}>
      <p className="countdown-label">{label}</p>
      {/* The timer's name uses a spoken date, not the ISO string "2027-01-27" (read digit by digit, worst in an Arabic voice). */}
      {countdown?.phase === "before" && (
        <div className="countdown-clock" role="timer" aria-live="off" aria-label={locale === "ar" ? `الوقت المتبقي حتى بداية يوم ${formatConferenceDate(dates.day1, locale)} عند ٠٠:٠٠ بتوقيت الرياض (Asia/Riyadh)، وليس موعد افتتاح المؤتمر` : `Time until ${formatConferenceDate(dates.day1, locale)} begins at 00:00 in Riyadh (Asia/Riyadh), not the conference opening time`}>
          <p className="countdown-remaining">
            <span className="countdown-number" data-countdown-unit="days">{number.format(countdown.days)}</span>
            <span className="countdown-unit">{countdownDayUnit(countdown.days, locale)}</span>
          </p>
          <dl className="countdown-time">
            {([
              ["hours", countdown.hours, locale === "ar" ? "ساعات" : "Hours"],
              ["minutes", countdown.minutes, locale === "ar" ? "دقائق" : "Minutes"],
              ["seconds", countdown.seconds, locale === "ar" ? "ثوانٍ" : "Seconds"],
            ] as const).map(([unit, value, unitLabel]) => (
              <div className="countdown-time-part" key={unit}>
                <dt className="countdown-time-label">{unitLabel}</dt>
                <dd className="countdown-time-number" data-countdown-unit={unit}>{clockNumber.format(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="countdown-context">
        <p className="countdown-dates"><time dateTime={dates.day1}>{dateRange}</time></p>
      </div>
    </div>
  );
}
