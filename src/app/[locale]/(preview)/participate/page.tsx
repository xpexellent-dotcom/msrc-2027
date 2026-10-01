import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParticipateExperience } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = experienceCopy[locale].pages.participate;
  return {
    ...localizedPageMetadata(locale, "/participate", siteTitle(copy.label), copy.lead),
    title: siteTitle(copy.label),
    description: copy.lead,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ParticipateExperience locale={locale} />;
}
