import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { isLocale } from "@/lib/i18n";
import { ParticipantCertificates } from "@/components/certificates/participant-certificates";
import { certificateCopy } from "@/components/certificates/copy";
import { readParticipantCertificatesPageState } from "@/features/certificates/page-state.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: certificateCopy[locale].participantTitle + " | MSRC 2027", robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Container className="certificate-route"><ParticipantCertificates standalone locale={locale} initialState={await readParticipantCertificatesPageState(locale)} /><p><Link href={`/${locale}/my-msrc`}>{certificateCopy[locale].back}</Link></p></Container>;
}
