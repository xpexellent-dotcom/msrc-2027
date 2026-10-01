import { describe, expect, it } from "vitest";
import { countdownDayUnit } from "@/components/conference-countdown";

// LOC-01: the counted noun after a numeral depends on the number, not only its plural category.
describe("countdown day unit", () => {
  it.each([
    [0, "يوم"],
    [1, "يوم"],
    [2, "يومان"],
    [3, "أيام"],
    [10, "أيام"],
    [11, "يومًا"],
    [99, "يومًا"],
    [100, "يوم"],
    [101, "يوم"],
    [102, "يوم"],
    [103, "أيام"],
    [111, "يومًا"],
    [118, "يومًا"],
    [200, "يوم"],
  ])("Arabic %i → %s", (days, unit) => {
    expect(countdownDayUnit(days, "ar")).toBe(unit);
  });

  it.each([[0, "days"], [1, "day"], [2, "days"], [118, "days"]])("English %i → %s", (days, unit) => {
    expect(countdownDayUnit(days, "en")).toBe(unit);
  });
});
