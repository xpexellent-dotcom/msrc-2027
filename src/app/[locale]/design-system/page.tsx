import { notFound } from "next/navigation";
import { DesignSystemDemo } from "@/components/design-system-demo";
import { isLocale } from "@/lib/i18n";
import { isDesignPreviewAllowed } from "@/lib/preview.server";

export const dynamic = "force-dynamic";

export default async function DesignSystemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !isDesignPreviewAllowed()) notFound();
  return <DesignSystemDemo locale={locale} />;
}
