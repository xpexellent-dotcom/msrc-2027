"use client";

import { Link } from "@/components/ui/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export type NavigationLink = { href: string; label: string; children?: readonly { href: string; label: string }[] };

/** A disclosure navigation, not a modal: native Tab order stays intact. */
export function MobileNav({ id, label, links, pathname, locale, status, action, animate, onNavigate }: {
  id: string; label: string; links: readonly NavigationLink[]; locale: Locale;
  pathname: string; status: string; action: string; animate: boolean; onNavigate: () => void;
}) {
  return <div id={id} className="mobile-menu" data-animate={animate}><Container>
    <nav aria-label={label}>{links.map((link) => <div className="mobile-nav-group" key={link.href}><Link href={link.href}
      aria-current={pathname === link.href ? "page" : undefined} onClick={() => {
        onNavigate();
        if (pathname === link.href) document.getElementById("main-content")?.focus();
      }}>{link.label}</Link>
      {link.children ? <div className="mobile-nav-children">{link.children.map((child) => <Link key={child.href} href={child.href}
        onClick={onNavigate}>{child.label}</Link>)}</div> : null}
    </div>)}</nav>
    <ButtonLink className="mobile-reserve-action" href={`/${locale}/registration`} variant="gold" onClick={onNavigate}>{action}</ButtonLink>
    <div className="mobile-menu-bottom"><p className="mobile-menu-status">{status}</p></div>
  </Container></div>;
}
