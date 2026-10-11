import Image from "next/image";
import { HorizontalRail } from "@/components/horizontal-rail";
import type { Locale } from "@/lib/i18n";

const photos = [
  { id: "03", en: "The approach", ar: "الطريق إلى المقر", alt: { en: "A sunny palm-lined approach to the conference center's stone facade", ar: "ممر تحيط به أشجار النخيل وصولًا إلى الواجهة الحجرية لمركز المؤتمرات" } },
  { id: "01", en: "The entrance", ar: "المدخل", alt: { en: "The signed entrance to King Faisal Conference Center between tall palms", ar: "مدخل مركز الملك فيصل للمؤتمرات ولوحته بين أشجار النخيل" } },
  { id: "02", en: "Inside the center", ar: "داخل المركز", alt: { en: "The conference center lobby with its glazed Saudi emblem and high ceiling", ar: "بهو مركز المؤتمرات بسقفه المرتفع وشعار المملكة على الواجهة الزجاجية" } },
  { id: "04", en: "A different light", ar: "في ضوء مختلف", alt: { en: "A palm-lined courtyard and the conference center silhouetted at sunset", ar: "ساحة تحيط بها أشجار النخيل ومركز المؤتمرات عند الغروب" } },
] as const;

/** Four organizer-selected views; native browsing, no autoplay or gallery download. */
export function VenuePhotoGallery({ locale }: { locale: Locale }) {
  return <HorizontalRail className="venue-photo-gallery" locale={locale} stepByItem
    label={locale === "ar" ? "صور مركز الملك فيصل للمؤتمرات" : "Views of King Faisal Conference Center"}>
    {photos.map((photo, index) => <figure key={photo.id} className={`venue-gallery-photo venue-gallery-photo--${photo.id}`}>
      <Image src={`/media/msrc-demo/venue-journey-${photo.id}.jpg`} alt={photo.alt[locale]} fill
        sizes="(max-width: 800px) 78vw, (max-width: 1100px) 38vw, 28vw" priority={index < 2} />
      <figcaption><span>{photo[locale]}</span><span aria-hidden="true">{locale === "ar" ? ["١", "٢", "٣", "٤"][index] : `0${index + 1}`}</span></figcaption>
    </figure>)}
  </HorizontalRail>;
}
