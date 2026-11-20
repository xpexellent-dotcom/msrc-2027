"use client";

import { useEffect, useRef } from "react";
import { Sparkle } from "@/components/brand/sparkle";
import { Container } from "@/components/ui/container";
import { sponsorBeltCopy } from "@/content/sponsor-belt";
import type { Locale } from "@/lib/i18n";

// Shared visibility observer; static before hydration and whenever JS is unavailable.
let observer: IntersectionObserver | undefined;
const observed = new Set<Element>();
function observeBelt(node: HTMLElement) {
  if (!window.IntersectionObserver) return;
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle("is-visible", entry.isIntersecting);
  }, { threshold: 0 });
  observed.add(node);
  observer.observe(node);
  return () => {
    observer?.unobserve(node);
    observed.delete(node);
    if (!observed.size) { observer?.disconnect(); observer = undefined; }
  };
}

export function SponsorBelt({ locale }: { locale: Locale }) {
  const root = useRef<HTMLElement>(null);
  const text = sponsorBeltCopy[locale];
  useEffect(() => root.current ? observeBelt(root.current) : undefined, []);
  return <section data-header-section="light" ref={root} className="sponsor-belt" aria-label={text.caption}>
    <Container className="belt-head"><p className="belt-caption">{text.caption}</p></Container>
    <div className="belt-window" onTouchStart={(event) => { event.currentTarget.dataset.touched = "true"; }} onTouchEnd={(event) => { delete event.currentTarget.dataset.touched; }} onTouchCancel={(event) => { delete event.currentTarget.dataset.touched; }}><div className="belt-track">{[0, 1].map((group) => <ul className="belt-group" key={group} aria-hidden="true" inert={group === 1 ? true : undefined}>{Array.from({ length: 8 }, (_, index) => <li className="belt-item" key={index}><svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true" focusable="false"><path d={index % 2 ? "M4 6h12v12H4zM16 14h12v12H16z" : "m16 3 13 13-13 13L3 16 16 3Zm0 7-6 6 6 6 6-6-6-6Z"} stroke="currentColor" strokeWidth="1.5" /></svg><span>{text.placeholder}</span><Sparkle size={10} /></li>)}</ul>)}</div></div>
  </section>;
}
