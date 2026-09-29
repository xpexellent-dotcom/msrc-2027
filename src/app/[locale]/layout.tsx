import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { defaultLocale, dictionaries, direction, isLocale, locales } from "@/lib/i18n";
import "../globals.css";

export const viewport: Viewport = { themeColor: "#F8F6F0" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const copy = dictionaries[locale];
  return {
    title: `MSRC 2027 | ${copy.preview}`,
    description: `${copy.title}. ${copy.footer}`,
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  // Unsupported locales retain a valid English document around the 404 boundary.
  // Route pages validate the locale before rendering any conference content.
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  return (
    <html lang={locale} dir={direction(locale)}>
      <body><SiteShell locale={locale}>{children}</SiteShell></body>
    </html>
  );
}
