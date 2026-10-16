"use client";

import { Link } from "@/components/ui/link";
import { MobileNav, type NavigationLink } from "@/components/mobile-nav";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { LanguageSwitch, LanguageSwitchFallback } from "@/components/language-switch";
import { ButtonLink } from "@/components/ui/button";
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
    edition: "Fifth edition", registration: "Registration not open yet", action: "Reserve your seat", options: "options",
    links: [
      { label: "Participate", href: "/participate", children: [
        { label: "Attend", href: "/registration" }, { label: "Abstract submission", href: "/submissions" },
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
    edition: "النسخة الخامسة", registration: "لم يُفتح التسجيل بعد", action: "احجز مقعدك", options: "خيارات",
    links: [
      { label: "المشاركة", href: "/participate", children: [
        { label: "الحضور", href: "/registration" }, { label: "تقديم الملخصات", href: "/submissions" },
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
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [animateMenu, setAnimateMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [readingDown, setReadingDown] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [canCompact, setCanCompact] = useState(false);
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
  const compact = canCompact && scrolled && readingDown && !focusWithin && !menuOpen && !openDropdown;

  useEffect(() => revealPageNavigation(pathname), [pathname]);
  useEffect(() => cancelDropdownClose, [cancelDropdownClose]);
  useEffect(() => cancelMenuClose, [cancelMenuClose]);

  useEffect(() => {
    let docked = window.scrollY > 48;
    let lastY = window.scrollY;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const y = window.scrollY;
      if (y > 48) docked = true;
      else if (y < 8) docked = false;
      setScrolled(docked);
      if (y < 160) { setReadingDown(false); lastY = y; return; }
      if (Math.abs(y - lastY) < 8) return;
      setReadingDown(y > lastY);
      lastY = y;
    };
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(update); };
    const desktop = window.matchMedia("(min-width: 1200px) and (hover: hover) and (pointer: fine)");
    const viewport = () => setCanCompact(desktop.matches && window.innerWidth >= 75 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    const leave = () => {
      cancelDropdownClose();
      if (!headerRef.current?.querySelector(":focus-visible")) setOpenDropdown(null);
    };
    update(); viewport();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    desktop.addEventListener("change", viewport);
    window.addEventListener("resize", viewport);
    const textSize = new MutationObserver(viewport);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      document.documentElement.removeEventListener("pointerleave", leave);
      desktop.removeEventListener("change", viewport);
      window.removeEventListener("resize", viewport);
      textSize.disconnect();
    };
  }, [cancelDropdownClose]);

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
    <header ref={headerRef} className="site-header axiom-header" data-scrolled={scrolled} data-tucked="false"
      data-compact={compact} data-home={pathname === `/${locale}`} data-menu-open={menuOpen} data-keyboard={keyboard}
      onPointerDownCapture={() => setKeyboard(false)}
      onKeyDownCapture={() => { setKeyboard(true); setFocusWithin(true); }}
      onFocusCapture={(event) => {
        const visibleFocus = event.target.matches(":focus-visible");
        // Keep an existing keyboard focus session open during a mouse handoff;
        // moving the target before pointerup would swallow the user's click.
        if (visibleFocus) { setFocusWithin(true); setKeyboard(true); }
      }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false); }}>
      <Container className="site-header-inner">
        <span className="header-glass" aria-hidden="true" />
        {/* A native anchor intentionally reloads home, even when already on home. */}
        <a className="wordmark" href={`/${locale}`}>
          <span className="wordmark-name" dir="ltr" lang="en">MSRC <span className="wordmark-year">2027</span></span>
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
          <ButtonLink className="header-primary-action" href={`/${locale}/participate`} variant="gold" size="small">{copy.action}<svg className="directional-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg></ButtonLink>
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
        pathname={pathname} status={copy.registration} action={copy.action} animate={animateMenu} closing={menuClosing}
        onExited={finishMenuClose} onNavigate={onNavigate} /> : null}
    </header>
  );
}
