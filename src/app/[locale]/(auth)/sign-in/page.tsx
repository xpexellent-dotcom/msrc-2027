import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { participantPageTitle, readParticipantPageState } from "@/features/participant-accounts/page-state.server";
import { ParticipantAccountPage } from "@/features/participant-accounts/participant-page";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: participantPageTitle(locale, "sign-in"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ParticipantAccountPage locale={locale} screen="sign-in" state={await readParticipantPageState(locale)} />;
}
