"use client";

import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { activateNavigation } from "@/lib/anchor-navigation";

export function Link({ disabled = false, className = "", onClick, children, ...props }: ComponentPropsWithoutRef<typeof NextLink> & { disabled?: boolean }) {
  if (disabled) return <span role="link" aria-disabled="true" className={`site-link ${className}`} id={props.id} lang={props.lang} dir={props.dir} title={props.title} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]}>{children}</span>;
  return <NextLink {...props} className={`site-link ${className}`} onClick={(event) => {
    onClick?.(event);
    if (props.scroll !== false) activateNavigation(event, props.replace);
  }}>{children}</NextLink>;
}
