import { describe, expect, it } from "vitest";
import { conferenceConfig } from "@/config/conference";
import { getConferenceClockCountdown } from "@/lib/conference-dates";
import { conferenceCalendar } from "@/lib/calendar";
import { conferenceEventJsonLd } from "@/lib/structured-data";

describe("ORG-073 month-only conference announcement", () => {
  it("keeps exact days and calendar/Event output unset", () => {
    expect(conferenceConfig.dates).toBeNull();
    for (const locale of ["en", "ar"] as const) {
      expect(conferenceCalendar(locale)).toBeNull();
      expect(conferenceEventJsonLd(locale)).toBeNull();
    }
  });
  it.each([
    ["2027-03-31T20:59:59Z", { phase: "before", days: 0, hours: 0, minutes: 0, seconds: 1 }],
    ["2027-03-31T21:00:00Z", { phase: "after" }],
    ["2027-04-30T00:00:00Z", { phase: "after" }],
  ])("settles at the separate Riyadh countdown boundary %s", (now, expected) => {
    expect(getConferenceClockCountdown(conferenceConfig.countdownTarget, new Date(now))).toEqual(expected);
  });
});
