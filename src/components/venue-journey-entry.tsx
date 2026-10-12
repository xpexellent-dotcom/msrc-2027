"use client";

import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ButtonLink } from "@/components/ui/button";
import { commitFragment, focusDestination } from "@/lib/anchor-navigation";
import { createVenueEntryScene } from "@/lib/venue-entry-scene";
import type { Locale } from "@/lib/i18n";

type EntryState = "approaching" | "charging" | "releasing" | "completed";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const releaseDuration = 850;
const wheelThreshold = 480;
const touchThreshold = 300;

/** A single bounded entrance; the journey itself keeps native scrolling. */
export function VenueJourneyEntry({ locale }: { locale: Locale }) {
  const portal = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const enter = useRef<() => boolean>(() => false);

  useEffect(() => {
    const element = portal.current;
    const stage = element?.closest<HTMLElement>(".venue-gallery-stage");
    const content = stage?.querySelector<HTMLElement>(".venue-stage-layout");
    const target = document.getElementById("journey-airport");
    const journey = target?.closest<HTMLElement>(".venue-arrival-journey");
    const glow = light.current;
    const veil = wash.current;
    if (!element || !stage || !content || !target || !journey || !glow || !veil) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const colors = matchMedia("(forced-colors: active)");
    const previousFilter = content.style.filter;
    let state: EntryState = location.hash.startsWith("#journey-") ? "completed" : "approaching";
    let charge = 0;
    let renderedCharge = 0;
    let gate = 0;
    let frame = 0;
    let paintFrame = 0;
    let scrollFrame = 0;
    let drainTimer = 0;
    let releaseCount = 0;
    let lastInput = 0;
    let visualFinished = 0;
    let focusOnArrival = false;
    let committing = false;
    let scene: ReturnType<typeof createVenueEntryScene> | undefined;
    let touch: { id: number; x: number; y: number; owned: boolean; decided: boolean } | undefined;

    const allowed = () => !motion.matches && !colors.matches && innerHeight > 480
      && Number.parseFloat(getComputedStyle(document.documentElement).fontSize) <= 24
      && (window.visualViewport?.scale ?? 1) <= 1.01;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const clearance = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 96;
      const fits = innerWidth >= 1200 && innerHeight >= 641 && bounds.height + clearance <= innerHeight + 1;
      gate = Math.max(0, scrollY + (fits ? bounds.top - clearance : bounds.bottom - innerHeight));
      stage.dataset.entryFrame = fits ? "overview" : "continuation";
      stage.style.setProperty("--venue-entry-boundary", gate.toFixed(2));
      element.dataset.entryReady = String(allowed());
    };
    const destination = () => {
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart) || 0;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      return Math.max(0, scrollY + target.getBoundingClientRect().top - margin - padding);
    };
    const setState = (next: EntryState) => {
      state = next;
      element.dataset.entryState = next;
      glow.dataset.entryState = next;
      veil.dataset.entryState = next;
      element.setAttribute("aria-busy", String(next === "releasing"));
    };
    const paintCharge = () => {
      paintFrame = 0;
      // Smooth the visual target without adding effort during a pause.
      renderedCharge += (charge - renderedCharge) * .28;
      if (Math.abs(charge - renderedCharge) < .001) renderedCharge = charge;
      element.style.setProperty("--venue-entry-charge", charge.toFixed(3));
      const strength = Math.pow(renderedCharge, 1.25);
      glow.style.opacity = String(strength * .88);
      glow.style.transform = `translateY(${16 * (1 - strength)}%) scaleY(${.7 + strength * 1.25})`;
      if (renderedCharge !== charge) paintFrame = requestAnimationFrame(paintCharge);
    };
    const setCharge = (value: number) => {
      charge = clamp(value);
      setState(charge > 0 ? "charging" : "approaching");
      element.style.setProperty("--venue-entry-charge", charge.toFixed(3));
      if (!paintFrame) paintFrame = requestAnimationFrame(paintCharge);
    };
    const clearVisuals = () => {
      cancelAnimationFrame(paintFrame); paintFrame = 0;
      charge = renderedCharge = 0;
      element.style.setProperty("--venue-entry-charge", "0");
      glow.style.opacity = veil.style.opacity = "0";
      glow.style.removeProperty("transform");
      content.style.filter = previousFilter;
    };
    const settle = (focus = focusOnArrival) => {
      cancelAnimationFrame(frame); frame = 0;
      clearTimeout(drainTimer); drainTimer = 0;
      if (scene) {
        scene.render(1);
        scene.restore(); scene = undefined;
      }
      setState("completed"); clearVisuals();
      // Restore flow, remeasure, and synchronize before the next browser paint.
      scrollTo({ top: destination(), behavior: "instant" });
      committing = true;
      commitFragment("#journey-airport", false);
      committing = false;
      if (focus) focusDestination(target);
      window.dispatchEvent(new Event("scroll"));
    };
    const drain = () => {
      const now = performance.now();
      if (now - lastInput >= 90 || now - visualFinished >= 180) settle();
      else drainTimer = window.setTimeout(drain, 20);
    };
    const begin = (focus: boolean) => {
      if (state === "releasing") return true;
      focusOnArrival = focus;
      releaseCount += 1;
      element.dataset.entryReleases = String(releaseCount);
      if (!allowed()) { settle(focus); return true; }
      cancelAnimationFrame(paintFrame); paintFrame = 0;
      const startCharge = renderedCharge;
      const landing = destination();
      scene = createVenueEntryScene(journey, target, landing);
      setState("releasing");
      const started = performance.now(); lastInput = started;
      const step = (now: number) => {
        const progress = clamp((now - started) / releaseDuration);
        const edge = scene!.render(progress);
        const rise = clamp(progress / .14);
        glow.style.opacity = String((startCharge + (1 - startCharge) * rise) * (1 - clamp((progress - .16) / .76)) * .88);
        glow.style.transform = `translateY(${edge - innerHeight}px) scaleY(${1.4 + progress * .7})`;
        veil.style.opacity = String(Math.sin(progress * Math.PI) * .13);
        content.style.filter = `blur(${(Math.sin(progress * Math.PI) * 3).toFixed(2)}px)`;
        if (progress < 1) frame = requestAnimationFrame(step);
        else {
          frame = 0; visualFinished = now;
          scrollTo({ top: landing, behavior: "instant" });
          // Refresh the existing camera and copy fades in the final pinned
          // composition before restoring flow on the next animation frame.
          window.dispatchEvent(new Event("scroll"));
          frame = requestAnimationFrame(() => { frame = 0; drain(); });
        }
      };
      frame = requestAnimationFrame(step);
      return true;
    };
    const hasOwnInput = (source: EventTarget | null, direction: number, keyboard = false) => {
      if (!(source instanceof Element)) return false;
      if (source.closest("input,select,textarea,[contenteditable=true],[role=dialog]")) return true;
      if (keyboard && source.closest("a,button,summary")) return true;
      for (let node: Element | null = source; node && node !== document.documentElement; node = node.parentElement) {
        if (node instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(node).overflowY)
          && node.scrollHeight > node.clientHeight + 2
          && (direction < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return true;
      }
      return false;
    };
    const accumulate = (amount: number, threshold: number, cap: number) => {
      const next = charge + Math.max(-cap, Math.min(cap, amount)) / threshold;
      if (next >= 1 - .0001) begin(false); else setCharge(next);
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (state === "releasing") {
        if (event.cancelable) event.preventDefault();
        lastInput = performance.now(); return;
      }
      if (state === "completed" || !allowed() || !event.cancelable) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (!delta || hasOwnInput(event.target, delta)) return;
      if (state === "charging" && delta < 0) {
        event.preventDefault(); accumulate(delta, wheelThreshold, 80); return;
      }
      const distance = gate - scrollY;
      if (delta < 0 || distance < -24 || distance > delta) return;
      event.preventDefault(); scrollTo({ top: gate, behavior: "instant" });
      accumulate(Math.max(1, delta - Math.max(0, distance)), wheelThreshold, 80);
    };
    const touchStart = (event: TouchEvent) => {
      touch = undefined;
      if (event.touches.length !== 1) { if (state === "releasing") settle(); return; }
      if (state === "completed" || !allowed()) return;
      const distance = gate - scrollY;
      // Ownership starts with this gesture, never midway through a native pan.
      if (state !== "releasing" && (distance < -24 || distance > innerHeight * 2 || hasOwnInput(event.target, 1))) return;
      const point = event.touches[0];
      touch = { id: point.identifier, x: point.clientX, y: point.clientY, owned: false, decided: false };
    };
    const touchMove = (event: TouchEvent) => {
      if (!touch) return;
      if (event.touches.length !== 1 || !event.cancelable) { touch = undefined; return; }
      const point = [...event.touches].find(item => item.identifier === touch!.id);
      if (!point) return;
      const delta = touch.y - point.clientY;
      const sideways = Math.abs(touch.x - point.clientX);
      if (!touch.decided) {
        if (Math.abs(delta) < 3 && sideways < 3) return;
        touch.decided = true;
        touch.owned = sideways <= Math.abs(delta) && (delta > 0 || state === "charging" || state === "releasing");
        if (!touch.owned) { touch = undefined; return; }
      }
      touch.x = point.clientX; touch.y = point.clientY;
      event.preventDefault();
      if (state === "releasing" || state === "completed") { lastInput = performance.now(); return; }
      if (delta < 0 && charge > 0) { accumulate(delta, touchThreshold, 72); return; }
      const distance = Math.max(0, gate - scrollY);
      if (delta < 0 || distance > 0) scrollTo({ top: Math.min(gate, scrollY + delta), behavior: "instant" });
      if (delta > distance) accumulate(delta - distance, touchThreshold, 72);
    };
    const touchEnd = () => { touch = undefined; };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.key === "Home" || event.key === "End") && !hasOwnInput(event.target, event.key === "Home" ? -1 : 1)) {
        if (state === "releasing") settle(false); else if (state === "charging") setCharge(0);
        return;
      }
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape" || event.key === "Tab") {
        if (state === "releasing") settle(); else if (state === "charging") setCharge(0);
        return;
      }
      if (hasOwnInput(event.target, 1, true)) return;
      const delta = event.key === "ArrowDown" ? 40 : event.key === "ArrowUp" ? -40
        : event.key === "PageDown" || (event.key === " " && !event.shiftKey) ? innerHeight * .85
        : event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -innerHeight * .85 : 0;
      if (!delta) return;
      if (state === "releasing") { event.preventDefault(); lastInput = performance.now(); return; }
      if (state === "completed" || !allowed()) return;
      if (state === "charging" && delta < 0) { event.preventDefault(); accumulate(delta, wheelThreshold, 80); return; }
      const distance = gate - scrollY;
      if (delta < 0 || distance < -24 || distance > delta) return;
      event.preventDefault(); scrollTo({ top: gate, behavior: "instant" });
      accumulate(Math.max(1, delta - Math.max(0, distance)), wheelThreshold, 80);
    };
    const onScroll = () => {
      if (state === "releasing" || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        // Explicit native anchors and scrollbar bypasses never fake completion.
        if (state === "charging" && Math.abs(gate - scrollY) > 24) setCharge(0);
      });
    };
    const resize = () => {
      if (state === "releasing") { settle(); measure(); return; }
      measure();
      if (state === "completed") return;
      if (!allowed()) setCharge(0);
      else if (state === "charging") scrollTo({ top: gate, behavior: "instant" });
    };
    const navigate = () => {
      if (committing) return;
      if (state === "releasing") {
        cancelAnimationFrame(frame); frame = 0; clearTimeout(drainTimer); drainTimer = 0;
        scene?.restore(); scene = undefined;
      }
      clearVisuals(); touch = undefined;
      setState(location.hash.startsWith("#journey-") ? "completed" : "approaching");
    };
    const visibility = () => { if (document.hidden && state === "releasing") settle(false); };
    const size = new ResizeObserver(resize); size.observe(stage);
    const textSize = new MutationObserver(resize);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    stage.dataset.entryBoundary = "true";
    enter.current = () => begin(true);
    setState(state); measure();
    // Attach before the first gesture; handlers act only at this entrance.
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    window.addEventListener("keydown", keyboard);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("popstate", navigate); window.addEventListener("hashchange", navigate);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", resize); colors.addEventListener("change", resize);
    return () => {
      enter.current = () => false;
      cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); clearTimeout(drainTimer);
      scene?.restore(); clearVisuals(); size.disconnect(); textSize.disconnect();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("touchstart", touchStart); window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd); window.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("keydown", keyboard); window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("popstate", navigate); window.removeEventListener("hashchange", navigate);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", resize); colors.removeEventListener("change", resize);
      delete stage.dataset.entryBoundary; delete stage.dataset.entryFrame; delete element.dataset.entryReady;
      stage.style.removeProperty("--venue-entry-boundary");
    };
  }, [mounted]);

  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (enter.current()) event.preventDefault();
  };
  return <><div ref={portal} className="venue-entry-portal venue-journey-invitation" data-entry-state="approaching">
    <ButtonLink href="#journey-airport" onClick={click} className="venue-hero-action" variant="gold">
      {locale === "ar" ? "ابدأ رحلتك" : "Begin your journey"}
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </ButtonLink>
  </div>{mounted && createPortal(<>
    <div ref={light} className="venue-entry-glow" data-entry-state="approaching" aria-hidden="true" />
    <div ref={wash} className="venue-entry-veil" data-entry-state="approaching" aria-hidden="true" />
  </>, document.body)}</>;
}
