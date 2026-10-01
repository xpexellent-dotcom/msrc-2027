import { describe, expect, it } from "vitest";
import { formatMinutes } from "@/lib/i18n";

// Session and recording durations: a fixed «دقيقة» read «٣ دقيقة» for a 3MT talk.
describe("formatMinutes", () => {
  it.each([
    [1, "دقيقة"],
    [2, "دقيقتان"],
    [3, "٣ دقائق"],
    [10, "١٠ دقائق"],
    [11, "١١ دقيقة"],
    [45, "٤٥ دقيقة"],
    [90, "٩٠ دقيقة"],
    [100, "١٠٠ دقيقة"],
  ])("Arabic %i minutes reads «%s»", (minutes, expected) => {
    expect(formatMinutes(minutes, "ar")).toBe(expected);
  });

  it.each([
    [1, "1 min"],
    [3, "3 min"],
    [45, "45 min"],
  ])("English %i minutes reads %s", (minutes, expected) => {
    expect(formatMinutes(minutes, "en")).toBe(expected);
  });
});
