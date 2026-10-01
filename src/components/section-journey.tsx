"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { formatIndex, type Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", title: "Inside MSRC", sections: ["The conference", "Participation", "Programme", "Speakers", "MSRC 2026", "Plan your visit"] },
  ar: { label: "استكشف أقسام المؤتمر", title: "داخل المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "المتحدثون", "نسخة ٢٠٢٦", "خطّط لزيارتك"] },
} as const;
const destinations = ["about", "participate", "program", "speakers", "legacy", "faq"] as const;
type Chapter = typeof destinations[number];

/** Native anchors and an informational current chapter; scrolling remains browser-owned. */
export function SectionJourney({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [current, setCurrent] = useState<Chapter | null>(null);

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
    <nav className="section-journey" aria-label={text.label}>
      <div className="section-journey-inner">
        <p className="section-journey-title"><span aria-hidden="true" />{text.title}</p>
        <div className="section-journey-links">
          {destinations.map((id, index) => <Link key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined}>
            <span className="chapter-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span>
            <span>{text.sections[index]}</span>
          </Link>)}
        </div>
      </div>
    </nav>
  );
}
