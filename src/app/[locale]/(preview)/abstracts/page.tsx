import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { researchCompetitionCopy } from "@/features/research-competition/copy";
import { ResearchCompetitionPage } from "@/features/research-competition/research-page";
import { abstractReviewCtaAllowed } from "@/features/submissions/review-mode.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = researchCompetitionCopy[locale];
  return { ...localizedPageMetadata(locale, "/abstracts", siteTitle(copy.title), copy.description), title: siteTitle(copy.title), description: copy.description };
}
export default async function Page({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  // TEMPORARY: evaluated at build time so the page stays static; production builds always get false.
  return <ResearchCompetitionPage locale={locale} reviewAllowed={abstractReviewCtaAllowed()} />;
}
