"use client";

import { useEffect, useRef } from "react";

/** Decorative backdrop for the Team page: drifting colour orbs and a soft gold light that follows the pointer. */
export function TeamSpotlight() {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    const host = node?.parentElement;
    if (!node || !host || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = host.getBoundingClientRect();
        node.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
        node.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
        node.dataset.active = "true";
      });
    };
    const leave = () => { delete node.dataset.active; };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(frame); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }, []);
  return <div ref={element} className="team-backdrop" aria-hidden="true">
    <span className="team-orb team-orb--lilac" />
    <span className="team-orb team-orb--gold" />
    <span className="team-orb team-orb--violet" />
    <span className="team-spot" />
  </div>;
}
