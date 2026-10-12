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
    let paintTime = 0;
    let glowShownAt = 0;
    let glowFrames = 0;
    let gate = 0;
    let geometry = "";
    let frame = 0;
    let paintFrame = 0;
    let drainTimer = 0;
    let releaseCount = 0;
    let lastInput = 0;
    let visualFinished = 0;
    let focusOnArrival = false;
    let committing = false;
    let observedY = scrollY;
    let releaseY = scrollY;
    let wheelTailUntil = 0;
    let wheelTailDeadline = 0;
    let scrollIntent: { kind: "wheel" | "touch" | "keyboard"; at: number; threshold: number } | undefined;
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
      const next = [innerWidth, innerHeight, bounds.width, bounds.height, gate, clearance, allowed()].join(":");
      const changed = next !== geometry;
      geometry = next;
      return changed;
    };
    const destination = () => {
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart) || 0;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      return Math.max(0, scrollY + target.getBoundingClientRect().top - margin - padding);
    };
    const writeScroll = (top: number) => {
      // A controller clamp is not earned input. Advance the observation baseline
      // before its queued scroll event, including the browser's pixel rounding.
      observedY = top;
      scrollTo({ top, behavior: "instant" });
      observedY = scrollY;
    };
    const forgetIntent = () => { scrollIntent = undefined; wheelTailUntil = wheelTailDeadline = 0; };
    const setState = (next: EntryState) => {
      state = next;
      element.dataset.entryState = next;
      glow.dataset.entryState = next;
      veil.dataset.entryState = next;
      element.setAttribute("aria-busy", String(next === "releasing"));
    };
    const paintCharge = (now: number) => {
      paintFrame = 0;
      // Smooth the visual target without adding effort during a pause.
      const elapsed = paintTime ? Math.min(64, now - paintTime) : 16;
      paintTime = now;
      renderedCharge += (charge - renderedCharge) * (1 - Math.exp(-elapsed / 50));
      if (Math.abs(charge - renderedCharge) < .001) renderedCharge = charge;
      element.style.setProperty("--venue-entry-charge", charge.toFixed(3));
      const strength = Math.pow(renderedCharge, 1.25);
      glow.style.opacity = String(strength * .88);
      glow.style.transform = `translateY(${16 * (1 - strength)}%) scaleY(${.7 + strength * 1.25})`;
      if (charge > 0) {
        if (!glowShownAt) glowShownAt = now;
        glowFrames += 1;
      }
      // Even a single fast packet gets a visible held frame. This displays
      // already-earned effort; it never creates charge without scroll input.
      if (charge === 1 && renderedCharge >= .9 && now - glowShownAt >= 140 && glowFrames >= 4) begin(false);
      else if (renderedCharge !== charge) paintFrame = requestAnimationFrame(paintCharge);
    };
    const setCharge = (value: number) => {
      charge = clamp(value);
      if (charge === 0) { glowShownAt = glowFrames = 0; }
      setState(charge > 0 ? "charging" : "approaching");
      element.style.setProperty("--venue-entry-charge", charge.toFixed(3));
      if (!paintFrame) { paintTime = 0; paintFrame = requestAnimationFrame(paintCharge); }
    };
    const clearVisuals = () => {
      cancelAnimationFrame(paintFrame); paintFrame = 0;
      charge = renderedCharge = 0;
      paintTime = 0;
      glowShownAt = glowFrames = 0;
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
      releaseY = destination();
      writeScroll(releaseY);
      // Non-cancelable wheel packets can outlive the visual release. Only that
      // existing stream is drained; a fresh cancelable gesture stays responsive.
      wheelTailDeadline = (visualFinished || performance.now()) + 350;
      wheelTailUntil = scrollIntent?.kind === "wheel" ? Math.min(lastInput + 120, wheelTailDeadline) : 0;
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
      releaseY = scrollY;
      visualFinished = 0;
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
          releaseY = landing;
          writeScroll(landing);
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
    const accumulate = (amount: number, threshold: number) => {
      // Preserve distance across event packet sizes. The glow and release ease
      // independently, so a coarse wheel tick earns as much as small samples.
      const next = charge + amount / threshold;
      if (next >= 1 - .0001) setCharge(1);
      else {
        setCharge(next);
        // The same upward gesture may both drain the glow and leave the hold.
        if (next < 0) writeScroll(Math.max(0, gate + next * threshold));
      }
    };
    const flushScroll = () => {
      // A native packet can move the document before its queued scroll event.
      // Credit it before consuming another packet or overwriting the baseline.
      if (Math.abs(scrollY - observedY) > .5) onScroll();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { forgetIntent(); return; }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (!Number.isFinite(delta) || !delta || hasOwnInput(event.target, delta)) { forgetIntent(); return; }
      if (state === "completed" && (delta < 0 || event.cancelable)) forgetIntent();
      flushScroll();
      const now = performance.now();
      if (state === "releasing") {
        if (event.cancelable) event.preventDefault();
        scrollIntent = { kind: "wheel", at: now, threshold: wheelThreshold };
        lastInput = now; return;
      }
      if (state === "completed") {
        if (delta > 0 && !event.cancelable && now < wheelTailUntil && now < wheelTailDeadline) {
          wheelTailUntil = Math.min(now + 120, wheelTailDeadline);
          scrollIntent = { kind: "wheel", at: now, threshold: wheelThreshold };
        } else forgetIntent();
        return;
      }
      if (!allowed()) { forgetIntent(); return; }
      // Observe intent even when the compositor has already claimed the scroll.
      // Its actual document displacement is credited by onScroll, exactly once.
      scrollIntent = { kind: "wheel", at: now, threshold: wheelThreshold };
      if (!event.cancelable) return;
      if (state === "charging" && delta < 0) {
        event.preventDefault(); accumulate(delta, wheelThreshold); return;
      }
      const distance = gate - scrollY;
      if (delta < 0 || distance < -24 || distance > delta) return;
      event.preventDefault(); writeScroll(gate);
      accumulate(Math.max(0, delta - Math.max(0, distance)), wheelThreshold);
    };
    const touchStart = (event: TouchEvent) => {
      touch = undefined;
      if (event.touches.length !== 1) { forgetIntent(); if (state === "releasing") settle(); return; }
      if (state === "completed" || !allowed()) return;
      const distance = gate - scrollY;
      if (hasOwnInput(event.target, 1)) { forgetIntent(); return; }
      // Ownership starts with this gesture, never midway through a native pan.
      const point = event.touches[0];
      touch = { id: point.identifier, x: point.clientX, y: point.clientY, owned: false,
        decided: state !== "releasing" && (distance < -24 || distance > innerHeight * 2) };
    };
    const touchMove = (event: TouchEvent) => {
      if (!touch) return;
      if (event.touches.length !== 1) { touch = undefined; forgetIntent(); return; }
      const point = [...event.touches].find(item => item.identifier === touch!.id);
      if (!point) return;
      const delta = touch.y - point.clientY;
      const sideways = Math.abs(touch.x - point.clientX);
      flushScroll();
      if (!touch.decided) {
        if (Math.abs(delta) < 3 && sideways < 3) return;
        touch.decided = true;
        touch.owned = event.cancelable && sideways <= Math.abs(delta) && (delta > 0 || state === "charging" || state === "releasing");
        if (sideways > Math.abs(delta)) { touch = undefined; forgetIntent(); return; }
      }
      touch.x = point.clientX; touch.y = point.clientY;
      if (sideways > Math.abs(delta)) { forgetIntent(); return; }
      scrollIntent = { kind: "touch", at: performance.now(), threshold: touchThreshold };
      if (!touch.owned || !event.cancelable) return;
      event.preventDefault();
      if (state === "releasing" || state === "completed") { lastInput = performance.now(); return; }
      if (delta < 0 && charge > 0) { accumulate(delta, touchThreshold); return; }
      const distance = Math.max(0, gate - scrollY);
      if (delta < 0 || distance > 0) writeScroll(Math.min(gate, scrollY + delta));
      if (delta > distance) accumulate(delta - distance, touchThreshold);
    };
    const touchEnd = () => { touch = undefined; };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.key === "Home" || event.key === "End") && !hasOwnInput(event.target, event.key === "Home" ? -1 : 1)) {
        forgetIntent();
        if (state === "releasing") settle(false); else if (state === "charging") setCharge(0);
        return;
      }
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape" || event.key === "Tab") {
        forgetIntent();
        if (state === "releasing") settle(); else if (state === "charging") setCharge(0);
        return;
      }
      if (hasOwnInput(event.target, 1, true)) return;
      const delta = event.key === "ArrowDown" ? 40 : event.key === "ArrowUp" ? -40
        : event.key === "PageDown" || (event.key === " " && !event.shiftKey) ? innerHeight * .85
        : event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -innerHeight * .85 : 0;
      if (!delta) return;
      flushScroll();
      if (state === "releasing") { event.preventDefault(); lastInput = performance.now(); return; }
      if (state === "completed" || !allowed()) return;
      scrollIntent = { kind: "keyboard", at: performance.now(), threshold: wheelThreshold };
      if (state === "charging" && delta < 0) { event.preventDefault(); accumulate(delta, wheelThreshold); return; }
      const distance = gate - scrollY;
      if (delta < 0 || distance < -24 || distance > delta) return;
      event.preventDefault(); writeScroll(gate);
      accumulate(Math.max(0, delta - Math.max(0, distance)), wheelThreshold);
    };
    const onScroll = () => {
      const current = scrollY;
      const previous = observedY;
      observedY = current;
      const now = performance.now();
      if (state === "releasing") {
        if (Math.abs(current - releaseY) > 1) {
          lastInput = now;
          writeScroll(releaseY);
        }
        return;
      }
      if (state === "completed") {
        if (current < releaseY - 1) forgetIntent();
        if (now < wheelTailUntil && current > releaseY + 1) { writeScroll(releaseY); return; }
        // Only a genuine return to the opening rearms, never small reversals
        // within Airport or a viewport/reading-layout update.
        if (current < gate - 128) { forgetIntent(); clearVisuals(); setState("approaching"); }
        return;
      }
      if (!allowed() || !scrollIntent || now - scrollIntent.at > 1200) {
        if (state === "charging" && Math.abs(gate - current) > 24) setCharge(0);
        return;
      }
      const moved = state === "charging" ? current - gate : current - Math.max(gate, previous);
      const crossing = previous <= gate + 1 && current > gate;
      if ((state === "charging" && Math.abs(current - gate) > 1) || crossing) {
        writeScroll(gate);
        accumulate(moved, scrollIntent.threshold);
      }
    };
    const resize = () => {
      // Initial observer delivery and unrelated root classes are not resizes.
      // They must not shorten an entrance already running on its own timeline.
      if (!measure()) return;
      if (state === "releasing") { settle(); measure(); return; }
      if (state === "completed") return;
      if (!allowed()) setCharge(0);
      else if (state === "charging") writeScroll(gate);
    };
    const navigate = () => {
      if (committing) return;
      forgetIntent();
      if (state === "releasing") {
        cancelAnimationFrame(frame); frame = 0; clearTimeout(drainTimer); drainTimer = 0;
        scene?.restore(); scene = undefined;
      }
      clearVisuals(); touch = undefined;
      setState(location.hash.startsWith("#journey-") ? "completed" : "approaching");
    };
    const visibility = () => { if (document.hidden) { forgetIntent(); if (state === "releasing") settle(false); } };
    const pointer = () => { if (state !== "releasing") forgetIntent(); };
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
    window.addEventListener("pointerdown", pointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("popstate", navigate); window.addEventListener("hashchange", navigate);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", resize); colors.addEventListener("change", resize);
    return () => {
      enter.current = () => false;
      cancelAnimationFrame(frame); clearTimeout(drainTimer);
      scene?.restore(); clearVisuals(); size.disconnect(); textSize.disconnect();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("touchstart", touchStart); window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd); window.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("keydown", keyboard); window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", pointer);
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
