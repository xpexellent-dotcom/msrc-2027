import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ConferenceCountdown } from "@/components/conference-countdown";
import {
  formatConferenceDate, formatConferenceDateRange, getConferenceCountdown, getConferenceClockCountdown,
  getRiyadhCalendarDate, millisecondsToNextRiyadhDay, subscribeToRiyadhDayChange, subscribeToConferenceClock,
  type CalendarDate, type CountdownClockEnvironment, type DayClockEnvironment,
} from "@/lib/conference-dates";

const dates = { day1: "2027-01-27", day2: "2027-01-28" } as const;

afterEach(() => { vi.useRealTimers(); });

describe("date-only publication and localization (CFG-01, LOC-01/03)", () => {
  it("formats approved Gregorian days without assuming an opening time", () => {
    expect(formatConferenceDate(dates.day1, "en")).toBe("27 January 2027");
    expect(formatConferenceDate(dates.day2, "en")).toBe("28 January 2027");
    expect(formatConferenceDateRange(dates, "en")).toMatch(/^27\D+28 January 2027$/);
    expect(formatConferenceDate(dates.day1, "ar")).toBe("٢٧ يناير ٢٠٢٧");
    expect(formatConferenceDateRange(dates, "ar")).toMatch(/^٢٧\D+٢٨ يناير ٢٠٢٧$/);
    expect(formatConferenceDateRange(dates, "ar")).not.toMatch(/[0-9]/);
  });

  it.each(["2027-02-29", "2027-01-32", "2027-13-01", "2027-1-27", "2027-01-27T00:00:00Z"])(
    "rejects invalid or instant-shaped input %s", (date) => {
      expect(() => formatConferenceDate(date as CalendarDate, "en")).toThrow(RangeError);
    },
  );

  it("renders useful static dates rather than freezing a live count into cached HTML", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const dateRange = formatConferenceDateRange(dates, "en");
    const first = renderToStaticMarkup(createElement(ConferenceCountdown, { dates, locale: "en", dateRange }));
    vi.setSystemTime(new Date("2027-01-29T12:00:00Z"));
    const later = renderToStaticMarkup(createElement(ConferenceCountdown, { dates, locale: "en", dateRange }));
    expect(later).toBe(first);
    expect(first).toContain('data-countdown="dates"');
    expect(first).toMatch(/27\D+28 January 2027/);
    expect(first).not.toContain("countdown-number");
    expect(first).not.toContain("aria-live");
  });

  it("preserves the server-provided date text despite different browser ICU range spacing", () => {
    const serverRange = "27\u2009–\u200928 January 2027";
    const browserFormatter = vi.spyOn(Intl.DateTimeFormat.prototype, "formatRange")
      .mockReturnValue("27 – 28 January 2027");
    const markup = renderToStaticMarkup(createElement(ConferenceCountdown, {
      dates, locale: "en", dateRange: serverRange,
    }));
    expect(markup).toContain(serverRange);
    expect(markup).not.toContain("27 – 28 January 2027");
    expect(browserFormatter).not.toHaveBeenCalled();
  });
});

describe("Riyadh calendar countdown transitions (TIM-01)", () => {
  it.each([
    ["2027-01-26T20:59:59.999Z", "2027-01-26", { phase: "before", days: 1 }],
    ["2027-01-26T21:00:00.000Z", "2027-01-27", { phase: "day1" }],
    ["2027-01-27T20:59:59.999Z", "2027-01-27", { phase: "day1" }],
    ["2027-01-27T21:00:00.000Z", "2027-01-28", { phase: "day2" }],
    ["2027-01-28T20:59:59.999Z", "2027-01-28", { phase: "day2" }],
    ["2027-01-28T21:00:00.000Z", "2027-01-29", { phase: "after" }],
  ])("maps %s to %s without inferring event opening/closing", (instant, expectedDate, expectedState) => {
    const today = getRiyadhCalendarDate(new Date(instant));
    expect(today).toBe(expectedDate);
    expect(getConferenceCountdown(dates, today)).toEqual(expectedState);
  });

  it("counts calendar days across year boundaries and leap days", () => {
    expect(getConferenceCountdown(dates, "2026-12-31")).toEqual({ phase: "before", days: 27 });
    expect(getConferenceCountdown(dates, "2026-10-01")).toEqual({ phase: "before", days: 118 });
    expect(getConferenceCountdown({ day1: "2028-03-01", day2: "2028-03-02" }, "2028-02-28"))
      .toEqual({ phase: "before", days: 2 });
  });

  it("never emits negative days or a false registration-open state", () => {
    expect(getConferenceCountdown(dates, "2027-08-01")).toEqual({ phase: "after" });
    expect(() => getConferenceCountdown({ day1: dates.day2, day2: dates.day1 }, dates.day1)).toThrow(RangeError);
  });

  it("schedules the next Riyadh midnight rather than the visitor's local midnight", () => {
    expect(millisecondsToNextRiyadhDay(new Date("2027-01-26T20:59:59.999Z"))).toBe(1);
    expect(millisecondsToNextRiyadhDay(new Date("2027-01-26T21:00:00Z"))).toBe(86_400_000);
    expect(millisecondsToNextRiyadhDay(new Date("2027-01-26T18:00:00Z"))).toBe(10_800_000);
  });
});

describe("clock display to the confirmed date boundary (TIM-01, CFG-01)", () => {
  it.each([
    ["2026-10-01T12:00:00Z", { phase: "before", days: 117, hours: 9, minutes: 0, seconds: 0 }],
    ["2027-01-25T21:00:00Z", { phase: "before", days: 1, hours: 0, minutes: 0, seconds: 0 }],
    ["2027-01-26T19:58:57Z", { phase: "before", days: 0, hours: 1, minutes: 1, seconds: 3 }],
    ["2027-01-26T20:59:59.999Z", { phase: "before", days: 0, hours: 0, minutes: 0, seconds: 1 }],
    ["2027-01-26T21:00:00Z", { phase: "day1" }],
    ["2027-01-27T21:00:00Z", { phase: "day2" }],
    ["2027-01-28T21:00:00Z", { phase: "after" }],
  ])("counts from %s to Riyadh midnight without inventing an event time", (instant, expected) => {
    expect(getConferenceClockCountdown(dates, new Date(instant))).toEqual(expected);
  });

  it("uses full elapsed days across leap dates and rejects reversed configuration", () => {
    expect(getConferenceClockCountdown({ day1: "2028-03-01", day2: "2028-03-02" }, new Date("2028-02-28T21:00:00Z")))
      .toEqual({ phase: "before", days: 1, hours: 0, minutes: 0, seconds: 0 });
    expect(() => getConferenceClockCountdown({ day1: dates.day2, day2: dates.day1 }, new Date("2026-10-01T12:00:00Z")))
      .toThrow(RangeError);
  });
});

describe("seconds clock suspension and recovery (ACC-01)", () => {
  function clockFixture(instant: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    let visible = true;
    let focus: (() => void) | null = null;
    let visibility: (() => void) | null = null;
    const removeFocus = vi.fn(() => { focus = null; });
    const removeVisibility = vi.fn(() => { visibility = null; });
    const clock: CountdownClockEnvironment = {
      now: () => new Date(),
      schedule: (callback, delay) => setTimeout(callback, delay) as unknown as number,
      cancel: (timer) => clearTimeout(timer),
      onFocus: (callback) => { focus = callback; return removeFocus; },
      onVisibilityChange: (callback) => { visibility = callback; return removeVisibility; },
      isVisible: () => visible,
    };
    return {
      clock, removeFocus, removeVisibility, focus: () => focus?.(),
      visibility: (next: boolean) => { visible = next; visibility?.(); },
    };
  }

  it("aligns updates to second boundaries and removes its timer and listeners", () => {
    const fixture = clockFixture("2027-01-26T20:59:57.500Z");
    const update = vi.fn();
    const unsubscribe = subscribeToConferenceClock(update, fixture.clock, dates);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(499);
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(update).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    expect(fixture.removeFocus).toHaveBeenCalledOnce();
    expect(fixture.removeVisibility).toHaveBeenCalledOnce();
  });

  it("stops background ticking and recalculates after a suspended tab returns", () => {
    const fixture = clockFixture("2027-01-26T20:59:50Z");
    const update = vi.fn();
    const unsubscribe = subscribeToConferenceClock(update, fixture.clock, dates);
    fixture.visibility(false);
    expect(update).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date("2027-01-28T06:00:00Z"));
    fixture.visibility(true);
    expect(update).toHaveBeenCalledTimes(2);
    expect(getConferenceClockCountdown(dates, new Date())).toEqual({ phase: "day2" });
    expect(vi.getTimerCount()).toBe(1);
    fixture.focus();
    expect(vi.getTimerCount()).toBe(1);
    unsubscribe();
    fixture.focus();
    fixture.visibility(true);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it("switches from second ticks to daily phase refresh after the boundary", () => {
    const fixture = clockFixture("2027-01-26T20:59:59Z");
    const update = vi.fn();
    const unsubscribe = subscribeToConferenceClock(update, fixture.clock, dates);
    vi.advanceTimersByTime(1000);
    expect(update).toHaveBeenCalledOnce();
    expect(getConferenceClockCountdown(dates, new Date())).toEqual({ phase: "day1" });
    vi.advanceTimersByTime(86_399_999);
    expect(update).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(getConferenceClockCountdown(dates, new Date())).toEqual({ phase: "day2" });
    unsubscribe();
  });
});

describe("day clock recovery and cleanup (ACC-01)", () => {
  function clockFixture() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-26T20:59:59Z"));
    let focus: (() => void) | null = null;
    let visibility: (() => void) | null = null;
    const removeFocus = vi.fn(() => { focus = null; });
    const removeVisibility = vi.fn(() => { visibility = null; });
    const clock: DayClockEnvironment = {
      now: () => new Date(),
      schedule: (callback, delay) => setTimeout(callback, delay) as unknown as number,
      cancel: (timer) => clearTimeout(timer),
      onFocus: (callback) => { focus = callback; return removeFocus; },
      onVisibilityChange: (callback) => { visibility = callback; return removeVisibility; },
    };
    return { clock, removeFocus, removeVisibility, focus: () => focus?.(), visibility: () => visibility?.() };
  }

  it("updates at midnight with one daily timer and removes timer/listeners on unmount", () => {
    const fixture = clockFixture();
    const update = vi.fn();
    const unsubscribe = subscribeToRiyadhDayChange(update, fixture.clock);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(getRiyadhCalendarDate(new Date())).toBe(dates.day1);
    expect(vi.getTimerCount()).toBe(1);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    expect(fixture.removeFocus).toHaveBeenCalledOnce();
    expect(fixture.removeVisibility).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(86_400_000);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("refreshes and rearms after a suspended tab returns on a later day", () => {
    const fixture = clockFixture();
    const update = vi.fn();
    const unsubscribe = subscribeToRiyadhDayChange(update, fixture.clock);
    vi.setSystemTime(new Date("2027-01-28T06:00:00Z"));
    fixture.focus();
    expect(update).toHaveBeenCalledOnce();
    expect(getRiyadhCalendarDate(new Date())).toBe(dates.day2);
    expect(vi.getTimerCount()).toBe(1);
    fixture.visibility();
    expect(update).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    unsubscribe();
    fixture.focus();
    fixture.visibility();
    expect(update).toHaveBeenCalledTimes(2);
  });
});
