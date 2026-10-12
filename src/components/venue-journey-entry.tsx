"use client";

import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ButtonLink } from "@/components/ui/button";
import { commitFragment, focusDestination } from "@/lib/anchor-navigation";
import { createVenueEntryScene, venueEntryGate, venueEntryRequest, type VenueEntryRequest } from "@/lib/venue-entry-scene";
import type { Locale } from "@/lib/i18n";

type EntryState = "approaching" | "releasing" | "completed";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const releaseDuration = 850;

/**
 * The single reveal into the journey. Input is owned by the journey stepper:
 * one gesture at the overview requests this reveal, as does the Begin action.
 */
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
    let frame = 0;
    let releaseCount = 0;
    let focusOnArrival = false;
    let committing = false;
    let settled: (() => void)[] = [];
    let scene: ReturnType<typeof createVenueEntryScene> | undefined;

    const allowed = () => !document.hidden && !motion.matches && !colors.matches && innerHeight > 480
      && Number.parseFloat(getComputedStyle(document.documentElement).fontSize) <= 24
      && (window.visualViewport?.scale ?? 1) <= 1.01;
    const measure = () => {
      const gate = venueEntryGate(stage);
      stage.dataset.entryFrame = gate.fits ? "overview" : "continuation";
      stage.style.setProperty("--venue-entry-boundary", gate.y.toFixed(2));
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
    const clearVisuals = () => {
      glow.style.opacity = veil.style.opacity = "0";
      glow.style.removeProperty("transform");
      content.style.filter = previousFilter;
    };
    const notify = () => { const waiting = settled; settled = []; waiting.forEach(done => done()); };
    const settle = (focus = focusOnArrival) => {
      cancelAnimationFrame(frame); frame = 0;
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
      notify();
    };
    const begin = (focus: boolean, done?: () => void) => {
      if (done) settled.push(done);
      if (state === "releasing") return true;
      focusOnArrival = focus;
      releaseCount += 1;
      element.dataset.entryReleases = String(releaseCount);
      if (!allowed()) { settle(focus); return true; }
      const landing = destination();
      scene = createVenueEntryScene(journey, target, landing);
      setState("releasing");
      const started = performance.now();
      const step = (now: number) => {
        const progress = clamp((now - started) / releaseDuration);
        const edge = scene!.render(progress);
        const rise = clamp(progress / .14);
        glow.style.opacity = String(rise * (1 - clamp((progress - .16) / .76)) * .88);
        glow.style.transform = `translateY(${edge - innerHeight}px) scaleY(${1.4 + progress * .7})`;
        veil.style.opacity = String(Math.sin(progress * Math.PI) * .13);
        content.style.filter = `blur(${(Math.sin(progress * Math.PI) * 3).toFixed(2)}px)`;
        if (progress < 1) frame = requestAnimationFrame(step);
        else {
          scrollTo({ top: landing, behavior: "instant" });
          // Refresh the camera and copy fades in the final pinned composition
          // before restoring flow on the next animation frame.
          window.dispatchEvent(new Event("scroll"));
          frame = requestAnimationFrame(() => { frame = 0; settle(); });
        }
      };
      frame = requestAnimationFrame(step);
      return true;
    };
    const request = (event: Event) => {
      event.preventDefault();
      begin(false, (event as VenueEntryRequest).detail?.done);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (state !== "releasing") return;
      if (event.key === "Home" || event.key === "End") settle(false);
      else if (event.key === "Escape" || event.key === "Tab") settle();
    };
    const resize = () => {
      if (state === "releasing") settle();
      measure();
    };
    const navigate = () => {
      if (committing) return;
      if (state === "releasing") {
        cancelAnimationFrame(frame); frame = 0;
        scene?.restore(); scene = undefined;
        notify();
      }
      clearVisuals();
      setState(location.hash.startsWith("#journey-") ? "completed" : "approaching");
    };
    const visibility = () => { if (document.hidden && state === "releasing") settle(false); };
    const size = new ResizeObserver(resize); size.observe(stage);
    const textSize = new MutationObserver(resize);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    stage.dataset.entryBoundary = "true";
    enter.current = () => begin(true);
    setState(state); measure();
    window.addEventListener(venueEntryRequest, request);
    window.addEventListener("keydown", keyboard);
    window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("popstate", navigate); window.addEventListener("hashchange", navigate);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", resize); colors.addEventListener("change", resize);
    return () => {
      enter.current = () => false;
      cancelAnimationFrame(frame);
      scene?.restore(); clearVisuals(); notify(); size.disconnect(); textSize.disconnect();
      window.removeEventListener(venueEntryRequest, request);
      window.removeEventListener("keydown", keyboard);
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
