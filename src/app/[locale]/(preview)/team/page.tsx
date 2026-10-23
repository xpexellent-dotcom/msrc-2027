import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamExperience } from "@/components/people-and-partners";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { getPublishedContent } from "@/features/content/published.server";
import { publishedTeamRoster } from "@/features/content/team-roster";

// ISR: published content refreshes on publish, or within a minute otherwise.
export const revalidate = 60;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = peopleAndPartnersCopy[locale].team;
  const items = await getPublishedContent("team");
  const description = items.length && !publishedTeamRoster(items) ? copy.groupTitle : copy.lead;
  return { ...localizedPageMetadata(locale, "/team", siteTitle(copy.label), description), title: siteTitle(copy.label), description };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TeamExperience locale={locale} items={await getPublishedContent("team")} />;
}
