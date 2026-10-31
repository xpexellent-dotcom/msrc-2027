import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { AbstractWorkspace } from "@/features/submissions/abstract-workspace";
import { abstractCopy } from "@/features/submissions/copy";
import { readAbstractPageState } from "@/features/submissions/page-state.server";
import { researchCompetitionCopy } from "@/features/research-competition/copy";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  return { ...localizedPageMetadata(locale, "/abstracts/submit", siteTitle(copy.title), copy.lead), robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  const competition = researchCompetitionCopy[locale];
  return <Container className="participant-account-page abstract-submission-page" narrow>
    <header className="participant-account-intro abstract-submission-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
    <section className="abstract-submission-rules" aria-labelledby="abstract-submission-rules-title" data-testid="abstract-submission-rules">
      <header><h2 id="abstract-submission-rules-title">{competition.rulesTitle}</h2></header>
      <ol>{competition.rules.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ol>
    </section>
    <AbstractWorkspace locale={locale} initial={await readAbstractPageState(locale)} />
  </Container>;
}
