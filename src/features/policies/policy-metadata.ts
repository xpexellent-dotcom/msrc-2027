import type { Metadata } from "next";
import { getPolicyDocument, type PolicyKind, type PolicyVersion } from "@/content/policies";
import type { Locale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

/** Draft policies remain noindex on production as well as previews (BL-PUB-08). */
export function policyPageMetadata(kind: PolicyKind, locale: Locale, version?: PolicyVersion): Metadata {
  const { document } = getPolicyDocument(kind, locale, version);
  const title = siteTitle(`${document.title} — ${locale === "ar" ? "مسودة" : "Draft"}`);
  const path = `/${kind}${version ? `/${version}` : ""}`;
  return {
    ...localizedPageMetadata(locale, path, title, document.metadataDescription),
    title,
    description: document.metadataDescription,
    robots: { index: false, follow: false, noarchive: true },
  };
}
