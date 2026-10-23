import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpeakersExperience } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { getPublicConferenceCatalogue } from "@/content/conference-catalogue.server";
import { isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata, siteTitle } from "@/lib/metadata";

// ISR: published content refreshes on publish, or within a minute otherwise.
export const revalidate = 60;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = experienceCopy[locale].pages.speakers;
  const description = conferenceDescription(locale, copy.lead);
  return {
    ...localizedPageMetadata(locale, "/speakers", siteTitle(copy.label), description),
    title: siteTitle(copy.label),
    description,
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { speakers } = await getPublicConferenceCatalogue(locale);
  return <SpeakersExperience locale={locale} speakers={speakers} />;
}
