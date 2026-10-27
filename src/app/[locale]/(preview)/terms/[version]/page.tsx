import { notFound } from "next/navigation";
import { isPolicyVersion, policyVersionKeys } from "@/content/policies";
import { PolicyPage } from "@/features/policies/policy-page";
import { policyPageMetadata } from "@/features/policies/policy-metadata";
import { isLocale } from "@/lib/i18n";

type PageProps = { params: Promise<{ locale: string; version: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return policyVersionKeys("terms").map((version) => ({ version }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, version } = await params;
  if (!isLocale(locale) || !isPolicyVersion(version, "terms")) notFound();
  return policyPageMetadata("terms", locale, version);
}

export default async function TermsVersionPage({ params }: PageProps) {
  const { locale, version } = await params;
  if (!isLocale(locale) || !isPolicyVersion(version, "terms")) notFound();
  return <PolicyPage kind="terms" locale={locale} version={version} dated />;
}
