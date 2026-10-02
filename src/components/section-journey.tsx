"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/ui/link";
import { formatIndex, type Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", title: "Inside MSRC", sections: ["The conference", "Participation", "Programme", "Speakers", "MSRC 2026", "Plan your visit"], show: "Show sections", close: "Close sections" },
  ar: { label: "استكشف أقسام المؤتمر", title: "داخل المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "المتحدثون", "نسخة ٢٠٢٦", "خطّط لزيارتك"], show: "عرض الأقسام", close: "إغلاق الأقسام" },
} as const;
const destinations = ["about", "participate", "program", "speakers", "legacy", "faq"] as const;
type Chapter = typeof destinations[number];

/**
 * Native anchors and an informational current chapter; scrolling remains browser-owned.
 * ORG-009: below 1100px the in-flow index scrolls away, so a floating chapter pill follows the
 * reader through the chapters and opens the same list in a side panel (a modal dialog).
 */
export function SectionJourney({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [current, setCurrent] = useState<Chapter | null>(null);
  const [dockVisible, setDockVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const index = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const sheetTitle = useRef<HTMLParagraphElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const choseChapter = useRef(false);

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
      // The pill appears once the in-flow index has left the screen and leaves with the last chapter.
      const indexGone = (index.current?.getBoundingClientRect().bottom ?? 0) < 0;
      const lastChapter = document.getElementById(destinations[destinations.length - 1]);
      const chaptersLeft = lastChapter ? lastChapter.getBoundingClientRect().bottom > window.innerHeight * .5 : false;
      setDockVisible(indexGone && chaptersLeft);
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

  const currentIndex = current ? destinations.indexOf(current) : -1;
  const closeSheet = () => sheet.current?.close();
  // A chosen chapter takes focus itself; any other dismissal returns focus to the pill (Safari
  // does not focus buttons on tap, so the dialog alone would leave it on the page body).
  const chooseChapter = () => { choseChapter.current = true; closeSheet(); };
  const links = (inSheet: boolean) => destinations.map((id, position) => <Link key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined} onClick={inSheet ? chooseChapter : undefined}>
    <span className="chapter-number" aria-hidden="true">{formatIndex(position + 1, locale)}</span>
    <span>{text.sections[position]}</span>
  </Link>);

  return (
    <>
      <nav className="section-journey" aria-label={text.label} ref={index}>
        <div className="section-journey-inner">
          <p className="section-journey-title"><span aria-hidden="true" />{text.title}</p>
          <div className="section-journey-links">{links(false)}</div>
        </div>
      </nav>
      <div className="chapter-dock" data-visible={dockVisible}>
        <button
          type="button" className="chapter-dock-toggle" ref={toggle} aria-haspopup="dialog" aria-expanded={open} aria-controls="chapter-sheet"
          // The panel opens on its title: announced by name, without a focus ring on the close button.
          onClick={() => { sheet.current?.showModal(); sheetTitle.current?.focus(); setOpen(true); }}
        >
          <span className="chapter-number" aria-hidden="true">{formatIndex(currentIndex + 1 || 1, locale)}</span>
          <span><span className="sr-only">{text.show}: </span>{currentIndex >= 0 ? text.sections[currentIndex] : text.title}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12M4 10h12M4 14h8" /></svg>
        </button>
      </div>
      <dialog
        id="chapter-sheet" className="chapter-sheet" ref={sheet} aria-labelledby="chapter-sheet-title"
        onClose={() => {
          setOpen(false);
          if (!choseChapter.current) toggle.current?.focus({ preventScroll: true });
          choseChapter.current = false;
        }}
        // The panel fills the dialog, so only a tap on the backdrop lands on the dialog itself.
        onClick={(event) => { if (event.target === event.currentTarget) closeSheet(); }}
      >
        <div className="chapter-sheet-panel">
          <div className="chapter-sheet-head">
            <p id="chapter-sheet-title" className="section-journey-title" tabIndex={-1} ref={sheetTitle}><span aria-hidden="true" />{text.title}</p>
            <button type="button" className="chapter-sheet-close" onClick={closeSheet}>
              <span className="sr-only">{text.close}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
          </div>
          <nav aria-labelledby="chapter-sheet-title" className="chapter-sheet-links">{links(true)}</nav>
        </div>
      </dialog>
    </>
  );
}
