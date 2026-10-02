import { describe, expect, it } from "vitest";
import { formatMinutes, formatResultCount } from "@/lib/i18n";

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

// Programme and media result counts: a fixed «نتائج» read «١ نتائج», «٢ نتائج» and «١١ نتائج».
describe("formatResultCount", () => {
  it.each([
    [1, "نتيجة واحدة"],
    [2, "نتيجتان"],
    [3, "٣ نتائج"],
    [10, "١٠ نتائج"],
    [11, "١١ نتيجة"],
    [99, "٩٩ نتيجة"],
    [100, "١٠٠ نتيجة"],
    [102, "١٠٢ نتيجة"],
    [103, "١٠٣ نتائج"],
  ])("Arabic %i reads «%s»", (count, expected) => {
    expect(formatResultCount(count, "ar")).toBe(expected);
  });

  it.each([
    [1, "1 result"],
    [2, "2 results"],
    [12, "12 results"],
  ])("English %i reads %s", (count, expected) => {
    expect(formatResultCount(count, "en")).toBe(expected);
  });
});
