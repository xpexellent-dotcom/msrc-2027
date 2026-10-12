"use client";

import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ButtonLink } from "@/components/ui/button";
import { commitFragment, focusDestination } from "@/lib/anchor-navigation";
import type { Locale } from "@/lib/i18n";

type EntryState = "idle" | "charging" | "burst" | "complete";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** One deliberate entrance. Document scrolling everywhere else stays native. */
export function VenueJourneyEntry({ locale }: { locale: Locale }) {
  const portal = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const enter = useRef<(animate: boolean) => boolean>(() => false);

  useEffect(() => {
    const element = portal.current;
    const stage = element?.closest<HTMLElement>(".venue-gallery-stage");
    const content = stage?.querySelector<HTMLElement>(".venue-stage-layout");
    const target = document.getElementById("journey-airport");
    const glow = light.current;
    const veil = wash.current;
    if (!element || !stage || !content || !target || !glow || !veil) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const colors = matchMedia("(forced-colors: active)");
    const previousFilter = content.style.filter;
    let state: EntryState = "idle";
    let released = location.hash.startsWith("#journey-");
    let charge = 0;
    let frame = 0;
    let decayTimer = 0;
    let chargeStarted = 0;
    let listening = false;
    let touch: { x: number; y: number } | undefined;

    const allowed = () => !motion.matches && !colors.matches && innerHeight > 480
      && Number.parseFloat(getComputedStyle(document.documentElement).fontSize) <= 24
      && (window.visualViewport?.scale ?? 1) <= 1.01;
    const boundary = () => {
      const bounds = stage.getBoundingClientRect();
      const clearance = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 96;
      // Hold the authored overview, not an arbitrary lower section edge. Tall
      // reading layouts still reach their end naturally before the entrance.
      const fits = innerWidth >= 1200 && innerHeight >= 641 && bounds.height + clearance <= innerHeight + 1;
      const position = Math.max(0, scrollY + (fits ? bounds.top - clearance : bounds.bottom - innerHeight));
      stage.dataset.entryFrame = fits ? "overview" : "continuation";
      stage.style.setProperty("--venue-entry-boundary", position.toFixed(2));
      return position;
    };
    const paint = (next: EntryState, value = 0) => {
      state = next; charge = clamp(value);
      element.dataset.entryState = next;
      glow.dataset.entryState = next; veil.dataset.entryState = next;
      element.style.setProperty("--venue-entry-charge", charge.toFixed(3));
      const strength = Math.pow(charge, 1.35);
      glow.style.opacity = String(strength * .8);
      glow.style.transform = `translateY(${18 * (1 - strength)}%) scaleY(${1 + strength * .35})`;
      veil.style.opacity = "0";
      content.style.filter = charge ? `blur(${(strength * 2).toFixed(2)}px)` : previousFilter;
    };
    const clear = (complete = false) => {
      cancelAnimationFrame(frame); frame = 0;
      clearTimeout(decayTimer); decayTimer = 0;
      touch = undefined;
      if (complete) released = true;
      paint(released ? "complete" : "idle");
    };
    const destination = () => {
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart) || 0;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      return Math.max(0, scrollY + target.getBoundingClientRect().top - margin - padding);
    };
    const begin = (animate: boolean, focus: boolean) => {
      const gesture = touch;
      clear(true);
      if (!animate || !allowed()) {
        commitFragment("#journey-airport", false);
        if (focus) focusDestination(target);
        target.scrollIntoView({ behavior: "instant", block: "start" });
        update();
        return true;
      }
      const from = scrollY;
      const to = destination();
      const started = performance.now();
      paint("burst", 1);
      touch = gesture;
      bind(true);
      const step = (now: number) => {
        const progress = clamp((now - started) / 540);
        // The established strong ease-out: release quickly, settle without bounce.
        const eased = 1 - Math.pow(1 - progress, 5);
        scrollTo({ top: from + (to - from) * eased, behavior: "instant" });
        glow.style.opacity = String((1 - progress) * .8);
        glow.style.transform = `translateY(0) scaleY(${1.35 + eased * 2.1})`;
        veil.style.opacity = String(Math.sin(progress * Math.PI) * .3);
        content.style.filter = `blur(${(2 + Math.sin(progress * Math.PI) * 4).toFixed(2)}px)`;
        if (progress < 1) frame = requestAnimationFrame(step);
        else {
          frame = 0;
          clear(true);
          commitFragment("#journey-airport", false);
          if (focus) focusDestination(target);
          update();
        }
      };
      frame = requestAnimationFrame(step);
      return true;
    };
    const hasOwnInput = (source: EventTarget | null, direction: number) => {
      if (!(source instanceof Element)) return false;
      if (source.closest("a,button,input,select,textarea,summary,[contenteditable=true],[role=dialog]")) return true;
      for (let node: Element | null = source; node && node !== document.documentElement; node = node.parentElement) {
        if (node instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(node).overflowY)
          && node.scrollHeight > node.clientHeight + 2
          && (direction < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return true;
      }
      return false;
    };
    const accumulate = (amount: number, threshold: number) => {
      if (state !== "charging") chargeStarted = performance.now();
      const next = charge + amount / threshold;
      if (next >= 1) { begin(true, false); return; }
      paint("charging", next);
      clearTimeout(decayTimer);
      // A paused gesture releases its tension; no body lock or indefinite hold.
      decayTimer = window.setTimeout(() => { clear(); update(); }, 800);
      if (performance.now() - chargeStarted > 2400) { clear(true); update(); }
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        if (state === "burst" || state === "charging") { clear(state === "burst"); update(); }
        return;
      }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (delta <= 0) { clear(state === "burst"); update(); return; }
      if (hasOwnInput(event.target, delta)) { clear(state === "burst"); update(); return; }
      if (!event.cancelable) { clear(true); update(); return; }
      if (state === "burst") { event.preventDefault(); return; }
      if (released || !allowed()) return;
      const distance = boundary() - scrollY;
      if (distance < -12 || distance > delta || distance > innerHeight * .55) return;
      event.preventDefault();
      if (Math.abs(distance) > 1) scrollTo({ top: boundary(), behavior: "instant" });
      accumulate(Math.min(120, Math.max(1, delta - Math.max(0, distance))), 480);
    };
    const touchStart = (event: TouchEvent) => {
      if (state === "burst") { clear(true); update(); return; }
      touch = undefined;
      const distance = boundary() - scrollY;
      if (released || !allowed() || event.touches.length !== 1
        || hasOwnInput(event.target, 1) || distance < -12 || distance > 160) return;
      const point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY };
    };
    const touchMove = (event: TouchEvent) => {
      if (!touch) return;
      if (event.touches.length !== 1 || !event.cancelable) { clear(true); update(); return; }
      const point = event.touches[0];
      const delta = touch.y - point.clientY;
      const sideways = Math.abs(touch.x - point.clientX);
      touch = { x: point.clientX, y: point.clientY };
      if (delta <= 0 || sideways > Math.abs(delta)) { clear(state === "burst"); update(); return; }
      if (state === "burst") { event.preventDefault(); return; }
      event.preventDefault();
      // Own only a gesture begun in the last small approach zone. Cancelling
      // its first move avoids seizing a native Safari pan after it has started.
      const distance = Math.max(0, boundary() - scrollY);
      if (distance > 0) scrollTo({ top: Math.min(boundary(), scrollY + delta), behavior: "instant" });
      if (delta > distance) accumulate(delta - distance, 180);
    };
    const touchEnd = () => { touch = undefined; };
    const touchCancel = () => { clear(state === "burst"); update(); };
    const bind = (wanted: boolean) => {
      if (listening === wanted) return;
      listening = wanted;
      if (wanted) {
        window.addEventListener("wheel", wheel, { passive: false });
        window.addEventListener("touchstart", touchStart, { passive: true });
        window.addEventListener("touchmove", touchMove, { passive: false });
        window.addEventListener("touchend", touchEnd, { passive: true });
        window.addEventListener("touchcancel", touchCancel, { passive: true });
      } else {
        window.removeEventListener("wheel", wheel);
        window.removeEventListener("touchstart", touchStart);
        window.removeEventListener("touchmove", touchMove);
        window.removeEventListener("touchend", touchEnd);
        window.removeEventListener("touchcancel", touchCancel);
      }
    };
    function update() {
      if (state === "burst") return;
      if (!allowed() || scrollY > boundary() + 24) clear(true);
      if (state === "charging" && Math.abs(boundary() - scrollY) > 12) clear();
      element!.dataset.entryReady = String(allowed());
      const distance = boundary() - scrollY;
      bind(!released && allowed() && distance >= -12 && distance <= innerHeight * .55);
    }
    const keyboard = () => { clear(true); update(); };
    const focus = () => { if (state === "charging" || state === "burst") { clear(state === "burst"); update(); } };
    const press = () => { if (state === "burst") { clear(true); update(); } };
    const leave = () => { clear(state === "burst"); update(); };
    const resize = () => { leave(); update(); };
    const visibility = () => { if (document.hidden) leave(); };
    const size = new ResizeObserver(resize);
    size.observe(stage);
    const textSize = new MutationObserver(resize);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    stage.dataset.entryBoundary = "true";
    enter.current = (animate: boolean) => begin(animate, true);
    paint(released ? "complete" : "idle");
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("keydown", keyboard, { capture: true });
    window.addEventListener("pointerdown", press, { capture: true, passive: true });
    window.addEventListener("blur", leave);
    window.addEventListener("pagehide", leave);
    document.addEventListener("focusin", focus);
    window.addEventListener("popstate", leave);
    window.addEventListener("hashchange", leave);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", resize);
    colors.addEventListener("change", resize);
    update();
    return () => {
      enter.current = () => false;
      clear(true); bind(false); size.disconnect(); textSize.disconnect();
      window.removeEventListener("scroll", update); window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyboard, { capture: true });
      window.removeEventListener("pointerdown", press, { capture: true });
      window.removeEventListener("blur", leave); window.removeEventListener("pagehide", leave);
      document.removeEventListener("focusin", focus); document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("popstate", leave); window.removeEventListener("hashchange", leave);
      motion.removeEventListener("change", resize); colors.removeEventListener("change", resize);
      delete stage.dataset.entryBoundary; delete stage.dataset.entryFrame; delete element.dataset.entryReady;
      stage.style.removeProperty("--venue-entry-boundary");
      content.style.filter = previousFilter;
    };
  }, [mounted]);

  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (enter.current(event.detail !== 0)) event.preventDefault();
  };
  return <><div ref={portal} className="venue-entry-portal venue-journey-invitation" data-entry-state="idle">
    <ButtonLink href="#journey-airport" onClick={click} className="venue-hero-action" variant="gold">
      {locale === "ar" ? "ابدأ رحلتك" : "Begin your journey"}
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </ButtonLink>
  </div>{mounted && createPortal(<>
    <div ref={light} className="venue-entry-glow" data-entry-state="idle" aria-hidden="true" />
    <div ref={wash} className="venue-entry-veil" data-entry-state="idle" aria-hidden="true" />
  </>, document.body)}</>;
}
