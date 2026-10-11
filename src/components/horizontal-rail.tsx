"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

/** Native scrolling remains the primary interaction; arrows are an additional affordance. */
export function HorizontalRail({ children, label, locale, className = "" }: {
  children: ReactNode; label: string; locale: Locale; className?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
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
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", schedule, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", schedule); cancelAnimationFrame(frame); };
  }, []);
  const move = (direction: number, keyboard: boolean) => {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * (locale === "ar" ? -1 : 1) * element.clientWidth * .82,
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
    <div ref={rail} className="rail-track" role="region" aria-label={label} tabIndex={0}>{children}</div>
  </div>;
}
