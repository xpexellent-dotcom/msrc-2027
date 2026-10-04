import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { readParticipantPageState } from "@/features/participant-accounts/page-state.server";
import { ParticipantAccountPage } from "@/features/participant-accounts/participant-page";
import { participantCopy } from "@/features/participant-accounts/participant-copy";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: `MSRC 2027 | ${participantCopy[locale].titles["forgot-password"]}`, robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ParticipantAccountPage locale={locale} screen="forgot-password" state={await readParticipantPageState(locale)} />;
}
