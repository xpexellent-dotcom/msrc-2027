import { describe, expect, it } from "vitest";
import { parseConferenceDays, validConferenceDay, validConferenceDays } from "@/features/attendance/conference-days";

describe("owner-entered conference days", () => {
  it.each(["2027-01-27", "2027-01-28", "2028-02-29", "0001-01-01", "9999-12-31"])("accepts real date-only values: %s", (day) => {
    expect(validConferenceDay(day)).toBe(true);
  });
  it.each(["2027-02-29", "2027-02-30", "2027-13-01", "2027-00-01", "0000-01-01", "2027-01-01T00:00:00Z", "2027-1-1", " 2027-01-27", "", null, 2027])("rejects malformed calendar values: %s", (day) => {
    expect(validConferenceDay(day)).toBe(false);
  });
  it("leaves unset dates null and sorts owner input without defaults", () => {
    expect(parseConferenceDays(" \n ")).toBeNull();
    expect(parseConferenceDays("2027-01-28, 2027-01-27")).toEqual(["2027-01-27", "2027-01-28"]);
    expect(parseConferenceDays("2027-01-27\n2027-01-28")).toEqual(["2027-01-27", "2027-01-28"]);
  });
  it("rejects duplicate, unordered, empty, oversized or invalid payload arrays", () => {
    for (const value of [[], ["2027-01-27", "2027-01-27"], ["2027-01-28", "2027-01-27"], ["2027-02-29"], [null], "2027-01-27", Array(32).fill("2027-01-27")]) expect(validConferenceDays(value)).toBe(false);
    for (const value of ["2027-01-27,2027-01-27", "2027-02-29", "2027-01-27,", ",2027-01-27"]) expect(parseConferenceDays(value)).toBeUndefined();
  });
});
