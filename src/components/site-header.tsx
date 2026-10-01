"use client";

import { Link } from "@/components/ui/link";
import { MobileNav } from "@/components/mobile-nav";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n";
import { revealPageNavigation } from "@/lib/anchor-navigation";

const headerCopy = {
  en: {
    navigation: "Main navigation",
    menu: "Menu",
    close: "Close menu",
    home: "MSRC 2027 home",
    edition: "Fifth edition",
    registration: "Registration not open yet",
    links: [
      { label: "About", href: "/about" },
      { label: "Participate", href: "#participate" },
      { label: "Program", href: "#program" },
      { label: "Our legacy", href: "#legacy" },
    ],
  },
  ar: {
    navigation: "التنقل الرئيسي",
    menu: "القائمة",
    close: "إغلاق القائمة",
    home: "الصفحة الرئيسية لمؤتمر MSRC 2027",
    edition: "النسخة الخامسة",
    registration: "لم يُفتح التسجيل بعد",
    links: [
      { label: "عن المؤتمر", href: "/about" },
      { label: "المشاركة", href: "#participate" },
      { label: "البرنامج", href: "#program" },
      { label: "مسيرتنا", href: "#legacy" },
    ],
  },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = headerCopy[locale];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => revealPageNavigation(pathname), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 1100px)");
    function onViewportChange() {
      if (desktop.matches) setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewportChange);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <Container className="site-header-inner">
        <Link className="wordmark" href={`/${locale}`} aria-label={copy.home} onClick={() => setMenuOpen(false)}>
          <span className="wordmark-name" dir="ltr" lang="en">MSRC<span className="wordmark-year">2027</span></span>
          <span className="wordmark-edition">{copy.edition}</span>
        </Link>
        <nav className="desktop-nav" aria-label={copy.navigation}>
          {copy.links.map((link) => <Link key={link.href} href={`/${locale}${link.href}`} aria-current={pathname === `/${locale}${link.href}` ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} />
          <Button className="header-registration" variant="secondary" size="small" disabled>{copy.registration}</Button>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? copy.close : copy.menu}
            ref={toggleRef}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d={menuOpen ? "M5 5l14 14M5 19L19 5" : "M4 7h16M4 12h16M4 17h16"} /></svg>
          </button>
        </div>
      </Container>
      {menuOpen ? (
        <MobileNav id={menuId} label={copy.navigation} links={copy.links.map((link) => ({...link, href: `/${locale}${link.href}`}))}
          pathname={pathname} status={copy.registration} onNavigate={() => setMenuOpen(false)} />
      ) : null}
    </header>
  );
}
