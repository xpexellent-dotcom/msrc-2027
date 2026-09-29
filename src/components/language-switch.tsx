"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dictionaries, localizePathname, type Locale } from "@/lib/i18n";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const targetLocale = locale === "en" ? "ar" : "en";

  return (
    <Link
      className="language-switch"
      href={localizePathname(pathname, targetLocale)}
      hrefLang={targetLocale}
      lang={targetLocale}
      dir={targetLocale === "ar" ? "rtl" : "ltr"}
      aria-label={dictionaries[locale].languageSwitch}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" />
      </svg>
      {targetLocale === "ar" ? "العربية" : "English"}
    </Link>
  );
}
