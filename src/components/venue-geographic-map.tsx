import type { Locale } from "@/lib/i18n";

const copy = {
  en: {
    alt: "Geographic map of King Faisal Conference Center and the surrounding King Abdulaziz University streets, with north arrow and 200 metre scale",
    title: "King Faisal Conference Center",
    description: "Campus streets and surroundings. Open your map app below for current driving directions.",
  },
  ar: {
    alt: "خريطة جغرافية لمركز الملك فيصل للمؤتمرات والشوارع المحيطة في جامعة الملك عبدالعزيز، مع سهم الشمال ومقياس ٢٠٠ متر",
    title: "مركز الملك فيصل للمؤتمرات",
    description: "شوارع الحرم الجامعي ومحيطه. افتح تطبيق الخرائط أدناه للحصول على اتجاهات القيادة الحالية.",
  },
};

/** Self-hosted OSM geometry; geographic orientation is identical in both languages. */
export function VenueGeographicMap({ locale, variant = "default" }: { locale: Locale; variant?: "default" | "hero" }) {
  const text = copy[locale];
  const hero = variant === "hero";
  return <figure className={`venue-geographic-map${hero ? " venue-geographic-map--hero" : ""}`} data-testid="venue-geographic-map">
    <picture>
      {!hero && <source media="(max-width: 650px)" srcSet={`/media/msrc-demo/venue-map-${locale}-portrait.svg`} />}
      {/* A local, already optimized SVG map; next/image does not optimize SVG assets. */}
      <img src={`/media/msrc-demo/venue-map-${locale}-landscape.svg`} width="1200" height="650" alt={text.alt} aria-describedby="venue-geographic-description" loading={hero ? "eager" : "lazy"} decoding="async" dir="ltr" />
    </picture>
    <figcaption className="venue-geographic-caption">
      <div><strong>{text.title}</strong><p id="venue-geographic-description" className={hero ? "sr-only" : undefined}>{text.description}</p></div>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">© OpenStreetMap contributors</a>
    </figcaption>
  </figure>;
}
