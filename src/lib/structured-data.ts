import { conferenceConfig } from "@/config/conference";
import { homepageCopy } from "@/content/public-site";
import type { Locale } from "@/lib/i18n";
import { siteOrigin } from "@/lib/metadata";

// The homepage's organizer line (homepage-narrative.ts), without its "Organized by" framing.
const organizer: Record<Locale, string> = {
  en: "Research Principles Club, Faculty of Medicine, King Abdulaziz University",
  ar: "نادي مبادئ البحث العلمي بكلية الطب، جامعة الملك عبدالعزيز",
};

/** schema.org WebSite: search results name the site "MSRC 2027" rather than its domain. */
export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MSRC 2027",
    alternateName: homepageCopy[locale].kicker,
    url: `${siteOrigin}/`,
    inLanguage: ["en", "ar"],
  };
}

/**
 * schema.org Event for the homepage, so search results can show the conference's name, dates
 * and city. Built only from facts the page already publishes: confirmed dates (ORG-001), the
 * city, the organizer line and the lead. ORG-031 adds the confirmed venue and street address.
 * There are no offers, times, prices or capacities.
 */
export function conferenceEventJsonLd(locale: Locale) {
  const dates = conferenceConfig.dates;
  if (!dates) return null;
  const copy = homepageCopy[locale];
  const venue = conferenceConfig.venue;
  const address = venue ? {
    "@type": "PostalAddress",
    streetAddress: venue.address.streetAddress[locale],
    addressLocality: venue.address.addressLocality,
    postalCode: venue.address.postalCode,
    addressCountry: venue.address.addressCountry,
  } : { "@type": "PostalAddress", addressLocality: locale === "ar" ? "جدة" : "Jeddah", addressCountry: "SA" };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `MSRC 2027 | ${copy.kicker}`,
    description: copy.lead,
    url: `${siteOrigin}/${locale}`,
    inLanguage: locale,
    image: `${siteOrigin}/${locale}/opengraph-image`,
    startDate: dates.day1,
    endDate: dates.day2,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: venue?.name[locale] ?? copy.city, address },
    organizer: { "@type": "Organization", name: organizer[locale], url: siteOrigin },
  };
}

/** JSON for a <script type="application/ld+json">; "<" is escaped so content cannot close the tag. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
