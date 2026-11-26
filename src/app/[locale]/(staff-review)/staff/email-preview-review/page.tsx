import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LanguageSwitchFallback } from "@/components/language-switch";
import { EmailPreviewsPanel } from "@/features/staff-portal/email-previews-panel";
import { renderRegistrationEmailPreviews } from "@/features/staff-portal/email-previews.server";
import { isLocale } from "@/lib/i18n";
import "@/styles/staff-portal.css";
import "@/styles/staff-console.css";
import "@/styles/email-message-preview.css";

export const dynamic = "force-dynamic";
const titles = { en: "Email design review", ar: "مراجعة تصميم البريد الإلكتروني" };
type ReviewPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `MSRC 2027 | ${titles[isLocale(locale) ? locale : "en"]}`,
    robots: { index: false, follow: false, noarchive: true },
    referrer: "no-referrer",
  };
}

/** This fixed-sample catalogue is isolated from the operational staff route tree. */
export default async function EmailPreviewReviewPage({ params }: ReviewPageProps) {
  const { locale } = await params;
  const { VERCEL, VERCEL_ENV, VERCEL_TARGET_ENV, VERCEL_GIT_COMMIT_REF, VERCEL_URL } = process.env;
  if (!isLocale(locale) || VERCEL !== "1" || VERCEL_ENV !== "preview"
    || (VERCEL_TARGET_ENV && VERCEL_TARGET_ENV !== "preview")
    || VERCEL_GIT_COMMIT_REF !== "codex/email-preview-brand-refresh"
    || !VERCEL_URL || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(VERCEL_URL)
    || (await headers()).get("host") !== VERCEL_URL) notFound();

  return <div className="staff-portal">
    <header className="staff-heading staff-detail-head">
      <h1>{titles[locale]}</h1>
      <LanguageSwitchFallback locale={locale} pathname={`/${locale}/staff/email-preview-review`} />
    </header>
    <EmailPreviewsPanel locale={locale} previews={renderRegistrationEmailPreviews()} />
  </div>;
}
