"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";

type Track = { id: string; label: string };

/** A reading index: observe native scrolling without creating or consuming scroll distance. */
export function PathwayTrackNav({ tracks, locale }: { tracks: readonly Track[]; locale: Locale }) {
  const navigation = useRef<HTMLElement>(null);
  const [active, setActive] = useState(tracks[0]?.id);

  useEffect(() => {
    const introduction = navigation.current?.parentElement;
    const cards = tracks.map((track) => document.getElementById(track.id));
    let frame = 0;

    const update = () => {
      frame = 0;
      // A shared reading line makes the current track deterministic in both directions,
      // including fast scrollbar jumps that can skip IntersectionObserver thresholds.
      // Enlarged text can make the header/anchor inset taller than 45vh.
      // Include the actual landing line so a successful anchor jump is current.
      const anchorInset = cards[0] ? Number.parseFloat(getComputedStyle(cards[0]).scrollMarginBlockStart) || 0 : 0;
      const scrollPadding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
      const readingLine = Math.max(window.innerHeight * .45, Math.min(window.innerHeight - 24, anchorInset + scrollPadding + 1));
      let current = tracks[0]?.id;
      cards.forEach((card, index) => {
        if (card && card.getBoundingClientRect().top <= readingLine) current = tracks[index].id;
      });
      setActive((previous) => previous === current ? previous : current);
      if (introduction) {
        const top = Number.parseFloat(getComputedStyle(introduction).insetBlockStart) || 0;
        const overflow = introduction.offsetHeight + top + 24 > window.innerHeight;
        if (introduction.dataset.trackOverflow !== String(overflow)) introduction.dataset.trackOverflow = String(overflow);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resizeObserver = new ResizeObserver(schedule);
    if (introduction) resizeObserver.observe(introduction);
    cards.forEach((card) => { if (card) resizeObserver.observe(card); });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (introduction) delete introduction.dataset.trackOverflow;
    };
  }, [tracks]);

  return <nav ref={navigation} className="pathway-track-nav" aria-label={locale === "ar" ? "مسارات المشاركة" : "Participation tracks"}>
    <ul>{tracks.map((track) => <li key={track.id}>
      <Link href={`#${track.id}`} className="pathway-track-link" aria-current={active === track.id ? "location" : undefined}>
        <span className="pathway-track-label">{track.label}</span>
        <svg className="pathway-track-marker" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </li>)}</ul>
  </nav>;
}
