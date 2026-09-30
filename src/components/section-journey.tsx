"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", sections: ["The conference", "Participation", "Program", "Our legacy"], glide: "Section glide", off: "Free scrolling", reduced: "Reduced motion" },
  ar: { label: "استكشف أقسام المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "النسخ السابقة"], glide: "تنقّل بين الأقسام", off: "تمرير حرّ", reduced: "حركة مخفّضة" },
} as const;
const destinations = ["about", "participate", "program", "legacy"] as const;

function subscribeMotion(onChange: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Native CSS settling is optional. Never intercept wheel, touch or keyboard input. */
export function SectionJourney({ locale }: { locale: Locale }) {
  const [glide, setGlide] = useState(true);
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const text = copy[locale];

  useEffect(() => {
    if (!glide) document.documentElement.dataset.freeScroll = "true";
    else delete document.documentElement.dataset.freeScroll;
    return () => { delete document.documentElement.dataset.freeScroll; };
  }, [glide]);

  return (
    <nav className="section-journey" aria-label={text.label}>
      <div className="section-journey-links">
        {destinations.map((id, index) => <Link key={id} href={`#${id}`}>{text.sections[index]}</Link>)}
      </div>
      <button className="section-glide-toggle" type="button" disabled={reduced} aria-pressed={glide && !reduced} onClick={() => setGlide((value) => !value)}>
        <span className="glide-indicator" aria-hidden="true" />
        {reduced ? text.reduced : glide ? text.glide : text.off}
      </button>
    </nav>
  );
}
