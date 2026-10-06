"use client";

import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { usePathname } from "next/navigation";

import { dictionaries, type Locale } from "@/lib/i18n";

export function SiteShell({ children, locale, showDesignSystem = false }: {
  children: React.ReactNode;
  locale: Locale;
  showDesignSystem?: boolean;
}) {
  const copy = dictionaries[locale];
  const privateStaffRoute = /^\/(en|ar)\/staff(?:\/|$)/.test(usePathname());
  return (
    <>
      <a className="skip-link" href="#main-content">{copy.skip}</a>
      {!privateStaffRoute ? <SiteHeader locale={locale} /> : null}
      <main id="main-content" className={privateStaffRoute ? "staff-main" : undefined} tabIndex={-1}>{children}</main>
      {!privateStaffRoute ? <Footer locale={locale} showDesignSystem={showDesignSystem} /> : null}
    </>
  );
}
