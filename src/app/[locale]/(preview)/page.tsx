import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageContent } from "@/components/homepage";
import { homepageCopy } from "@/content/public-site";
import { conferenceConfig } from "@/config/conference";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = homepageCopy[locale];
  const datePrefix = conferenceConfig.dates ? `${formatConferenceDateRange(conferenceConfig.dates, locale)}. ` : "";
  const title = `MSRC 2027 | ${copy.kicker}`;
  const description = `${datePrefix}${copy.lead}`;
  return { ...localizedPageMetadata(locale, "", title, description), title, description };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomePageContent locale={locale} />;
}
