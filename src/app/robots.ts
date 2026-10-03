import type { MetadataRoute } from "next";
import { indexable, siteOrigin } from "@/lib/metadata";

// ORG-013: production invites search engines to the public pages; every other deployment is
// excluded. Exclusion is a courtesy to crawlers, not access control.
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/design-system", "/*/design-system", "/*/hero-preview", "/*/admin", "/*/dashboard", "/*/reviewer", "/*/check-in"] },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
