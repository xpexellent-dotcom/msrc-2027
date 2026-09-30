"use client";

import { useSyncExternalStore } from "react";
import {
  getConferenceCountdown, getRiyadhCalendarDate,
  subscribeToRiyadhDayChange, type ConferenceDates,
} from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

function subscribe(onChange: () => void) {
  return subscribeToRiyadhDayChange(onChange, {
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
  });
}

const getSnapshot = () => getRiyadhCalendarDate(new Date());
// A cached HTML page must never contain a countdown number calculated at build time.
const getServerSnapshot = () => null;

function dayUnit(days: number, locale: Locale): string {
  if (locale === "en") return days === 1 ? "day" : "days";
  const plural = new Intl.PluralRules("ar").select(days);
  return plural === "one" ? "يوم" : plural === "two" ? "يومان" : plural === "few" ? "أيام" : "يومًا";
}

export function ConferenceCountdown({ dates, locale, dateRange }: { dates: ConferenceDates; locale: Locale; dateRange: string }) {
  const today = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const countdown = today ? getConferenceCountdown(dates, today) : null;
  const before = countdown?.phase === "before";
  const label = before
    ? locale === "ar" ? "حتى MSRC 2027" : "to MSRC 2027"
    : countdown?.phase === "day1"
      ? locale === "ar" ? "اليوم الأول اليوم" : "Day 1 is today"
      : countdown?.phase === "day2"
        ? locale === "ar" ? "اليوم الثاني اليوم" : "Day 2 is today"
        : locale === "ar" ? "مواعيد المؤتمر المؤكدة" : "Confirmed conference dates";

  return (
    <div className="conference-countdown" data-countdown={countdown?.phase ?? "dates"}>
      {before && (
        <p className="countdown-remaining">
          <span className="countdown-number">{new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { numberingSystem: locale === "ar" ? "arab" : "latn" }).format(countdown.days)}</span>
          <span className="countdown-unit">{dayUnit(countdown.days, locale)}</span>
        </p>
      )}
      <div className="countdown-context">
        <p className="countdown-label">{label}</p>
        <p className="countdown-dates"><time dateTime={dates.day1}>{dateRange}</time></p>
        <p className="countdown-zone">{locale === "ar" ? "بتوقيت الرياض · Asia/Riyadh" : "Riyadh calendar · Asia/Riyadh"}</p>
      </div>
    </div>
  );
}
