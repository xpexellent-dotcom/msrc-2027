"use client";

import Image from "next/image";
import { brandLogo, brandLogoRendition } from "@/content/brand-identity";
import { Link } from "@/components/ui/link";
import { MobileNav, type NavigationLink } from "@/components/mobile-nav";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { LanguageSwitch, LanguageSwitchFallback } from "@/components/language-switch";
import { HeaderPrimaryAction, headerAction, useParticipantName } from "@/components/header-account-link";
import { ReserveSeat } from "@/components/reserve-seat";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n";
import { revealPageNavigation } from "@/lib/anchor-navigation";

// Native links work immediately, but disclosures need their client handlers.
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

const headerCopy = {
  en: {
    navigation: "Main navigation", menu: "Menu", close: "Close menu", homeSuffix: ", home page",
    edition: "Fifth edition", registration: "Conference registration", action: "Reserve your seat", options: "options",
    links: [
      { label: "Participate", href: "/participate", children: [
        { label: "Attend", href: "/registration" }, { label: "Abstracts", href: "/abstracts" },
        { label: "Workshops", href: "/workshops" }, { label: "Hackathon", href: "/hackathon" },
        { label: "3MT", href: "/3mt" },
      ] },
      { label: "Program", href: "/program" }, { label: "Speakers", href: "/speakers" },
      { label: "Sponsors", href: "/sponsors" }, { label: "Venue", href: "/dates-venue" },
      { label: "Our Team", href: "/team" }, { label: "Contact", href: "/contact" },
    ],
  },
  ar: {
    navigation: "التنقل الرئيسي", menu: "القائمة", close: "إغلاق القائمة", homeSuffix: "، الصفحة الرئيسية",
    edition: "النسخة الخامسة", registration: "التسجيل في المؤتمر", action: "احجز مقعدك", options: "خيارات",
    links: [
      { label: "المشاركة", href: "/participate", children: [
        { label: "الحضور", href: "/registration" }, { label: "الملخصات", href: "/abstracts" },
        { label: "ورش العمل", href: "/workshops" }, { label: "الهاكاثون", href: "/hackathon" },
        { label: "أطروحة في ثلاث دقائق", href: "/3mt" },
      ] },
      { label: "البرنامج", href: "/program" }, { label: "المتحدثون", href: "/speakers" },
      { label: "الرعاة", href: "/sponsors" }, { label: "المقر", href: "/dates-venue" },
      { label: "فريقنا", href: "/team" }, { label: "التواصل", href: "/contact" },
    ],
  },
} satisfies Record<Locale, { navigation: string; menu: string; close: string; homeSuffix: string; edition: string; registration: string; action: string; options: string; links: NavigationLink[] }>;

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = headerCopy[locale];
  const action = headerAction(locale, useParticipantName(), copy.action);
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [animateMenu, setAnimateMenu] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A dropdown opened by hovering stays open on the click that usually follows,
  // instead of the toggle closing it under the pointer.
  const hoverOpenedRef = useRef<string | null>(null);
  const menuCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelMenuClose = useCallback(() => {
    if (menuCloseRef.current !== null) clearTimeout(menuCloseRef.current);
    menuCloseRef.current = null;
  }, []);
  const finishMenuClose = useCallback(() => {
    cancelMenuClose();
    setMenuClosing(false);
  }, [cancelMenuClose]);
  const closeMenu = useCallback((animate = false) => {
    cancelMenuClose();
    const closing = menuOpen && animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMenuOpen(false);
    setMenuClosing(closing);
    // A canceled transition, preference change, or older browser must still dismiss.
    if (closing) menuCloseRef.current = setTimeout(finishMenuClose, 220);
  }, [menuOpen, cancelMenuClose, finishMenuClose]);
  const cancelDropdownClose = useCallback(() => {
    if (dropdownCloseRef.current !== null) clearTimeout(dropdownCloseRef.current);
    dropdownCloseRef.current = null;
  }, []);

  useEffect(() => revealPageNavigation(pathname), [pathname]);
  useEffect(() => cancelDropdownClose, [cancelDropdownClose]);
  useEffect(() => cancelMenuClose, [cancelMenuClose]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header || !window.IntersectionObserver) return;
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      const bar = header.querySelector(".site-header-inner")!.getBoundingClientRect();
      const y = Math.round(bar.top + bar.height / 2);
      const visible = new Set<Element>();
      const sections = [...document.querySelectorAll<HTMLElement>("[data-header-section]")];
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        const section = sections.findLast((node) => visible.has(node));
        if (section) header.dataset.headerTone = section.dataset.headerSection;
      }, { rootMargin: `-${y}px 0px -${Math.max(0, innerHeight - y - 1)}px 0px`, threshold: 0 });
      for (const section of sections) observer.observe(section);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => { observer?.disconnect(); window.removeEventListener("resize", observe); };
  }, [pathname]);

  useEffect(() => {
    const masthead = headerRef.current?.querySelector<HTMLElement>(".site-header-inner");
    if (!masthead) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty("--site-header-height", `${Math.ceil(masthead.getBoundingClientRect().bottom)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(masthead);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); root.style.removeProperty("--site-header-height"); };
  }, []);

  useEffect(() => {
    if (!menuOpen && !menuClosing && !openDropdown) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      cancelDropdownClose();
      if (menuOpen || menuClosing) { closeMenu(); toggleRef.current?.focus(); }
      if (openDropdown) {
        headerRef.current?.querySelector<HTMLButtonElement>(`[data-dropdown-toggle="${openDropdown}"]`)?.focus();
        setOpenDropdown(null);
      }
    }
    function onOutside(event: Event) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        cancelDropdownClose();
        closeMenu(event.type === "pointerdown"); setOpenDropdown(null);
      }
    }
    const desktop = window.matchMedia("(min-width: 1200px)");
    const viewport = () => { cancelDropdownClose(); closeMenu(); setOpenDropdown(null); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onOutside);
    document.addEventListener("pointerdown", onOutside);
    desktop.addEventListener("change", viewport);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("pointerdown", onOutside);
      desktop.removeEventListener("change", viewport);
    };
  }, [menuOpen, menuClosing, openDropdown, cancelDropdownClose, closeMenu]);

  const onNavigate = () => { cancelDropdownClose(); closeMenu(); setOpenDropdown(null); };
  const links: NavigationLink[] = copy.links.map((link) => ({ ...link, href: `/${locale}${link.href}`,
    children: "children" in link ? link.children?.map((child) => ({ ...child, href: `/${locale}${child.href}` })) : undefined,
  }));

  return (
    <header ref={headerRef} className="site-header axiom-header"
      data-header-ready={hydrated && typeof IntersectionObserver !== "undefined"}
      data-header-tone={pathname === `/${locale}` ? "dark" : "light"}
      data-home={pathname === `/${locale}`} data-menu-open={menuOpen} data-keyboard={keyboard}
      onPointerDownCapture={() => setKeyboard(false)} onKeyDownCapture={() => setKeyboard(true)}>
      <Container className="site-header-inner">
        <span className="header-glass" aria-hidden="true" />
        {/* A native anchor intentionally reloads home, even when already on home. */}
        <a className="wordmark" href={`/${locale}`}>
          <Image src={brandLogo.onPurple} alt="" width={brandLogoRendition.width} height={brandLogoRendition.height} loading="eager" unoptimized className="wordmark-logo wordmark-logo--dark" />
          <Image src={brandLogo.onWhite} alt="" width={brandLogoRendition.width} height={brandLogoRendition.height} loading="eager" unoptimized className="wordmark-logo wordmark-logo--light" />
          <span className="brand-word" dir="ltr" lang="en" aria-hidden="true">MSRC’27</span>
          <span className="wordmark-name sr-only" dir="ltr" lang="en">MSRC 2027</span>
          <span className="wordmark-edition sr-only">{copy.edition}</span>
          <span className="sr-only">{copy.homeSuffix}</span>
        </a>
        <div className="header-middle">
          <nav className="desktop-nav" aria-label={copy.navigation}>
            {links.map((link, index) => {
              const dropdownId = `${menuId}-dropdown-${index}`;
              const open = openDropdown === link.href;
              return <div className="header-nav-item" key={link.href} data-open={open}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    cancelDropdownClose();
                    if (!open) hoverOpenedRef.current = link.children ? link.href : null;
                    setKeyboard(false); setOpenDropdown(link.children ? link.href : null);
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "touch" || !link.children) return;
                  const item = event.currentTarget;
                  cancelDropdownClose();
                  // Forgive a brief diagonal gap crossing without latching the menu
                  // open after a real exit. Keyboard focus is never timed out.
                  dropdownCloseRef.current = setTimeout(() => {
                    dropdownCloseRef.current = null;
                    if (!item.matches(":hover") && !item.querySelector(":focus-visible")) {
                      setOpenDropdown((current) => current === link.href ? null : current);
                    }
                  }, 140);
                }}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { cancelDropdownClose(); setOpenDropdown(null); } }}>
                <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={onNavigate}
                  onFocus={() => { cancelDropdownClose(); if (link.children) setOpenDropdown(link.href); }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && link.children) {
                      event.preventDefault(); setOpenDropdown(link.href);
                      document.getElementById(dropdownId)?.querySelector<HTMLAnchorElement>("a")?.focus();
                    }
                  }}>{link.label}</Link>
                {link.children ? <>
                  <button type="button" className="header-dropdown-toggle" data-dropdown-toggle={link.href}
                    aria-expanded={open} aria-controls={dropdownId} aria-label={`${link.label} ${copy.options}`} disabled={!hydrated}
                    onClick={(event) => {
                      const keepHoverOpen = open && event.detail > 0 && hoverOpenedRef.current === link.href;
                      hoverOpenedRef.current = null;
                      if (!keepHoverOpen) setOpenDropdown(open ? null : link.href);
                    }}>
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
                  </button>
                  <div className="header-dropdown" id={dropdownId} inert={!open}>
                    {link.children.map((child) => <Link key={child.href} href={child.href} onClick={onNavigate}>{child.label}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg></Link>)}
                  </div>
                </> : null}
              </div>;
            })}
          </nav>
          <Suspense fallback={<LanguageSwitchFallback locale={locale} pathname={pathname} />}><LanguageSwitch locale={locale} /></Suspense>
        </div>
        <div className="header-actions">
          {action.name ? <HeaderPrimaryAction action={action} /> : <ReserveSeat locale={locale} label={copy.action} className="header-primary-action" size="small" testId="header-primary-action" />}
          <div className="header-mobile-language" onClick={onNavigate}>
            <Suspense fallback={<LanguageSwitchFallback locale={locale} pathname={pathname} iconOnly />}><LanguageSwitch locale={locale} iconOnly /></Suspense>
          </div>
          <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls={menuId}
            aria-label={menuOpen ? copy.close : copy.menu} ref={toggleRef} disabled={!hydrated}
            onClick={(event) => {
              const animate = event.detail !== 0;
              setAnimateMenu(animate);
              if (menuOpen) closeMenu(animate);
              else { cancelMenuClose(); setMenuClosing(false); setMenuOpen(true); }
            }}>
            <span>{copy.menu}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path className="menu-toggle-line-top" d="M4 8h16" /><path className="menu-toggle-line-bottom" d="M4 16h16" />
            </svg>
          </button>
        </div>
      </Container>
      {menuOpen || menuClosing ? <MobileNav id={menuId} label={copy.navigation} links={links} locale={locale}
        pathname={pathname} status={copy.registration} action={action.label} actionHref={action.href} animate={animateMenu} closing={menuClosing}
        onExited={finishMenuClose} onNavigate={onNavigate} /> : null}
    </header>
  );
}
