import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpeakerDetailExperience } from "@/components/conference-experiences";
import { getPublicConferenceCatalogue } from "@/content/conference-catalogue.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata, siteTitle } from "@/lib/metadata";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const speaker = getPublicConferenceCatalogue().speakers.find((record) => record.slug === slug);
  if (!speaker) notFound();
  return {
    ...localizedPageMetadata(locale, `/speakers/${slug}`, siteTitle(speaker.name), speaker.biography),
    title: siteTitle(speaker.name),
    description: speaker.biography,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const { speakers, sessions } = getPublicConferenceCatalogue();
  const speaker = speakers.find((record) => record.slug === slug);
  if (!speaker) notFound();
  const linkedSessions = sessions.filter((session) => session.speakerSlugs.includes(speaker.slug));
  return <SpeakerDetailExperience locale={locale} speaker={speaker} sessions={linkedSessions} />;
}
