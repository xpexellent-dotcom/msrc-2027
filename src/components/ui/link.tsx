"use client";

import NextLink from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

/** Only an explicit, unmodified same-page anchor click requests smooth motion. */
function jumpToAnchor(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.currentTarget;
  if (anchor.target && anchor.target !== "_self") return;
  const destination = new URL(anchor.href);
  if (!destination.hash || destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;
  let id: string;
  try { id = decodeURIComponent(destination.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  // Retain native link history and meaningful keyboard focus without a scroll listener.
  if (location.hash !== destination.hash) history.pushState(null, "", destination.hash);
  const temporaryFocus = !target.hasAttribute("tabindex") && !target.matches("a[href],button,input,select,textarea");
  if (temporaryFocus) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

export function Link({ disabled = false, className = "", onClick, children, ...props }: ComponentPropsWithoutRef<typeof NextLink> & { disabled?: boolean }) {
  if (disabled) return <span role="link" aria-disabled="true" className={`site-link ${className}`} id={props.id} lang={props.lang} dir={props.dir} title={props.title} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]}>{children}</span>;
  return <NextLink {...props} className={`site-link ${className}`} onClick={(event) => { onClick?.(event); jumpToAnchor(event); }}>{children}</NextLink>;
}
