import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { AbstractWorkspace } from "@/features/submissions/abstract-workspace";
import { abstractCopy } from "@/features/submissions/copy";
import { readAbstractPageState } from "@/features/submissions/page-state.server";
import "@/styles/participant-accounts.css";
import "@/styles/abstract-submissions.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  return { ...localizedPageMetadata(locale, "/abstracts/submit", siteTitle(copy.title), copy.lead), robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  return <Container className="participant-account-page" narrow><header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header><AbstractWorkspace locale={locale} initial={await readAbstractPageState(locale)} /></Container>;
}
