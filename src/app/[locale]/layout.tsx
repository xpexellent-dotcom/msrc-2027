import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { VercelObservability } from "@/components/vercel-observability";
import { conferenceConfig } from "@/config/conference";
import { defaultLocale, dictionaries, direction, isLocale, locales } from "@/lib/i18n";
import "../globals.css";
import { arabicFont, bodyFont, displayFont, headingFont } from "@/lib/fonts";
import { siteOrigin } from "@/lib/metadata";

// Keep zoom and native keyboard scrolling. Safari reports unknown viewport keys
// as console errors; this document has no keyboard-bound fixed app shell.
export const viewport: Viewport = { themeColor: "#F8F6F0", viewportFit: "cover" };

// Unknown top-level URLs must reach the routing-level 404, rather than enter
// this locale layout and throw a notFound() document that needs JS to recover.
export const dynamicParams = false;

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
    title: `MSRC 2027 | ${copy.title}`,
    description: `${copy.title}. ${copy.institution}. ${conferenceConfig.venue ? `${conferenceConfig.venue.name[locale]}. ` : ""}${copy.location}.`,
    // Pages opt in through localizedPageMetadata; everything else stays out of search.
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
    <html lang={locale} dir={direction(locale)} className={`${headingFont.variable} ${bodyFont.variable} ${arabicFont.variable} ${displayFont.variable}`}>
      <body>
        <SiteShell locale={locale}>{children}</SiteShell>
        {/* ORG-008: production only. Previews would count the team; elsewhere (local, CI) the
            scripts do not exist. */}
        {process.env.VERCEL_ENV === "production" ? <VercelObservability /> : null}
      </body>
    </html>
  );
}
