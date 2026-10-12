import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VenueTravelDetails } from "@/components/venue-travel-details";
import { VenueArrivalJourney } from "@/components/venue-arrival-journey";
import DatesVenuePage from "@/app/[locale]/(preview)/dates-venue/page";
import { conferenceConfig, type ConferenceVenue } from "@/config/conference";
import { venueMapLinks } from "@/lib/venue-travel";
import { approvedAtVenue, approvedTravelTime, approvedVisaResponsibility } from "../fixtures/approved-venue-guidance";

const venue = conferenceConfig.venue!;
const render = (value: ConferenceVenue, locale: "en" | "ar") => renderToStaticMarkup(createElement(VenueTravelDetails, { venue: value, locale }));
const renderJourney = (value: ConferenceVenue, locale: "en" | "ar") => renderToStaticMarkup(createElement(VenueArrivalJourney, { venue: value, locale }));

describe("plain external venue map links", () => {
  it("encodes venue text as one destination parameter without inventing coordinates", () => {
    const synthetic: ConferenceVenue = {
      ...venue,
      name: { en: "Synthetic Hall & Pavilion #1 / مثال", ar: "قاعة تجريبية" },
      address: { ...venue.address, streetAddress: { en: "Synthetic St?redirect=https://example.invalid", ar: "شارع تجريبي" } },
    };
    const expected = "Synthetic Hall & Pavilion #1 / مثال, Synthetic St?redirect=https://example.invalid, Jeddah 22254";
    const links = venueMapLinks(synthetic);
    expect(links.map(({ provider }) => provider)).toEqual(["google", "apple"]);
    for (const { href } of links) {
      const url = new URL(href);
      expect(url.searchParams.get("destination")).toBe(expected);
      expect(url.hash).toBe("");
      expect(url.searchParams.has("redirect")).toBe(false);
      expect(url.searchParams.has("ll")).toBe(false);
      expect(url.searchParams.has("latitude")).toBe(false);
      expect(url.searchParams.has("longitude")).toBe(false);
      expect(url.protocol).toBe("https:");
    }
  });
});

describe("approved and optional venue information stays honest", () => {
  it.each(["en", "ar"] as const)("hides unset travel times and at-venue details while preserving the visa responsibility notice in %s", (locale) => {
    const markup = render({ ...venue, travelTimes: {}, atVenue: {} }, locale);
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
    expect(markup).toContain('id="international-attendees"');
    expect(markup).toContain("UTC+3");
    expect(markup).toContain(approvedVisaResponsibility[locale]);
  });

  it.each(["en", "ar"] as const)("publishes the exact approved guidance and linked contact phrase in %s", (locale) => {
    const markup = render(venue, locale);
    const visibleText = markup.replace(/<[^>]+>/g, "");
    for (const value of Object.values(approvedAtVenue)) expect(visibleText).toContain(value[locale]);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(2);
    expect(visibleText.split(approvedTravelTime[locale])).toHaveLength(3);
    expect(markup.match(/data-venue-detail="/g)).toHaveLength(6);
    expect(markup).toContain(approvedVisaResponsibility[locale]);
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
    expect(markup).toContain(`href="/${locale}/contact"`);
    expect(markup).toContain(`>${locale === "en" ? "contact form" : "نموذج التواصل"}</a>`);
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
        ticket: { en: "Synthetic ticket guidance", ar: "إرشادات تذكرة تجريبية" },
        accessibility: { en: "Synthetic access guidance", ar: "إرشادات وصول تجريبية" },
        onSite: { en: "Synthetic facilities guidance", ar: "إرشادات مرافق تجريبية" },
        wifi: { en: "Synthetic connection guidance", ar: "إرشادات شبكة تجريبية" },
      },
    } satisfies ConferenceVenue;
    const markup = render(configured, locale);
    expect(markup.match(/data-venue-detail="/g)).toHaveLength(6);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(3);
    for (const value of Object.values(configured.atVenue)) expect(markup).toContain(value[locale]);
    for (const value of Object.values(configured.travelTimes)) expect(markup).toContain(value[locale]);
  });

  it("hides omitted optionals and keeps the visa notice without a link", () => {
    const markup = render({ ...venue, travelTimes: undefined, atVenue: undefined }, "en");
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
    expect(markup).toContain(approvedVisaResponsibility.en);
  });
});

describe("arrival journey preserves approved guidance and optional configuration", () => {
  it.each(["en", "ar"] as const)("server-renders every approved detail and native transport option in %s", (locale) => {
    const markup = renderJourney(venue, locale);
    const visibleText = markup.replace(/<[^>]+>/g, "");
    for (const value of Object.values(approvedAtVenue)) expect(visibleText).toContain(value[locale]);
    expect(markup.match(/data-travel-mode="/g)).toHaveLength(3);
    expect(markup.match(/<details name="venue-transport"/g)).toHaveLength(3);
    expect(markup).toContain('class="venue-arrival-disclosure"');
    expect(markup).not.toMatch(/<details[^>]*\sopen\b/);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(2);
    expect(visibleText.split(approvedTravelTime[locale])).toHaveLength(3);
    expect(markup.match(/data-venue-detail="/g)).toHaveLength(6);
    expect(markup).toContain(`href="/${locale}/contact"`);
    expect(markup).not.toContain("<iframe");
  });

  it.each(["en", "ar"] as const)("omits unset travel and on-site claims while retaining the public arrival sequence in %s", (locale) => {
    const markup = renderJourney({ ...venue, travelTimes: undefined, atVenue: undefined }, locale);
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
    expect(markup.match(/data-journey-chapter="/g)).toHaveLength(3);
    expect(markup).not.toContain('id="international-attendees"');
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
  });

  it.each(["en", "ar"] as const)("shows only supplied optional guidance in %s", (locale) => {
    const configured: ConferenceVenue = {
      ...venue,
      travelTimes: { train: { en: "Synthetic train guidance", ar: "إرشادات قطار تجريبية" }, taxi: { en: " ", ar: " " } },
      atVenue: { wifi: { en: "Synthetic Wi-Fi guidance", ar: "إرشادات شبكة تجريبية" }, parking: { en: " ", ar: " " } },
    };
    const markup = renderJourney(configured, locale);
    expect(markup.match(/class="venue-travel-time"/g)).toHaveLength(1);
    expect(markup).toContain(configured.travelTimes!.train![locale]);
    expect(markup.match(/data-venue-detail="/g)).toHaveLength(1);
    expect(markup).toContain('data-venue-detail="wifi"');
    expect(markup).toContain(configured.atVenue!.wifi![locale]);
    expect(markup).not.toContain('data-venue-detail="parking"');
  });

  it("does not fill missing Arabic optionals with English claims", () => {
    const markup = renderJourney({
      ...venue,
      travelTimes: { taxi: { en: "Synthetic English duration", ar: " " } },
      atVenue: { entryGate: { en: "Synthetic English gate", ar: " " } },
    }, "ar");
    expect(markup).not.toContain("Synthetic English");
    expect(markup).not.toContain('class="venue-travel-time"');
    expect(markup).not.toContain('id="at-venue"');
  });
});

describe("full Venue page preserves international guidance once before the journey", () => {
  it.each(["en", "ar"] as const)("server-renders the approved visa responsibility and time zone in %s", async (locale) => {
    const markup = renderToStaticMarkup(await DatesVenuePage({ params: Promise.resolve({ locale }) }));
    const visibleText = markup.replace(/<[^>]+>/g, "");
    expect(markup.match(/id="international-attendees"/g)).toHaveLength(1);
    expect(visibleText.split(approvedVisaResponsibility[locale])).toHaveLength(2);
    expect(markup).toContain("UTC+3");
    const international = markup.indexOf('id="international-attendees"');
    expect(international).toBeGreaterThan(markup.indexOf('class="venue-stage-guidance"'));
    expect(international).toBeLessThan(markup.indexOf('data-testid="venue-arrival-journey"'));
    expect(markup).not.toMatch(/class="[^"]*\bvenue-visa-link\b/);
    expect(markup).not.toContain("<iframe");
    expect(markup).toContain(`href="/${locale}/program"`);
    expect(markup).toContain(`href="/${locale}#faq"`);
  });
});
