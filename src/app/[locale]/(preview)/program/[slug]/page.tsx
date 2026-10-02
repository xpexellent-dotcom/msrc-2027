import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionDetailExperience } from "@/components/conference-experiences";
import { getPublicConferenceCatalogue } from "@/content/conference-catalogue.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const session = getPublicConferenceCatalogue().sessions.find((record) => record.slug === slug);
  if (!session) notFound();
  return {
    ...localizedPageMetadata(locale, `/program/${slug}`, siteTitle(session.title), session.description),
    title: siteTitle(session.title),
    description: session.description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const { sessions, speakers, media } = getPublicConferenceCatalogue();
  const session = sessions.find((record) => record.slug === slug);
  if (!session) notFound();
  const linkedSpeakers = speakers.filter((speaker) => session.speakerSlugs.includes(speaker.slug));
  const recording = media.find((record) => record.slug === session.recordingSlug);
  return <SessionDetailExperience locale={locale} session={session} speakers={linkedSpeakers} recording={recording} />;
}
