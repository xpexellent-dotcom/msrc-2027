import type { MetadataRoute } from "next";

// Indexing exclusion is an additional preview safeguard, not access control.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
