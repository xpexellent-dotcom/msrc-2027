"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Marks each journey step visible once it scrolls into view, so touch screens fade the detail text in. Without JavaScript the text stays visible. */
export function RoadmapReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const steps = [...root.querySelectorAll("li")];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -15% 0px" });
    steps.forEach((step) => observer.observe(step));
    root.dataset.reveal = "ready";
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="research-roadmap-reveal">{children}</div>;
}
