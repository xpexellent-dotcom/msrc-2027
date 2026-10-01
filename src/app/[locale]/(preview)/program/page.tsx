import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgrammeExperience, type CatalogueQuery } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { getPublicConferenceCatalogue } from "@/content/conference-catalogue.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = experienceCopy[locale].pages.program;
  return {
    ...localizedPageMetadata(locale, "/program", copy.label, copy.lead),
    title: copy.label,
    description: copy.lead,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const search = await searchParams;
  const initialQuery: CatalogueQuery = {};
  for (const key of ["q", "day", "category", "room", "edition", "kind"] as const) {
    const value = search[key];
    if (typeof value === "string") initialQuery[key] = value.slice(0, 200);
  }
  const { sessions, speakers } = getPublicConferenceCatalogue();
  return <ProgrammeExperience key={JSON.stringify(initialQuery)} locale={locale} initialQuery={initialQuery} sessions={sessions} speakers={speakers} />;
}
