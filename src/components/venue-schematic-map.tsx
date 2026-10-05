import type { Locale } from "@/lib/i18n";
import "@/styles/venue-schematic-map.css";

const copy = {
  en: {
    title: "King Faisal Conference Center in Jeddah",
    description: "A schematic of Jeddah, with the Red Sea to the west and the airport to the north. King Abdulaziz International Airport and the Haramain Airport station share one marker. The railway runs south to Jeddah Al-Sulaymaniyah station. From there, take a taxi to King Faisal Conference Center at King Abdulaziz University. Abdullah Sulayman Street is marked near the university. This map shows general orientation, not an exact driving route or scale; use the directions links to plan your route.",
    airport: ["King Abdulaziz", "International Airport", "JED", "Haramain Airport station"],
    jeddahStation: ["Jeddah", "Al-Sulaymaniyah", "station"],
    campus: ["King Abdulaziz", "University"],
    venue: ["King Faisal", "Conference", "Center"],
    north: "N", railway: ["Haramain", "railway"],
    street: ["Abdullah Sulayman", "St"],
    road: "Road", rail: "Rail", notToScale: "Map not to scale",
  },
  ar: {
    title: "مركز الملك فيصل للمؤتمرات في جدة",
    description: "خريطة توضيحية لجدة، يقع البحر الأحمر غربها والمطار شمالها. يظهر مطار الملك عبدالعزيز الدولي ومحطة المطار لقطار الحرمين بعلامة واحدة. يمتد القطار جنوبًا إلى محطة جدة السليمانية، ثم تصل بسيارة أجرة إلى مركز الملك فيصل للمؤتمرات في جامعة الملك عبدالعزيز. يظهر شارع عبدالله سليمان قرب الجامعة. توضّح الخريطة الاتجاهات العامة وليست مسار قيادة دقيقًا أو بمقياس رسم؛ استخدم روابط الاتجاهات لتخطيط رحلتك.",
    airport: ["مطار الملك عبدالعزيز", "الدولي", "JED", "ومحطة قطار الحرمين بالمطار"],
    jeddahStation: ["محطة جدة", "السليمانية"],
    campus: ["جامعة", "الملك عبدالعزيز"],
    venue: ["مركز الملك فيصل", "للمؤتمرات"],
    north: "ش", railway: ["قطار", "الحرمين"],
    street: ["شارع عبدالله سليمان"],
    road: "الطرق", rail: "القطار", notToScale: "الخريطة ليست بمقياس رسم",
  },
} as const;

type Point = readonly [number, number];
type MapGeometry = {
  width: number; height: number; sea: string; coastline: string; roads: readonly string[];
  roadTransfer: string; rail: string;
  airport: Point; jeddahStation: Point; venue: Point;
  campus: readonly [number, number, number, number];
  labels: Readonly<Record<"airport" | "jeddahStation" | "campus" | "venue" | "railway" | "street", Point>>;
};

// Orientation remains north-up in both languages. These are schematic connections,
// not a claim about road distances, terminal exits, campus gates or a driving route.
const geometry: Record<"portrait" | "landscape", MapGeometry> = {
  portrait: {
    width: 320, height: 936,
    sea: "M0 0H55C66 135 39 238 57 355S37 720 57 936H0Z",
    coastline: "M55 0C66 135 39 238 57 355S37 720 57 936",
    roads: ["M84 174V825", "M84 842H302"],
    roadTransfer: "M84 174H162M84 732H94",
    rail: "M182 194V406",
    airport: [182, 174], jeddahStation: [182, 406], venue: [126, 747],
    campus: [94, 610, 208, 185],
    labels: { airport: [182, 56], jeddahStation: [182, 454], campus: [198, 646], venue: [225, 729], railway: [249, 285], street: [200, 879] },
  },
  landscape: {
    width: 760, height: 708,
    sea: "M0 0H90C135 118 68 215 105 318S78 540 103 708H0Z",
    coastline: "M90 0C135 118 68 215 105 318S78 540 103 708",
    roads: ["M203 190V600", "M203 618H710"],
    roadTransfer: "M203 190H400M203 558H220",
    rail: "M420 210V344",
    airport: [420, 190], jeddahStation: [420, 344], venue: [277, 558],
    campus: [220, 430, 370, 160],
    labels: { airport: [420, 65], jeddahStation: [552, 373], campus: [405, 465], venue: [450, 540], railway: [573, 270], street: [455, 656] },
  },
};

function MapLabel({ point: [x, y], lines, locale, className = "" }: { point: Point; lines: readonly string[]; locale: Locale; className?: string }) {
  return <text className={`venue-map-label ${className}`} x={x} y={y} textAnchor="middle" direction={locale === "ar" ? "rtl" : "ltr"} style={{ unicodeBidi: "plaintext" }}>
    {lines.map((line, index) => <tspan key={line} x={x} dy={index ? 25 : 0} direction={line === "JED" ? "ltr" : undefined}>{line}{index < lines.length - 1 ? " " : ""}</tspan>)}
  </text>;
}

function Station({ point: [x, y], landmark }: { point: Point; landmark: string }) {
  return <g data-map-landmark={landmark}>
    <rect x={x - 10} y={y - 10} width="20" height="20" rx="4" className="venue-map-station" />
    <path d={`M${x - 4} ${y - 3}H${x + 4}M${x - 4} ${y + 3}H${x + 4}`} className="venue-map-station-detail" />
  </g>;
}

function Schematic({ locale, layout }: { locale: Locale; layout: keyof typeof geometry }) {
  const text = copy[locale];
  const map = geometry[layout];
  const titleId = `venue-map-${locale}-${layout}-title`;
  const descriptionId = `venue-map-${locale}-${layout}-description`;
  const [campusX, campusY, campusWidth, campusHeight] = map.campus;
  const [airportX, airportY] = map.airport;
  const [venueX, venueY] = map.venue;
  const northX = layout === "portrait" ? 28 : 148;
  return <svg className={`venue-map-svg venue-map-svg--${layout}`} viewBox={`0 0 ${map.width} ${map.height}`} role="img" aria-labelledby={titleId} aria-describedby={descriptionId} focusable="false" direction="ltr" data-map-layout={layout}>
    <title id={titleId}>{text.title}</title><desc id={descriptionId}>{text.description}</desc>
    <rect width={map.width} height={map.height} className="venue-map-land" />
    <path d={map.sea} className="venue-map-sea" /><path d={map.coastline} className="venue-map-coast" />
    <path d={`M${northX} 55V25L${northX - 5} 34M${northX} 25L${northX + 5} 34`} className="venue-map-north" />
    <text x={northX} y="79" textAnchor="middle" className="venue-map-label">{text.north}</text>
    <text x={layout === "portrait" ? 28 : 48} y={layout === "portrait" ? 465 : 365} className="venue-map-sea-label" textAnchor="middle" direction={locale === "ar" ? "rtl" : "ltr"}>
      {locale === "ar" ? <><tspan x={layout === "portrait" ? 28 : 48}>البحر</tspan><tspan x={layout === "portrait" ? 28 : 48} dy="25">الأحمر</tspan></> : <><tspan x={layout === "portrait" ? 28 : 48}>Red</tspan><tspan x={layout === "portrait" ? 28 : 48} dy="25">Sea</tspan></>}
    </text>
    <g className="venue-map-roads">{map.roads.map((path) => <path key={path} d={path} />)}<path d={map.roadTransfer} /></g>
    <path d={map.rail} className="venue-map-rail" />
    <rect x={campusX} y={campusY} width={campusWidth} height={campusHeight} rx="10" className="venue-map-campus" />
    <g data-map-landmark="airport" data-includes-station="true"><circle cx={airportX} cy={airportY} r="20" className="venue-map-airport" /><path d={`M${airportX - 10} ${airportY - 3}L${airportX - 2} ${airportY - 7}V${airportY - 13}H${airportX + 2}V${airportY - 7}L${airportX + 10} ${airportY - 3}V${airportY}L${airportX + 2} ${airportY - 2}V${airportY + 2}H${airportX - 2}V${airportY - 2}L${airportX - 10} ${airportY}Z`} className="venue-map-plane" /><path d={`M${airportX - 7} ${airportY + 8}H${airportX + 7}M${airportX - 7} ${airportY + 13}H${airportX + 7}`} className="venue-map-station-detail" /></g>
    <Station point={map.jeddahStation} landmark="jeddah-station" />
    <g data-map-landmark="venue"><path d={`M${venueX} ${venueY + 17}C${venueX - 5} ${venueY + 8} ${venueX - 15} ${venueY - 2} ${venueX - 15} ${venueY - 12}a15 15 0 1 1 30 0C${venueX + 15} ${venueY - 2} ${venueX + 5} ${venueY + 8} ${venueX} ${venueY + 17}Z`} className="venue-map-pin" /><circle cx={venueX} cy={venueY - 12} r="5" className="venue-map-pin-core" /></g>
    <MapLabel point={map.labels.airport} lines={text.airport} locale={locale} className="venue-map-label--airport" />
    <MapLabel point={map.labels.jeddahStation} lines={layout === "landscape" && locale === "en" ? ["Jeddah Al-Sulaymaniyah", "station"] : text.jeddahStation} locale={locale} />
    <MapLabel point={map.labels.campus} lines={text.campus} locale={locale} className="venue-map-label--campus" />
    <MapLabel point={map.labels.venue} lines={layout === "landscape" && locale === "en" ? ["King Faisal", "Conference Center"] : text.venue} locale={locale} className="venue-map-label--venue" />
    <MapLabel point={map.labels.railway} lines={text.railway} locale={locale} className="venue-map-label--secondary" />
    <MapLabel point={map.labels.street} lines={layout === "landscape" && locale === "en" ? ["Abdullah Sulayman St"] : text.street} locale={locale} className="venue-map-label--secondary" />
  </svg>;
}

/** Original self-hosted SVG; localized labels never mirror Jeddah's geography. */
export function VenueSchematicMap({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return <figure className="venue-schematic" data-testid="venue-schematic-map">
    <Schematic locale={locale} layout="portrait" /><Schematic locale={locale} layout="landscape" />
    <figcaption className="venue-map-caption"><strong>{text.notToScale}</strong><span className="venue-map-legend"><span><i className="venue-map-key venue-map-key--road" aria-hidden="true" />{text.road}</span><span><i className="venue-map-key venue-map-key--rail" aria-hidden="true" />{text.rail}</span></span></figcaption>
  </figure>;
}
