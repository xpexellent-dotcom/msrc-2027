"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { VenueIcon } from "@/components/venue-icon";
import type { ConferenceVenue, VenueTravelMode, VenueVisitorInfoKey } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { venueTravelCopy } from "@/content/venue-travel";
import { venueJourneyCopy, venueJourneyIds, venueJourneySteps } from "@/content/venue-journey";
import type { Locale } from "@/lib/i18n";
import { createJourneyStepper } from "@/lib/journey-stepper";
import { venueEntryGate, venueEntryRequest } from "@/lib/venue-entry-scene";

const modes = ["taxi", "train", "rental"] as const satisfies readonly VenueTravelMode[];
const detailKeys = ["entryGate", "ticket", "parking", "accessibility", "onSite", "wifi"] as const satisfies readonly VenueVisitorInfoKey[];
// These are image-space camera references, not driving instructions. The middle
// point is a camera composition only; it is deliberately not a place marker.
const cameraStops = [{ x: 581, y: 366, zoom: 1.12 }, { x: 800, y: 850, zoom: 1.02 }, { x: 1008, y: 1366, zoom: 1.55 }] as const;
const pagingKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"]);
// An abstract arrival thread through the camera stops. It is deliberately a
// smooth curve, never a road-following route.
const threadPath = "M581 366C622 560 708 742 800 850S978 1158 1008 1366";
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (first: number, last: number, amount: number) => first + (last - first) * amount;
const subscribeToHydration = () => () => {};
const hydrated = () => true;
const serverHydrated = () => false;
type MapPoint = "airport" | "arrival";

function JourneyTitle({ phrases, id }: { phrases: readonly [string, string]; id: string }) {
  return <h2 id={id} className="venue-journey-title">{phrases[0]} <span>{phrases[1]}</span></h2>;
}

function AccessibilityGuidance({ text, label, locale }: { text: string; label: string; locale: Locale }) {
  const at = text.indexOf(label);
  return at < 0 ? text : <>{text.slice(0, at)}<a className="text-link" href={`/${locale}/contact`}>{label}</a>{text.slice(at + label.length)}</>;
}

function revealOnHover(event: PointerEvent<HTMLDetailsElement>) {
  if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) event.currentTarget.open = true;
}

function resetPoint(event: PointerEvent<HTMLAnchorElement>) {
  if (!event.currentTarget.matches(":focus-visible")) delete event.currentTarget.dataset.tooltipDismissed;
}

/** Measure only when context is requested; compensate for the camera's scale. */
function positionPointDetail(point: HTMLAnchorElement) {
  const tip = point.querySelector<HTMLElement>(".venue-journey-point-detail");
  const atlas = point.closest<HTMLElement>(".venue-journey-atlas");
  const journey = atlas?.closest<HTMLElement>(".venue-arrival-journey");
  if (!tip || !atlas || journey?.dataset.mapCompact === "true" || journey?.dataset.readingFlow === "true") return;
  const frame = atlas.getBoundingClientRect();
  const box = point.getBoundingClientRect();
  const top = Math.max(frame.top + 16, 96);
  const bottom = Math.min(frame.bottom, window.innerHeight) - 16;
  let left = Math.max(frame.left, 0) + 16;
  let right = Math.min(frame.right, window.innerWidth) - 16;
  // Keep context in the reserved map column, outside the foreground's
  // painting and selection area. Arabic changes reading flow, not geography.
  const reading = journey?.querySelector<HTMLElement>(".venue-journey-reading")?.getBoundingClientRect();
  if (reading) {
    if (document.documentElement.dir === "rtl") right = Math.min(right, reading.left - 16);
    else left = Math.max(left, reading.right + 16);
  }
  const controls = atlas.querySelector<HTMLElement>(".venue-map-controls")?.getBoundingClientRect();
  if (controls) {
    // A pointer must reach the popup without crossing a higher map control.
    if (document.documentElement.dir === "rtl") left = Math.max(left, controls.right + 16);
    else right = Math.min(right, controls.left - 16);
  }
  const priorDisplay = tip.style.display;
  const priorVisibility = tip.style.visibility;
  tip.style.visibility = "hidden";
  tip.style.display = "block";
  const scale = tip.getBoundingClientRect().width / Math.max(1, tip.offsetWidth);
  tip.style.maxWidth = `${(right - left) / scale}px`;
  tip.style.maxHeight = "none";
  tip.style.overflowY = "visible";
  // Absolute hover bridges contribute to scrollHeight, but not panel height.
  // Measure the panel itself so ordinary panels keep that bridge available.
  if (tip.getBoundingClientRect().height > bottom - top) {
    tip.style.maxHeight = `${Math.max(1, bottom - top) / scale}px`;
    tip.style.overflowY = "auto";
  }
  const size = tip.getBoundingClientRect();
  const gap = 16 * scale;
  const above = box.top - gap - size.height;
  const below = box.bottom + gap;
  const flip = above < top && below + size.height <= bottom;
  const wantedTop = flip ? below : above;
  const y = Math.max(top, Math.min(wantedTop, bottom - size.height));
  const center = box.left + box.width / 2;
  const x = Math.max(left, Math.min(center - size.width / 2, right - size.width));
  // A side-clamped panel still needs a continuous corridor from its pin.
  tip.style.setProperty("--point-bridge-left", `${Math.min(0, center - x) / scale}px`);
  tip.style.setProperty("--point-bridge-right", `${Math.min(0, x + size.width - center) / scale}px`);
  tip.style.bottom = "auto";
  tip.style.top = `${(y - box.top) / scale}px`;
  tip.style.left = `calc(50% + ${(x + size.width / 2 - center) / scale}px)`;
  point.dataset.tipSide = flip ? "below" : "above";
  tip.style.display = priorDisplay;
  tip.style.visibility = priorVisibility;
}

/** Native scroll and readable foreground; no wheel interception or map service. */
export function VenueArrivalJourney({ locale, venue }: { locale: Locale; venue: ConferenceVenue }) {
  const root = useRef<HTMLElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const enhanced = useSyncExternalStore(subscribeToHydration, hydrated, serverHydrated);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const selected = useRef<MapPoint | null>(null);
  const focusDetails = useRef(false);
  const zoom = useRef(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const refresh = useRef<() => void>(() => {});
  const journey = venueJourneyCopy[locale];
  const travel = venueTravelCopy[locale];
  const place = datesVenueCopy[locale];
  const details = detailKeys.flatMap(key => {
    const text = venue.atVenue?.[key]?.[locale]?.trim();
    return text ? [{ key, text }] : [];
  });
  const closePoint = (returnFocus = false) => {
    const previous = selected.current;
    selected.current = null;
    setSelectedPoint(null);
    refresh.current();
    if (returnFocus && previous) {
      const target = previous === venueJourneySteps[active]
        ? root.current?.querySelector<HTMLElement>(`[data-map-point="${previous}"]`)
        : root.current?.querySelector<HTMLElement>('.venue-journey-index [aria-current="location"]');
      target?.focus({ preventScroll: true });
    }
  };
  const choosePoint = (point: MapPoint, keyboard = false) => {
    if (selected.current === point) { closePoint(true); return; }
    focusDetails.current = keyboard;
    selected.current = point;
    setSelectedPoint(point);
    refresh.current();
  };
  const changeZoom = (amount: number | "reset") => {
    zoom.current = amount === "reset" ? 1 : Math.max(.55, Math.min(2, zoom.current + amount));
    setZoomLevel(zoom.current);
    closePoint();
  };

  useEffect(() => {
    if (selectedPoint && focusDetails.current) {
      root.current?.querySelector<HTMLElement>("#venue-map-detail h3")?.focus({ preventScroll: true });
      focusDetails.current = false;
    }
  }, [selectedPoint]);

  useEffect(() => {
    const element = root.current;
    const map = plane.current;
    if (!element || !map) return;
    const chapters = venueJourneyIds.map(id => element.querySelector<HTMLElement>(`#${id}`));
    const points = [...map.querySelectorAll<HTMLElement>(".venue-journey-point")];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = window.matchMedia("(forced-colors: active)");
    const trail = map.querySelector<SVGPathElement>(".venue-journey-thread-trail");
    const trailGlow = map.querySelector<SVGPathElement>(".venue-journey-thread-glow");
    const trailLength = trail?.getTotalLength() ?? 0;
    const travellers = [[".venue-journey-traveller-halo", 14], [".venue-journey-traveller", 5]].flatMap(([selector, size]) => {
      const dot = map.querySelector<SVGCircleElement>(selector as string);
      return dot ? [[dot, size as number] as const] : [];
    });
    let frame = 0;
    let current = -1;
    let readingFlow = false;
    const chapterAnchors = () => {
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      return chapters.flatMap(chapter => {
        if (!chapter) return [];
        const margin = Number.parseFloat(getComputedStyle(chapter).scrollMarginBlockStart) || 0;
        return [window.scrollY + chapter.getBoundingClientRect().top - margin - padding];
      });
    };
    /** 0 at the airport's resting position, 2 at arrival, fractional between. */
    const journeyPosition = (anchors: number[]) => {
      const y = window.scrollY;
      const last = anchors.length - 1;
      if (last <= 0 || y <= anchors[0]) return 0;
      if (y >= anchors[last]) return last;
      let index = 0;
      while (index < last - 1 && y >= anchors[index + 1]) index++;
      return index + clamp((y - anchors[index]) / Math.max(1, anchors[index + 1] - anchors[index]));
    };
    // Sizes that never change while scrolling are measured only after a resize,
    // font or content change. Each frame then reads geometry before writing,
    // so the browser never has to lay the page out twice in one frame.
    let dirty = true;
    const sizes = { font: 16, header: 80, padding: 0, index: 0, margins: [] as number[], readings: [] as number[], points: [] as { width: number; height: number }[] };
    const setData = (node: HTMLElement, key: string, value: string) => { if (node.dataset[key] !== value) node.dataset[key] = value; };
    const setVar = (node: HTMLElement, name: string, value: string) => { if (node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value); };
    const readings = chapters.map(chapter => chapter?.querySelector<HTMLElement>(".venue-journey-reading") ?? null);
    const indexNav = element.querySelector<HTMLElement>(".venue-journey-index");
    const atlas = map.parentElement!;
    const world = atlas.closest<HTMLElement>(".venue-journey-world");
    const credits = atlas.querySelector<HTMLElement>(".venue-journey-map-caption");
    const controlGroup = atlas.querySelector<HTMLElement>(".venue-map-controls");
    const northMark = atlas.querySelector<HTMLElement>(".venue-journey-north");
    const measureSizes = () => {
      dirty = false;
      sizes.font = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const compact = window.innerWidth < 1200 || window.innerHeight <= 640;
      readingFlow = sizes.font > 24 || window.innerHeight <= 480;
      setData(element, "mapCompact", String(compact));
      setData(element, "readingFlow", String(readingFlow));
      sizes.header = Number.parseFloat(getComputedStyle(element).getPropertyValue("--site-header-height")) || 80;
      sizes.padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      sizes.margins = chapters.map(chapter => chapter ? Number.parseFloat(getComputedStyle(chapter).scrollMarginBlockStart) || 0 : 0);
      sizes.index = indexNav?.offsetHeight ?? 0;
      setVar(element, "--venue-index-height", `${sizes.index}px`);
      sizes.readings = readings.map(reading => reading?.offsetHeight ?? 0);
      sizes.points = points.map(point => ({ width: point.offsetWidth, height: point.offsetHeight }));
    };
    const update = () => {
      frame = 0;
      if (dirty) measureSizes();
      // ---- Read phase: geometry only, no writes. ----
      const viewport = window.innerHeight;
      const scrollTop = window.scrollY;
      const compact = element.dataset.mapCompact === "true";
      const headerHeight = sizes.header;
      const atlasBox = atlas.getBoundingClientRect();
      const worldBottom = world?.getBoundingClientRect().bottom ?? atlasBox.bottom;
      const atlasWidth = atlas.clientWidth;
      const atlasHeight = atlas.clientHeight;
      const creditsBox = credits?.getBoundingClientRect();
      const controls = controlGroup?.getBoundingClientRect();
      const north = northMark?.getBoundingClientRect();
      const chapterTops = chapters.map(chapter => chapter?.getBoundingClientRect().top);
      // Progress is measured between the chapters' own resting positions, so
      // the camera sits exactly on each place whenever its chapter is at rest.
      const anchors = chapterTops.flatMap((top, index) => top === undefined ? [] : [scrollTop + top - sizes.margins[index] - sizes.padding]);
      const position = journeyPosition(anchors);
      const next = Math.round(position);
      // Horizontal reading bounds are unaffected by the vertical crossfade.
      const foreground = readings[next]?.getBoundingClientRect();
      const hovered = points.map(point => point.matches(":hover") || point.matches(":focus-visible"));

      // ---- Write phase. ----
      const mapBottom = compact && !readingFlow ? atlasBox.bottom + sizes.index : 0;
      setData(element, "inView", String(atlasBox.top < viewport && worldBottom > 0));
      setData(element, "framePinned", String(compact && !readingFlow && Math.abs(atlasBox.top - headerHeight) < 2 && worldBottom > headerHeight + atlasHeight));
      if (selected.current && (worldBottom <= Math.max(headerHeight + 32, viewport * .35) || atlasBox.top >= viewport)) {
        selected.current = null; setSelectedPoint(null);
      }
      // Keyboard (Tab) reading keeps ordinary flow so every link stays reachable.
      const choreograph = !motion.matches && !readingFlow && element.dataset.keyboard !== "true";
      if (next !== current) {
        if (current >= 0 && selected.current) { selected.current = null; setSelectedPoint(null); }
        current = next; setActive(next);
      }
      chapters.forEach((chapter, index) => {
        if (!chapter) return;
        setData(chapter, "chapterActive", String(index === next));
        const reading = readings[index];
        if (!reading) return;
        if (!choreograph || anchors.length !== chapters.length) {
          setVar(reading, "--venue-copy-opacity", "1");
          reading.style.removeProperty("--venue-copy-shift");
          delete reading.dataset.copyHidden;
          return;
        }
        // Chapters crossfade near the reading centre instead of scrolling a
        // full chapter apart: each eases 55% of the way back toward its rest
        // and is fully faded by the halfway point of the move.
        const top = compact ? mapBottom : headerHeight + 16;
        let delta = scrollTop - anchors[index];
        // Content taller than the reading area is read in place before it fades.
        if (delta > 0) delta = Math.max(0, delta - Math.max(0, sizes.readings[index] - (viewport - top - 24)));
        // Before the first and after the last stop the page scrolls normally.
        if ((index === 0 && delta < 0) || (index === anchors.length - 1 && delta > 0)) delta = 0;
        const span = Math.max(1, delta >= 0 ? (anchors[index + 1] ?? Infinity) - anchors[index] : anchors[index] - anchors[index - 1]);
        const fade = 1 - clamp(Math.abs(delta) / span / .5);
        const opacity = fade * fade * (3 - 2 * fade);
        const shift = Math.sign(delta) * Math.min(Math.abs(delta), span) * .55;
        setVar(reading, "--venue-copy-shift", `${shift.toFixed(1)}px`);
        setVar(reading, "--venue-copy-opacity", opacity.toFixed(3));
        setData(reading, "copyHidden", String(opacity < .02));
      });

      {
        // The stepper already eases each move; the camera follows it linearly.
        const from = motion.matches ? next : Math.min(Math.floor(position), cameraStops.length - 1);
        const following = Math.min(from + 1, cameraStops.length - 1);
        const amount = motion.matches ? 0 : position - from;
        const first = cameraStops[from];
        const last = cameraStops[following];
        const chosen = selected.current ? cameraStops[selected.current === "airport" ? 0 : 2] : null;
        const overview = motion.matches && !chosen && (!compact || readingFlow);
        // The north indicator occupies a side corner, not the full focal band.
        // Its actual rectangle is still excluded from each pin below.
        const upper = (controls?.bottom ?? atlasBox.top) - atlasBox.top;
        const lower = (creditsBox?.top ?? atlasBox.bottom) - atlasBox.top;
        const pointHeight = Math.max(0, ...sizes.points.map(point => point.height));
        const x = chosen?.x ?? (overview ? 780 : mix(first.x, last.x, amount));
        const y = chosen?.y ?? (overview ? 850 : mix(first.y, last.y, amount));
        const scale = Math.max(.05, overview
          ? Math.min(atlasWidth / 1400 * .86, compact ? Math.max(0, lower - upper - pointHeight - 12) / 1000 : atlasHeight / 1700 * .86) * zoom.current
          : Math.max(atlasWidth / 1400, atlasHeight / 1700) * (chosen?.zoom ?? mix(first.zoom, last.zoom, amount)) * zoom.current);
        let targetX = atlasWidth * (compact || overview ? .5 : locale === "ar" ? .27 : .73);
        if (!compact && !readingFlow && foreground) {
          const readingEdge = locale === "ar" ? atlasBox.right - foreground.left : foreground.right - atlasBox.left;
          setVar(element, "--venue-reading-edge", `${readingEdge.toFixed(1)}px`);
        } else element.style.removeProperty("--venue-reading-edge");
        const currentIndex = selected.current ? (selected.current === "airport" ? 0 : 1) : next === 0 ? 0 : next === 2 ? 1 : -1;
        const currentSize = sizes.points[currentIndex];
        const focalStop = chosen ?? cameraStops[next];
        if (!compact && !readingFlow && !overview && foreground && currentSize) {
          // Camera travel must leave the active pin and its hover corridor in
          // the real map column, outside the side foreground's hit area.
          const pinX = targetX + (focalStop.x - x) * scale;
          const clearance = currentSize.width / 2 + 24;
          const minimum = locale === "ar" ? (controls?.right ?? atlasBox.left) - atlasBox.left + clearance : foreground.right - atlasBox.left + clearance;
          const maximum = locale === "ar" ? foreground.left - atlasBox.left - clearance : (controls?.left ?? atlasBox.right) - atlasBox.left - clearance;
          targetX += Math.min(maximum, Math.max(minimum, pinX)) - pinX;
        }
        // Keep the focal stop between controls and attribution on thin maps.
        let targetY = compact ? (upper + lower) / 2 : atlasHeight * .48;
        if (!compact && !readingFlow && !overview && currentSize) {
          // The desktop atlas extends beneath the fixed header. Retain a clear
          // active marker while its chapter is read, rather than advertising a
          // point at the atlas edge that the header physically covers.
          const pinY = targetY + (focalStop.y - y) * scale;
          targetY += Math.max(0, headerHeight + 24 - atlasBox.top + currentSize.height / 2 - pinY);
        }
        map.style.left = "0px"; map.style.top = "0px"; map.style.transformOrigin = "0 0";
        map.style.transform = `translate3d(${(targetX - x * scale).toFixed(2)}px,${(targetY - y * scale).toFixed(2)}px,0) scale(${scale.toFixed(5)})`;
        // Strokes and the traveller keep a constant on-screen size at any zoom.
        setVar(map, "--venue-camera-scale", scale.toFixed(4));
        if (trail) {
          const travelled = (motion.matches ? next : position) / (cameraStops.length - 1);
          trail.style.strokeDashoffset = (1 - travelled).toFixed(4);
          if (trailGlow) trailGlow.style.strokeDashoffset = trail.style.strokeDashoffset;
          const point = trail.getPointAtLength(travelled * trailLength);
          travellers.forEach(([dot, size]) => {
            dot.setAttribute("cx", point.x.toFixed(1));
            dot.setAttribute("cy", point.y.toFixed(1));
            dot.setAttribute("r", (size / scale).toFixed(2));
          });
          setData(element, "travelling", String(travelled > .01 && travelled < .99));
        }
        points.forEach((point, index) => {
          point.style.transform = `translate(-50%,-50%) scale(${(1 / scale).toFixed(5)})`;
          const { width, height } = sizes.points[index] ?? { width: 0, height: 0 };
          const stop = point.dataset.mapPoint === "airport" ? cameraStops[0] : cameraStops[2];
          const px = targetX + (stop.x - x) * scale;
          const py = targetY + (stop.y - y) * scale;
          const bounds = { left: atlasBox.left + px - width / 2, right: atlasBox.left + px + width / 2, top: atlasBox.top + py - height / 2, bottom: atlasBox.top + py + height / 2 };
          const blocked = [creditsBox, controls, north].some(box => box && bounds.left < box.right + 4 && bounds.right > box.left - 4 && bounds.top < box.bottom + 4 && bounds.bottom > box.top - 4)
            || (!compact && bounds.top < headerHeight + 8);
          const visible = !blocked && bounds.left >= atlasBox.left && bounds.right <= atlasBox.right && bounds.top >= atlasBox.top && bounds.bottom <= atlasBox.bottom;
          if (point.dataset.pointVisible !== String(visible)) {
            point.inert = !visible; point.tabIndex = visible ? 0 : -1;
            if (visible) point.removeAttribute("aria-hidden"); else point.setAttribute("aria-hidden", "true");
            point.dataset.pointVisible = String(visible);
          }
          if (!compact && visible && hovered[index]) positionPointDetail(point as HTMLAnchorElement);
        });
      }
      setData(element, "journeyReady", "true");
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const remeasure = () => { dirty = true; schedule(); };
    const entryStage = () => document.querySelector<HTMLElement>(".venue-gallery-stage[data-entry-boundary]");
    // Stops: the venue overview (when present), then each chapter's resting position.
    const stepper = createJourneyStepper({
      enabled: () => element.dataset.journeyReady === "true" && !readingFlow && !motion.matches && !colors.matches
        && (window.visualViewport?.scale ?? 1) <= 1.01,
      stops: () => {
        const stage = entryStage();
        return stage ? [venueEntryGate(stage).y, ...chapterAnchors()] : chapterAnchors();
      },
      overflow: index => {
        const reading = chapters[index - (entryStage() ? 1 : 0)]?.querySelector<HTMLElement>(".venue-journey-reading");
        return reading ? reading.getBoundingClientRect().bottom - (window.innerHeight - 24) : 0;
      },
      // Entering from the overview keeps the existing light-and-reveal scene.
      transition: (from, to) => {
        if (from !== 0 || to !== 1 || !entryStage()) return;
        let done = () => {};
        const settled = new Promise<void>(resolve => { done = resolve; });
        const request = new CustomEvent(venueEntryRequest, { cancelable: true, detail: { done: () => done() } });
        window.dispatchEvent(request);
        return request.defaultPrevented ? settled : undefined;
      },
      onMoving: moving => { element.dataset.journeyMoving = String(moving); },
    });
    refresh.current = schedule;
    const keyboard = (event: KeyboardEvent) => {
      // Paging keys travel between stops; they are not focus navigation.
      if (!pagingKeys.has(event.key)) element.dataset.keyboard = "true";
      if (event.key === "Escape") points.forEach(point => {
        if (point.matches(":hover") || point.contains(document.activeElement)) point.dataset.tooltipDismissed = "true";
      });
      if (event.key === "Escape" && selected.current) {
        const previous = selected.current;
        selected.current = null; setSelectedPoint(null);
        const target = previous === venueJourneySteps[current]
          ? element.querySelector<HTMLElement>(`[data-map-point="${previous}"]`)
          : element.querySelector<HTMLElement>('.venue-journey-index [aria-current="location"]');
        target?.focus({ preventScroll: true });
      }
      if (event.key === "Tab") update(); else schedule();
    };
    const pointer = () => { element.dataset.keyboard = "false"; };
    const wheel = () => { pointer(); schedule(); };
    const size = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    chapters.forEach(chapter => { if (chapter) size?.observe(chapter); });
    readings.forEach(reading => { if (reading) size?.observe(reading); });
    const textSize = new MutationObserver(remeasure);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    window.visualViewport?.addEventListener("resize", remeasure);
    window.addEventListener("keydown", keyboard, { capture: true });
    window.addEventListener("pointerdown", pointer, { passive: true, capture: true });
    window.addEventListener("wheel", wheel, { passive: true });
    motion.addEventListener("change", remeasure);
    update();
    return () => {
      stepper.destroy();
      refresh.current = () => {};
      cancelAnimationFrame(frame); size?.disconnect(); textSize.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", remeasure);
      window.visualViewport?.removeEventListener("resize", remeasure);
      window.removeEventListener("keydown", keyboard, { capture: true });
      window.removeEventListener("pointerdown", pointer, { capture: true }); window.removeEventListener("wheel", wheel);
      motion.removeEventListener("change", remeasure);
      map.style.removeProperty("transform"); map.style.removeProperty("left"); map.style.removeProperty("top"); map.style.removeProperty("transform-origin");
      points.forEach(point => { point.style.removeProperty("transform"); point.inert = false; point.tabIndex = 0; point.removeAttribute("aria-hidden"); delete point.dataset.pointVisible; });
      delete element.dataset.journeyReady; delete element.dataset.readingFlow; delete element.dataset.mapCompact; delete element.dataset.keyboard; delete element.dataset.framePinned; delete element.dataset.journeyMoving; delete element.dataset.travelling; delete element.dataset.inView;
      map.style.removeProperty("--venue-camera-scale");
      element.style.removeProperty("--venue-index-height");
      element.style.removeProperty("--venue-reading-edge");
      chapters.forEach(chapter => {
        const reading = chapter?.querySelector<HTMLElement>(".venue-journey-reading");
        reading?.style.removeProperty("--venue-copy-opacity");
        reading?.style.removeProperty("--venue-copy-shift");
        if (reading) delete reading.dataset.copyHidden;
      });
    };
  }, [locale]);

  const renderPoint = (point: MapPoint) => {
    const airport = point === "airport";
    const name = airport ? journey.airportName : venue.name[locale];
    return <Link href={airport ? "#journey-airport" : "#journey-arrival"}
      role={enhanced ? "button" : undefined} aria-expanded={enhanced ? selectedPoint === point : undefined}
      aria-controls={enhanced ? "venue-map-detail" : undefined}
      className={`venue-journey-point venue-journey-point--${point}`} data-map-point={point}
      aria-label={`${journey.steps[airport ? 0 : 2]}: ${name}`} aria-describedby={`venue-${point}-point-detail`}
      dir={locale === "ar" ? "rtl" : "ltr"}
      onClick={event => { if (enhanced) { event.preventDefault(); choosePoint(point, event.detail === 0); } }}
      onKeyDown={event => { if (event.key === " ") { event.preventDefault(); choosePoint(point, true); } }}
      onPointerEnter={event => { resetPoint(event); positionPointDetail(event.currentTarget); }}
      onPointerLeave={resetPoint}
      onFocus={event => { delete event.currentTarget.dataset.tooltipDismissed; positionPointDetail(event.currentTarget); }}
      onBlur={event => { if (!event.currentTarget.matches(":hover")) delete event.currentTarget.dataset.tooltipDismissed; }}>
      <span className="venue-journey-point-light" aria-hidden="true" /><span>{airport ? journey.airportPin : journey.venuePin}</span>
      <span className="venue-journey-point-detail" id={`venue-${point}-point-detail`} role="tooltip"><strong>{name}</strong><span>{airport ? journey.airportNote : venue.address.streetAddress[locale]}</span></span>
    </Link>;
  };
  return <section ref={root} className="venue-arrival-journey" data-testid="venue-arrival-journey" data-active-step={venueJourneySteps[active]} data-point-details-open={selectedPoint !== null} aria-label={journey.label}>
    <div className="venue-journey-world">
      <div className="venue-journey-frame">
      <div className="venue-journey-atlas">
        <div ref={plane} className="venue-journey-camera" data-testid="venue-journey-camera" dir="ltr" onTransitionEnd={() => {
          plane.current?.querySelectorAll<HTMLAnchorElement>(".venue-journey-point").forEach(point => {
            if (point.matches(":hover") || point.matches(":focus-visible")) positionPointDetail(point);
          });
        }}>
          <Image src="/media/msrc-demo/venue-journey-city.svg" width={1400} height={1700} alt="" unoptimized loading="lazy" draggable={false} />
          <svg className="venue-journey-thread" viewBox="0 0 1400 1700" width={1400} height={1700} aria-hidden="true" focusable="false">
            <path className="venue-journey-thread-base" d={threadPath} />
            <path className="venue-journey-thread-glow" d={threadPath} pathLength={1} />
            <path className="venue-journey-thread-trail" d={threadPath} pathLength={1} />
            <circle className="venue-journey-traveller-halo" cx={581} cy={366} r={1} />
            <circle className="venue-journey-traveller" cx={581} cy={366} r={1} />
          </svg>
          {renderPoint("airport")}{renderPoint("arrival")}
        </div>
        <div className="venue-journey-atlas-shade" aria-hidden="true" />
        <div className="venue-journey-map-caption"><p>{journey.mapNote}</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">© OpenStreetMap contributors</a></div>
        <span className="venue-journey-north" aria-label={journey.north}><svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 1 2 20l8-4 8 4L10 1Z" fill="currentColor" /></svg><span>{locale === "ar" ? "ش" : "N"}</span></span>
        <div className="venue-map-controls" role="group" aria-label={journey.exploreMap}>
          <button type="button" aria-label={journey.zoomIn} disabled={!enhanced || zoomLevel >= 2} onClick={() => changeZoom(.25)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></button>
          <button type="button" aria-label={journey.zoomOut} disabled={!enhanced || zoomLevel <= .55} onClick={() => changeZoom(-.25)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg></button>
          <button type="button" aria-label={journey.resetMap} disabled={!enhanced} onClick={() => changeZoom("reset")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></svg></button>
        </div>
      </div>
        <nav className="venue-journey-index" aria-label={journey.navigation}>
          <ol>{venueJourneyIds.map((id, index) => <li key={id}><Link href={`#${id}`} onClick={() => closePoint()} aria-current={active === index ? "location" : undefined}><span className="venue-journey-index-dot" aria-hidden="true" /><span>{journey.steps[index]}</span><VenueIcon name="arrow" /></Link></li>)}</ol>
        </nav>
      </div>
      <Container className="venue-journey-body">
        <div className="venue-journey-chapters">
          <section id="journey-airport" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--airport" data-journey-chapter="airport" aria-labelledby="journey-airport-title">
            <div className="venue-journey-reading">
              <JourneyTitle id="journey-airport-title" phrases={journey.airportTitle} />
              <p className="venue-journey-place-name">{journey.airportName}</p>
              <p className="venue-journey-note">{journey.airportNote}</p>
              <Link href="#journey-city" className="venue-journey-continue">{journey.continue}<VenueIcon name="arrow" /></Link>
            </div>
          </section>
          <section id="journey-city" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--city" data-journey-chapter="city" aria-labelledby="journey-city-title">
            <div className="venue-journey-reading">
              <JourneyTitle id="journey-city-title" phrases={journey.cityTitle} />
              <div className="venue-travel-cards venue-journey-options">{modes.map(mode => {
                const time = venue.travelTimes?.[mode]?.[locale]?.trim();
                return <article key={mode} data-travel-mode={mode}><details name="venue-transport" onPointerEnter={revealOnHover}><summary><h3><VenueIcon name={mode} /><span>{travel.modes[mode].title}</span><svg className="venue-journey-disclosure-mark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false"><path d="M12 4v16M4 12h16" /></svg></h3></summary><p>{travel.modes[mode].body}</p>{time ? <p className="venue-travel-time"><strong>{travel.travelTime}: </strong>{time}</p> : null}</details></article>;
              })}</div>
            </div>
          </section>
          <section id="journey-arrival" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--arrival" data-journey-chapter="arrival" aria-labelledby="journey-arrival-title">
            <div id="venue" tabIndex={-1} className="venue-journey-reading">
              <JourneyTitle id="journey-arrival-title" phrases={journey.arrivalTitle} />
              <dl className="dates-location-details venue-journey-address"><div><dt><VenueIcon name="venue" />{place.venue}</dt><dd>{venue.name[locale]}</dd></div><div><dt><VenueIcon name="address" />{place.address}</dt><dd>{venue.address.streetAddress[locale]}{locale === "ar" ? "، جدة " : ", Jeddah "}{venue.address.postalCode}</dd></div></dl>
              <Link href="#venue-orientation" className="venue-journey-continue">{place.directions}<VenueIcon name="arrow" /></Link>
              {details.length ? <section id="at-venue" className="venue-arrival-details venue-journey-arrival-details" aria-labelledby="at-venue-title"><details className="venue-arrival-disclosure"><summary><h3 id="at-venue-title">{journey.arrivalEssentials}</h3><svg className="venue-journey-disclosure-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg></summary><dl>{details.map(({ key, text }) => <div key={key} data-venue-detail={key}><dt><VenueIcon name={key} />{travel.venueDetails[key]}</dt><dd>{key === "accessibility" ? <AccessibilityGuidance text={text} label={travel.contactForm} locale={locale} /> : text}</dd></div>)}</dl></details></section> : null}
            </div>
          </section>
        </div>
      </Container>
      <aside id="venue-map-detail" data-testid="venue-map-detail" className="venue-map-detail" hidden={!selectedPoint} role="region" aria-label={journey.exploreMap}>
        <button type="button" className="venue-map-detail-close" aria-label={journey.closeDetails} onClick={() => closePoint(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        {selectedPoint ? <><h3 tabIndex={-1}>{selectedPoint === "airport" ? journey.airportName : venue.name[locale]}</h3><p>{selectedPoint === "airport" ? journey.airportNote : `${venue.address.streetAddress[locale]}${locale === "ar" ? "، جدة " : ", Jeddah "}${venue.address.postalCode}`}</p><Link href={selectedPoint === "airport" ? "#journey-city" : "#venue-orientation"} onClick={() => closePoint()}>{selectedPoint === "airport" ? journey.continue : place.directions}<VenueIcon name="arrow" /></Link></> : null}
      </aside>
    </div>
  </section>;
}
