import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamExperience } from "@/components/people-and-partners";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { getPublishedContent } from "@/features/content/published.server";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = peopleAndPartnersCopy[locale].team;
  const description = (await getPublishedContent("team")).length ? copy.groupTitle : copy.lead;
  return { ...localizedPageMetadata(locale, "/team", siteTitle(copy.label), description), title: siteTitle(copy.label), description };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TeamExperience locale={locale} items={await getPublishedContent("team")} />;
}
