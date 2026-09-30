import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { isDesignPreviewAllowed } from "@/lib/preview.server";

// Validate before this segment's loading boundary can stream a 200 response.
export default async function DesignSystemLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !isDesignPreviewAllowed()) notFound();
  return children;
}
