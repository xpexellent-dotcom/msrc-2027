"use client";

import { useEffect, useRef } from "react";
import { conferenceExpectations, totalHistoricalAttendance } from "@/content/conference-expectations";
import type { Locale } from "@/lib/i18n";
import { BrandIcon } from "@/components/brand/brand-icon";

// The visual digits group with a baseline comma in both locales: El Messiri draws the
// Arabic thousands separator (U+066C) as a low dot that reads as a decimal point, and
// Noto Sans Arabic draws it as a raised mark. The screen-reader value keeps Intl output.
const GROUP_MARK = ",";

function CountUp({ value, suffix = "", locale }: { value: number; suffix?: string; locale: Locale }) {
  const element = useRef<HTMLSpanElement>(null);
  const parts = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").formatToParts(value);
  const final = parts.map((part) => part.value).join("");
  useEffect(() => {
    const node = element.current;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || motion.matches || !window.IntersectionObserver) return;
    let frame = 0;
    let started = false;
    const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");
    const display = node.parentElement!;
    const render = (number: number) => {
      const formatted = formatter.formatToParts(number);
      if (node.textContent === formatted.map((part) => part.type === "group" ? GROUP_MARK : part.value).join("")) return;
      node.replaceChildren(...formatted.map((part) => {
        if (part.type !== "group") return document.createTextNode(part.value);
        const separator = document.createElement("span");
        separator.className = "history-count-group";
        separator.textContent = GROUP_MARK;
        return separator;
      }));
    };
    const finish = () => { cancelAnimationFrame(frame); render(value); display.dataset.counting = "false"; };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (started) { finish(); observer.disconnect(); }
        return;
      }
      if (started) return;
      started = true;
      if (motion.matches) return;
      const start = performance.now();
      display.dataset.counting = "true";
      const tick = (time: number) => {
        const progress = Math.min(1, (time - start) / 1400);
        const eased = 1 - Math.pow(1 - progress, 4);
        render(Math.round(value * eased));
        if (progress < 1 && !motion.matches) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: .7 });
    const preference = () => { if (motion.matches) finish(); };
    observer.observe(node);
    motion.addEventListener("change", preference);
    return () => { observer.disconnect(); motion.removeEventListener("change", preference); finish(); };
  }, [value, locale, final]);
  return <><span className="sr-only">{final}{suffix}</span><span aria-hidden="true" className="history-count" dir="ltr"><span ref={element}>{parts.map((part, index) => part.type === "group" ? <span className="history-count-group" key={index}>{GROUP_MARK}</span> : part.value)}</span>{suffix ? <span className="history-count-suffix">{suffix}</span> : null}</span></>;
}

export function HistoryNumbers({ locale }: { locale: Locale }) {
  const copy = conferenceExpectations[locale];
  return <dl className="history-numbers history-numbers--glass">
    <div className="history-total">
      <dt><BrandIcon className="history-icon" name="16-global" size={40} />{copy.attendance}<span>{copy.editions}</span></dt>
      <dd><CountUp value={totalHistoricalAttendance} suffix="+" locale={locale} /></dd>
    </div>
    <div className="history-visitors">
      <dt><BrandIcon className="history-icon" name="13-collaboration" size={40} />{copy.lastEdition}<span><bdi dir="ltr" lang={locale === "en" ? "en" : undefined}>{copy.historyEdition}</bdi></span></dt>
      <dd><CountUp value={2257} locale={locale} /></dd>
    </div>
    <div className="history-research">
      <dt><BrandIcon className="history-icon" name="01-research" size={40} />{copy.research}<span><bdi dir="ltr" lang={locale === "en" ? "en" : undefined}>{copy.historyEdition}</bdi></span></dt>
      <dd><CountUp value={83} locale={locale} /></dd>
    </div>
  </dl>;
}
