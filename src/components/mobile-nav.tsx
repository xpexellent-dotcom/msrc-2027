"use client";

import { Link } from "@/components/ui/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";

export type NavigationLink = { href: string; label: string; children?: readonly { href: string; label: string }[] };

/** A disclosure navigation, not a modal: native Tab order stays intact. */
export function MobileNav({ id, label, links, pathname, locale, status, action, animate, closing, onExited, onNavigate }: {
  id: string; label: string; links: readonly NavigationLink[]; locale: Locale;
  pathname: string; status: string; action: string; animate: boolean; closing: boolean;
  onExited: () => void; onNavigate: () => void;
}) {
  return <div id={id} className="mobile-menu" data-animate={animate} data-closing={closing}
    inert={closing} aria-hidden={closing || undefined} onTransitionEnd={(event) => {
      if (closing && event.target === event.currentTarget && event.propertyName === "opacity") onExited();
    }}><Container>
    <div className="mobile-menu-registration" style={{ "--menu-index": 0 } as CSSProperties}>
      <ButtonLink className="mobile-reserve-action" href={`/${locale}/participate`} variant="gold" onClick={onNavigate}>{action}</ButtonLink>
      <p className="mobile-menu-status">{status}</p>
    </div>
    <nav aria-label={label}>{links.map((link, index) => <div className="mobile-nav-group" key={link.href}
      style={{ "--menu-index": index + 1 } as CSSProperties}><Link href={link.href}
      aria-current={pathname === link.href ? "page" : undefined} onClick={() => {
        onNavigate();
        if (pathname === link.href) document.getElementById("main-content")?.focus();
      }}>{link.label}</Link>
      {link.children ? <div className="mobile-nav-children">{link.children.map((child) => <Link key={child.href} href={child.href}
        onClick={onNavigate}>{child.label}</Link>)}</div> : null}
    </div>)}</nav>
  </Container></div>;
}
