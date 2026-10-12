import type { Locale } from "@/lib/i18n";

export const venueJourneySteps = ["airport", "city", "arrival"] as const;
export const venueJourneyIds = ["journey-airport", "journey-city", "journey-arrival"] as const;

type VenueJourneyCopy = {
  label: string;
  navigation: string;
  steps: readonly [string, string, string];
  airportTitle: readonly [string, string];
  airportName: string;
  airportBody: string;
  airportNote: string;
  continue: string;
  cityTitle: readonly [string, string];
  cityBody: string;
  arrivalTitle: readonly [string, string];
  arrivalBody: string;
  orientationTitle: string;
  orientationBody: string;
  airportPin: string;
  venuePin: string;
  pointAction: string;
  mapNote: string;
  north: string;
  exploreMap: string;
  mapHelp: string;
  zoomIn: string;
  zoomOut: string;
  resetMap: string;
  closeDetails: string;
  arrivalEssentials: string;
  viewDetails: string;
  hideDetails: string;
};

/** Arrival sequence, not a surveyed driving route or terminal pickup instruction. */
export const venueJourneyCopy: Record<Locale, VenueJourneyCopy> = {
  en: {
    label: "Arrival journey",
    navigation: "Arrival journey chapters",
    steps: ["Airport", "Getting there", "Venue"],
    airportTitle: ["Start at", "the airport."],
    airportName: "King Abdulaziz International Airport",
    airportBody: "Connect by taxi, train or rental car.",
    airportNote: "Check terminal and pickup details with your airline and the airport.",
    continue: "Choose your connection",
    cityTitle: ["Choose your", "connection."],
    cityBody: "Compare travel options.",
    arrivalTitle: ["You’ve arrived", "at MSRC."],
    arrivalBody: "Save your QR ticket before you arrive.",
    orientationTitle: "The final approach.",
    orientationBody: "Open your map app for current directions.",
    airportPin: "Airport",
    venuePin: "MSRC",
    pointAction: "View arrival details",
    mapNote: "Arrival overview, not a driving route.",
    north: "North",
    exploreMap: "Explore the map",
    mapHelp: "Tap a stop to explore",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetMap: "Reset map",
    closeDetails: "Close map details",
    arrivalEssentials: "Arrival essentials",
    viewDetails: "View details",
    hideDetails: "Hide details",
  },
  ar: {
    label: "رحلة الوصول",
    navigation: "مراحل الوصول إلى المؤتمر",
    steps: ["المطار", "الوصول", "المقر"],
    airportTitle: ["بداية الرحلة،", "في المطار."],
    airportName: "مطار الملك عبدالعزيز الدولي",
    airportBody: "اختر سيارة أجرة أو قطارًا أو سيارة مستأجرة.",
    airportNote: "تحقّق من تفاصيل الصالة ومكان الركوب لدى شركة الطيران والمطار.",
    continue: "اختر وسيلة الوصول",
    cityTitle: ["اختر", "وسيلة الوصول."],
    cityBody: "قارن وسائل النقل.",
    arrivalTitle: ["وجهتك،", "المؤتمر."],
    arrivalBody: "احفظ تذكرتك برمز QR قبل وصولك.",
    orientationTitle: "الخطوة الأخيرة.",
    orientationBody: "افتح تطبيق الخرائط للحصول على الاتجاهات الحالية.",
    airportPin: "المطار",
    venuePin: "المؤتمر",
    pointAction: "اعرض تفاصيل الوصول",
    mapNote: "نظرة عامة للوصول، وليست مسارًا للقيادة.",
    north: "الشمال",
    exploreMap: "استكشف الخريطة",
    mapHelp: "اضغط على محطة لاستكشافها",
    zoomIn: "تكبير الخريطة",
    zoomOut: "تصغير الخريطة",
    resetMap: "إعادة ضبط الخريطة",
    closeDetails: "أغلق تفاصيل الخريطة",
    arrivalEssentials: "أساسيات الوصول",
    viewDetails: "اعرض التفاصيل",
    hideDetails: "أخفِ التفاصيل",
  },
};
