"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

/** Native scrolling remains the primary interaction; arrows are an additional affordance. */
export function HorizontalRail({ children, label, locale, className = "", stepByItem = false }: {
  children: ReactNode; label: string; locale: Locale; className?: string; stepByItem?: boolean;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const destination = useRef<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const position = Math.abs(element.scrollLeft);
      setEdges({ start: position < 2, end: position >= element.scrollWidth - element.clientWidth - 2 });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    const reset = () => { destination.current = null; };
    const observer = new ResizeObserver(() => { reset(); update(); });
    observer.observe(element);
    Array.from(element.children).forEach(child => observer.observe(child));
    element.addEventListener("scroll", schedule, { passive: true });
    element.addEventListener("scrollend", reset);
    element.addEventListener("pointerdown", reset, { passive: true });
    element.addEventListener("wheel", reset, { passive: true });
    return () => {
      observer.disconnect(); element.removeEventListener("scroll", schedule);
      element.removeEventListener("scrollend", reset); element.removeEventListener("pointerdown", reset);
      element.removeEventListener("wheel", reset); cancelAnimationFrame(frame);
    };
  }, []);
  const move = (direction: number, keyboard: boolean) => {
    const element = rail.current;
    if (!element) return;
    const first = element.firstElementChild as HTMLElement | null;
    if (!first) return;
    const rtl = locale === "ar";
    const end = Math.max(0, element.scrollWidth - element.clientWidth);
    const position = destination.current ?? Math.abs(element.scrollLeft);
    const stops = Array.from(element.children).map((child) => {
      const item = child as HTMLElement;
      // Layout offsets remain stable during smooth scrolling. Measure from the
      // reading edge, including each item's width, so mixed widths and RTL work.
      const start = rtl
        ? first.offsetLeft + first.offsetWidth - item.offsetLeft - item.offsetWidth
        : item.offsetLeft - first.offsetLeft;
      // Existing full-width venue galleries retain their start alignment.
      const offset = start - (stepByItem ? 0 : (element.clientWidth - item.offsetWidth) / 2);
      return Math.max(0, Math.min(end, offset));
    });
    const target = direction > 0
      ? stops.find(stop => stop > position + 2) ?? end
      : stops.slice().reverse().find(stop => stop < position - 2) ?? 0;
    // Repeated taps advance from the requested item, even before motion settles.
    destination.current = target;
    element.scrollTo({ left: rtl ? -target : target,
      behavior: keyboard || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className={`horizontal-rail ${className}`}>
    <div className="rail-tools">
      <p>{locale === "ar" ? "اسحب لاستكشاف المزيد" : "Scroll to explore"}</p>
      <div className="rail-buttons">
        {([-1, 1] as const).map((direction) => <button key={direction} type="button" disabled={direction < 0 ? edges.start : edges.end}
          aria-label={direction < 0 ? locale === "ar" ? "السابق" : "Previous" : locale === "ar" ? "التالي" : "Next"}
          onClick={(event) => move(direction, event.detail === 0)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={direction < 0 ? "rail-back" : "rail-next"}><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>)}
      </div>
    </div>
    <div ref={rail} className="rail-track" role="region" aria-label={label} tabIndex={0} onKeyDown={(event) => {
      // Home/End otherwise scroll the whole document, abandoning the album.
      // Leave keys on child links, buttons and native media controls alone.
      if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const element = event.currentTarget;
        const end = element.scrollWidth - element.clientWidth;
        destination.current = null;
        element.scrollTo({ left: event.key === "Home" ? 0 : locale === "ar" ? -end : end, behavior: "instant" });
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        move(locale === "ar" ? -direction : direction, true);
      }
    }}>{children}</div>
  </div>;
}
