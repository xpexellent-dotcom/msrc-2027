import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { CertificateVerification } from "@/components/certificates/verification";
import { certificateCopy } from "@/components/certificates/copy";
import { readCertificateVerification } from "@/features/certificates/verification.server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; code: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: certificateCopy[locale].verifyTitle + " | MSRC 2027", robots: { index: false, follow: false, noarchive: true, nosnippet: true } };
}
export default async function Page({ params }: Props) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  return <CertificateVerification locale={locale} result={await readCertificateVerification(code)} />;
}
