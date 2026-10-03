import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftPageMetadata, LegalPage } from "@/components/legal-page";
import { privacyCopy } from "@/content/legal";
import { isLocale } from "@/lib/i18n";

type PrivacyPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = privacyCopy[locale];
  return draftPageMetadata(locale, "/privacy", copy.metadataTitle, copy.metadataDescription);
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage locale={locale} copy={privacyCopy[locale]} />;
}
