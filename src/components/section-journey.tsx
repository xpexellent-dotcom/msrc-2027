"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@/components/ui/link";
import { formatIndex, type Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", title: "Inside MSRC", sections: ["The conference", "Participation", "Programme", "Speakers", "MSRC 2026", "Plan your visit"] },
  ar: { label: "استكشف أقسام المؤتمر", title: "داخل المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "المتحدثون", "نسخة ٢٠٢٦", "خطّط لزيارتك"] },
} as const;
const destinations = ["about", "participate", "program", "speakers", "legacy", "faq"] as const;
type Chapter = typeof destinations[number];

/**
 * Native anchors and an informational current chapter; scrolling remains browser-owned.
 * ORG-009: below 1100px the index is one swipeable row that sticks under the floating header,
 * like the desktop bar. A highlight glides to the current chapter and the row keeps it centred.
 * A tapped chapter takes the highlight at once, rather than passing through every chapter between.
 */
export function SectionJourney({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [current, setCurrent] = useState<Chapter | null>(null);
  const [stuck, setStuck] = useState(false);
  // "waiting" only once hydrated below the fold, so server HTML and an on-screen bar stay visible.
  const [entrance, setEntrance] = useState<"none" | "waiting" | "played">("none");
  const nav = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const arriving = useRef<{ id: Chapter; until: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * .38;
      let chapter: Chapter | null = null;
      for (const id of destinations) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= readingLine) chapter = id;
      }
      const pending = arriving.current;
      if (pending && performance.now() < pending.until && chapter !== pending.id) chapter = pending.id;
      else arriving.current = null;
      setCurrent(chapter);
      const bar = nav.current;
      if (bar) setStuck(window.scrollY > 0 && bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top) + 1);
    };
    const scheduleUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  // The first time the bar scrolls into view its chapters glide in, as the page's reveals do.
  useEffect(() => {
    const bar = nav.current;
    if (!bar || typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (bar.getBoundingClientRect().top < window.innerHeight) return;
    setEntrance("waiting");
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      seen.disconnect();
      setEntrance("played");
    }, { rootMargin: "0px 0px -12% 0px" });
    seen.observe(bar);
    return () => seen.disconnect();
  }, []);

  // The highlight sits behind the current chapter's link; the row slides it into the middle.
  useLayoutEffect(() => {
    const row = track.current;
    const highlight = indicator.current;
    if (!row || !highlight) return;
    const place = (scroll: boolean) => {
      const link = row.querySelector<HTMLElement>('a[aria-current="location"]');
      highlight.style.opacity = link ? "1" : "0";
      if (!link) return;
      highlight.style.transform = `translateX(${link.offsetLeft}px)`;
      highlight.style.width = `${link.offsetWidth}px`;
      if (!scroll || row.scrollWidth <= row.clientWidth) return;
      // In RTL rows both offsetLeft and scrollLeft run negative past the start edge, so one
      // formula centres the link in either direction.
      const left = link.offsetLeft - (row.clientWidth - link.offsetWidth) / 2;
      row.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    place(true);
    const resized = new ResizeObserver(() => place(false));
    resized.observe(row);
    return () => resized.disconnect();
  }, [current]);

  return (
    <nav className="section-journey" aria-label={text.label} ref={nav} data-stuck={stuck} data-entrance={entrance}>
      <div className="section-journey-inner">
        <p className="section-journey-title"><span aria-hidden="true" />{text.title}</p>
        <div className="section-journey-links" ref={track}>
          <span className="section-journey-indicator" aria-hidden="true" ref={indicator} />
          {destinations.map((id, index) => <Link key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined} style={{ "--chip-order": index } as CSSProperties} onClick={() => {
            arriving.current = { id, until: performance.now() + 1500 };
            setCurrent(id);
          }}>
            <span className="chapter-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span>
            <span>{text.sections[index]}</span>
          </Link>)}
        </div>
      </div>
    </nav>
  );
}
