import { describe, expect, it } from "vitest";
import { conferenceCalendar } from "@/lib/calendar";

const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("Add to calendar (.ics)", () => {
  it.each(["en", "ar"] as const)("is one all-day event over the confirmed days in %s", (locale) => {
    const ics = conferenceCalendar(locale)!;
    const lines = unfold(ics).split("\r\n");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(lines).toContain("DTSTART;VALUE=DATE:20270127");
    // DTEND is exclusive: the event covers 27 and 28 January.
    expect(lines).toContain("DTEND;VALUE=DATE:20270129");
    expect(lines).toContain("UID:msrc-2027-conference@msrc2027.com");
    expect(lines).toContain(`URL:https://www.msrc2027.com/${locale}/dates-venue`);
    // No invented times, venue, prices or attendees.
    expect(ics).not.toMatch(/DTSTART:|T\d{6}(?!Z)|ATTENDEE|ORGANIZER|PRICE/);
    expect(lines.filter((line) => line.startsWith("BEGIN:VEVENT"))).toHaveLength(1);
  });

  it("escapes commas and folds long lines by octets", () => {
    const ics = conferenceCalendar("ar")!;
    expect(unfold(ics)).toContain("LOCATION:جدة، المملكة العربية السعودية");
    expect(conferenceCalendar("en")).toContain(String.raw`LOCATION:Jeddah\, Saudi Arabia`);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
