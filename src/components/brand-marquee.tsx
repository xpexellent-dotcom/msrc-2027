"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export function BrandMarquee({ locale }: { locale: Locale }) {
  const [paused, setPaused] = useState(false);
  const label = locale === "ar" ? "شعارات توضيحية — سيُعلن الرعاة لاحقًا" : "Illustrative logos — sponsors to be announced";
  return <section className="brand-marquee" aria-label={label} data-paused={paused}>
    <div className="brand-marquee-caption"><p>{label}</p><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? locale === "ar" ? "تشغيل الحركة" : "Play motion" : locale === "ar" ? "إيقاف الحركة" : "Pause motion"}>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">{paused ? <path d="m6 4 9 6-9 6V4Z" fill="currentColor" /> : <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" />}</svg>
      <span>{paused ? locale === "ar" ? "تشغيل الحركة" : "Play motion" : locale === "ar" ? "إيقاف الحركة" : "Pause motion"}</span>
    </button></div>
    <div className="brand-marquee-window"><div className="brand-marquee-track">
      {[0, 1].map((group) => <div className="brand-marquee-group" key={group} aria-hidden={group === 1 ? true : undefined}>
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={`brand-placeholder brand-placeholder-${index % 3}`}>
          <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><path d={index % 2 ? "M4 6h12v12H4zM16 14h12v12H16z" : "m16 3 13 13-13 13L3 16 16 3Zm0 7-6 6 6 6 6-6-6-6Z"} stroke="currentColor" strokeWidth="1.5" /></svg><span lang="en" dir="ltr">Brand</span>
        </span>)}
      </div>)}
    </div></div>
  </section>;
}
