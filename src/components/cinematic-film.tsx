"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cinematicRequestEvent, setCinematicPlayback } from "@/lib/cinematic-film";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: { title: "MSRC 2026 opening film", close: "Back to conference", play: "Play film", instructions: "Footage from MSRC 2026. Press Escape to return to the conference. The film background can be paused or resumed using Space or Enter." },
  ar: { title: "الفيلم الافتتاحي لمؤتمر ٢٠٢٦", close: "العودة إلى المؤتمر", play: "تشغيل الفيلم", instructions: "لقطات من نسخة ٢٠٢٦. اضغط مفتاح Esc للعودة إلى المؤتمر. عند التركيز على الفيلم، استخدم مفتاح المسافة أو الإدخال لإيقافه مؤقتًا أو استئنافه." },
} as const;

type Origin = { href: string; scroll: number; focus: HTMLElement | null; pushed: boolean };

export function CinematicFilmLink({ children }: { locale: Locale; children: ReactNode }) {
  return <button className="button button--gold cinematic-launch" data-testid="watch-opening-film" type="button" onClick={(event) => {
    window.dispatchEvent(new CustomEvent(cinematicRequestEvent, { detail: { source: event.currentTarget } }));
  }}>{children}</button>;
}

/** Reframes the existing approved homepage hero; never creates a second media player. */
export function CinematicFilm({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const active = useRef(false);
  const origin = useRef<Origin | null>(null);
  const filmAddress = useRef<string | null>(null);
  const explicitViewing = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<(changeHistory?: boolean) => void>(() => {});
  const text = copy[locale];

  useEffect(() => {
    let pendingHistoryReturn: Origin | null = null;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection;
    const prefersPoster = () => motion.matches || connection?.saveData === true || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
    const preferencesChanged = () => { if (active.current && !explicitViewing.current) setNeedsPlay(prefersPoster()); };
    function restore(saved: Origin | null) {
      requestAnimationFrame(() => {
        if (!saved) return;
        window.scrollTo({ top: saved.scroll, behavior: "instant" });
        if (saved.focus?.isConnected && saved.focus !== document.body) saved.focus.focus({ preventScroll: true });
        else document.getElementById("main-content")?.focus({ preventScroll: true });
      });
    }
    function enter(explicit: boolean, source?: HTMLElement) {
      if (active.current) return;
      const previous = new URL(location.href);
      const pushed = previous.hash !== "#film";
      const returnAddress = new URL(previous);
      if (!pushed) returnAddress.hash = "";
      // A forward traversal reopens our existing film history entry. Keep its
      // original opener rather than replacing it with the fullscreen position.
      const returning = !pushed && origin.current?.pushed && filmAddress.current === previous.href;
      if (!returning) origin.current = { href: returnAddress.href, scroll: window.scrollY, focus: source ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null), pushed };
      active.current = true;
      explicitViewing.current = explicit;
      setNeedsPlay(!explicit && prefersPoster());
      setOpen(true);
      if (pushed) { previous.hash = "film"; history.pushState(null, "", previous.href); }
      filmAddress.current = previous.href;
      setCinematicPlayback({ active: true, explicit });
    }
    function exit(changeHistory = true) {
      if (!active.current) return;
      active.current = false;
      explicitViewing.current = false;
      setOpen(false);
      setCinematicPlayback({ active: false, explicit: false });
      const saved = origin.current;
      if (saved && changeHistory) {
        if (saved.pushed) {
          // Native/Next history restores its fragment asynchronously. Restore
          // the opener after that event so it cannot overwrite our focus/scroll.
          pendingHistoryReturn = saved;
          history.back();
          return;
        }
        history.replaceState(null, "", saved.href);
      }
      restore(saved);
    }
    exitRef.current = exit;
    const request = (event: Event) => enter(true, (event as CustomEvent<{ source?: HTMLElement }>).detail?.source);
    const historyChange = () => {
      if (location.hash === "#film") enter(false);
      else {
        exit(false);
        if (pendingHistoryReturn) { const saved = pendingHistoryReturn; pendingHistoryReturn = null; restore(saved); }
      }
    };
    window.addEventListener(cinematicRequestEvent, request);
    window.addEventListener("hashchange", historyChange);
    window.addEventListener("popstate", historyChange);
    motion.addEventListener("change", preferencesChanged);
    connection?.addEventListener("change", preferencesChanged);
    const frame = requestAnimationFrame(historyChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(cinematicRequestEvent, request);
      window.removeEventListener("hashchange", historyChange);
      window.removeEventListener("popstate", historyChange);
      motion.removeEventListener("change", preferencesChanged);
      connection?.removeEventListener("change", preferencesChanged);
      setCinematicPlayback({ active: false, explicit: false });
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const hero = document.querySelector<HTMLElement>(".conference-hero");
    if (!hero) return;
    document.documentElement.dataset.cinematic = "true";
    const attributes = ["role", "aria-modal", "aria-labelledby", "aria-describedby"].map((name) => [name, hero.getAttribute(name)] as const);
    hero.setAttribute("role", "dialog");
    hero.setAttribute("aria-modal", "true");
    hero.setAttribute("aria-labelledby", "cinematic-title");
    hero.setAttribute("aria-describedby", "cinematic-instructions");
    const background = [...Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && !["MAIN", "SCRIPT", "STYLE"].includes(element.tagName)), ...document.querySelectorAll<HTMLElement>(".homepage-journey > :not(.conference-hero), .conference-hero .hero-content")];
    const priorInert = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    closeRef.current?.focus({ preventScroll: true });
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); exitRef.current(); }
      if (event.key !== "Tab") return;
      const focusable = Array.from(hero!.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex='0']")).filter((element) => !element.closest("[inert], [hidden]") && getComputedStyle(element).visibility !== "hidden" && element.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !hero!.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !hero!.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      delete document.documentElement.dataset.cinematic;
      attributes.forEach(([name, value]) => { if (value === null) hero.removeAttribute(name); else hero.setAttribute(name, value); });
      background.forEach((element, index) => { element.inert = priorInert[index]; });
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);

  return <div id="film" className="cinematic-ui" hidden={!open}>
    <h2 id="cinematic-title" className="sr-only">{text.title}</h2>
    <p id="cinematic-instructions" className="sr-only">{text.instructions}</p>
    <button ref={closeRef} className="cinematic-close" data-testid="cinematic-close" type="button" aria-label={text.close} onClick={() => exitRef.current()}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="1.6" /></svg></button>
    <span className="cinematic-provenance">{locale === "en" ? "MSRC 2026" : "نسخة ٢٠٢٦"}</span>
    {open && needsPlay ? <button className="button button--gold cinematic-start" type="button" onClick={() => {
      setNeedsPlay(false);
      explicitViewing.current = true;
      setCinematicPlayback({ active: true, explicit: true });
      requestAnimationFrame(() => { document.querySelector<HTMLElement>(".conference-hero .hero-media-toggle")?.focus({ preventScroll: true }); });
    }}>{text.play}</button> : null}
  </div>;
}
