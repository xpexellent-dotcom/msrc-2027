import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

/** Public origin for absolute metadata URLs. Previews also point shared links at the public site. */
export const siteOrigin = "https://www.msrc2027.com";

const openGraphLocale: Record<Locale, string> = { en: "en_US", ar: "ar_SA" };

/**
 * Canonical, hreflang and link-preview metadata for one localized page.
 * `path` is the locale-free route ("" for home, "/about"). Indexing stays disabled elsewhere.
 */
export function localizedPageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const other: Locale = locale === "ar" ? "en" : "ar";
  // Page-level openGraph replaces the segment's file-based image, so reference it explicitly.
  const image = { url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: "MSRC 2027" };
  return {
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
