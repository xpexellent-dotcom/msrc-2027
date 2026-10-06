import type { Metadata } from "next";
import { getPolicyDocument, type PolicyKind, type PolicyVersion } from "@/content/policies";
import type { Locale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

/** ORG-037: approved policies inherit the site's production-only indexing rule. */
export function policyPageMetadata(kind: PolicyKind, locale: Locale, version?: PolicyVersion): Metadata {
  const { document } = getPolicyDocument(kind, locale, version);
  const title = siteTitle(document.title);
  const path = `/${kind}${version ? `/${version}` : ""}`;
  return {
    ...localizedPageMetadata(locale, path, title, document.metadataDescription),
    title,
    description: document.metadataDescription,
  };
}
