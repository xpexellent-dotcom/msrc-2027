"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/ui/link";
import { formatIndex, type Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", title: "Inside MSRC", sections: ["The conference", "Participation", "Programme", "Speakers", "MSRC 2026", "Partners", "Plan your visit"] },
  ar: { label: "استكشف أقسام المؤتمر", title: "داخل المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "المتحدثون", "نسخة ٢٠٢٦", "الشركاء", "خطّط لزيارتك"] },
} as const;
// One chapter per numbered homepage section, so the numbers match the eyebrows (6 / Shared purpose).
const destinations = ["about", "participate", "program", "speakers", "legacy", "partners", "faq"] as const;
type Chapter = typeof destinations[number];

/**
 * Native anchors and an informational current chapter; scrolling remains browser-owned.
 * From 1100px the index is a bar that sticks under the floating header. Below that it is not
 * shown: on phones each chapter announces itself with its title instead (ORG-010).
 * A clicked chapter takes the underline at once, rather than passing through every chapter between.
 */
export function SectionJourney({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [current, setCurrent] = useState<Chapter | null>(null);
  const nav = useRef<HTMLElement>(null);
  const arriving = useRef<{ id: Chapter; until: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!nav.current?.offsetParent) return;
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

  return (
    <nav className="section-journey" aria-label={text.label} ref={nav}>
      <div className="section-journey-inner">
        <p className="section-journey-title"><span aria-hidden="true" />{text.title}</p>
        <div className="section-journey-links">
          {destinations.map((id, index) => <Link key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined} onClick={() => {
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
