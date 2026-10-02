import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { SiteShell } from "@/components/site-shell";
import { VercelObservability } from "@/components/vercel-observability";
import { defaultLocale, dictionaries, direction, isLocale, locales } from "@/lib/i18n";
import "../globals.css";
import { arabicFontFile } from "@/lib/arabic-font";
import { bodyFont, displayFont, headingFont } from "@/lib/fonts";
import { siteOrigin } from "@/lib/metadata";

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
    metadataBase: new URL(siteOrigin),
    title: `MSRC 2027 | ${copy.preview}`,
    description: `${copy.title}. ${copy.institution}. ${copy.location}.`,
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
  // Fetch the Arabic face with the document, before first paint, on Arabic pages only.
  if (locale === "ar") preload(arabicFontFile, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang={locale} dir={direction(locale)} className={`${headingFont.variable} ${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <SiteShell locale={locale}>{children}</SiteShell>
        {/* ORG-008: only Vercel serves these scripts; elsewhere (local, CI) they would 404. */}
        {process.env.VERCEL ? <VercelObservability /> : null}
      </body>
    </html>
  );
}
