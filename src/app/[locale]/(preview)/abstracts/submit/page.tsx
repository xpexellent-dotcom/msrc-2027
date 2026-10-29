import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { AbstractWorkspace } from "@/features/submissions/abstract-workspace";
import { abstractCopy } from "@/features/submissions/copy";
import { readAbstractPageState } from "@/features/submissions/page-state.server";
import { isAbstractReviewMode } from "@/features/submissions/review-mode.server";
import { researchCompetitionCopy } from "@/features/research-competition/copy";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ review?: string | string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  return { ...localizedPageMetadata(locale, "/abstracts/submit", siteTitle(copy.title), copy.lead), robots: { index: false, follow: false } };
}
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = abstractCopy[locale];
  const query = await searchParams, reviewMode = isAbstractReviewMode(query), competition = researchCompetitionCopy[locale];
  return <Container className="participant-account-page abstract-submission-page" narrow data-review-mode={reviewMode || undefined}>
    <header className="participant-account-intro abstract-submission-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
    {reviewMode ? <div className="abstract-review-banner" data-testid="abstract-review-banner" role="status"><strong>{copy.reviewBanner}</strong></div> : null}
    <section className="abstract-submission-rules" aria-labelledby="abstract-submission-rules-title" data-testid="abstract-submission-rules">
      <header><h2 id="abstract-submission-rules-title">{competition.rulesTitle}</h2></header>
      <ol>{competition.rules.map(([name, text]) => <li key={name}><h3>{name}</h3><p>{text}</p></li>)}</ol>
    </section>
    <AbstractWorkspace locale={locale} initial={await readAbstractPageState(locale, query)} reviewMode={reviewMode} />
  </Container>;
}
