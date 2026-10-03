import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftPageMetadata, LegalPage } from "@/components/legal-page";
import { termsCopy } from "@/content/legal";
import { isLocale } from "@/lib/i18n";

type TermsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = termsCopy[locale];
  return draftPageMetadata(locale, "/terms", copy.metadataTitle, copy.metadataDescription);
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage locale={locale} copy={termsCopy[locale]} />;
}
