"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

let viewportObserver: IntersectionObserver | undefined;
const awaitingReveal = new Set<Element>();

function observeReveal(node: HTMLDivElement) {
  if (node.dataset.revealState === "complete") return () => {};
  if (!window.IntersectionObserver || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.dataset.revealState = "complete";
    return () => {};
  }
  if (!viewportObserver) {
    viewportObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !awaitingReveal.has(entry.target)) continue;
        awaitingReveal.delete(entry.target);
        viewportObserver?.unobserve(entry.target);
        const target = entry.target as HTMLDivElement;
        target.dataset.revealState = "complete";
        // Never hide text, including if JavaScript, media or the observer fails.
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) target.classList.add("reveal--seen");
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
  }
  awaitingReveal.add(node);
  viewportObserver.observe(node);
  return () => {
    awaitingReveal.delete(node);
    viewportObserver?.unobserve(node);
    if (!awaitingReveal.size) {
      viewportObserver?.disconnect();
      viewportObserver = undefined;
    }
  };
}

/** Content is visible without JS. One reveal at most; no scrolling is intercepted. */
export function Reveal({ children, className = "", stagger = false, ...props }: ComponentPropsWithoutRef<"div"> & { stagger?: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    return node ? observeReveal(node) : undefined;
  }, []);
  return <div {...props} ref={element} className={`reveal ${className}`.trim()} data-reveal-stagger={stagger ? "true" : undefined}>{children}</div>;
}
