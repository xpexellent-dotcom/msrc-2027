"use client";

import { usePathname, useRouter } from "next/navigation";
import { localizePathname, type Locale } from "@/lib/i18n";
import { activateNavigation } from "@/lib/anchor-navigation";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const targetLocale = locale === "en" ? "ar" : "en";
  const targetPath = localizePathname(pathname, targetLocale);

  return (
    <a
      className="language-switch"
      href={targetPath}
      hrefLang={targetLocale}
      lang={targetLocale}
      dir={targetLocale === "ar" ? "rtl" : "ltr"}
      aria-label={locale === "en" ? "View this page in Arabic" : "View this page in English"}
      onClick={(event) => {
        // Read at activation so the latest anchor/query survives a language change.
        const destination = `${targetPath}${window.location.search}${window.location.hash}`;
        event.currentTarget.href = destination;
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          activateNavigation(event);
          event.preventDefault();
          router.push(destination);
        }
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" />
      </svg>
      {targetLocale === "ar" ? "العربية" : "English"}
    </a>
  );
}
