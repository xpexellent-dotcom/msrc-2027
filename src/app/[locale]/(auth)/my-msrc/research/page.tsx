import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";
import { researchParticipantCopy } from "@/features/research-judging/participant-copy";
import { readResearchParticipantPageState } from "@/features/research-judging/participant-page-state.server";
import { ResearchParticipantWorkspace } from "@/features/research-judging/participant-workspace";
import "@/styles/participant-accounts.css";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  return { title: researchParticipantCopy[locale].title + " | MSRC 2027", robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const copy = researchParticipantCopy[locale];
  return <Container className="participant-account-page" narrow><header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
    <ResearchParticipantWorkspace locale={locale} initial={await readResearchParticipantPageState(locale)} />
    <div className="participant-account-actions"><ButtonLink href={`/${locale}/my-msrc`} variant="secondary">{locale === "ar" ? "حسابي في MSRC" : "My MSRC"}</ButtonLink></div>
  </Container>;
}
