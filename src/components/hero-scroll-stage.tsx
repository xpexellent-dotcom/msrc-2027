"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A tall opening scrolls to its last control before the following sheet covers it. */
export function HeroScrollStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const hero = stage?.querySelector<HTMLElement>(":scope > .conference-hero");
    if (!stage || !hero || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      // Cinema temporarily fixes the same hero to the viewport; keep its reading offset.
      if (document.documentElement.dataset.cinematic === "true") return;
      const top = Math.min(0, window.innerHeight - hero.getBoundingClientRect().height);
      const value = `${top}px`;
      if (stage.style.getPropertyValue("--hero-sticky-top") !== value) stage.style.setProperty("--hero-sticky-top", value);
      stage.dataset.holdReady = "true";
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const size = new ResizeObserver(schedule);
    size.observe(hero);
    const cinema = new MutationObserver(schedule);
    cinema.observe(document.documentElement, { attributes: true, attributeFilter: ["data-cinematic"] });
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      cinema.disconnect();
      window.removeEventListener("resize", schedule);
      delete stage.dataset.holdReady;
      stage.style.removeProperty("--hero-sticky-top");
    };
  }, []);

  return <div className="hero-scroll-stage" ref={stageRef}>{children}</div>;
}
