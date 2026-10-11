"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { VenueGeographicMap } from "@/components/venue-geographic-map";
import { VenueIcon } from "@/components/venue-icon";
import type { ConferenceVenue, VenueTravelMode, VenueVisitorInfoKey } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { venueTravelCopy } from "@/content/venue-travel";
import { venueJourneyCopy, venueJourneyIds, venueJourneySteps } from "@/content/venue-journey";
import type { Locale } from "@/lib/i18n";
import { venueMapLinks } from "@/lib/venue-travel";

const modes = ["taxi", "train", "rental"] as const satisfies readonly VenueTravelMode[];
const detailKeys = ["entryGate", "ticket", "parking", "accessibility", "onSite", "wifi"] as const satisfies readonly VenueVisitorInfoKey[];
// These are image-space camera references, not driving instructions. The middle
// point is a camera composition only; it is deliberately not a place marker.
const cameraStops = [{ x: 581, y: 366, zoom: 1.12 }, { x: 800, y: 850, zoom: 1.02 }, { x: 1008, y: 1366, zoom: 1.55 }] as const;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (first: number, last: number, amount: number) => first + (last - first) * amount;

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
  if (!tip || !atlas || window.innerWidth < 1200 || journey?.dataset.readingFlow === "true") return;
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
  const journey = venueJourneyCopy[locale];
  const travel = venueTravelCopy[locale];
  const place = datesVenueCopy[locale];
  const details = detailKeys.flatMap(key => {
    const text = venue.atVenue?.[key]?.[locale]?.trim();
    return text ? [{ key, text }] : [];
  });

  useEffect(() => {
    const element = root.current;
    const map = plane.current;
    if (!element || !map) return;
    const chapters = venueJourneyIds.map(id => element.querySelector<HTMLElement>(`#${id}`));
    const points = [...map.querySelectorAll<HTMLElement>(".venue-journey-point")];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current = -1;
    let readingFlow = false;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const font = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      readingFlow = window.innerWidth < 1200 || viewport <= 640 || font > 24;
      element.dataset.readingFlow = String(readingFlow);
      const anchorInset = chapters[0] ? Number.parseFloat(getComputedStyle(chapters[0]).scrollMarginBlockStart) || 0 : 0;
      const scrollPadding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      const line = Math.max(viewport * .45, Math.min(viewport - 24, anchorInset + scrollPadding + 1));
      const boxes = chapters.map(chapter => chapter?.getBoundingClientRect());
      let next = 0;
      boxes.forEach((box, index) => { if (box && box.top <= line) next = index; });
      if (next !== current) { current = next; setActive(next); }

      if (readingFlow || motion.matches) {
        map.style.removeProperty("transform");
        map.style.removeProperty("left"); map.style.removeProperty("top"); map.style.removeProperty("transform-origin");
        points.forEach(point => point.style.removeProperty("transform"));
        points.forEach(point => { point.inert = false; point.tabIndex = 0; point.removeAttribute("aria-hidden"); point.dataset.pointVisible = "true"; });
      } else {
        const following = Math.min(next + 1, cameraStops.length - 1);
        const start = boxes[next]?.top ?? line;
        const end = boxes[following]?.top ?? start;
        const progress = following === next ? 0 : clamp((line - start) / Math.max(1, end - start));
        const amount = progress * progress * (3 - 2 * progress);
        const first = cameraStops[next];
        const last = cameraStops[following];
        const x = mix(first.x, last.x, amount);
        const y = mix(first.y, last.y, amount);
        const atlas = map.parentElement!;
        const scale = Math.max(atlas.clientWidth / 1400, viewport / 1700) * mix(first.zoom, last.zoom, amount);
        const targetX = atlas.clientWidth * (locale === "ar" ? .22 : .78);
        const targetY = viewport * .48;
        map.style.left = "0px"; map.style.top = "0px"; map.style.transformOrigin = "0 0";
        map.style.transform = `translate3d(${targetX - x * scale}px,${targetY - y * scale}px,0) scale(${scale})`;
        points.forEach(point => {
          point.style.transform = `translate(-50%,-50%) scale(${1 / scale})`;
          const stop = point.dataset.mapPoint === "airport" ? cameraStops[0] : cameraStops[2];
          const px = targetX + (stop.x - x) * scale;
          const py = targetY + (stop.y - y) * scale;
          const visible = px - point.offsetWidth / 2 >= 0 && px + point.offsetWidth / 2 <= atlas.clientWidth && py - point.offsetHeight / 2 >= 0 && py + point.offsetHeight / 2 <= viewport;
          point.inert = !visible; point.tabIndex = visible ? 0 : -1;
          if (visible) point.removeAttribute("aria-hidden"); else point.setAttribute("aria-hidden", "true");
          point.dataset.pointVisible = String(visible);
          if (visible && (point.matches(":hover") || point.matches(":focus-visible"))) positionPointDetail(point as HTMLAnchorElement);
        });
      }
      element.dataset.journeyReady = "true";
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const keyboard = (event: KeyboardEvent) => {
      element.dataset.keyboard = "true";
      if (event.key === "Escape") points.forEach(point => {
        if (point.matches(":hover") || point.contains(document.activeElement)) point.dataset.tooltipDismissed = "true";
      });
      if (event.key === "Tab") update(); else schedule();
    };
    const pointer = () => { element.dataset.keyboard = "false"; };
    const wheel = () => { pointer(); schedule(); };
    const size = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    chapters.forEach(chapter => { if (chapter) size?.observe(chapter); });
    const textSize = new MutationObserver(schedule);
    textSize.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("keydown", keyboard, { capture: true });
    window.addEventListener("pointerdown", pointer, { passive: true, capture: true });
    window.addEventListener("wheel", wheel, { passive: true });
    motion.addEventListener("change", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame); size?.disconnect(); textSize.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      window.removeEventListener("keydown", keyboard, { capture: true });
      window.removeEventListener("pointerdown", pointer, { capture: true }); window.removeEventListener("wheel", wheel);
      motion.removeEventListener("change", schedule);
      map.style.removeProperty("transform"); map.style.removeProperty("left"); map.style.removeProperty("top"); map.style.removeProperty("transform-origin");
      points.forEach(point => { point.style.removeProperty("transform"); point.inert = false; point.tabIndex = 0; point.removeAttribute("aria-hidden"); delete point.dataset.pointVisible; });
      delete element.dataset.journeyReady; delete element.dataset.readingFlow; delete element.dataset.keyboard;
    };
  }, [locale]);

  return <section ref={root} className="venue-arrival-journey" data-testid="venue-arrival-journey" data-active-step={venueJourneySteps[active]} aria-label={journey.label}>
    <div className="venue-journey-world">
      <div className="venue-journey-atlas">
        <div ref={plane} className="venue-journey-camera" data-testid="venue-journey-camera" dir="ltr" onTransitionEnd={() => {
          plane.current?.querySelectorAll<HTMLAnchorElement>(".venue-journey-point").forEach(point => {
            if (point.matches(":hover") || point.matches(":focus-visible")) positionPointDetail(point);
          });
        }}>
          <Image src="/media/msrc-demo/venue-journey-city.svg" width={1400} height={1700} alt="" unoptimized loading="lazy" draggable={false} />
          <Link href="#journey-airport" className="venue-journey-point venue-journey-point--airport" data-map-point="airport" aria-label={`${journey.steps[0]}: ${journey.airportName}`} aria-describedby="venue-airport-point-detail" dir={locale === "ar" ? "rtl" : "ltr"} onPointerEnter={event => { resetPoint(event); positionPointDetail(event.currentTarget); }} onPointerLeave={resetPoint} onFocus={event => { delete event.currentTarget.dataset.tooltipDismissed; positionPointDetail(event.currentTarget); }} onBlur={event => { if (!event.currentTarget.matches(":hover")) delete event.currentTarget.dataset.tooltipDismissed; }}><span className="venue-journey-point-light" aria-hidden="true" /><span>{journey.airportPin}</span><span className="venue-journey-point-detail" id="venue-airport-point-detail" role="tooltip"><strong>{journey.airportName}</strong><span>{journey.airportNote}</span><span className="venue-journey-point-action">{journey.pointAction}</span></span></Link>
          <Link href="#journey-arrival" className="venue-journey-point venue-journey-point--arrival" data-map-point="arrival" aria-label={`${journey.steps[2]}: ${venue.name[locale]}`} aria-describedby="venue-arrival-point-detail" dir={locale === "ar" ? "rtl" : "ltr"} onPointerEnter={event => { resetPoint(event); positionPointDetail(event.currentTarget); }} onPointerLeave={resetPoint} onFocus={event => { delete event.currentTarget.dataset.tooltipDismissed; positionPointDetail(event.currentTarget); }} onBlur={event => { if (!event.currentTarget.matches(":hover")) delete event.currentTarget.dataset.tooltipDismissed; }}><span className="venue-journey-point-light" aria-hidden="true" /><span>{journey.venuePin}</span><span className="venue-journey-point-detail" id="venue-arrival-point-detail" role="tooltip"><strong>{venue.name[locale]}</strong><span>{venue.address.streetAddress[locale]}</span><span className="venue-journey-point-action">{journey.pointAction}</span></span></Link>
        </div>
        <div className="venue-journey-atlas-shade" aria-hidden="true" />
        <div className="venue-journey-map-caption"><p>{journey.mapNote}</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">© OpenStreetMap contributors</a></div>
        <span className="venue-journey-north" aria-label={journey.north}><svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 1 2 20l8-4 8 4L10 1Z" fill="currentColor" /></svg><span>{locale === "ar" ? "ش" : "N"}</span></span>
      </div>
      <Container className="venue-journey-body">
        <nav className="venue-journey-index" aria-label={journey.navigation}>
          <ol>{venueJourneyIds.map((id, index) => <li key={id}><Link href={`#${id}`} aria-current={active === index ? "location" : undefined}><span className="venue-journey-index-dot" aria-hidden="true" /><span>{journey.steps[index]}</span><VenueIcon name="arrow" /></Link></li>)}</ol>
        </nav>
        <div className="venue-journey-chapters">
          <section id="journey-airport" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--airport" data-journey-chapter="airport" aria-labelledby="journey-airport-title">
            <div className="venue-journey-reading">
              <JourneyTitle id="journey-airport-title" phrases={journey.airportTitle} />
              <p className="venue-journey-place-name">{journey.airportName}</p>
              <p className="venue-journey-lead">{journey.airportBody}</p>
              <p className="venue-journey-note">{journey.airportNote}</p>
              <Link href="#journey-city" className="venue-journey-continue">{journey.continue}<VenueIcon name="arrow" /></Link>
            </div>
          </section>
          <section id="journey-city" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--city" data-journey-chapter="city" aria-labelledby="journey-city-title">
            <div className="venue-journey-reading">
              <JourneyTitle id="journey-city-title" phrases={journey.cityTitle} />
              <p className="venue-journey-lead">{journey.cityBody}</p>
              <div className="venue-travel-cards venue-journey-options">{modes.map(mode => {
                const time = venue.travelTimes?.[mode]?.[locale]?.trim();
                return <article key={mode} data-travel-mode={mode}><details open onPointerEnter={revealOnHover}><summary><h3><VenueIcon name={mode} /><span>{travel.modes[mode].title}</span><svg className="venue-journey-disclosure-mark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false"><path d="M12 4v16M4 12h16" /></svg></h3></summary><p>{travel.modes[mode].body}</p>{time ? <p className="venue-travel-time"><strong>{travel.travelTime}: </strong>{time}</p> : null}</details></article>;
              })}</div>
            </div>
          </section>
          <section id="journey-arrival" tabIndex={-1} className="venue-journey-chapter venue-journey-chapter--arrival" data-journey-chapter="arrival" aria-labelledby="journey-arrival-title">
            <div id="venue" tabIndex={-1} className="venue-journey-reading">
              <JourneyTitle id="journey-arrival-title" phrases={journey.arrivalTitle} />
              <p className="venue-journey-lead">{journey.arrivalBody}</p>
              <p className="dates-body venue-journey-location">{place.locationBody}</p>
              <dl className="dates-location-details venue-journey-address"><div><dt><VenueIcon name="city" />{place.city}</dt><dd>{place.cityValue}</dd></div><div><dt><VenueIcon name="host" />{place.host}</dt><dd>{place.hostValue}</dd></div><div><dt><VenueIcon name="venue" />{place.venue}</dt><dd>{venue.name[locale]}</dd></div><div><dt><VenueIcon name="address" />{place.address}</dt><dd>{venue.address.streetAddress[locale]}{locale === "ar" ? "، جدة " : ", Jeddah "}{venue.address.postalCode}</dd></div></dl>
              {details.length ? <section id="at-venue" className="venue-arrival-details venue-journey-arrival-details" aria-labelledby="at-venue-title"><h3 id="at-venue-title">{travel.atVenueTitle}</h3><dl>{details.map(({ key, text }) => <div key={key} data-venue-detail={key}><dt><VenueIcon name={key} />{travel.venueDetails[key]}</dt><dd>{key === "accessibility" ? <AccessibilityGuidance text={text} label={travel.contactForm} locale={locale} /> : text}</dd></div>)}</dl></section> : null}
            </div>
          </section>
        </div>
      </Container>
    </div>
    <section className="venue-journey-orientation" aria-labelledby="venue-orientation-title"><Container>
      <h2 id="venue-orientation-title">{journey.orientationTitle}</h2><p>{journey.orientationBody}</p>
      <VenueGeographicMap locale={locale} />
      <nav className="venue-map-links" aria-label={travel.mapLinksLabel}>{venueMapLinks(venue).map(({ provider, href }) => <a key={provider} className={`button button--secondary${provider === "google" ? " dates-directions-link" : ""}`} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={provider === "google" ? place.directionsLabel : `${travel.openMap} ${venue.name[locale]} ${travel.inProvider} ${travel.providers[provider]} (${travel.newTab})`}>{provider === "google" ? place.directions : travel.providers[provider]}<VenueIcon name="arrow" /></a>)}</nav>
      <section id="international-attendees" className="venue-international" aria-labelledby="international-title"><h3 id="international-title"><VenueIcon name="globe" />{travel.internationalTitle}</h3><p>{travel.internationalNote} <bdi dir="ltr">(UTC+3)</bdi>.</p><p>{travel.visaResponsibility}</p></section>
    </Container></section>
  </section>;
}
