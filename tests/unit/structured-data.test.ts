import { describe, expect, it } from "vitest";
import { conferenceEventJsonLd, jsonLdScript } from "@/lib/structured-data";

describe("homepage Event structured data", () => {
  it.each(["en", "ar"] as const)("publishes only the confirmed public facts in %s", (locale) => {
    const event = conferenceEventJsonLd(locale)!;
    expect(event).toMatchObject({
      "@type": "Event", startDate: "2027-01-27", endDate: "2027-01-28", inLanguage: locale,
      url: `https://www.msrc2027.com/${locale}`, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", address: { addressCountry: "SA" } },
    });
    // No unapproved venue, times, prices or capacities.
    expect(JSON.stringify(event)).not.toMatch(/offers|price|T\d\d:|maximumAttendeeCapacity|streetAddress/);
  });

  it("cannot close its script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</");
  });
});
