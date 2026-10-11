"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { localizePathname, type Locale } from "@/lib/i18n";
import { activateNavigation } from "@/lib/anchor-navigation";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("popstate", onChange); };
}
const getHash = () => window.location.hash;
const getServerHash = () => "";

function LanguageLabel({ targetLocale, iconOnly }: { targetLocale: Locale; iconOnly: boolean }) {
  return <>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" />
    </svg>
    <span className={iconOnly ? "sr-only" : undefined}>{targetLocale === "ar" ? "العربية" : "English"}</span>
  </>;
}

export function LanguageSwitchFallback({ locale, pathname, iconOnly = false }: {
  locale: Locale; pathname: string; iconOnly?: boolean;
}) {
  const targetLocale = locale === "en" ? "ar" : "en";
  return <a className={`language-switch${iconOnly ? " language-switch--icon" : ""}`}
    href={localizePathname(pathname, targetLocale)} hrefLang={targetLocale} lang={targetLocale}
    dir={targetLocale === "ar" ? "rtl" : "ltr"}
    aria-label={locale === "en" ? "View this page in Arabic" : "View this page in English"}>
    <LanguageLabel targetLocale={targetLocale} iconOnly={iconOnly} />
  </a>;
}

export function LanguageSwitch({ locale, iconOnly = false }: { locale: Locale; iconOnly?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams().toString();
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const targetLocale = locale === "en" ? "ar" : "en";
  const targetPath = localizePathname(pathname, targetLocale);

  return (
    <a
      className={`language-switch${iconOnly ? " language-switch--icon" : ""}`}
      href={`${targetPath}${query ? `?${query}` : ""}${hash}`}
      hrefLang={targetLocale}
      lang={targetLocale}
      dir={targetLocale === "ar" ? "rtl" : "ltr"}
      aria-label={locale === "en" ? "View this page in Arabic" : "View this page in English"}
      onClick={(event) => {
        // Read at activation so the latest anchor/query survives a language change.
        const address = new URL(window.location.href);
        address.pathname = localizePathname(address.pathname, targetLocale);
        const destination = `${address.pathname}${address.search}${address.hash}`;
        event.currentTarget.href = destination;
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          activateNavigation(event);
          event.preventDefault();
          // Next's route cache owns pathname/search; our anchor arrival owns
          // the fragment. Passing a hash back to an initial cached route can
          // append it twice in Next 16.3.7's canonical URL handling.
          router.push(`${address.pathname}${address.search}`, { scroll: false });
        }
      }}
    >
      <LanguageLabel targetLocale={targetLocale} iconOnly={iconOnly} />
    </a>
  );
}
