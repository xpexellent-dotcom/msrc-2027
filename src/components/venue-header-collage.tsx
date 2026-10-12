"use client";

import Image from "next/image";
import { useState, type UIEvent } from "react";
import { HorizontalRail } from "@/components/horizontal-rail";
import type { Locale } from "@/lib/i18n";

const photos = [
  { id: "03", en: "The approach", ar: "الطريق إلى المقر", alt: { en: "A sunny palm-lined approach to the conference center's stone facade", ar: "ممر تحيط به أشجار النخيل وصولًا إلى الواجهة الحجرية لمركز المؤتمرات" } },
  { id: "01", en: "The entrance", ar: "المدخل", alt: { en: "The signed entrance to King Faisal Conference Center between tall palms", ar: "مدخل مركز الملك فيصل للمؤتمرات ولوحته بين أشجار النخيل" } },
  { id: "02", en: "Inside the center", ar: "داخل المركز", alt: { en: "The conference center lobby with its glazed Saudi emblem and high ceiling", ar: "بهو مركز المؤتمرات بسقفه المرتفع وشعار المملكة على الواجهة الزجاجية" } },
  { id: "04", en: "", ar: "", alt: { en: "A palm-lined courtyard and the conference center silhouetted at sunset", ar: "ساحة تحيط بها أشجار النخيل ومركز المؤتمرات عند الغروب" } },
] as const;

/** A focusable photo stack becomes an ordinary swipe rail on smaller screens. */
export function VenueHeaderCollage({ locale }: { locale: Locale }) {
  const [selected, setSelected] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const followSwipe = (event: UIEvent<HTMLDivElement>) => {
    const rail = event.target as HTMLElement;
    if (!rail.classList.contains("rail-track") || !window.matchMedia("(max-width: 1000px)").matches) return;
    const bounds = rail.getBoundingClientRect();
    const index = [...rail.children].findIndex(item => {
      const box = item.getBoundingClientRect();
      return Math.min(bounds.right, box.right) - Math.max(bounds.left, box.left) > bounds.width / 2;
    });
    if (index >= 0) setSelected(index);
  };

  return <div className="venue-header-collage" data-keyboard={keyboard} onScrollCapture={followSwipe}>
    <HorizontalRail className="venue-photo-gallery" locale={locale} stepByItem
      label={locale === "ar" ? "صور مركز الملك فيصل للمؤتمرات" : "Views of King Faisal Conference Center"}>
      {photos.map((photo, index) => <figure key={photo.id}
        className={`venue-collage-photo venue-collage-photo--${photo.id}`} data-photo-active={selected === index}>
        <button type="button" className="venue-collage-photo-button" aria-pressed={selected === index}
          aria-label={`${locale === "ar" ? "اعرض الصورة" : "View photo"}: ${photo.alt[locale]}`}
          onPointerDown={() => setKeyboard(false)} onKeyDown={() => setKeyboard(true)}
          onClick={event => { setKeyboard(event.detail === 0); setSelected(index); }}>
          <Image src={`/media/msrc-demo/venue-journey-${photo.id}.jpg`} alt={photo.alt[locale]} fill
            sizes="(max-width: 1000px) 92vw, 26vw" priority={index === 0} />
          {photo[locale] && <span className="venue-collage-caption">{photo[locale]}</span>}
        </button>
      </figure>)}
    </HorizontalRail>
  </div>;
}
