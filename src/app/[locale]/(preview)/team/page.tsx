import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamPage } from "@/features/team/team-page";
import { teamCopy } from "@/content/team";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = teamCopy[locale];
  return { ...localizedPageMetadata(locale, "/team", siteTitle(copy.label), copy.lead), title: siteTitle(copy.label), description: copy.lead };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TeamPage locale={locale} />;
}
