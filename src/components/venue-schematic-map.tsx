import type { Locale } from "@/lib/i18n";
import "@/styles/venue-schematic-map.css";

const copy = {
  en: {
    title: "Jeddah arrival routes to King Faisal Conference Center",
    description: "A schematic of Jeddah, with the Red Sea to the west and the airport to the north. From King Abdulaziz International Airport, use the Haramain Airport station for a train to Jeddah Al-Sulaymaniyah station, then a taxi to King Faisal Conference Center on the King Abdulaziz University campus. A road connection also links the airport and the university. This map is not to scale; use the directions links to plan your route.",
    airport: ["King Abdulaziz", "International Airport", "JED"],
    airportStation: ["Haramain", "Airport station"],
    jeddahStation: ["Jeddah", "Al-Sulaymaniyah", "station"],
    campus: ["King Abdulaziz", "University campus"],
    venue: ["King Faisal", "Conference Center"],
    north: "N", railway: ["Haramain", "railway"],
    street: ["Abdullah Sulayman", "St"], mainRoad: ["Prince Majid Road"],
    road: "Road", rail: "Rail", taxi: "Taxi connection", notToScale: "Map not to scale",
  },
  ar: {
    title: "طرق الوصول إلى مركز الملك فيصل للمؤتمرات في جدة",
    description: "خريطة توضيحية لجدة، يقع البحر الأحمر غربها والمطار شمالها. من مطار الملك عبدالعزيز الدولي، يمكنك ركوب القطار من محطة المطار إلى محطة جدة السليمانية، ثم سيارة أجرة إلى مركز الملك فيصل للمؤتمرات داخل حرم جامعة الملك عبدالعزيز. يربط المطار والجامعة طريق بري أيضًا. الخريطة ليست بمقياس رسم؛ استخدم روابط الاتجاهات لتخطيط رحلتك.",
    airport: ["مطار الملك عبدالعزيز", "الدولي", "JED"],
    airportStation: ["محطة المطار", "قطار الحرمين"],
    jeddahStation: ["محطة جدة", "السليمانية"],
    campus: ["حرم جامعة", "الملك عبدالعزيز"],
    venue: ["مركز الملك فيصل", "للمؤتمرات"],
    north: "ش", railway: ["قطار", "الحرمين"],
    street: ["شارع عبدالله سليمان"], mainRoad: ["طريق الأمير ماجد"],
    road: "الطرق", rail: "القطار", taxi: "وصلة بسيارة أجرة", notToScale: "الخريطة ليست بمقياس رسم",
  },
} as const;

type Point = readonly [number, number];
type MapGeometry = {
  width: number; height: number; sea: string; coastline: string; roads: readonly string[];
  roadTransfer: string; rail: string; taxi: string;
  airport: Point; airportStation: Point; jeddahStation: Point; venue: Point;
  campus: readonly [number, number, number, number];
  labels: Readonly<Record<"airport" | "airportStation" | "jeddahStation" | "campus" | "venue" | "railway" | "street" | "mainRoad", Point>>;
};

// Orientation remains north-up in both languages. These are schematic connections,
// not a claim about road distances, terminal exits, campus gates or a driving route.
const geometry: Record<"portrait" | "landscape", MapGeometry> = {
  portrait: {
    width: 320, height: 864,
    sea: "M0 0H55C66 135 39 238 57 355S37 640 57 864H0Z",
    coastline: "M55 0C66 135 39 238 57 355S37 640 57 864",
    roads: ["M82 135V695", "M37 710H290"],
    roadTransfer: "M168 137L82 166M82 588H175",
    rail: "M168 137L282 196V455H158",
    taxi: "M158 455V529H175V588",
    airport: [168, 137], airportStation: [282, 196], jeddahStation: [158, 455], venue: [175, 588],
    campus: [90, 555, 170, 130],
    labels: { airport: [176, 60], airportStation: [176, 206], jeddahStation: [177, 368], campus: [175, 637], venue: [175, 806], railway: [214, 307], street: [176, 738], mainRoad: [146, 272] },
  },
  landscape: {
    width: 760, height: 600,
    sea: "M0 0H90C135 118 68 215 105 318S78 490 103 600H0Z",
    coastline: "M90 0C135 118 68 215 105 318S78 490 103 600",
    roads: ["M211 122V512", "M105 501H710"],
    roadTransfer: "M319 118L211 170M211 403H374",
    rail: "M319 118L589 165V308H360",
    taxi: "M360 308V342H374V403",
    airport: [319, 118], airportStation: [589, 165], jeddahStation: [360, 308], venue: [374, 403],
    campus: [268, 345, 215, 132],
    labels: { airport: [319, 40], airportStation: [589, 92], jeddahStation: [360, 249], campus: [376, 447], venue: [365, 551], railway: [635, 255], street: [564, 530], mainRoad: [220, 286] },
  },
};

function MapLabel({ point: [x, y], lines, locale, className = "" }: { point: Point; lines: readonly string[]; locale: Locale; className?: string }) {
  return <text className={`venue-map-label ${className}`} x={x} y={y} textAnchor="middle" direction={locale === "ar" ? "rtl" : "ltr"} style={{ unicodeBidi: "plaintext" }}>
    {lines.map((line, index) => <tspan key={line} x={x} dy={index ? 25 : 0} direction={line === "JED" ? "ltr" : undefined}>{line}</tspan>)}
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
  const northX = layout === "portrait" ? 57 : 148;
  const calloutX = layout === "portrait" ? 302 : campusX + campusWidth + 18;
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
    <path d={map.rail} className="venue-map-rail" /><path d={map.taxi} className="venue-map-taxi" />
    <rect x={campusX} y={campusY} width={campusWidth} height={campusHeight} rx="10" className="venue-map-campus" />
    <g data-map-landmark="airport"><circle cx={airportX} cy={airportY} r="16" className="venue-map-airport" /><path d={`M${airportX - 10} ${airportY + 3}L${airportX - 2} ${airportY - 1}V${airportY - 8}H${airportX + 2}V${airportY - 1}L${airportX + 10} ${airportY + 3}V${airportY + 6}L${airportX + 2} ${airportY + 4}V${airportY + 9}H${airportX - 2}V${airportY + 4}L${airportX - 10} ${airportY + 6}Z`} className="venue-map-plane" /></g>
    <Station point={map.airportStation} landmark="airport-station" /><Station point={map.jeddahStation} landmark="jeddah-station" />
    <path d={`M${venueX + 15} ${venueY - 12}H${calloutX}V${map.labels.venue[1] - 22}`} className="venue-map-callout" />
    <g data-map-landmark="venue"><path d={`M${venueX} ${venueY + 17}C${venueX - 5} ${venueY + 8} ${venueX - 15} ${venueY - 2} ${venueX - 15} ${venueY - 12}a15 15 0 1 1 30 0C${venueX + 15} ${venueY - 2} ${venueX + 5} ${venueY + 8} ${venueX} ${venueY + 17}Z`} className="venue-map-pin" /><circle cx={venueX} cy={venueY - 12} r="5" className="venue-map-pin-core" /></g>
    <MapLabel point={map.labels.airport} lines={text.airport} locale={locale} />
    <MapLabel point={map.labels.airportStation} lines={text.airportStation} locale={locale} />
    <MapLabel point={map.labels.jeddahStation} lines={layout === "landscape" && locale === "en" ? ["Jeddah Al-Sulaymaniyah", "station"] : text.jeddahStation} locale={locale} />
    <MapLabel point={map.labels.campus} lines={text.campus} locale={locale} className="venue-map-label--campus" />
    <MapLabel point={map.labels.venue} lines={text.venue} locale={locale} className="venue-map-label--venue" />
    <MapLabel point={map.labels.railway} lines={text.railway} locale={locale} className="venue-map-label--secondary" />
    <MapLabel point={map.labels.street} lines={layout === "landscape" && locale === "en" ? ["Abdullah Sulayman St"] : text.street} locale={locale} className="venue-map-label--secondary" />
    <MapLabel point={map.labels.mainRoad} lines={text.mainRoad} locale={locale} className="venue-map-label--secondary" />
  </svg>;
}

/** Original self-hosted SVG; localized labels never mirror Jeddah's geography. */
export function VenueSchematicMap({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return <figure className="venue-schematic" data-testid="venue-schematic-map">
    <Schematic locale={locale} layout="portrait" /><Schematic locale={locale} layout="landscape" />
    <figcaption className="venue-map-caption"><strong>{text.notToScale}</strong><span className="venue-map-legend"><span><i className="venue-map-key venue-map-key--road" aria-hidden="true" />{text.road}</span><span><i className="venue-map-key venue-map-key--rail" aria-hidden="true" />{text.rail}</span><span><i className="venue-map-key venue-map-key--taxi" aria-hidden="true" />{text.taxi}</span></span></figcaption>
  </figure>;
}
