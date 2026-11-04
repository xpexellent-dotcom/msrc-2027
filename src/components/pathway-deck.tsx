"use client";

import { useEffect } from "react";

/** CSS owns the deck; this gate keeps enlarged or constrained content readable. */
export function PathwayDeck() {
  useEffect(() => {
    const list = document.querySelector<HTMLElement>(".pathway-list[data-pathway-deck]");
    if (!list) return;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;inset-block-start:0;inline-size:0;block-size:100svh;visibility:hidden;pointer-events:none";
    document.body.append(probe);
    const phone = matchMedia("(max-width: 800px)"), reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let active = true;
    const update = () => {
      if (!active) return;
      const limit = probe.offsetHeight || Math.min(innerHeight, document.documentElement.clientHeight);
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height")) || 96;
      const tooTall = [...list.querySelectorAll<HTMLElement>(".pathway-card-body")]
        .some((body) => body.getBoundingClientRect().height + header + 16 > limit);
      list.dataset.deck = !phone.matches || reduce.matches || limit < 560 || tooTall ? "static" : "stack";
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.querySelectorAll(".pathway-card-body").forEach((body) => observer.observe(body));
    phone.addEventListener("change", update);
    reduce.addEventListener("change", update);
    addEventListener("resize", update);
    document.fonts?.ready.then(update);
    update();
    return () => {
      active = false;
      observer.disconnect();
      phone.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
      removeEventListener("resize", update);
      probe.remove();
      delete list.dataset.deck;
    };
  }, []);
  return null;
}
