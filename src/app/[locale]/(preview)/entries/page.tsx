import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { EntryWorkspace } from "@/features/competitions/entry-workspace";
import { competitionCopy } from "@/features/competitions/copy";
import { readCompetitionPageState } from "@/features/competitions/page-state.server";
import { isCompetitionKind } from "@/features/competitions/validation";
import "@/styles/participant-accounts.css";
import "@/features/competitions/competitions.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = competitionCopy[locale];
  return { ...localizedPageMetadata(locale, "/entries", siteTitle(copy.title), copy.lead), robots: { index: false, follow: false } };
}
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = competitionCopy[locale];
  const query = await searchParams, kind = query.kind ?? "hackathon"; if (!isCompetitionKind(kind)) notFound();
  return <Container className="participant-account-page" narrow><header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
    <EntryWorkspace key={kind} locale={locale} kind={kind} initial={await readCompetitionPageState(locale, kind)} />
  </Container>;
}
