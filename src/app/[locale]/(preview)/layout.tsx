import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default async function PreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Validate before this segment's loading boundary can stream a 200 response.
  // The parent locale layout still supplies the 404's document and navigation.
  if (!isLocale(locale)) notFound();
  return children;
}
