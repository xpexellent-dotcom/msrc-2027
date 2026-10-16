import type { Metadata } from "next";
import { headers } from "next/headers";
import { NotFoundContent } from "@/components/not-found-content";
import { SiteShell } from "@/components/site-shell";
import { arabicFont, bodyFont, displayFont, headingFont } from "@/lib/fonts";
import { dictionaries, direction } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await headers()).get("x-msrc-locale") === "ar" ? "ar" : "en";
  return { title: `MSRC 2027 | ${dictionaries[locale].notFoundTitle}`, robots: { index: false, follow: false } };
}

// Next's routing-level 404 bypasses the dynamic root layout. Only this fallback
// reads request headers; public layouts/pages retain their static rendering.
export default async function GlobalNotFound() {
  const locale = (await headers()).get("x-msrc-locale") === "ar" ? "ar" : "en";
  return (
    <html lang={locale} dir={direction(locale)} className={`${headingFont.variable} ${bodyFont.variable} ${arabicFont.variable} ${displayFont.variable}`}>
      <body>
        <SiteShell locale={locale}><NotFoundContent locale={locale} /></SiteShell>
      </body>
    </html>
  );
}
