import { describe, expect, it } from "vitest";
import { conferenceConfig, conferenceDateLabel } from "@/config/conference";
import { getConferenceClockCountdown } from "@/lib/conference-dates";

describe("confirmed conference dates", () => {
  it("publishes the confirmed calendar dates in both languages", () => {
    expect(conferenceDateLabel("en")).toBe("7–8 April 2027");
    expect(conferenceDateLabel("ar")).toBe("٧–٨ أبريل ٢٠٢٧");
  });
  it.each([
    ["2027-04-06T20:59:59Z", { phase: "before", days: 0, hours: 0, minutes: 0, seconds: 1 }],
    ["2027-04-06T21:00:00Z", { phase: "after" }],
    ["2027-04-30T00:00:00Z", { phase: "after" }],
  ])("settles at the separate Riyadh countdown boundary %s", (now, expected) => {
    expect(getConferenceClockCountdown(conferenceConfig.countdownTarget, new Date(now))).toEqual(expected);
  });
});
