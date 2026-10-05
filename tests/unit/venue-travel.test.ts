import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VenueTravelDetails } from "@/components/venue-travel-details";
import { conferenceConfig, type ConferenceVenue } from "@/config/conference";
import { venueMapLinks } from "@/lib/venue-travel";

const venue = conferenceConfig.venue!;
const render = (value: ConferenceVenue, locale: "en" | "ar") => renderToStaticMarkup(createElement(VenueTravelDetails, { venue: value, locale }));

describe("plain external venue map links", () => {
  it("encodes venue text as one destination parameter without inventing coordinates", () => {
    const synthetic: ConferenceVenue = {
      ...venue,
      name: { en: "Synthetic Hall & Pavilion #1 / مثال", ar: "قاعة تجريبية" },
      address: { ...venue.address, streetAddress: { en: "Synthetic St?redirect=https://example.invalid", ar: "شارع تجريبي" } },
    };
    const expected = "Synthetic Hall & Pavilion #1 / مثال, Synthetic St?redirect=https://example.invalid, Jeddah 22254";
    const links = venueMapLinks(synthetic);
    expect(links.map(({ provider }) => provider)).toEqual(["google", "apple", "waze"]);
    for (const { provider, href } of links) {
      const url = new URL(href);
      const parameter = provider === "waze" ? "q" : "destination";
      expect(url.searchParams.get(parameter)).toBe(expected);
      expect(url.hash).toBe("");
      expect(url.searchParams.has("redirect")).toBe(false);
      expect(url.searchParams.has("ll")).toBe(false);
      expect(url.searchParams.has("latitude")).toBe(false);
      expect(url.searchParams.has("longitude")).toBe(false);
      expect(url.protocol).toBe("https:");
    }
  });
});

describe("optional venue information stays honest", () => {
  it.each(["en", "ar"] as const)("hides unset travel times, at-venue details and visa links in %s", (locale) => {
    const markup = render(venue, locale);
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
    expect(markup).toContain('id="international-attendees"');
    expect(markup).toContain("UTC+3");
  });

  it.each(["en", "ar"] as const)("renders only supplied localized values in %s", (locale) => {
    const configured = {
      ...venue,
      travelTimes: { taxi: { en: "Synthetic taxi duration", ar: "مدة تجريبية لسيارة الأجرة" }, train: { en: " ", ar: " " } },
      atVenue: {
        entryGate: { en: "Synthetic entry gate", ar: "بوابة دخول تجريبية" },
        wifi: { en: "Synthetic Wi-Fi", ar: "شبكة لاسلكية تجريبية" },
        parking: { en: " ", ar: " " },
      },
      visaInformationUrl: "https://example.invalid/synthetic-visa-information",
    } satisfies ConferenceVenue;
    const markup = render(configured, locale);
    expect(markup).toContain(configured.travelTimes.taxi![locale]);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(1);
    expect(markup).toContain('id="at-venue"');
    expect(markup).toContain('data-venue-detail="entryGate"');
    expect(markup).toContain('data-venue-detail="wifi"');
    expect(markup).not.toContain('data-venue-detail="parking"');
    expect(markup).toContain(configured.atVenue.entryGate![locale]);
    expect(markup).toContain(configured.atVenue.wifi![locale]);
    expect(markup).toContain('href="https://example.invalid/synthetic-visa-information"');
    expect(markup).toMatch(/class="[^"]*\bvenue-visa-link\b/);
  });

  it("does not substitute English values when the Arabic optional value is blank", () => {
    const configured: ConferenceVenue = {
      ...venue,
      travelTimes: { taxi: { en: "Synthetic English time", ar: " " } },
      atVenue: { entryGate: { en: "Synthetic English gate", ar: " " } },
    };
    const markup = render(configured, "ar");
    expect(markup).not.toContain("Synthetic English");
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
  });

  it.each(["en", "ar"] as const)("supports every supplied at-venue field and travel mode in %s", (locale) => {
    const configured = {
      ...venue,
      travelTimes: {
        taxi: { en: "Synthetic taxi time", ar: "مدة سيارة أجرة تجريبية" },
        train: { en: "Synthetic train time", ar: "مدة قطار تجريبية" },
        rental: { en: "Synthetic driving time", ar: "مدة قيادة تجريبية" },
      },
      atVenue: {
        entryGate: { en: "Synthetic gate guidance", ar: "إرشادات بوابة تجريبية" },
        parking: { en: "Synthetic parking guidance", ar: "إرشادات مواقف تجريبية" },
        entrances: { en: "Synthetic entrance guidance", ar: "إرشادات مداخل تجريبية" },
        accessibility: { en: "Synthetic access guidance", ar: "إرشادات وصول تجريبية" },
        prayerAreas: { en: "Synthetic prayer guidance", ar: "إرشادات مصليات تجريبية" },
        food: { en: "Synthetic food guidance", ar: "إرشادات طعام تجريبية" },
        wifi: { en: "Synthetic connection guidance", ar: "إرشادات شبكة تجريبية" },
      },
    } satisfies ConferenceVenue;
    const markup = render(configured, locale);
    expect(markup.match(/data-venue-detail="/g)).toHaveLength(7);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(3);
    for (const value of Object.values(configured.atVenue)) expect(markup).toContain(value[locale]);
    for (const value of Object.values(configured.travelTimes)) expect(markup).toContain(value[locale]);
  });

  it("hides omitted optionals and a whitespace-only visa URL", () => {
    const markup = render({ ...venue, travelTimes: undefined, atVenue: undefined, visaInformationUrl: " " }, "en");
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
  });
});
