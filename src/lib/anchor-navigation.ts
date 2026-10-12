import type { MouseEvent } from "react";

type PageNavigation = { pathname: string; hash: string; requestedAt: number; animate: boolean };
let pendingPageNavigation: PageNavigation | undefined;
let cancelAnchorArrival: (() => void) | undefined;
const activeSlides = new WeakMap<HTMLElement, Animation>();

function destinationElement(hash: string): HTMLElement | null {
  if (!hash) return document.getElementById("main-content");
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
  catch { return null; }
}

/** Keep client-only fragments separate from Next's cached route canonical URL. */
export function commitFragment(hash: string, replace: boolean) {
  if (location.hash === hash) return;
  const address = new URL(location.href);
  const previousURL = address.href;
  address.hash = hash;
  // Passing Next's internal history marker would bypass its canonical sync.
  history[replace ? "replaceState" : "pushState"](null, "", address.href);
  // Custom anchor handling must notify hash subscribers just as native
  // fragment navigation does; rendered locale hrefs then remain accurate.
  window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: previousURL, newURL: address.href }));
}

export function focusDestination(target: HTMLElement) {
  const temporaryFocus = !target.hasAttribute("tabindex") && !target.matches("a[href],button,input,select,textarea");
  if (temporaryFocus) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.focus({ preventScroll: true });
}

/** Explicit destinations are ready to read; their ordinary reveals must not compete with navigation. */
function settleDestinationReveals(target: HTMLElement) {
  const content = target.id === "main-content" ? target.querySelector<HTMLElement>(".site-container") ?? target : target;
  const reveals = [...content.querySelectorAll<HTMLElement>(".reveal")];
  if (content.matches(".reveal")) reveals.push(content);
  for (const reveal of reveals) {
    reveal.dataset.revealState = "complete";
    reveal.classList.remove("reveal--rise", "reveal--seen");
  }
}

/** Text stays fully visible; only explicit navigation receives this short reveal. */
function slideDestination(target: HTMLElement) {
  const content = target.querySelector<HTMLElement>(".site-container") ?? target;
  const previous = activeSlides.get(content);
  const currentTransform = previous ? getComputedStyle(content).transform : undefined;
  previous?.cancel();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || typeof content.animate !== "function") return;
  const direction = getComputedStyle(target).direction === "rtl" ? -1 : 1;
  const slide = content.animate([
    { transform: currentTransform ?? `translateX(${8 * direction}px)` },
    { transform: "translateX(0)" },
  ], { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  activeSlides.set(content, slide);
  const preferenceChanged = () => { if (motion.matches) slide.cancel(); };
  const clearSlide = () => {
    motion.removeEventListener("change", preferenceChanged);
    if (activeSlides.get(content) === slide) activeSlides.delete(content);
  };
  motion.addEventListener("change", preferenceChanged);
  slide.addEventListener("finish", clearSlide, { once: true });
  slide.addEventListener("cancel", clearSlide, { once: true });
  return () => { slide.cancel(); clearSlide(); };
}

/** Reveal when the section heading enters view, rather than spending motion offscreen. */
function revealOnArrival(target: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  if (typeof IntersectionObserver === "undefined") return slideDestination(target) ?? (() => {});
  const heading = target.querySelector<HTMLElement>("h1,h2") ?? target;
  let cancelSlide: (() => void) | undefined;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    clearTimeout(timeout);
    cancelSlide = slideDestination(target);
  }, { rootMargin: "-8% 0px -8% 0px" });
  observer.observe(heading);
  // An interrupted journey leaves ordinary scrolling in charge and no live observer.
  const timeout = setTimeout(() => observer.disconnect(), 2500);
  return () => { observer.disconnect(); clearTimeout(timeout); cancelSlide?.(); };
}

/** Never handle modified clicks, external destinations, downloads, or scrolling input. */
export function activateNavigation(event: MouseEvent<HTMLAnchorElement>, replace = false) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.currentTarget;
  if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
  const destination = new URL(anchor.href);
  if (destination.origin !== location.origin) return;
  // Keyboard and assistive activation have no pointer click count; focus must arrive immediately.
  const animate = event.detail !== 0;

  if (destination.pathname !== location.pathname) {
    cancelAnchorArrival?.();
    cancelAnchorArrival = undefined;
    pendingPageNavigation = { pathname: destination.pathname, hash: destination.hash, requestedAt: Date.now(), animate };
    return; // Next.js retains route loading, history, and normal browser navigation.
  }
  if (!destination.hash || destination.search !== location.search) return;
  const target = destinationElement(destination.hash);
  if (!target) return;
  event.preventDefault();
  commitFragment(destination.hash, replace);
  settleDestinationReveals(target);
  focusDestination(target);
  cancelAnchorArrival?.();
  // The mobile disclosure can finish closing before its height affects the destination.
  const frame = requestAnimationFrame(() => {
    const shouldAnimate = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cancelReveal = shouldAnimate ? revealOnArrival(target) : undefined;
    target.scrollIntoView({ behavior: shouldAnimate ? "smooth" : "instant", block: "start" });
    cancelAnchorArrival = cancelReveal;
  });
  cancelAnchorArrival = () => cancelAnimationFrame(frame);
}

/** Called once by the shared header after an explicitly requested route has committed. */
export function revealPageNavigation(pathname: string) {
  const navigation = pendingPageNavigation;
  if (!navigation || navigation.pathname !== pathname) return;
  if (Date.now() - navigation.requestedAt > 10_000) {
    pendingPageNavigation = undefined;
    return;
  }
  let cancelArrival: (() => void) | undefined;
  const frame = requestAnimationFrame(() => {
    // Consume only after the effect survives cleanup, including development Strict Mode.
    if (pendingPageNavigation !== navigation || location.pathname !== navigation.pathname) return;
    pendingPageNavigation = undefined;
    // The router changes the route first. Apply the requested fragment once,
    // replacing any stale fragment retained by a prefetched initial route.
    commitFragment(navigation.hash, true);
    const target = destinationElement(navigation.hash);
    if (!target) return;
    settleDestinationReveals(target);
    focusDestination(target);
    if (navigation.hash) {
      const shouldAnimate = navigation.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      cancelAnchorArrival?.();
      cancelArrival = shouldAnimate ? revealOnArrival(target) : undefined;
      cancelAnchorArrival = cancelArrival;
      target.scrollIntoView({ behavior: shouldAnimate ? "smooth" : "instant", block: "start" });
    } else if (navigation.animate) {
      cancelArrival = slideDestination(target);
    }
  });
  return () => {
    cancelAnimationFrame(frame);
    cancelArrival?.();
    if (cancelAnchorArrival === cancelArrival) cancelAnchorArrival = undefined;
  };
}
