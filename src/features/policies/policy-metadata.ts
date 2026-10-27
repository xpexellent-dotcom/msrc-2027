import type { Metadata } from "next";
import { getPolicyDocument, type PolicyKind, type PolicyVersion } from "@/content/policies";
import type { Locale } from "@/lib/i18n";
import { indexable, localizedPageMetadata, siteTitle } from "@/lib/metadata";

/**
 * The approved headings already name the conference ("MSRC 2027 Privacy Policy",
 * "سياسة الخصوصية لمؤتمر MSRC ٢٠٢٧"), and siteTitle appends "| MSRC 2027". Drop the
 * leading/trailing brand for the tab title only; the published heading is unchanged.
 */
export function policyTabLabel(heading: string): string {
  return heading.replace(/^MSRC 2027\s+/, "").replace(/\s+ل?مؤتمر\s+MSRC\s+(?:2027|٢٠٢٧)$/, "").trim() || heading;
}

/**
 * ORG-037/066: approved policies inherit the site's production-only indexing rule.
 * Stable version pages point search engines at the current unversioned document
 * and stay out of the index.
 */
export function policyPageMetadata(kind: PolicyKind, locale: Locale, version?: PolicyVersion): Metadata {
  const { document } = getPolicyDocument(kind, locale, version);
  const title = siteTitle(policyTabLabel(document.title));
  const base = localizedPageMetadata(locale, `/${kind}`, title, document.metadataDescription);
  return {
    ...base,
    ...(version ? { robots: { index: false, follow: indexable } } : {}),
    title,
    description: document.metadataDescription,
  };
}
