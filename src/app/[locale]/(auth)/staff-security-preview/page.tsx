import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StaffSecurityPreview } from "@/features/auth/staff-security-preview";
import { isAuthPreviewAllowed } from "@/lib/auth-preview.server";
import { isLocale } from "@/lib/i18n";
import "@/styles/staff-security-preview.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "MSRC staff security | Local synthetic preview",
  robots: { index: false, follow: false },
};

export default async function StaffSecurityPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !isAuthPreviewAllowed(await headers())) notFound();
  return <StaffSecurityPreview locale={locale} />;
}
