import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { publicRoutes, siteOrigin } from "@/lib/metadata";

// ORG-013: every public page in both languages, each listing its other-language twin.
export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.flatMap((path) => locales.map((locale) => ({
    url: `${siteOrigin}/${locale}${path}`,
    changeFrequency: "weekly" as const,
    priority: path ? .7 : 1,
    alternates: { languages: Object.fromEntries(locales.map((language) => [language, `${siteOrigin}/${language}${path}`])) },
  })));
}
