"use client";

import { useEffect, useRef } from "react";
import { conferenceExpectations, totalHistoricalAttendance } from "@/content/conference-expectations";
import type { Locale } from "@/lib/i18n";

function CountUp({ value, suffix = "", locale }: { value: number; suffix?: string; locale: Locale }) {
  const element = useRef<HTMLSpanElement>(null);
  const final = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value) + suffix;
  useEffect(() => {
    const node = element.current;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || motion.matches || !window.IntersectionObserver) return;
    let frame = 0;
    let started = false;
    const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");
    const finish = () => { cancelAnimationFrame(frame); node.textContent = final; node.dataset.counting = "false"; };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      if (motion.matches) return;
      const start = performance.now();
      node.dataset.counting = "true";
      const tick = (time: number) => {
        const progress = Math.min(1, (time - start) / 1400);
        const eased = 1 - Math.pow(1 - progress, 4);
        node.textContent = formatter.format(Math.round(value * eased)) + suffix;
        if (progress < 1 && !motion.matches) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: .7 });
    const preference = () => { if (motion.matches) finish(); };
    observer.observe(node);
    motion.addEventListener("change", preference);
    return () => { observer.disconnect(); motion.removeEventListener("change", preference); finish(); };
  }, [value, suffix, locale, final]);
  return <><span className="sr-only">{final}</span><span ref={element} aria-hidden="true" className="history-count" dir="ltr">{final}</span></>;
}

function HistoryIcon({ kind }: { kind: "community" | "visitors" | "research" }) {
  return <svg className="history-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === "community" && <>
      <circle cx="20" cy="20" r="15" />
      <path d="M5 20h30M20 5c5 4.5 7.5 9.5 7.5 15S25 30.5 20 35c-5-4.5-7.5-9.5-7.5-15S15 9.5 20 5Z" />
      <path d="M8.5 10.5c7.5 4 15.5 4 23 0M8.5 29.5c7.5-4 15.5-4 23 0" opacity=".6" />
    </>}
    {kind === "visitors" && <>
      <circle cx="20" cy="12" r="5" />
      <path d="M10.5 33v-4a9.5 9.5 0 0 1 19 0v4H10.5Z" />
      <path d="M7 10.5a4.5 4.5 0 0 0 0 9M33 10.5a4.5 4.5 0 0 1 0 9M6.5 24A7.5 7.5 0 0 0 2 31v2h4M33.5 24A7.5 7.5 0 0 1 38 31v2h-4" opacity=".7" />
    </>}
    {kind === "research" && <>
      <path d="M12 4h14l7 7v23a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M26 4v7h7M16 18h11M16 24h11M16 30h6M5 12v20" />
    </>}
  </svg>;
}

export function HistoryNumbers({ locale }: { locale: Locale }) {
  const copy = conferenceExpectations[locale];
  return <dl className="history-numbers history-numbers--glass">
    <div className="history-total">
      <dt><HistoryIcon kind="community" />{copy.attendance}<span>{copy.editions}</span></dt>
      <dd><CountUp value={totalHistoricalAttendance} suffix="+" locale={locale} /></dd>
    </div>
    <div className="history-visitors">
      <dt><HistoryIcon kind="visitors" />{copy.lastEdition}<span><bdi>{copy.historyEdition}</bdi></span></dt>
      <dd><CountUp value={2257} locale={locale} /></dd>
    </div>
    <div className="history-research">
      <dt><HistoryIcon kind="research" />{copy.research}<span><bdi>{copy.historyEdition}</bdi></span></dt>
      <dd><CountUp value={83} locale={locale} /></dd>
    </div>
  </dl>;
}
