import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageContent } from "@/components/homepage";
import { isLocale } from "@/lib/i18n";
import { isLocalMediaPreviewAllowed } from "@/lib/preview.server";
import { getLocalPreviewAsset, PREVIEW_ASSETS } from "@/lib/preview-media.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "MSRC homepage film | Local review", robots: { index: false, follow: false } };

export default async function HeroPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !isLocalMediaPreviewAllowed()) notFound();
  const assets = await Promise.all(Object.keys(PREVIEW_ASSETS).map(getLocalPreviewAsset));
  if (assets.some((asset) => asset === null)) notFound();
  return <HomePageContent locale={locale} media={{
    video: { approval: "preview", src: "/api/preview-media/desktop.mp4", mobileSrc: "/api/preview-media/mobile.mp4", poster: "/api/preview-media/poster-desktop.jpg", mobilePoster: "/api/preview-media/poster-mobile.jpg" },
    poster: "/api/preview-media/poster-desktop.jpg",
    caption: locale === "ar" ? "لقطات من MSRC 2026 · معاينة محلية للمراجعة" : "MSRC 2026 footage · Local review cut",
  }} />;
}
