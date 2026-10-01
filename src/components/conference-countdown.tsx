"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getConferenceClockCountdown, subscribeToConferenceClock, type ConferenceDates,
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

function dayUnit(days: number, locale: Locale): string {
  if (locale === "en") return days === 1 ? "day" : "days";
  const plural = new Intl.PluralRules("ar").select(days);
  return plural === "one" ? "يوم" : plural === "two" ? "يومان" : plural === "few" ? "أيام" : "يومًا";
}

export function ConferenceCountdown({ dates, locale, dateRange }: { dates: ConferenceDates; locale: Locale; dateRange: string }) {
  const subscribeToClock = useCallback((onChange: () => void) => subscribe(onChange, dates), [dates]);
  const currentSecond = useSyncExternalStore(subscribeToClock, getSnapshot, getServerSnapshot);
  const countdown = currentSecond !== null ? getConferenceClockCountdown(dates, new Date(currentSecond * 1000)) : null;
  const label = countdown?.phase === "before"
    ? locale === "ar" ? "العدّ التنازلي لموعد المؤتمر" : "Counting down to MSRC 2027"
    : countdown?.phase === "day1"
      ? locale === "ar" ? "اليوم الأول اليوم" : "Day 1 is today"
      : countdown?.phase === "day2"
        ? locale === "ar" ? "اليوم الثاني اليوم" : "Day 2 is today"
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
      {countdown?.phase === "before" && (
        <div className="countdown-clock" role="timer" aria-live="off" aria-label={locale === "ar" ? "الوقت المتبقي حتى بداية التاريخ المؤكد" : "Time until the confirmed date begins"}>
          <p className="countdown-remaining">
            <span className="countdown-number" data-countdown-unit="days">{number.format(countdown.days)}</span>
            <span className="countdown-unit">{dayUnit(countdown.days, locale)}</span>
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
        <p className="countdown-zone">{locale === "ar" ? "بداية تاريخ اليوم الأول، ٠٠:٠٠ · Asia/Riyadh" : "Start of the Day 1 date, 00:00 · Asia/Riyadh"}</p>
        <p className="countdown-note">{locale === "ar" ? "موعد افتتاح المؤتمر سيُعلن لاحقًا." : "Conference opening time will be announced."}</p>
      </div>
    </div>
  );
}
