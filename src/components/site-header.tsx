"use client";

import { Link } from "@/components/ui/link";
import { MobileNav } from "@/components/mobile-nav";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { ButtonLink } from "@/components/ui/button";
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
    action: "Explore MSRC",
    links: [
      { label: "About", href: "/about" },
      { label: "Programme", href: "/program" },
      { label: "Participate", href: "/participate" },
      { label: "Speakers", href: "/speakers" },
      { label: "Media", href: "/media" },
    ],
  },
  ar: {
    navigation: "التنقل الرئيسي",
    menu: "القائمة",
    close: "إغلاق القائمة",
    home: "الصفحة الرئيسية لمؤتمر MSRC 2027",
    edition: "النسخة الخامسة",
    registration: "لم يُفتح التسجيل بعد",
    action: "اكتشف المؤتمر",
    links: [
      { label: "عن المؤتمر", href: "/about" },
      { label: "البرنامج", href: "/program" },
      { label: "المشاركة", href: "/participate" },
      { label: "المتحدثون", href: "/speakers" },
      { label: "الوسائط", href: "/media" },
    ],
  },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = headerCopy[locale];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => revealPageNavigation(pathname), [pathname]);

  useEffect(() => {
    let docked = window.scrollY > 48;
    let lastY = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      // A small return-to-top zone prevents toolbar bounce from toggling the card.
      if (y > 48) docked = true;
      else if (y < 8) docked = false;
      setScrolled(docked);
      // Direction of travel, for short landscape screens only (CSS): there the floating header
      // would cover a quarter of the view, so it steps aside while reading down and returns on
      // any scroll back up, near the top, or when focus moves into it.
      if (y < 160) { setTucked(false); lastY = y; return; }
      if (Math.abs(y - lastY) < 8) return;
      setTucked(y > lastY);
      lastY = y;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const card = headerRef.current?.querySelector<HTMLElement>(".site-header-inner");
    if (!card) return;
    const root = document.documentElement;
    const measure = () => {
      root.style.setProperty("--site-header-height", `${card.offsetHeight}px`);

    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--site-header-height");
    };
  }, []);

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
    <header ref={headerRef} className="site-header" data-scrolled={scrolled} data-tucked={tucked && !menuOpen} data-home={pathname === `/${locale}`} data-menu-open={menuOpen}>
      <Container className="site-header-inner">
        <Link className="wordmark" href={`/${locale}`} aria-label={copy.home} onClick={() => setMenuOpen(false)}>
          <span className="wordmark-name" dir="ltr" lang="en">MSRC<span className="wordmark-year">2027</span></span>
          <span className="wordmark-edition">{copy.edition}</span>
        </Link>
        <nav className="desktop-nav" aria-label={copy.navigation}>
          {copy.links.map((link) => <Link key={link.href} href={`/${locale}${link.href}`} aria-current={pathname === `/${locale}${link.href}` ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Suspense fallback={<Link className="language-switch" href={pathname.replace(/^\/(en|ar)/, locale === "en" ? "/ar" : "/en")} hrefLang={locale === "en" ? "ar" : "en"}>{locale === "en" ? "العربية" : "English"}</Link>}><LanguageSwitch locale={locale} /></Suspense>
          <ButtonLink className="header-primary-action" href={`/${locale}/participate`} size="small">{copy.action}<span aria-hidden="true">↗</span></ButtonLink>
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
