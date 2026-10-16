"use client";

import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { activateNavigation } from "@/lib/anchor-navigation";
import { isPrivatePage } from "@/lib/content-security-policy";

export function Link({ disabled = false, className = "", onClick, children, ...props }: ComponentPropsWithoutRef<typeof NextLink> & { disabled?: boolean }) {
  if (disabled) return <span role="link" aria-disabled="true" className={`site-link ${className}`} id={props.id} lang={props.lang} dir={props.dir} title={props.title} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]}>{children}</span>;
  const targetPath = (typeof props.href === "string" ? props.href : props.href.pathname ?? "").split(/[?#]/)[0];
  return <NextLink {...props} prefetch={isPrivatePage(targetPath) ? false : props.prefetch} className={`site-link ${className}`} onClick={(event) => {
    onClick?.(event);
    // A client transition retains the old document CSP. Cross this boundary with
    // a full navigation so entering private pages always installs their policy.
    const address = new URL(event.currentTarget.href);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
      && !event.currentTarget.download && (!event.currentTarget.target || event.currentTarget.target === "_self")
      && address.origin === window.location.origin && isPrivatePage(address.pathname) !== isPrivatePage(window.location.pathname)) {
      event.preventDefault();
      if (props.replace) window.location.replace(address.href);
      else window.location.assign(address.href);
      return;
    }
    if (props.scroll !== false) activateNavigation(event, props.replace);
  }}>{children}</NextLink>;
}
