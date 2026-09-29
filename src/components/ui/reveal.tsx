"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content is visible without JS. One reveal at most; no scrolling is intercepted. */
export function Reveal({ children }: { children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      node.classList.add("reveal--seen");
      observer.disconnect();
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={element} className="reveal">{children}</div>;
}
