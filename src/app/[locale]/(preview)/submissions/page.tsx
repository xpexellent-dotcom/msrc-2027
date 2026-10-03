import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JourneyExperience } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata, siteTitle } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = experienceCopy[locale].pages.submissions;
  const description = conferenceDescription(locale, copy.lead);
  return {
    ...localizedPageMetadata(locale, "/submissions", siteTitle(copy.label), description),
    title: siteTitle(copy.label),
    description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <JourneyExperience locale={locale} journey="submissions" />;
}
