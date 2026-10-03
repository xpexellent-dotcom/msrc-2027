import { notFound } from "next/navigation";
import { PolicyPage } from "@/features/policies/policy-page";
import { policyPageMetadata } from "@/features/policies/policy-metadata";
import { isLocale } from "@/lib/i18n";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return policyPageMetadata("privacy", locale);
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PolicyPage kind="privacy" locale={locale} />;
}
