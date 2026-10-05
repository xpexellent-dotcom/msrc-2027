import type { Metadata } from "next";
import { conferenceConfig } from "@/config/conference";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

/** Public origin for absolute metadata URLs. Previews also point shared links at the public site. */
export const siteOrigin = "https://www.msrc2027.com";

/**
 * ORG-013: only the production deployment (www.msrc2027.com) may be indexed. Branch previews,
 * local runs and CI stay noindex, as do staff, workflow and review routes, which never use
 * localizedPageMetadata and so keep the layout's noindex default.
 */
export const indexable = process.env.VERCEL_ENV === "production";

/** Public information pages listed in the sitemap, as locale-free routes. */
// Legal drafts have their own noindex metadata and await approved effective wording.
export const publicRoutes = ["", "/about", "/dates-venue", "/program", "/speakers", "/participate", "/workshops", "/hackathon", "/3mt", "/media", "/contact"] as const;

const openGraphLocale: Record<Locale, string> = { en: "en_US", ar: "ar_SA" };

/** "Programme | MSRC 2027": a bare page label is ambiguous in tabs, bookmarks and link cards. */
export function siteTitle(page: string): string {
  return `${page} | MSRC 2027`;
}

/**
 * Canonical, hreflang and link-preview metadata for one localized page.
 * `path` is the locale-free route ("" for home, "/about"). Indexed on production only.
 */
export function localizedPageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const other: Locale = locale === "ar" ? "en" : "ar";
  // Page-level openGraph replaces the segment's file-based image, so reference it explicitly.
  const image = { url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: "MSRC 2027" };
  return {
    robots: { index: indexable, follow: indexable },
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { en: `/en${path}`, ar: `/ar${path}`, "x-default": `/en${path}` },
    },
    openGraph: {
      type: "website",
      siteName: "MSRC 2027",
      url: `/${locale}${path}`,
      title,
      description,
      locale: openGraphLocale[locale],
      alternateLocale: openGraphLocale[other],
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

const descriptionCity: Record<Locale, string> = { en: ", Jeddah. ", ar: "، جدة. " };

/**
 * A page's search snippet led by the confirmed dates, venue and city, as on the homepage:
 * "27–28 January 2027, King Faisal Conference Center, Jeddah. Practical learning…"
 */
export function conferenceDescription(locale: Locale, text: string): string {
  const venue = conferenceConfig.venue;
  const location = `${venue ? `${locale === "ar" ? "، " : ", "}${venue.name[locale]}` : ""}${descriptionCity[locale]}`;
  return conferenceConfig.dates ? `${formatConferenceDateRange(conferenceConfig.dates, locale)}${location}${text}` : text;
}
