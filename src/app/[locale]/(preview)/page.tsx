import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageContent } from "@/components/homepage";
import { homepageCopy } from "@/content/public-site";
import { isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata } from "@/lib/metadata";
import { conferenceEventJsonLd, jsonLdScript, websiteJsonLd } from "@/lib/structured-data";

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = homepageCopy[locale];
  const title = `MSRC 2027 | ${copy.kicker}`;
  const description = conferenceDescription(locale, copy.lead);
  return { ...localizedPageMetadata(locale, "", title, description), title, description };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const event = conferenceEventJsonLd(locale);
  const structuredData = event ? [websiteJsonLd(locale), event] : [websiteJsonLd(locale)];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <HomePageContent locale={locale} />
    </>
  );
}
