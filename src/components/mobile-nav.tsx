"use client";

import { Link } from "@/components/ui/link";
import { Container } from "@/components/ui/container";

/** A disclosure navigation, not a modal: native Tab order stays intact. */
export function MobileNav({ id, label, links, pathname, status, onNavigate }: {
  id: string; label: string; links: readonly { href: string; label: string }[];
  pathname: string; status: string; onNavigate: () => void;
}) {
  return <div id={id} className="mobile-menu"><Container>
    <nav aria-label={label}>{links.map((link) => <Link key={link.href} href={link.href}
      aria-current={pathname === link.href ? "page" : undefined} onClick={() => {
        onNavigate();
        if (pathname === link.href) document.getElementById("main-content")?.focus();
      }}>{link.label}<span className="directional-arrow" aria-hidden="true">↗</span></Link>)}</nav>
    <p className="mobile-menu-status">{status}</p>
  </Container></div>;
}
