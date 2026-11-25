import { describe, expect, it, vi } from "vitest";
import { conferenceConfig, conferenceDateLabel } from "@/config/conference";
import { getConferenceClockCountdown } from "@/lib/conference-dates";

describe("confirmed conference dates", () => {
  it("keeps public date labels stable across browser and server ICU punctuation", () => {
    const browserRange = vi.spyOn(Intl.DateTimeFormat.prototype, "formatRange").mockReturnValue("٧–٨ أبريل، ٢٠٢٧");
    try {
      expect(conferenceDateLabel("en")).toBe("7–8 April 2027");
      expect(conferenceDateLabel("en", "day1")).toBe("7 April 2027");
      expect(conferenceDateLabel("en", "day2")).toBe("8 April 2027");
      expect(conferenceDateLabel("ar")).toBe("٧–٨ أبريل ٢٠٢٧");
      expect(conferenceDateLabel("ar", "day1")).toBe("٧ أبريل ٢٠٢٧");
      expect(conferenceDateLabel("ar", "day2")).toBe("٨ أبريل ٢٠٢٧");
      expect(browserRange).not.toHaveBeenCalled();
    } finally {
      browserRange.mockRestore();
    }
  });
  it.each([
    ["2027-04-06T20:59:59Z", { phase: "before", days: 0, hours: 0, minutes: 0, seconds: 1 }],
    ["2027-04-06T21:00:00Z", { phase: "after" }],
    ["2027-04-30T00:00:00Z", { phase: "after" }],
  ])("settles at the separate Riyadh countdown boundary %s", (now, expected) => {
    expect(getConferenceClockCountdown(conferenceConfig.countdownTarget, new Date(now))).toEqual(expected);
  });
});
