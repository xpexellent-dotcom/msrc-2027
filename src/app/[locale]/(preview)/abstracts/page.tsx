import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { researchCompetitionCopy } from "@/features/research-competition/copy";
import { ResearchCompetitionPage } from "@/features/research-competition/research-page";
import { isAbstractReviewMode } from "@/features/submissions/review-mode.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ review?: string | string[] }> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = researchCompetitionCopy[locale];
  const reviewMode = isAbstractReviewMode(await searchParams);
  return { ...localizedPageMetadata(locale, "/abstracts", siteTitle(copy.title), copy.description), title: siteTitle(copy.title), description: copy.description, ...(reviewMode ? { robots: { index: false, follow: false } } : {}) };
}
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  return <ResearchCompetitionPage locale={locale} reviewMode={isAbstractReviewMode(await searchParams)} />;
}
