import Image from "next/image";
import { HorizontalRail } from "@/components/horizontal-rail";
import type { Locale } from "@/lib/i18n";

const photos = [
  { id: "03", en: "The approach", ar: "الطريق إلى المقر", alt: { en: "A sunny palm-lined approach to the conference center's stone facade", ar: "ممر تحيط به أشجار النخيل وصولًا إلى الواجهة الحجرية لمركز المؤتمرات" } },
  { id: "01", en: "The entrance", ar: "المدخل", alt: { en: "The signed entrance to King Faisal Conference Center between tall palms", ar: "مدخل مركز الملك فيصل للمؤتمرات ولوحته بين أشجار النخيل" } },
  { id: "02", en: "Inside the center", ar: "داخل المركز", alt: { en: "The conference center lobby with its glazed Saudi emblem and high ceiling", ar: "بهو مركز المؤتمرات بسقفه المرتفع وشعار المملكة على الواجهة الزجاجية" } },
  { id: "04", en: "", ar: "", alt: { en: "A palm-lined courtyard and the conference center silhouetted at sunset", ar: "ساحة تحيط بها أشجار النخيل ومركز المؤتمرات عند الغروب" } },
] as const;

/** One native swipe card with four organizer-selected views and manual controls. */
export function VenuePhotoGallery({ locale }: { locale: Locale }) {
  return <HorizontalRail className="venue-photo-gallery" locale={locale} stepByItem
    label={locale === "ar" ? "صور مركز الملك فيصل للمؤتمرات" : "Views of King Faisal Conference Center"}>
    {photos.map((photo, index) => <figure key={photo.id} className={`venue-gallery-photo venue-gallery-photo--${photo.id}`}>
      <Image src={`/media/msrc-demo/venue-journey-${photo.id}.jpg`} alt={photo.alt[locale]} fill
        sizes="(max-width: 800px) 92vw, (max-width: 1100px) 48vw, 34vw" priority={index === 0} />
      {photo[locale] && <figcaption>{photo[locale]}</figcaption>}
    </figure>)}
  </HorizontalRail>;
}
